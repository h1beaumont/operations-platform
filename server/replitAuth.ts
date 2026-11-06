import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend Express Request to include session types
declare module "express-session" {
  interface SessionData {
    passport?: {
      user?: any;
    };
    // Store auth tokens separately from passport user
    authTokens?: {
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }
}

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const ALLOWED_DOMAINS = ["@example.com", "@northstaystays.co.uk", "@example.com"];

// Specific allowed Google accounts for admin access
const ALLOWED_GOOGLE_ACCOUNTS = [
  "team@example.com",
  "harry@example.com",
  "team@example.com",
  "team@example.com",
  "hecspb@example.com" // Test account for development/testing
];

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);

  console.log("[SESSION-CONFIG] Database URL exists:", !!process.env.DATABASE_URL);
  console.log("[SESSION-CONFIG] Session secret exists:", !!process.env.SESSION_SECRET);
  console.log("[SESSION-CONFIG] Environment:", process.env.NODE_ENV);

  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Changed to true to ensure table exists
    ttl: sessionTtl,
    tableName: "sessions",
    // Add error handling to prevent crashes
    errorLog: (error: Error) => {
      console.error("[SESSION-STORE] Error:", error.message);
    }
    // Removed the pool configuration - let connect-pg-simple handle it
  });

  // Log when sessions are touched
  const originalTouch = sessionStore.touch?.bind(sessionStore);
  if (originalTouch) {
    sessionStore.touch = function(sid: string, session: any, callback: any) {
      console.log("[SESSION-STORE] Touching session:", sid.substring(0, 8) + "...");
      return originalTouch(sid, session, callback);
    };
  }

  // Log when sessions are retrieved
  const originalGet = sessionStore.get?.bind(sessionStore);
  if (originalGet) {
    sessionStore.get = function(sid: string, callback: any) {
      console.log("[SESSION-STORE] Getting session:", sid.substring(0, 8) + "...");
      return originalGet(sid, (err: any, session: any) => {
        if (err) {
          console.error("[SESSION-STORE] Error getting session:", err);
        } else {
          console.log("[SESSION-STORE] Session found:", !!session, session?.passport?.user?.email);
        }
        callback(err, session);
      });
    };
  }

  const isProduction = process.env.NODE_ENV === "production";

  // Log cookie configuration for debugging
  console.log("[SESSION-CONFIG] Cookie settings:", {
    isProduction,
    secure: isProduction,
    sameSite: "lax",
    httpOnly: true,
    maxAge: sessionTtl
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true,  // Ensure sessions are saved even before modification
    rolling: true,  // Refresh session expiry on activity
    proxy: isProduction, // Trust proxy in production (required for secure cookies behind proxy)
    cookie: {
      httpOnly: true,
      secure: isProduction, // Require secure cookies only in production
      sameSite: "lax", // Use lax for same-site requests (frontend and backend on same domain)
      maxAge: sessionTtl,
      domain: undefined, // Let Express handle the domain
      path: "/", // Explicit path for cookie
    },
    name: 'connect.sid', // Explicit session cookie name
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;

  // DEVELOPMENT MODE: Allow any email address for testing
  // NOTE: In production, re-enable domain restrictions below
  return true;

  // PRODUCTION MODE (commented out for development):
  // const lowerEmail = email.toLowerCase();
  // const isDomainAllowed = ALLOWED_DOMAINS.some(domain => lowerEmail.endsWith(domain));
  // const isGoogleAccountAllowed = ALLOWED_GOOGLE_ACCOUNTS.some(
  //   account => lowerEmail === account.toLowerCase()
  // );
  // return isDomainAllowed || isGoogleAccountAllowed;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const claims = tokens.claims();
    if (!claims) {
      return verified(new Error("NO_CLAIMS"), false);
    }

    const email = claims["email"] as string | undefined;

    // Log the email attempting to log in (to help identify the Replit Google account)
    console.log(`[AUTH] Login attempt from email: ${email}`);

    if (!isEmailAllowed(email)) {
      console.log(`[AUTH] Rejected login attempt from unauthorized domain: ${email}`);
      console.log(`[AUTH] To allow this email, add it to ALLOWED_GOOGLE_ACCOUNTS in server/replitAuth.ts`);
      return verified(new Error("DOMAIN_NOT_ALLOWED"), false);
    }

    const user: any = {
      id: claims["sub"],
      email: claims["email"],
      claims: claims
    };
    updateUserSession(user, tokens);
    await upsertUser(claims);
    console.log(`[AUTH] User verified successfully: ${email}`);
    verified(null, user);
  };

  // Register strategies for all possible domains
  const domains = process.env.REPLIT_DOMAINS!.split(",");

  // Add the production domain if not already included
  const prodDomains = [
    "workspace.harry391.replit.app",
    "workspace.harry391.repl.co",
    "staff-flow-harry391.replit.app",
    "staff-flow-harry391.repl.co"
  ];

  const allDomains = Array.from(new Set([...domains, ...prodDomains]));

  for (const domain of allDomains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => {
    const userData = user as any;
    console.log("[AUTH-SERIALIZE] Serializing user:", userData.email);
    console.log("[AUTH-SERIALIZE] User data:", {
      id: userData.id,
      email: userData.email,
      expires_at: userData.expires_at,
      has_refresh_token: !!userData.refresh_token,
      has_access_token: !!userData.access_token
    });

    // Only serialize the user ID - tokens will be stored separately in session
    cb(null, userData.id);
  });

  passport.deserializeUser(async (sessionData: any, cb) => {
    console.log("[AUTH-DESERIALIZE] Deserializing session data:", typeof sessionData);

    try {
      let userId: string;
      let legacyAuthData: any = null;

      // Handle both old format (full user object) and new format (just user ID)
      if (typeof sessionData === 'string') {
        // New format: just the user ID
        userId = sessionData;
        console.log("[AUTH-DESERIALIZE] Using new format - User ID:", userId);
      } else if (sessionData && typeof sessionData === 'object' && sessionData.id) {
        // Old format: full user object was serialized
        userId = sessionData.id;
        legacyAuthData = sessionData;
        console.log("[AUTH-DESERIALIZE] Migrating from old format - User ID:", userId);
        console.log("[AUTH-DESERIALIZE] Legacy auth data available:", {
          hasAccessToken: !!sessionData.access_token,
          hasRefreshToken: !!sessionData.refresh_token,
          hasExpiresAt: !!sessionData.expires_at
        });
      } else {
        console.error("[AUTH-DESERIALIZE] Invalid session data format:", sessionData);
        return cb(new Error("Invalid session data"), null);
      }

      // Fetch the user from storage
      let dbUser = await storage.getUser(userId);

      if (!dbUser) {
        // Check if this is a dev auto-login user
        if (userId.startsWith('test-user-')) {
          console.log("[AUTH-DESERIALIZE] Dev auto-login user not found, creating:", userId);

          // Extract email from user ID or use default
          const userEmail = 'dev@staffflow.test';

          try {
            dbUser = await storage.upsertUser({
              id: userId,
              email: userEmail,
              firstName: "Dev",
              lastName: "User",
              profileImageUrl: ""
            });
            console.log("[AUTH-DESERIALIZE] Dev user created successfully:", userEmail);
          } catch (err) {
            console.error("[AUTH-DESERIALIZE] Failed to create dev user:", err);
            return cb(new Error("Failed to create dev user"), null);
          }
        } else {
          // Only create user if we have sufficient data from legacy session
          const claims = legacyAuthData?.claims;
          const userEmail = claims?.email || legacyAuthData?.email;

          if (!userEmail) {
            // No email available - can't create a valid user record
            console.error("[AUTH-DESERIALIZE] User not found and no email available to create user:", userId);
            console.log("[AUTH-DESERIALIZE] Forcing re-login due to insufficient data");
            return cb(new Error("Session expired - please login again"), null);
          }

          console.log("[AUTH-DESERIALIZE] User not found in database, creating:", userId, userEmail);

          const firstName = claims?.first_name || "";
          const lastName = claims?.last_name || "";
          const fullName = `${firstName} ${lastName}`.trim() || userEmail.split("@")[0];

          try {
            dbUser = await storage.upsertUser({
              id: userId,
              email: userEmail,
              firstName: firstName || fullName.split(" ")[0],
              lastName: lastName || fullName.split(" ").slice(1).join(" "),
              profileImageUrl: claims?.profile_image_url || ""
            });
            console.log("[AUTH-DESERIALIZE] User created successfully:", userEmail);
          } catch (err) {
            console.error("[AUTH-DESERIALIZE] Failed to create user:", err);
            return cb(new Error("Failed to create user"), null);
          }
        }
      }

      // Reconstruct the user object
      const user = {
        id: dbUser.id,
        email: dbUser.email,
        claims: {
          sub: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
          profile_image_url: dbUser.profileImageUrl
        },
        // For legacy sessions, preserve the auth tokens temporarily
        // They will be moved to session.authTokens in the middleware
        access_token: legacyAuthData?.access_token || null,
        refresh_token: legacyAuthData?.refresh_token || null,
        expires_at: legacyAuthData?.expires_at || null
      };

      console.log("[AUTH-DESERIALIZE] Successfully reconstructed user:", user.email);
      cb(null, user);
    } catch (error) {
      console.error("[AUTH-DESERIALIZE] Error deserializing user:", error);
      cb(error as Error, null);
    }
  });

  app.get("/api/login", (req, res, next) => {
    console.log(`[AUTH] Login attempt from hostname: ${req.hostname}`);

    // Check if strategy exists for this hostname
    const strategyName = `replitauth:${req.hostname}`;
    if (!(passport as any)._strategies[strategyName]) {
      console.error(`[AUTH] No strategy registered for hostname: ${req.hostname}`);
      console.error(`[AUTH] Available strategies:`, Object.keys((passport as any)._strategies));
      return res.status(500).json({ 
        error: "Authentication not configured for this domain",
        hostname: req.hostname 
      });
    }

    passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, (err: Error | null, user: Express.User | false) => {
      if (err) {
        if (err.message === "DOMAIN_NOT_ALLOWED") {
          return res.redirect("/?error=domain_not_allowed");
        }
        return res.redirect("/api/login");
      }

      if (!user) {
        return res.redirect("/api/login");
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("[AUTH] Login error:", loginErr);
          return res.redirect("/api/login");
        }

        // Store auth tokens in session
        const userData = user as any;
        req.session.authTokens = {
          access_token: userData.access_token,
          refresh_token: userData.refresh_token,
          expires_at: userData.expires_at
        };

        console.log("[AUTH-CALLBACK] Storing auth tokens in session:", {
          has_access_token: !!userData.access_token,
          has_refresh_token: !!userData.refresh_token,
          expires_at: userData.expires_at
        });

        // Explicitly save the session to ensure it's persisted to PostgreSQL
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("[AUTH] Session save error:", saveErr);
            return res.redirect("/api/login");
          }
          console.log("[AUTH] Session saved successfully for user:", userData.email);
          console.log("[AUTH] Session ID:", req.sessionID?.substring(0, 8) + "...");
          return res.redirect("/");
        });
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // In development, auto-login with a test user
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUTH-MIDDLEWARE] DEV AUTO-LOGIN: Using test user: dev@staffflow.test');

    // Create a mock authenticated request
    (req as any).user = {
      claims: {
        sub: 'test-user-dev-staffflow-test',
        email: 'dev@staffflow.test',
        name: 'Dev User',
        first_name: 'Dev',
        last_name: 'User'
      }
    };

    (req as any).isAuthenticated = () => true;

    // Ensure user exists in database
    storage.getUser('test-user-dev-staffflow-test')
      .then(user => {
        if (!user) {
          // Use upsertUser for consistency, as it handles both creation and updates
          return storage.upsertUser({
            id: 'test-user-dev-staffflow-test',
            email: 'dev@staffflow.test',
            firstName: 'Dev',
            lastName: 'User',
            profileImageUrl: '' // Add default or empty value
          });
        }
        return user;
      })
      .then(() => {
        console.log('[AUTH-MIDDLEWARE] DEV AUTO-LOGIN: User created/updated in database');
        next();
      })
      .catch(err => {
        console.error('[AUTH-MIDDLEWARE] DEV AUTO-LOGIN ERROR:', err);
        // Even if user creation fails, proceed to next() in dev to avoid blocking development
        next();
      });

    return;
  }

  // Production authentication check
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    next();
  } else {
    console.log("[AUTH-MIDDLEWARE] UNAUTHORIZED: User not authenticated in production.");
    res.status(401).json({ message: 'Unauthorized' });
  }
};