import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { 
  insertCandidateSchema, 
  csvCandidateSchema,
  csvCandidateRowSchema,
  insertStaffSchema, 
  compliancePayloadSchema, 
  insertScreeningLinkSchema,
  insertScreeningResponseSchema,
  insertOnboardingSubmissionSchema,
  insertPhotoIdUploadSchema,
  insertMeetingAttendanceSchema,
  insertMaintenanceRequestSchema,
  insertContractorSchema,
  insertOrderingSupplierSchema,
  insertOrderingProductSchema,
  insertOrderingOrderSchema,
  insertOrderingOrderItemSchema,
  insertOrderingStockMovementSchema,
  insertAstBuildingSchema,
  insertAstApartmentSchema,
  insertAstPropertySchema,
  insertAstTenancySchema,
  insertAstContractSchema,
  insertAstRentPaymentSchema,
  insertLandlordSchema,
  insertMonthlyStatementSchema,
  insertTaskTemplateSchema,
  insertDailyTaskInstanceSchema,
  insertLinenOrderScheduleSchema,
  insertCleaningOrderScheduleSchema,
  insertCleaningOrderSchema,
  insertCriticalInfoSchema,
  insertCleaningRateSchema,
  insertTrainingVideoSchema,
  insertTrainingCompletionSchema,
  insertManualCleaningAdjustmentSchema,
  insertKnowledgeBaseEntrySchema,
  insertLinenPackingListSchema,
  insertWeeklyRotaTaskSchema,
  insertScheduleTimetableSchema,
  insertCleanerScheduleAcceptanceSchema,
  insertPotentialClientSchema,
  insertClientContactSchema,
  insertClientPropertySchema,
  insertClientPipelineStageSchema,
  insertClientStageHistorySchema,
  insertClientMeetingSchema,
  updateClientMeetingOutcomeSchema,
  insertClientFollowUpSchema,
  insertClientCommunicationSchema,
  type CSVCandidate,
  type CSVCandidateRow,
  type MasterAnalytics
} from "@shared/schema";
import * as schema from "@shared/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { z } from "zod";
import { createGroupMeeting } from "./calendar";
import { createGroupMeetingDualCalendar } from "./calendar-dual";
import { scheduleGroupMeetingForCandidates } from "./automation";
import { autoScheduleCandidateForMeeting } from "./meeting-scheduler";
import { autoAssignTrialShifts } from "./trial-shift-matcher";
import crypto from "crypto";
import Papa from "papaparse";
import { examineSheetStructure, getStaffFromSheet, getAvailabilityFromSheet } from "./google-sheets";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { sendAdminAvailabilityReminder, sendScreeningLink, sendRentPaymentReceipt, sendMaintenanceLandlordEmail, sendLandlordInviteEmail, sendGenericEmail } from "./email";
import { sendAvailabilitySMS, sendScreeningLinkSMS, sendMaintenanceGuestNotificationSMS, sendMaintenanceStaffSMS, sendGenericSMS } from "./twilio";
import { initiateCall, sendSMS } from "./justcall";
import { format, parseISO, addDays } from "date-fns";
import { sendCandidateCommunication, sendScreeningPassedEmail, sendScreeningFailedEmail, sendHiredEmail, sendMeetingScheduledEmail, getDefaultTemplates } from "./communication-service";
import { processHelpdeskMessage } from "./services/helpdesk-assistant";
import { ActivityLogger } from "./activity-logger";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { astContractStorage } from "./object-storage";
import { parseProperlyCSV } from './services/properly-parser';
import { allocateCleaner, BUILDING_RULES, getAllocationStats, adjustPreferencesFromHistory } from './services/properly-allocation';
import { parseProperlyDamageEmail } from './services/properly-email-parser';
import { 
  helpdeskRateLimiter, 
  publicChatRateLimiter, 
  cleaningStaffRateLimiter, 
  managementRateLimiter,
  guestSupportRateLimiter,
  tenantCommunicationRateLimiter,
  generalAIRateLimiter 
} from './rate-limiter';
import { 
  validateChatMessage, 
  sanitizeAIResponse, 
  sanitizeEmailContent, 
  sanitizeSMSContent,
  logSecurityEvent,
  handleSecurityMonitoring 
} from './chat-security';

// Compliance weights constant (totaling 17.0 with availability tracking)
const COMPLIANCE_WEIGHTS: Record<string, number> = {
  "Arrived on time": 1.5,
  "Signed into property on time": 1.0,
  "Taken all photos and completed all tasks on Properly": 2.0,
  "Ensured all damage is reported on time": 2.0,
  "Used correct staff entrance at Head Office (not front reception doors)": 0.5,
  "Signed in a trolley at start and signed out a trolley at end of shift": 1.0,
  "Signed in cleaning caddy with all items; signed cleaning caddy back in and returned all items": 1.0,
  "Used the chatbot every time linen was packed": 1.5,
  "Did not miss any special requests in the chatbot": 1.5,
  "Placed used linen in the linen hampers (not left in pillowcases/on the floor)": 1.0,
  "Finished cleans on time; if they overran, they told us": 2.0,
  "Submitted availability on time": 1.0
};

// In-memory conversation histories for cleaning staff assistant chatbot
const conversationHistories: Record<string, Array<{ role: string; content: string }>> = {};

// Helper function to escape CSV values
function escapeCSV(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  await setupAuth(app);

  // TASK 19: Initialize default onboarding checklist templates on startup
  try {
    await storage.initializeDefaultOnboardingTemplates();
    console.log("[Startup] Onboarding checklist templates initialized");
  } catch (error) {
    console.error("[Startup] Failed to initialize onboarding templates:", error);
  }

  // TASK 10: Initialize default badges on startup
  try {
    await storage.initializeDefaultBadges();
    console.log("[Startup] Default badges initialized");
  } catch (error) {
    console.error("[Startup] Failed to initialize badges:", error);
  }

  // Initialize cleaner building preferences on startup
  try {
    await storage.initializeCleanerBuildingPreferences();
    console.log("[Startup] Cleaner building preferences initialized");
  } catch (error) {
    console.error("[Startup] Failed to initialize cleaner building preferences:", error);
  }

  // Initialize default inspection templates on startup
  try {
    await storage.initializeDefaultInspectionTemplates();
    console.log("[Startup] Inspection templates initialized");
  } catch (error) {
    console.error("[Startup] Failed to initialize inspection templates:", error);
  }

  // Initialize linen stock task templates on startup
  try {
    await storage.initializeLinenStockTaskTemplates();
    console.log("[Startup] Linen stock task templates initialized");
  } catch (error) {
    console.error("[Startup] Failed to initialize linen stock task templates:", error);
  }

  // Initialize linen products for Head Office stock tracking
  try {
    await storage.initializeLinenProducts();
    console.log("[Startup] Linen products initialized");
  } catch (error) {
    console.error("[Startup] Failed to initialize linen products:", error);
  }

  // Debug auth state - no authentication required
  app.get('/api/auth/debug', (req: any, res) => {
    const isAuth = req.isAuthenticated();
    const sessionId = req.sessionID;
    const user = req.user;
    
    res.json({
      isAuthenticated: isAuth,
      sessionId: sessionId ? sessionId.substring(0, 8) + '...' : null,
      hasUser: !!user,
      userEmail: user?.claims?.email || null,
      userId: user?.claims?.sub || null,
      sessionCookie: !!req.session
    });
  });

  // Auth route - get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      let user = await storage.getUser(userId);
      
      // If user doesn't exist in storage yet, create a basic user object
      if (!user) {
        user = {
          id: userId,
          email: email,
          firstName: req.user.claims.first_name || "Dev",
          lastName: req.user.claims.last_name || "User",
          role: "admin",
          createdAt: new Date()
        };
      }
      
      // Ensure email is included in response
      if (!user.email && email) {
        user.email = email;
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout route - use GET from Replit auth
  app.post('/api/auth/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Logged out successfully" });
    });
  });

  // ===== LANDLORD AUTH ROUTES =====
  const { 
    hashPassword, 
    verifyPassword, 
    generateLandlordToken, 
    requireLandlordAuth,
    generateResetToken
  } = await import('./landlord-auth');

  // Landlord login
  app.post('/api/landlord-auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Find landlord by email
      const landlord = await storage.getLandlordByEmail(email);
      
      if (!landlord) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Check if landlord has a password set
      if (!landlord.password) {
        return res.status(401).json({ error: 'Account not activated. Please contact support.' });
      }
      
      // Verify password
      const isValid = await verifyPassword(password, landlord.password);
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Generate JWT token
      const token = generateLandlordToken(landlord.id, landlord.email);
      
      // Set HTTP-only cookie
      res.cookie('landlord_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
      
      // Update last login (skip if storage method doesn't exist yet)
      try {
        await storage.updateLandlordLastLogin(landlord.id);
      } catch (e) {
        console.log('[Landlord Auth] Last login update not available yet');
      }
      
      res.json({
        success: true,
        landlord: {
          id: landlord.id,
          name: landlord.name,
          email: landlord.email,
        },
      });
    } catch (error) {
      console.error('Landlord login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Get current landlord
  app.get('/api/landlord-auth/me', requireLandlordAuth, async (req: any, res) => {
    try {
      const landlordId = req.landlord.landlordId;
      const landlord = await storage.getLandlordById(landlordId);
      
      if (!landlord) {
        return res.status(404).json({ error: 'Landlord not found' });
      }
      
      // Return safe landlord data (exclude sensitive fields)
      res.json({
        id: landlord.id,
        name: landlord.name,
        email: landlord.email,
        phone: landlord.phone,
        address: landlord.address,
        statementDay: landlord.statementDay,
      });
    } catch (error) {
      console.error('Get landlord error:', error);
      res.status(500).json({ error: 'Failed to fetch landlord data' });
    }
  });

  // Landlord logout
  app.post('/api/landlord-auth/logout', (req, res) => {
    res.clearCookie('landlord_token');
    res.json({ success: true });
  });

  // Set password for landlord (admin only - from staff portal)
  app.post('/api/landlord-auth/set-password', isAuthenticated, async (req, res) => {
    try {
      const { landlordId, password } = req.body;
      
      if (!landlordId || !password) {
        return res.status(400).json({ error: 'Landlord ID and password are required' });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Update landlord password
      await storage.updateLandlordPassword(landlordId, hashedPassword);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Set password error:', error);
      res.status(500).json({ error: 'Failed to set password' });
    }
  });

  // Setup password for landlord (public route - via email invitation token)
  app.post('/api/landlord-auth/setup-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      
      // Get landlord by reset token
      const landlord = await storage.getLandlordByResetToken(token);
      
      if (!landlord) {
        return res.status(400).json({ error: 'Invalid or expired invitation link' });
      }
      
      // Check if token has expired (48 hours)
      if (landlord.resetTokenExpiry && new Date() > new Date(landlord.resetTokenExpiry)) {
        return res.status(400).json({ error: 'Invitation link has expired. Please request a new invitation.' });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Update landlord password
      await storage.updateLandlordPassword(landlord.id, hashedPassword);
      
      // Clear reset token
      await storage.clearLandlordResetToken(landlord.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Setup password error:', error);
      res.status(500).json({ error: 'Failed to setup password' });
    }
  });

  // ===== LANDLORD PORTAL DATA ROUTES =====

  // Get landlord's properties
  app.get('/api/landlord/properties', requireLandlordAuth, async (req: any, res) => {
    try {
      const landlordId = req.landlord.landlordId;
      const properties = await storage.getPropertiesByLandlord(landlordId);
      res.json(properties);
    } catch (error) {
      console.error('Get landlord properties error:', error);
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  });

  // Get landlord's maintenance requests
  app.get('/api/landlord/maintenance', requireLandlordAuth, async (req: any, res) => {
    try {
      const landlordId = req.landlord.landlordId;
      const requests = await storage.getMaintenanceRequestsByLandlord(landlordId);
      res.json(requests);
    } catch (error) {
      console.error('Get landlord maintenance error:', error);
      res.status(500).json({ error: 'Failed to fetch maintenance requests' });
    }
  });

  // Get landlord's financial statements
  app.get('/api/landlord/statements', requireLandlordAuth, async (req: any, res) => {
    try {
      const landlordId = req.landlord.landlordId;
      const statements = await storage.getLandlordStatements(landlordId);
      res.json(statements);
    } catch (error) {
      console.error('Get landlord statements error:', error);
      res.status(500).json({ error: 'Failed to fetch statements' });
    }
  });

  // Get landlord's management contracts
  app.get('/api/landlord/contracts', requireLandlordAuth, async (req: any, res) => {
    try {
      const landlordId = req.landlord.landlordId;
      const contracts = await storage.getManagementContractsByLandlord(landlordId);
      res.json(contracts);
    } catch (error) {
      console.error('Get landlord contracts error:', error);
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  // Client Pipeline Routes
  app.get("/api/potential-clients", isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getPotentialClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching potential clients:", error);
      res.status(500).json({ error: "Failed to fetch potential clients" });
    }
  });

  app.post("/api/potential-clients", isAuthenticated, async (req, res) => {
    try {
      const clientData = insertPotentialClientSchema.parse(req.body);
      const client = await storage.createPotentialClient(clientData);
      res.json(client);
    } catch (error) {
      console.error("Error creating potential client:", error);
      res.status(500).json({ error: "Failed to create potential client" });
    }
  });

  app.patch("/api/potential-clients/:id/stage", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { currentStage } = req.body;
      
      const client = await storage.updatePotentialClientStage(id, currentStage);
      
      if (!client) {
        return res.status(404).json({ error: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error updating client stage:", error);
      res.status(500).json({ error: "Failed to update client stage" });
    }
  });

  app.get("/api/potential-clients/:id/meetings", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const meetings = await storage.getClientMeetings(id);
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching client meetings:", error);
      res.status(500).json({ error: "Failed to fetch client meetings" });
    }
  });

  app.post("/api/potential-clients/:id/meetings", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const meetingData = req.body;
      const meeting = await storage.createClientMeeting({
        ...meetingData,
        clientId: id,
      });
      res.json(meeting);
    } catch (error) {
      console.error("Error creating client meeting:", error);
      res.status(500).json({ error: "Failed to create client meeting" });
    }
  });

  // QuickBooks removed to fix production database issues

  // Public route for attendance marking via token (no auth required for quick access)
  app.post("/api/meetings/attendance-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { attendedCandidateIds } = req.body;

      // Get meeting by attendance token
      const meeting = await storage.getGroupMeetingByAttendanceToken(token);
      if (!meeting) {
        return res.status(404).json({ error: "Invalid attendance token" });
      }

      // Check if meeting has already been completed
      if (meeting.status === 'completed') {
        return res.status(400).json({ error: "Attendance has already been marked for this meeting" });
      }

      // Validate candidate IDs
      if (!Array.isArray(attendedCandidateIds) || attendedCandidateIds.length === 0) {
        return res.status(400).json({ error: "Please provide candidate IDs who attended" });
      }

      // Filter only valid candidate IDs that belong to this meeting
      const validCandidateIds = attendedCandidateIds.filter(candidateId => 
        meeting.candidateIds.includes(candidateId)
      );

      if (validCandidateIds.length === 0) {
        return res.status(400).json({ 
          error: "No valid candidate IDs provided for this meeting" 
        });
      }

      // Mark attendance for all attended candidates
      const attendanceRecords = [];
      const candidatesToOnboard = [];

      for (const candidateId of validCandidateIds) {
        const candidate = await storage.getCandidate(candidateId);
        if (!candidate) continue;

        // Create or update attendance record
        const existingAttendance = await storage.getMeetingAttendanceByMeeting(meeting.id);
        const existing = existingAttendance.find(a => a.candidateId === candidateId);

        if (existing) {
          await storage.updateMeetingAttendance(existing.id, {
            attended: true,
            wantsToProceed: true,
          });
        } else {
          await storage.createMeetingAttendance({
            meetingId: meeting.id,
            candidateId,
            attended: true,
            wantsToProceed: true,
            markedBy: 'attendance-token',
          });
        }

        // Update candidate status
        await storage.updateCandidate(candidateId, {
          status: "attended",
          meetingAttended: true,
        });

        // Add to stage history
        await storage.addCandidateStageHistory({
          candidateId,
          fromStatus: candidate.status,
          toStatus: "attended",
          changedBy: "system",
          note: "Marked as attended via attendance token",
        });

        attendanceRecords.push(candidateId);

        // Prepare for onboarding SMS
        if (candidate.phone) {
          // Generate onboarding token for this candidate
          const onboardingToken = crypto.randomUUID();
          
          // Create onboarding submission record
          await storage.createOnboardingSubmission({
            candidateId,
            onboardingToken,
            fullName: `${candidate.firstName} ${candidate.lastName}`,
            email: candidate.email,
            phone: candidate.phone,
            niNumber: "", // To be filled by candidate
            sentAt: new Date(),
          });

          candidatesToOnboard.push({
            id: candidateId,
            name: `${candidate.firstName} ${candidate.lastName}`,
            phone: candidate.phone,
            onboardingToken,
          });
        }
      }

      // Update meeting status
      await storage.updateGroupMeeting(meeting.id, {
        status: "completed",
        attendeeCount: validCandidateIds.length,
      });

      // Send bulk onboarding SMS to all attended candidates
      let onboardingSmsResult = { success: true, sent: [], failed: [] };
      if (candidatesToOnboard.length > 0) {
        const { sendBulkOnboardingLinks } = await import("./twilio");
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://css-operations-hub.replit.app' 
          : 'http://localhost:5000';
        
        onboardingSmsResult = await sendBulkOnboardingLinks(candidatesToOnboard, baseUrl);
        
        // Update onboarding link sent status
        for (const candidateId of onboardingSmsResult.sent) {
          const attendanceRecords = await storage.getMeetingAttendanceByMeeting(meeting.id);
          const record = attendanceRecords.find(a => a.candidateId === candidateId);
          if (record) {
            await storage.updateMeetingAttendance(record.id, {
              onboardingLinkSent: true,
            });
          }
        }
      }

      res.json({
        success: true,
        meeting: {
          id: meeting.id,
          roleType: meeting.roleType,
          scheduledAt: meeting.scheduledAt,
        },
        attendanceMarked: attendanceRecords.length,
        onboardingSmsSent: onboardingSmsResult.sent.length,
        onboardingSmsFailed: onboardingSmsResult.failed.length,
        message: `Successfully marked attendance for ${attendanceRecords.length} candidates. Onboarding SMS sent to ${onboardingSmsResult.sent.length} candidates.`,
      });

    } catch (error) {
      console.error("Error marking attendance via token:", error);
      res.status(500).json({ error: "Failed to mark attendance" });
    }
  });

  // Protected routes below - all require authentication
  
  // Get all candidates
  app.get("/api/candidates", isAuthenticated, async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch candidates" });
    }
  });

  // Get CSV template
  app.get("/api/candidates/template", isAuthenticated, async (req, res) => {
    try {
      const csvTemplate = "First Name,Last Name,Email,Phone,Role Type";
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="candidate-upload-template.csv"');
      res.send(csvTemplate);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Get single candidate
  app.get("/api/candidates/:id", isAuthenticated, async (req, res) => {
    try {
      const candidate = await storage.getCandidate(req.params.id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch candidate" });
    }
  });

  // Upload and process CSV candidates with validation and duplicate detection
  app.post("/api/candidates/upload", isAuthenticated, async (req, res) => {
    try {
      const { candidates: csvCandidates } = req.body;
      
      if (!Array.isArray(csvCandidates) || csvCandidates.length === 0) {
        return res.status(400).json({ 
          error: "Invalid request: candidates array is required and must not be empty" 
        });
      }

      // Get screening settings
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(500).json({ error: "Settings not configured" });
      }

      // Arrays to track results
      const duplicates: string[] = [];
      const errors: Array<{ row: number, message: string }> = [];
      const validCandidatesToImport: Array<CSVCandidate & { rowNumber: number }> = [];
      const seenEmailsInBatch = new Set<string>();

      // Validate each row and check for duplicates
      for (let i = 0; i < csvCandidates.length; i++) {
        const rowNumber = i + 2; // +2 because row 1 is header, and array is 0-indexed
        const row = csvCandidates[i];

        try {
          // Validate row with enhanced schema
          const validated = csvCandidateRowSchema.parse(row);
          
          const emailLower = validated.email.toLowerCase();
          
          // Check for duplicates within the batch first
          if (seenEmailsInBatch.has(emailLower)) {
            duplicates.push(`${validated.email} (${validated.firstName} ${validated.lastName}) - Duplicate within upload batch`);
          } else {
            // Check if candidate already exists by email (case-insensitive)
            const existingCandidate = await storage.getCandidateByEmail(validated.email);
            
            if (existingCandidate) {
              duplicates.push(`${validated.email} (${validated.firstName} ${validated.lastName})`);
            } else {
              // Valid and unique - add to batch tracking and import list
              seenEmailsInBatch.add(emailLower);
              validCandidatesToImport.push({
                ...validated,
                rowNumber
              });
            }
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            const firstError = error.errors[0];
            errors.push({
              row: rowNumber,
              message: firstError.message
            });
          } else {
            errors.push({
              row: rowNumber,
              message: "Unknown validation error"
            });
          }
        }
      }

      // If there are validation errors, return them without importing
      if (errors.length > 0) {
        return res.json({
          imported: 0,
          duplicates,
          errors,
          message: `Validation failed: ${errors.length} error(s), ${duplicates.length} duplicate(s)`
        });
      }

      // Import valid candidates
      let imported = 0;
      let linksSent = 0;

      for (const csvCandidate of validCandidatesToImport) {
        try {
          // Create candidate record
          const candidate = await storage.createCandidate({
            firstName: csvCandidate.firstName,
            lastName: csvCandidate.lastName,
            email: csvCandidate.email,
            phone: csvCandidate.phone || "",
            roleType: csvCandidate.roleType,
            screeningAnswers: csvCandidate.screeningAnswers || {},
            status: "uploaded",
          });

          imported++;

          // Add initial stage history for bulk upload
          await storage.addCandidateStageHistory({
            candidateId: candidate.id,
            fromStatus: null,
            toStatus: "uploaded",
            changedBy: "csv_upload",
            note: `Bulk uploaded from CSV (row ${csvCandidate.rowNumber})`
          });
          
          // AUTO-SCREENING: Immediately move to screened status
          // This bypasses the need for candidates to click links
          const autoScreened = await storage.updateCandidate(candidate.id, {
            status: "screened",
          });

          // Add stage history for auto-screening
          await storage.addCandidateStageHistory({
            candidateId: candidate.id,
            fromStatus: "uploaded",
            toStatus: "screened", 
            changedBy: "system",
            note: "Auto-screened after bulk upload"
          });
          
          console.log(`[AUTO-SCREEN] Candidate ${candidate.firstName} ${candidate.lastName} automatically screened`);

          // Generate screening token and create screening link
          const screeningToken = crypto.randomUUID();
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 14); // 14 days from now

          await storage.createScreeningLink({
            candidateId: candidate.id,
            screeningToken,
            roleType: csvCandidate.roleType,
            sentVia: csvCandidate.phone ? "both" : "email",
            sentAt: new Date(),
            expiresAt,
          });

          // Build screening URL - use correct production domain
          const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://staff-flow-harry391.replit.app'
            : (process.env.VITE_DOMAIN || 'https://staff-flow-harry391.replit.app');
          const screeningUrl = `${baseUrl}/screening/${screeningToken}`;

          // Format applied date for anti-scam message
          const appliedDate = format(new Date(), 'dd/MM/yyyy');

          // Send email
          const emailResult = await sendScreeningLink(
            candidate.email,
            `${candidate.firstName} ${candidate.lastName}`,
            csvCandidate.roleType.charAt(0).toUpperCase() + csvCandidate.roleType.slice(1),
            screeningUrl,
            appliedDate
          );

          // Send SMS if phone number provided
          if (csvCandidate.phone) {
            await sendScreeningLinkSMS(
              csvCandidate.phone,
              csvCandidate.roleType.charAt(0).toUpperCase() + csvCandidate.roleType.slice(1),
              screeningUrl,
              appliedDate
            );
          }

          if (emailResult.success) {
            linksSent++;
          }
        } catch (error) {
          console.error(`Error importing candidate at row ${csvCandidate.rowNumber}:`, error);
          errors.push({
            row: csvCandidate.rowNumber,
            message: "Failed to import candidate"
          });
        }
      }

      res.json({ 
        imported,
        duplicates,
        errors,
        linksSent,
        message: `${imported} candidate(s) imported, ${linksSent} screening link(s) sent${duplicates.length > 0 ? `, ${duplicates.length} duplicate(s) skipped` : ''}`
      });
    } catch (error) {
      console.error("CSV upload error:", error);
      res.status(500).json({ 
        error: "Internal server error during CSV processing",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Manually add a single candidate
  app.post("/api/candidates/manual", isAuthenticated, async (req, res) => {
    try {
      const { firstName, lastName, email, phone, roleType, source, notes } = req.body;

      // Validate required fields
      if (!firstName || !lastName || !email || !roleType) {
        return res.status(400).json({
          error: "First name, last name, email, and role type are required"
        });
      }

      // Validate role type
      if (!["driver", "non-driver"].includes(roleType)) {
        return res.status(400).json({
          error: "Role type must be 'driver' or 'non-driver'"
        });
      }

      // Check for duplicate email
      const existingCandidates = await storage.getCandidates();
      const duplicate = existingCandidates.find(c => c.email.toLowerCase() === email.toLowerCase());
      
      if (duplicate) {
        return res.status(400).json({
          error: "A candidate with this email already exists in the system"
        });
      }

      // Create the candidate
      const candidate = await storage.createCandidate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        roleType,
        source: source || "other",
        notes: notes?.trim() || null,
        screeningAnswers: {},
        status: "uploaded"
      });

      console.log(`[Manual Add] Created candidate with ID: ${candidate.id}, email: ${email}`);

      // Add stage history entry
      try {
        const historyEntry = await storage.addCandidateStageHistory({
          candidateId: candidate.id,
          fromStatus: null,
          toStatus: "uploaded",
          changedBy: (req as any).user?.id || "manual_entry",
          note: `Manually added via form${notes ? `: ${notes}` : ""}`
        });
        console.log(`[Manual Add] Added stage history for candidate ${candidate.id}:`, historyEntry);
      } catch (historyError) {
        console.error(`[Manual Add] Failed to add stage history for candidate ${candidate.id}:`, historyError);
        // Don't fail the entire request if history fails
      }

      // Return the candidate in uploaded status (no auto-screening or auto-scheduling)
      // Manual candidates should behave the same as bulk uploads from Indeed
      res.json({
        success: true,
        candidate: candidate,
        message: "Candidate added successfully"
      });
    } catch (error) {
      console.error("Error adding candidate manually:", error);
      res.status(500).json({
        error: "Failed to add candidate. Please try again."
      });
    }
  });

  // Update candidate status
  app.patch("/api/candidates/:id", isAuthenticated, async (req, res) => {
    try {
      const updates = req.body;
      const candidate = await storage.updateCandidate(req.params.id, updates);
      
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // TASK 10: Auto-assign trial shifts if candidate was just hired
      if (updates.status === "hired" && candidate.status === "hired") {
        const trialShiftResult = await autoAssignTrialShifts(candidate);
        
        if (!trialShiftResult.success) {
          console.error(`[Candidate Status Update] Failed to auto-assign trial shifts: ${trialShiftResult.error}`);
          // Don't fail the update - the candidate is still hired, just needs manual scheduling
        }
        
        // TASK 19: Initialize onboarding checklist when candidate is hired
        try {
          await storage.initializeOnboardingChecklist(req.params.id);
        } catch (checklistError) {
          console.error(`[Candidate Status Update] Failed to initialize onboarding checklist: ${checklistError}`);
          // Don't fail the update - checklist can be initialized manually
        }
      }

      res.json(candidate);
    } catch (error) {
      res.status(500).json({ error: "Failed to update candidate" });
    }
  });

  // Update candidate status with history tracking (enhanced for drag-and-drop)
  app.patch("/api/candidates/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      const candidateId = req.params.id;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      // Get current candidate to track fromStatus
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      const fromStatus = candidate.status;
      
      // Validation: Cannot move to "scheduled" without a meeting scheduled
      if (status === "scheduled" && fromStatus === "screened") {
        // Check if candidate has a meeting scheduled
        const meetings = await storage.getGroupMeetings();
        const hasMeeting = meetings.some(meeting => 
          meeting.candidateIds.includes(candidateId) && 
          meeting.status === "scheduled"
        );
        
        if (!hasMeeting) {
          return res.status(400).json({ 
            error: "Cannot move to 'Scheduled' stage without scheduling an interview. Please use the 'Schedule Interview' button to select a date and time first.",
            requiresAction: "schedule_meeting"
          });
        }
      }
      
      // Update status
      const updatedCandidate = await storage.updateCandidate(candidateId, { status });
      
      // Record history
      await storage.addCandidateStageHistory({
        candidateId,
        fromStatus,
        toStatus: status,
        changedBy: req.user?.id || "system",
      });
      
      // Auto-assign trial shifts if candidate was just hired
      if (status === "hired") {
        const trialShiftResult = await autoAssignTrialShifts(updatedCandidate!);
        
        if (!trialShiftResult.success) {
          console.error(`[Status Update] Failed to auto-assign trial shifts: ${trialShiftResult.error}`);
        }
        
        // TASK 19: Initialize onboarding checklist when candidate is hired
        try {
          await storage.initializeOnboardingChecklist(candidateId);
        } catch (checklistError) {
          console.error(`[Status Update] Failed to initialize onboarding checklist: ${checklistError}`);
        }
      }
      
      res.json({ success: true, candidate: updatedCandidate });
    } catch (error) {
      console.error("Error updating candidate status:", error);
      res.status(500).json({ error: "Failed to update candidate status" });
    }
  });

  // Add note to candidate
  app.post("/api/candidates/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const { note } = req.body;
      const candidateId = req.params.id;
      
      if (!note || !note.trim()) {
        return res.status(400).json({ error: "Note is required" });
      }
      
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      // Append note to existing notes with timestamp
      const timestamp = new Date().toLocaleString('en-GB', { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      });
      const updatedNotes = candidate.notes 
        ? `${candidate.notes}\n\n---\n[${timestamp}]\n${note.trim()}` 
        : `[${timestamp}]\n${note.trim()}`;
      
      const updatedCandidate = await storage.updateCandidate(candidateId, { notes: updatedNotes });
      
      res.json({ success: true, candidate: updatedCandidate });
    } catch (error) {
      console.error("Error adding note:", error);
      res.status(500).json({ error: "Failed to add note" });
    }
  });

  // Get candidate stage history
  app.get("/api/candidates/:id/history", isAuthenticated, async (req, res) => {
    try {
      const candidateId = req.params.id;
      console.log(`[History API] Fetching history for candidate ID: ${candidateId}`);
      
      const history = await storage.getCandidateStageHistory(candidateId);
      console.log(`[History API] Found ${history.length} history entries for candidate ${candidateId}`);
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching candidate history:", error);
      res.status(500).json({ error: "Failed to fetch candidate history" });
    }
  });

  // Get all group meetings
  app.get("/api/group-meetings", isAuthenticated, async (req, res) => {
    try {
      const meetings = await storage.getGroupMeetings();
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  });

  // Create group meeting
  app.post("/api/group-meetings", isAuthenticated, async (req, res) => {
    try {
      const meetingData = req.body;
      const meeting = await storage.createGroupMeeting(meetingData);
      
      // Generate attendance token for the meeting
      if (meeting.id) {
        const token = await storage.generateAttendanceTokenForMeeting(meeting.id);
        meeting.attendanceToken = token;
      }
      
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ error: "Failed to create meeting" });
    }
  });

  // Cancel group meeting
  app.patch("/api/group-meetings/:id/cancel", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const meeting = await storage.updateGroupMeeting(id, { status: "cancelled" });
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error) {
      console.error("Error canceling meeting:", error);
      res.status(500).json({ error: "Failed to cancel meeting" });
    }
  });

  // Reschedule group meeting
  app.patch("/api/group-meetings/:id/reschedule", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { scheduledAt } = req.body;
      
      if (!scheduledAt) {
        return res.status(400).json({ error: "scheduledAt is required" });
      }
      
      const meeting = await storage.updateGroupMeeting(id, { 
        scheduledAt: new Date(scheduledAt)
      });
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error) {
      console.error("Error rescheduling meeting:", error);
      res.status(500).json({ error: "Failed to reschedule meeting" });
    }
  });

  // Archive group meeting
  app.patch("/api/group-meetings/:id/archive", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const meeting = await storage.updateGroupMeeting(id, { status: "archived" });
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error) {
      console.error("Error archiving meeting:", error);
      res.status(500).json({ error: "Failed to archive meeting" });
    }
  });

  // Delete group meeting
  app.delete("/api/group-meetings/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteGroupMeeting(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      res.status(500).json({ error: "Failed to delete meeting" });
    }
  });

  // Mark attendance for group meeting
  app.patch("/api/group-meetings/:id/attendance", isAuthenticated, async (req, res) => {
    // Declare variables outside try block so they're accessible in catch for rollback
    let successfullyUpdatedIds: string[] = [];
    let candidateStates: Map<string, { status: string; meetingAttended: boolean }> = new Map();
    
    try {
      const { id } = req.params;
      const { attendedCandidateIds } = req.body;

      if (!Array.isArray(attendedCandidateIds)) {
        return res.status(400).json({ error: "attendedCandidateIds must be an array" });
      }

      const meeting = await storage.getGroupMeeting(id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const validCandidateIds = attendedCandidateIds.filter(candidateId => 
        meeting.candidateIds.includes(candidateId)
      );

      if (validCandidateIds.length === 0) {
        return res.status(400).json({ 
          error: "No valid candidate IDs provided. All submitted IDs must belong to this meeting." 
        });
      }

      // PHASE 1: VALIDATION - Fetch all candidate records to verify they exist
      const candidateRecords = await Promise.all(
        validCandidateIds.map(id => storage.getCandidate(id))
      );

      const missingCandidateIds: string[] = [];

      validCandidateIds.forEach((candidateId, index) => {
        const candidate = candidateRecords[index];
        if (!candidate) {
          missingCandidateIds.push(candidateId);
        } else {
          candidateStates.set(candidateId, {
            status: candidate.status,
            meetingAttended: candidate.meetingAttended || false,
          });
        }
      });

      if (missingCandidateIds.length > 0) {
        return res.status(400).json({
          error: `Cannot mark attendance: ${missingCandidateIds.length} candidate(s) not found`,
          missingCandidateIds
        });
      }

      // PHASE 2: ATOMIC UPDATES - Update all candidates and track failures
      const failedIds: string[] = [];

      try {
        for (const candidateId of validCandidateIds) {
          const updated = await storage.updateCandidate(candidateId, {
            status: "attended",
            meetingAttended: true,
          });
          
          if (updated) {
            successfullyUpdatedIds.push(candidateId);
          } else {
            failedIds.push(candidateId);
          }
        }
      } catch (error) {
        // Exception occurred - rollback all successful updates
        console.error("Exception during attendance update. Rolling back...", error);
        
        for (const candidateId of successfullyUpdatedIds) {
          const originalState = candidateStates.get(candidateId);
          if (originalState) {
            await storage.updateCandidate(candidateId, {
              status: originalState.status,
              meetingAttended: originalState.meetingAttended ?? false,
            });
          }
        }
        
        throw error; // Re-throw to outer catch
      }

      // If ANY update failed, rollback all successful updates
      if (failedIds.length > 0) {
        console.error(`Attendance update failed for ${failedIds.length} candidate(s). Rolling back...`);
        
        for (const candidateId of successfullyUpdatedIds) {
          const originalState = candidateStates.get(candidateId);
          if (originalState) {
            await storage.updateCandidate(candidateId, {
              status: originalState.status,
              meetingAttended: originalState.meetingAttended ?? false,
            });
          }
        }

        return res.status(500).json({
          error: `Failed to update ${failedIds.length} candidate(s). All changes have been rolled back.`,
          failedCandidateIds: failedIds
        });
      }

      // All updates succeeded - complete the meeting
      const updatedMeeting = await storage.updateGroupMeeting(id, {
        status: "completed",
      });

      if (!updatedMeeting) {
        // Rollback all candidate updates
        console.error("Failed to complete meeting. Rolling back candidate updates...");
        
        for (const candidateId of successfullyUpdatedIds) {
          const originalState = candidateStates.get(candidateId);
          if (originalState) {
            await storage.updateCandidate(candidateId, {
              status: originalState.status,
              meetingAttended: originalState.meetingAttended ?? false,
            });
          }
        }
        
        return res.status(500).json({ error: "Failed to complete meeting. All changes rolled back." });
      }

      res.json({
        success: true,
        attendedCount: successfullyUpdatedIds.length,
        meeting: updatedMeeting,
      });
    } catch (error) {
      // Rollback ALL successfully updated candidates
      for (const candidateId of successfullyUpdatedIds) {
        const originalState = candidateStates.get(candidateId);
        if (originalState) {
          await storage.updateCandidate(candidateId, {
            status: originalState.status,
            meetingAttended: originalState.meetingAttended ?? false,
          });
        }
      }
      
      console.error("Error in attendance endpoint:", error);
      res.status(500).json({ error: "Failed to process attendance" });
    }
  });

  // Schedule group meeting with Google Calendar
  app.post("/api/group-meetings/schedule-with-calendar", isAuthenticated, async (req, res) => {
    try {
      const { roleType, scheduledAt, candidateIds } = req.body;

      if (!roleType || !scheduledAt || !candidateIds || !Array.isArray(candidateIds)) {
        return res.status(400).json({ 
          error: "Missing required fields: roleType, scheduledAt, candidateIds" 
        });
      }

      const startDateTime = new Date(scheduledAt);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const candidatesData = await Promise.all(
        candidateIds.map(id => storage.getCandidate(id))
      );

      const validCandidates = candidatesData.filter(c => c !== undefined);
      
      if (validCandidates.length === 0) {
        return res.status(400).json({ error: "No valid candidates found" });
      }

      const attendeeEmails = validCandidates.map(c => c!.email);
      const candidateNames = validCandidates.map(c => `${c!.firstName} ${c!.lastName}`);

      const calendarResult = await createGroupMeeting({
        title: `Northstay - Group Interview: ${candidateNames.slice(0, 3).join(', ')}`,
        startDateTime,
        endDateTime,
        attendeeEmails,
        candidateNames,
      });

      if (!calendarResult.success) {
        return res.status(500).json({ 
          error: calendarResult.error || "Failed to create calendar event" 
        });
      }

      const meeting = await storage.createGroupMeeting({
        roleType,
        scheduledAt: startDateTime,
        googleCalendarEventId: calendarResult.eventId,
        googleCalendarMeetingLink: calendarResult.meetingLink,
        candidateIds,
        maxCapacity: 10,
        status: "scheduled",
      });

      // Generate attendance token for the meeting
      if (meeting.id) {
        const token = await storage.generateAttendanceTokenForMeeting(meeting.id);
        meeting.attendanceToken = token;
      }

      for (const candidateId of candidateIds) {
        await storage.updateCandidate(candidateId, {
          status: "scheduled",
          meetingScheduledAt: startDateTime,
        });
      }

      res.json({
        success: true,
        meeting,
        calendarEvent: {
          eventId: calendarResult.eventId,
          meetingLink: calendarResult.meetingLink,
        },
        candidatesScheduled: candidateIds.length,
        attendanceLink: meeting.attendanceToken 
          ? `${req.protocol}://${req.get('host')}/api/meetings/attendance-token/${meeting.attendanceToken}`
          : undefined,
      });
    } catch (error) {
      console.error("Error scheduling group meeting:", error);
      res.status(500).json({ 
        error: "Failed to schedule group meeting",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Schedule individual meeting for a candidate
  app.post("/api/candidates/:candidateId/schedule-meeting", isAuthenticated, async (req, res) => {
    try {
      const { candidateId } = req.params;
      const { 
        meetingType, 
        date, 
        time, 
        duration, 
        location, 
        notes, 
        sendCalendarInvite 
      } = req.body;

      // Validate required fields
      if (!date || !time) {
        return res.status(400).json({ 
          error: "Date and time are required" 
        });
      }

      // Get candidate
      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // Check if candidate is in the right status
      if (candidate.status !== "screened") {
        return res.status(400).json({ 
          error: "Only screened candidates can be scheduled for interviews" 
        });
      }

      // Combine date and time into a single DateTime
      const startDateTime = new Date(`${date}T${time}:00`);
      const durationMs = (duration || 60) * 60 * 1000;
      const endDateTime = new Date(startDateTime.getTime() + durationMs);

      let calendarResult = { success: false, eventId: undefined, meetingLink: undefined };

      // Create calendar event if requested
      if (sendCalendarInvite) {
        const candidateName = `${candidate.firstName} ${candidate.lastName}`;
        const roleTypeCapitalized = candidate.roleType === "driver" ? "Driver" : "Non-Driver";
        
        calendarResult = await createGroupMeeting({
          title: `Interview - ${candidateName} (${roleTypeCapitalized})`,
          startDateTime,
          endDateTime,
          attendeeEmails: [candidate.email],
          candidateNames: [candidateName],
        });

        if (!calendarResult.success) {
          console.warn("Failed to create calendar event:", calendarResult.error);
          // Continue even if calendar creation fails
        }
      }

      // Create or update group meeting for individual interview
      const meeting = await storage.createGroupMeeting({
        roleType: candidate.roleType,
        scheduledAt: startDateTime,
        googleCalendarEventId: calendarResult.eventId,
        googleCalendarMeetingLink: calendarResult.meetingLink,
        candidateIds: [candidateId],
        maxCapacity: 1,
        status: "scheduled",
      });

      // Generate attendance token for the meeting
      if (meeting.id) {
        const token = await storage.generateAttendanceTokenForMeeting(meeting.id);
        meeting.attendanceToken = token;
      }

      // Create confirmation token for the candidate
      const confirmationToken = crypto.randomUUID();
      if (meeting.id) {
        await storage.createMeetingConfirmation({
          meetingId: meeting.id,
          candidateId,
          token: confirmationToken,
        });
      }

      // Update candidate status
      await storage.updateCandidate(candidateId, {
        status: "scheduled",
        meetingScheduledAt: startDateTime,
      });

      // Send confirmation email to candidate
      if (sendCalendarInvite && calendarResult.meetingLink) {
        try {
          const meetingDateFormatted = format(startDateTime, "EEEE, MMMM d, yyyy 'at' h:mm a");
          const confirmationLink = `${process.env.REPLIT_DEV_DOMAIN || 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co'}/meeting-confirm/${confirmationToken}`;
          
          await sendMeetingScheduledEmail(
            candidateId,
            meetingDateFormatted,
            calendarResult.meetingLink,
            confirmationLink
          );
        } catch (emailError) {
          console.error("Failed to send meeting confirmation email:", emailError);
          // Don't fail the request if email fails
        }
      }

      res.json({
        success: true,
        meeting,
        candidate: {
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          status: "scheduled",
        },
        calendarEvent: calendarResult.success ? {
          eventId: calendarResult.eventId,
          meetingLink: calendarResult.meetingLink,
        } : null,
      });
    } catch (error) {
      console.error("Error scheduling individual meeting:", error);
      res.status(500).json({ 
        error: "Failed to schedule meeting",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get all meeting attendance records
  app.get("/api/meeting-attendance", isAuthenticated, async (req, res) => {
    try {
      const meetingId = req.query.meetingId as string | undefined;
      let attendanceRecords;
      
      if (meetingId) {
        attendanceRecords = await storage.getMeetingAttendanceByMeeting(meetingId);
      } else {
        // Get all attendance records
        const allAttendance = await Promise.all(
          (await storage.getGroupMeetings()).map(async (meeting) => {
            return await storage.getMeetingAttendanceByMeeting(meeting.id);
          })
        );
        attendanceRecords = allAttendance.flat();
      }
      
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ error: "Failed to fetch attendance records" });
    }
  });

  // Save meeting attendance with enhanced tracking
  app.post("/api/meetings/:meetingId/attendance", isAuthenticated, async (req, res) => {
    try {
      const { meetingId } = req.params;
      const { attendanceData } = req.body;

      if (!Array.isArray(attendanceData)) {
        return res.status(400).json({ error: "attendanceData must be an array" });
      }

      const meeting = await storage.getGroupMeeting(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      let updatedCount = 0;

      for (const data of attendanceData) {
        const { candidateId, attended, wantsToProceed, onboardingLinkSent } = data;

        // Check if attendance record exists
        const existingAttendance = await storage.getMeetingAttendanceByMeeting(meetingId);
        const existing = existingAttendance.find(a => a.candidateId === candidateId);

        const wantsToProceedValue = wantsToProceed === 'yes' ? true : 
                                   wantsToProceed === 'no' ? false : null;

        if (existing) {
          // Update existing record
          await storage.updateMeetingAttendance(existing.id, {
            attended,
            wantsToProceed: wantsToProceedValue,
            onboardingLinkSent: onboardingLinkSent || false,
          });
        } else {
          // Create new record
          await storage.createMeetingAttendance({
            meetingId,
            candidateId,
            attended,
            wantsToProceed: wantsToProceedValue,
            onboardingLinkSent: onboardingLinkSent || false,
          });
        }

        // Update candidate status if they attended
        if (attended) {
          await storage.updateCandidate(candidateId, {
            status: "attended",
            meetingAttended: true,
          });
        }

        updatedCount++;
      }

      res.json({
        success: true,
        updatedCount,
        message: `Updated attendance for ${updatedCount} candidate(s)`,
      });
    } catch (error) {
      console.error("Error saving attendance:", error);
      res.status(500).json({ error: "Failed to save attendance" });
    }
  });

  // Get meeting confirmation details by token (PUBLIC endpoint)
  app.get("/api/public/meeting-confirm/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const confirmation = await storage.getMeetingConfirmationByToken(token);
      if (!confirmation) {
        return res.status(404).json({ error: "Confirmation not found or invalid token" });
      }

      const meeting = await storage.getGroupMeeting(confirmation.meetingId);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const candidate = await storage.getCandidate(confirmation.candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      res.json({
        confirmation,
        meeting,
        candidate: {
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
        }
      });
    } catch (error) {
      console.error("Error fetching meeting confirmation:", error);
      res.status(500).json({ error: "Failed to fetch confirmation details" });
    }
  });

  // Confirm meeting attendance by token (PUBLIC endpoint)
  app.post("/api/public/meeting-confirm/:token/confirm", async (req, res) => {
    try {
      const { token } = req.params;
      
      const existingConfirmation = await storage.getMeetingConfirmationByToken(token);
      if (!existingConfirmation) {
        return res.status(404).json({ error: "Confirmation not found or invalid token" });
      }

      if (existingConfirmation.confirmed) {
        return res.status(400).json({ 
          error: "This meeting has already been confirmed",
          confirmedAt: existingConfirmation.confirmedAt 
        });
      }

      const confirmation = await storage.confirmMeetingByToken(token);
      
      res.json({
        success: true,
        confirmation,
        message: "Your attendance has been confirmed successfully!"
      });
    } catch (error) {
      console.error("Error confirming meeting:", error);
      res.status(500).json({ error: "Failed to confirm meeting" });
    }
  });

  // Send onboarding link to candidate
  app.post("/api/onboarding/send-link", isAuthenticated, async (req, res) => {
    try {
      const { candidateId } = req.body;

      const candidate = await storage.getCandidate(candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }

      // Generate onboarding token
      const onboardingToken = crypto.randomUUID();
      const onboardingUrl = `${process.env.VITE_DOMAIN || 'https://automated-recruiting-pipeline.replit.app'}/onboarding/${onboardingToken}`;

      // Create onboarding submission record
      const onboardingSubmission = await storage.createOnboardingSubmission({
        candidateId: candidate.id,
        onboardingToken,
        fullName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        phone: candidate.phone || '',
        niNumber: '',
        sentAt: new Date(),
      });

      const candidateName = `${candidate.firstName} ${candidate.lastName}`;

      // Send via email and SMS if phone available
      let sentVia = 'email';
      
      try {
        const { sendOnboardingForm } = await import('./email');
        await sendOnboardingForm(candidate.email, candidateName, onboardingUrl);
        
        if (candidate.phone) {
          const { sendOnboardingLinkSMS } = await import('./twilio');
          await sendOnboardingLinkSMS(candidate.phone, candidateName, onboardingUrl);
          sentVia = 'both';
        }
      } catch (error) {
        console.error('Error sending onboarding link:', error);
        // Continue even if email/SMS fails
      }

      // Update meeting attendance record to mark onboarding link as sent
      const attendanceRecords = await storage.getMeetingAttendanceByCandidate(candidateId);
      if (attendanceRecords.length > 0) {
        const latestAttendance = attendanceRecords[0];
        await storage.updateMeetingAttendance(latestAttendance.id, {
          onboardingLinkSent: true,
        });
      }

      res.json({
        success: true,
        candidateName,
        sentVia,
        onboardingUrl,
      });
    } catch (error) {
      console.error("Error sending onboarding link:", error);
      res.status(500).json({ error: "Failed to send onboarding link" });
    }
  });

  // Get all trial shifts
  app.get("/api/trial-shifts", isAuthenticated, async (req, res) => {
    try {
      const shifts = await storage.getTrialShifts();
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trial shifts" });
    }
  });

  // Create trial shift
  app.post("/api/trial-shifts", isAuthenticated, async (req, res) => {
    try {
      const shiftData = req.body;
      const shift = await storage.createTrialShift(shiftData);
      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Failed to create trial shift" });
    }
  });

  // Update trial shift status
  app.patch("/api/trial-shifts/:id", isAuthenticated, async (req, res) => {
    try {
      const updates = req.body;
      const shift = await storage.updateTrialShift(req.params.id, updates);
      
      if (!shift) {
        return res.status(404).json({ error: "Trial shift not found" });
      }

      res.json(shift);
    } catch (error) {
      res.status(500).json({ error: "Failed to update trial shift" });
    }
  });

  // Get hiring settings
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings) {
        console.error("No settings found in database");
        return res.status(404).json({ error: "Settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update hiring active status
  app.patch("/api/settings/hiring-active", isAuthenticated, async (req, res) => {
    try {
      const { active } = req.body;
      const settings = await storage.updateSettings({ hiringActive: active });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // Update screening questions
  app.patch("/api/settings/screening-questions", isAuthenticated, async (req, res) => {
    try {
      const { roleType, questions } = req.body;
      
      if (!roleType || !["driver", "non-driver"].includes(roleType)) {
        return res.status(400).json({ error: "Invalid role type" });
      }
      
      if (!Array.isArray(questions)) {
        return res.status(400).json({ error: "Questions must be an array" });
      }
      
      // Validate each question has the required fields
      for (const q of questions) {
        if (!q.id || !q.prompt || !q.type || q.weight === undefined || q.required === undefined) {
          return res.status(400).json({ error: "Invalid question format" });
        }
        
        if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
          return res.status(400).json({ error: "Multiple choice questions must have at least 2 options" });
        }
      }
      
      const updates = roleType === "driver"
        ? { driverScreeningQuestions: questions }
        : { nonDriverScreeningQuestions: questions };

      const settings = await storage.updateSettings(updates);
      res.json(settings);
    } catch (error) {
      console.error("Update screening questions error:", error);
      res.status(500).json({ error: "Failed to update screening questions" });
    }
  });

  // Update onboarding form URL
  app.patch("/api/settings/onboarding-form-url", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      const settings = await storage.updateSettings({ onboardingFormUrl: url });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update onboarding form URL" });
    }
  });
  
  // Update passing scores
  app.patch("/api/settings/passing-scores", isAuthenticated, async (req, res) => {
    try {
      const { passingScoreDriver, passingScoreNonDriver } = req.body;
      
      const updates: any = {};
      if (passingScoreDriver !== undefined) {
        updates.passingScoreDriver = Math.max(0, Math.min(100, parseInt(passingScoreDriver)));
      }
      if (passingScoreNonDriver !== undefined) {
        updates.passingScoreNonDriver = Math.max(0, Math.min(100, parseInt(passingScoreNonDriver)));
      }
      
      const settings = await storage.updateSettings(updates);
      res.json(settings);
    } catch (error) {
      console.error("Update passing scores error:", error);
      res.status(500).json({ error: "Failed to update passing scores" });
    }
  });

  // Update communication templates
  app.patch("/api/settings/communication-templates", isAuthenticated, async (req, res) => {
    try {
      const { templates } = req.body;
      const settings = await storage.updateSettings({ communicationTemplates: templates });
      res.json(settings);
    } catch (error) {
      console.error("Update communication templates error:", error);
      res.status(500).json({ error: "Failed to update communication templates" });
    }
  });

  // Update interview schedule settings
  app.patch("/api/settings/interview-schedule", isAuthenticated, async (req, res) => {
    try {
      const {
        recurringMeetingEnabled,
        recurringMeetingDay,
        recurringMeetingTime,
        recurringMeetingDuration,
        minNoticePeriodHours,
        meetingLocation,
      } = req.body;

      // Validate time format (HH:MM)
      if (recurringMeetingTime && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(recurringMeetingTime)) {
        return res.status(400).json({ error: "Invalid time format. Use HH:MM (24-hour format)" });
      }

      // Validate reasonable hours (8 AM - 8 PM)
      if (recurringMeetingTime) {
        const [hours] = recurringMeetingTime.split(':').map(Number);
        if (hours < 8 || hours > 20) {
          return res.status(400).json({ error: "Interview time must be between 8 AM and 8 PM" });
        }
      }

      // Validate day of week (0-6)
      if (recurringMeetingDay !== undefined && (recurringMeetingDay < 0 || recurringMeetingDay > 6)) {
        return res.status(400).json({ error: "Invalid day of week. Must be 0-6 (Sunday-Saturday)" });
      }

      // Build update object only with provided fields
      const updates: any = {};
      if (recurringMeetingEnabled !== undefined) updates.recurringMeetingEnabled = recurringMeetingEnabled;
      if (recurringMeetingDay !== undefined) updates.recurringMeetingDay = recurringMeetingDay;
      if (recurringMeetingTime !== undefined) updates.recurringMeetingTime = recurringMeetingTime;
      if (recurringMeetingDuration !== undefined) updates.recurringMeetingDuration = recurringMeetingDuration;
      if (minNoticePeriodHours !== undefined) updates.minNoticePeriodHours = minNoticePeriodHours;
      if (meetingLocation !== undefined) updates.meetingLocation = meetingLocation;

      console.log("Updating interview schedule with:", updates);
      const settings = await storage.updateSettings(updates);
      console.log("Updated settings:", {
        recurringMeetingEnabled: settings.recurringMeetingEnabled,
        recurringMeetingDay: settings.recurringMeetingDay,
        recurringMeetingTime: settings.recurringMeetingTime,
        recurringMeetingDuration: settings.recurringMeetingDuration,
        minNoticePeriodHours: settings.minNoticePeriodHours,
        meetingLocation: settings.meetingLocation,
      });

      res.json(settings);
    } catch (error) {
      console.error("Failed to update interview schedule:", error);
      res.status(500).json({ error: "Failed to update interview schedule settings" });
    }
  });

  // Get default communication templates
  app.get("/api/settings/communication-templates/defaults", isAuthenticated, async (req, res) => {
    try {
      const defaults = await getDefaultTemplates();
      res.json(defaults);
    } catch (error) {
      res.status(500).json({ error: "Failed to get default templates" });
    }
  });

  // Get communication logs
  app.get("/api/communication-logs", isAuthenticated, async (req, res) => {
    try {
      const { candidateId, status, limit, offset } = req.query;
      const logs = await storage.getCommunicationLogs({
        candidateId: candidateId as string | undefined,
        status: status as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });
      res.json(logs);
    } catch (error) {
      console.error("Get communication logs error:", error);
      res.status(500).json({ error: "Failed to fetch communication logs" });
    }
  });

  // Test send communication template
  app.post("/api/communication-logs/test-send", isAuthenticated, async (req, res) => {
    try {
      const { candidateId, templateKey, extraData } = req.body;
      
      if (!candidateId || !templateKey) {
        return res.status(400).json({ error: "candidateId and templateKey are required" });
      }
      
      const result = await sendCandidateCommunication(candidateId, templateKey, extraData);
      res.json(result);
    } catch (error) {
      console.error("Test send error:", error);
      res.status(500).json({ error: "Failed to send test communication" });
    }
  });

  // Automation: Schedule screened candidates for group meeting
  app.post("/api/automation/schedule-screened-candidates", isAuthenticated, async (req, res) => {
    try {
      const { roleType } = req.body;

      if (!roleType || !["driver", "non-driver"].includes(roleType)) {
        return res.status(400).json({ 
          error: "Invalid roleType. Must be 'driver' or 'non-driver'" 
        });
      }

      const screenedCandidates = await storage.getScreenedCandidatesByRoleType(roleType);

      if (screenedCandidates.length === 0) {
        return res.status(404).json({ 
          error: `No screened ${roleType} candidates found`,
          candidatesFound: 0
        });
      }

      const candidateIds = screenedCandidates.map(c => c.id);

      const result = await scheduleGroupMeetingForCandidates(candidateIds, roleType);

      if (!result.success) {
        return res.status(500).json({ 
          error: result.error || "Failed to schedule group meeting" 
        });
      }

      res.json({
        success: true,
        message: `Successfully scheduled ${result.meeting?.candidateCount} ${roleType} candidates`,
        meeting: result.meeting,
      });
    } catch (error) {
      console.error("Error in automation endpoint:", error);
      res.status(500).json({ 
        error: "Failed to schedule screened candidates",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Staff management routes
  
  // Get all staff
  app.get("/api/staff", isAuthenticated, async (req, res) => {
    try {
      const allStaff = await storage.getAllStaff();
      res.json(allStaff);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  // Get all active staff (for dropdowns/selectors)
  app.get("/api/staff/active", isAuthenticated, async (req, res) => {
    try {
      const activeStaff = await storage.getActiveStaff();
      res.json(activeStaff);
    } catch (error) {
      console.error("Error fetching active staff:", error);
      res.status(500).json({ error: "Failed to fetch staff" });
    }
  });

  // Get current user's staff record
  app.get('/api/staff/me', isAuthenticated, async (req: any, res) => {
    try {
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      
      // Check if user is an admin (exists in adminStaff table)
      const adminStaff = await storage.getAdminStaffByEmail(req.user.claims.email);
      const isAdmin = !!adminStaff;
      
      // Return a valid response even if no staff record exists
      // This allows frontend to gracefully handle missing records
      if (!staff) {
        return res.json({ 
          id: null,
          isAdmin,
          email: req.user.claims.email,
          name: req.user.claims.name || null,
          // No other staff data available
        });
      }
      
      // Return staff record with isAdmin flag
      res.json({
        ...staff,
        isAdmin
      });
    } catch (error) {
      console.error("Error fetching current staff:", error);
      res.status(500).json({ error: "Failed to fetch staff information" });
    }
  });

  // Staff onboarding form submission
  app.post("/api/staff/onboarding", isAuthenticated, async (req, res) => {
    try {
      const { fullName, phone, email, niNumber, photoIdLink, unavailableDays } = req.body;

      // Validate required fields
      if (!fullName || !phone || !email) {
        return res.status(400).json({ error: "Full name, phone, and email are required" });
      }

      // Create staff record
      const staffData: InsertStaff = {
        fullName,
        phone,
        email,
        niNumber: niNumber || null,
        photoUrl: photoIdLink || null,
        roleType: "non-driver", // Default to non-driver for onboarding
        status: "active",
        hireDate: new Date().toISOString().split('T')[0], // Today's date
      };

      const newStaff = await storage.createStaff(staffData);

      // Create availability records for unavailable days
      if (unavailableDays && Array.isArray(unavailableDays) && unavailableDays.length > 0) {
        for (const date of unavailableDays) {
          await storage.createAvailability({
            staffId: newStaff.id,
            date,
            available: false,
            notes: "Set during onboarding",
          });
        }
      }

      res.json({
        success: true,
        staff: newStaff,
        unavailableDaysSet: unavailableDays?.length || 0,
      });
    } catch (error) {
      console.error("Onboarding error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to process onboarding", details: errorMessage });
    }
  });

  // Check for duplicate staff email
  app.post("/api/staff/check-duplicate", isAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const existingStaff = await storage.getStaffByEmail(email);
      
      if (existingStaff) {
        return res.json({
          isDuplicate: true,
          message: "A staff member with this email address already exists",
          existingStaff: {
            id: existingStaff.id,
            fullName: existingStaff.fullName,
            email: existingStaff.email,
            roleType: existingStaff.roleType,
            status: existingStaff.status
          }
        });
      }
      
      res.json({ isDuplicate: false });
    } catch (error) {
      console.error("Error checking duplicate staff:", error);
      res.status(500).json({ error: "Failed to check for duplicates" });
    }
  });

  // Create staff
  app.post("/api/staff", isAuthenticated, async (req, res) => {
    try {
      // Clean up the data before validation
      const cleanedData = {
        ...req.body,
        hireDate: req.body.hireDate === "" || req.body.hireDate === undefined ? null : req.body.hireDate
      };
      
      const validatedData = insertStaffSchema.parse(cleanedData);
      
      // Check for duplicate email
      const existingStaff = await storage.getStaffByEmail(validatedData.email);
      if (existingStaff) {
        return res.status(400).json({
          error: "Duplicate email",
          message: "A staff member with this email address already exists"
        });
      }
      
      const newStaff = await storage.createStaff(validatedData);
      res.json(newStaff);
    } catch (error) {
      console.error("Create staff error:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ error: "Invalid staff data", details: error.errors });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to create staff", details: errorMessage });
    }
  });

  // Bulk upload staff from CSV
  app.post("/api/staff/bulk-upload", isAuthenticated, async (req, res) => {
    try {
      const { staffData } = req.body;
      
      if (!Array.isArray(staffData) || staffData.length === 0) {
        return res.status(400).json({ error: "Invalid staff data array" });
      }

      let created = 0;
      let updated = 0;
      let errors: Array<{ row: number; error: string }> = [];

      for (let i = 0; i < staffData.length; i++) {
        try {
          const row = staffData[i];
          
          // Check if staff exists by email
          const existingStaff = await storage.getStaffByEmail(row.email);
          
          if (existingStaff) {
            // Update existing staff
            await storage.updateStaff(existingStaff.id, row);
            updated++;
          } else {
            // Create new staff
            const validatedData = insertStaffSchema.parse(row);
            await storage.createStaff(validatedData);
            created++;
          }
        } catch (error) {
          errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.json({
        success: true,
        created,
        updated,
        total: staffData.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error("Bulk upload error:", error);
      res.status(500).json({ error: "Failed to bulk upload staff" });
    }
  });

  // Update staff
  app.patch("/api/staff/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Clean up the data before updating
      const cleanedData = {
        ...req.body,
        hireDate: req.body.hireDate === "" || req.body.hireDate === undefined ? null : req.body.hireDate,
        dateOfBirth: req.body.dateOfBirth === "" || req.body.dateOfBirth === undefined ? null : req.body.dateOfBirth
      };
      
      const updatedStaff = await storage.updateStaff(id, cleanedData);
      res.json(updatedStaff);
    } catch (error) {
      console.error("Update staff error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: "Failed to update staff", details: errorMessage });
    }
  });

  // Delete staff
  app.delete("/api/staff/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteStaff(id);
      res.json({ success: true, message: "Staff member deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete staff" });
    }
  });

  // Delete candidate 
  app.delete("/api/candidates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      await storage.deleteCandidate(id);
      res.json({ success: true, message: "Candidate deleted successfully" });
    } catch (error) {
      console.error("Delete candidate error:", error);
      res.status(500).json({ error: "Failed to delete candidate" });
    }
  });

  // Get compliance history for staff member
  app.get("/api/staff/:id/compliance", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const events = await storage.getComplianceEventsByStaff(id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch compliance events" });
    }
  });

  // Get staff leaderboard (authenticated)
  app.get("/api/staff/leaderboard", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getStaffLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Get staff leaderboard (public - no auth required for TV display and public view)
  app.get("/api/staff/leaderboard/public", async (req, res) => {
    try {
      const leaderboard = await storage.getStaffLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  // Get detailed staff profile with metrics
  app.get("/api/staff/:id/profile", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.getStaffWithMetrics(req.params.id);
      if (!profile) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Get staff profile error:", error);
      res.status(500).json({ error: "Failed to fetch staff profile" });
    }
  });

  // Update staff profile
  app.patch("/api/staff/:id/profile", isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateStaffProfile(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update staff profile error:", error);
      res.status(500).json({ error: "Failed to update staff profile" });
    }
  });

  // Get compliance trend data (for charts)
  app.get("/api/staff/:id/compliance-trends", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getComplianceEventsByStaff(req.params.id);
      
      // Group by week for trend chart
      const weeklyData = events.reduce((acc, event) => {
        const weekStart = event.weekStart;
        if (!acc[weekStart]) {
          acc[weekStart] = { weekStart, totalPoints: 0, count: 0 };
        }
        acc[weekStart].totalPoints += event.points;
        acc[weekStart].count++;
        return acc;
      }, {} as Record<string, any>);
      
      const trends = Object.values(weeklyData)
        .map((week: any) => ({
          weekStart: week.weekStart,
          avgScore: week.totalPoints / week.count,
          totalEvents: week.count,
        }))
        .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime())
        .slice(-12); // Last 12 weeks
      
      res.json(trends);
    } catch (error) {
      console.error("Get compliance trends error:", error);
      res.status(500).json({ error: "Failed to fetch compliance trends" });
    }
  });

  // Get all compliance events with optional filters
  app.get("/api/compliance/events", isAuthenticated, async (req, res) => {
    try {
      const { staffId, startDate, endDate } = req.query;
      
      const filters: { staffId?: string; startDate?: string; endDate?: string } = {};
      
      if (staffId && typeof staffId === 'string') {
        filters.staffId = staffId;
      }
      
      if (startDate && typeof startDate === 'string') {
        filters.startDate = startDate;
      }
      
      if (endDate && typeof endDate === 'string') {
        filters.endDate = endDate;
      }
      
      const events = await storage.getComplianceEvents(filters);
      
      // Enrich events with staff names
      const enrichedEvents = await Promise.all(
        events.map(async (event) => {
          const staffMember = await storage.getStaff(event.staffId);
          return {
            ...event,
            staffName: staffMember?.fullName || 'Unknown',
          };
        })
      );
      
      res.json(enrichedEvents);
    } catch (error) {
      console.error("Get compliance events error:", error);
      res.status(500).json({ error: "Failed to fetch compliance events" });
    }
  });

  // In-app compliance submission endpoint
  app.post("/api/compliance", isAuthenticated, async (req, res) => {
    try {
      // Validate request body exists and is valid JSON
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const { staffId, date, property, checks, notes, auditor } = req.body;

      if (!staffId || !date || !checks) {
        return res.status(400).json({ error: "Missing required fields: staffId, date, checks" });
      }

      // Parse date to ISO format
      let eventDate: string;
      if (date.includes("/")) {
        const [day, month, year] = date.split("/");
        eventDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      } else {
        eventDate = date.split("T")[0];
      }

      // Calculate week_start (Monday of that week)
      const dateObj = new Date(eventDate);
      const dayOfWeek = dateObj.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(dateObj);
      monday.setDate(dateObj.getDate() + diff);
      const weekStart = monday.toISOString().split("T")[0];

      // Calculate score
      let points = 0;
      for (const [question, answer] of Object.entries(checks)) {
        if (typeof answer === "string" && answer.toLowerCase() === "yes") {
          const weight = COMPLIANCE_WEIGHTS[question];
          if (weight !== undefined) {
            points += weight;
          }
        }
      }

      // Get staff details for event creation
      const staffMember = await storage.getStaff(staffId);
      if (!staffMember) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      // Generate deterministic eventId
      const source = "Compliance";
      const formResponseId = crypto.randomUUID();
      const hashInput = `${source}|${staffId}|${eventDate}|${formResponseId}`;
      const eventId = crypto.createHash("sha1").update(hashInput).digest("hex");

      // Check for duplicate eventId
      const existingEvent = await storage.getComplianceEventById(eventId);
      if (existingEvent) {
        return res.json({
          status: "duplicate",
          event_id: eventId,
          points,
          max_points: 15.0,
        });
      }

      // Create compliance event
      const reason = Object.entries(checks)
        .filter(([_, answer]) => typeof answer === "string" && answer.toLowerCase() === "yes")
        .map(([question]) => question)
        .join("; ");

      const complianceEvent = await storage.createComplianceEvent({
        eventId,
        eventDate,
        weekStart,
        source,
        property: property || "1 Example Street",
        staffId,
        points,
        maxPoints: 15.0,
        reason: reason || "No checks completed",
        rawPayload: {
          src: source,
          event_date: eventDate,
          staff_member: staffMember.fullName,
          staff_id_resolved: staffId,
          property: property || "1 Example Street",
          checks,
          weights: COMPLIANCE_WEIGHTS,
          notes: notes || "",
          form_response_id: formResponseId,
          auditor: auditor || "In-app submission",
        },
        createdByZap: "In-App_Submission",
        linkKey: `${source}|${eventDate}|${staffId}`,
      });

      res.json({
        status: "ok",
        event_id: eventId,
        points,
        max_points: 15.0,
      });
    } catch (error) {
      console.error("In-app compliance submission error:", error);
      res.status(500).json({ error: "Failed to submit compliance check" });
    }
  });

  // Prize settings endpoints
  app.get("/api/prize-settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getPrizeSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch prize settings" });
    }
  });

  app.patch("/api/prize-settings", isAuthenticated, async (req, res) => {
    try {
      const { firstPlacePrize, secondPlacePrize, thirdPlacePrize } = req.body;
      const updates: any = {};
      if (firstPlacePrize) updates.firstPlacePrize = firstPlacePrize;
      if (secondPlacePrize) updates.secondPlacePrize = secondPlacePrize;
      if (thirdPlacePrize) updates.thirdPlacePrize = thirdPlacePrize;

      const settings = await storage.updatePrizeSettings(updates);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update prize settings" });
    }
  });

  // System settings endpoints
  app.get("/api/system-settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system settings" });
    }
  });

  app.put("/api/system-settings", isAuthenticated, async (req, res) => {
    try {
      const { directBookingLink, officePhone } = req.body;
      const updates: any = {};
      if (directBookingLink !== undefined) updates.directBookingLink = directBookingLink;
      if (officePhone !== undefined) updates.officePhone = officePhone;

      const settings = await storage.updateSystemSettings(updates);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update system settings" });
    }
  });

  // Send monthly rankings SMS
  app.post("/api/send-monthly-rankings", isAuthenticated, async (req, res) => {
    try {
      const { sendMonthlyRankingSMS } = await import("./sms");
      const leaderboard = await storage.getStaffLeaderboard();
      const prizeSettings = await storage.getPrizeSettings();

      const prizes = {
        first: prizeSettings.firstPlacePrize,
        second: prizeSettings.secondPlacePrize,
        third: prizeSettings.thirdPlacePrize,
      };

      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        const rank = i + 1;
        
        try {
          await sendMonthlyRankingSMS(
            entry.staff,
            rank,
            entry.avgScore,
            leaderboard.length,
            prizes
          );
          sentCount++;
        } catch (error) {
          console.error(`Failed to send SMS to ${entry.staff.fullName}:`, error);
          failedCount++;
        }
      }

      res.json({
        success: true,
        sentCount,
        failedCount,
        totalStaff: leaderboard.length,
      });
    } catch (error) {
      console.error("Error sending monthly rankings:", error);
      res.status(500).json({ error: "Failed to send monthly rankings" });
    }
  });

  // TASK 10: Badge and Enhanced Leaderboard Routes
  
  // Get enhanced leaderboard with badges
  app.get("/api/staff/leaderboard/enhanced", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getEnhancedLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      console.error("Get enhanced leaderboard error:", error);
      res.status(500).json({ error: "Failed to fetch enhanced leaderboard" });
    }
  });

  // Get individual staff ranking with context
  app.get("/api/staff/:id/ranking", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getEnhancedLeaderboard();
      const staffRanking = leaderboard.find(entry => entry.staff.id === req.params.id);
      
      if (!staffRanking) {
        return res.status(404).json({ error: "Staff member not found on leaderboard" });
      }
      
      const rank = staffRanking.rank;
      const ahead = leaderboard.slice(Math.max(0, rank - 3), rank - 1);
      const behind = leaderboard.slice(rank, rank + 2);
      
      res.json({
        ...staffRanking,
        ahead,
        behind,
        totalStaff: leaderboard.length,
      });
    } catch (error) {
      console.error("Get staff ranking error:", error);
      res.status(500).json({ error: "Failed to fetch staff ranking" });
    }
  });

  // Get all badges
  app.get("/api/badges", isAuthenticated, async (req, res) => {
    try {
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  // Get staff badges
  app.get("/api/staff/:id/badges", isAuthenticated, async (req, res) => {
    try {
      const badges = await storage.getStaffBadges(req.params.id);
      res.json(badges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch staff badges" });
    }
  });

  // Check and award badges for a staff member
  app.post("/api/staff/:id/check-badges", isAuthenticated, async (req, res) => {
    try {
      const newBadges = await storage.checkAndAwardBadges(req.params.id);
      res.json({ newBadges, count: newBadges.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to check badges" });
    }
  });

  // Send monthly emails with badges and rankings
  app.post("/api/send-monthly-emails", isAuthenticated, async (req, res) => {
    try {
      const leaderboard = await storage.getEnhancedLeaderboard();
      const prizeSettings = await storage.getPrizeSettings();
      
      let sentCount = 0;
      let failedCount = 0;
      
      for (const entry of leaderboard) {
        try {
          const emailHtml = `
            <h2>Monthly Compliance Update</h2>
            <p>Hi ${entry.staff.fullName},</p>
            <p><strong>Your Ranking:</strong> ${entry.rank} of ${leaderboard.length}</p>
            <p><strong>Your Score:</strong> ${entry.avgScore.toFixed(1)}/15.0 (${((entry.avgScore/15)*100).toFixed(0)}%)</p>
            
            ${entry.rank <= 3 ? `
              <p style="color: green; font-size: 1.2em;">
                <strong>CONGRATULATIONS! YOU WON: ${entry.rank === 1 ? prizeSettings.firstPlacePrize : entry.rank === 2 ? prizeSettings.secondPlacePrize : prizeSettings.thirdPlacePrize}!</strong>
              </p>
            ` : ''}
            
            ${entry.badges.length > 0 ? `
              <h3>Your Badges:</h3>
              <ul>
                ${entry.badges.map(b => `<li>${b.badge.name} - ${b.badge.description}</li>`).join('')}
              </ul>
            ` : ''}
            
            <p>Keep up the great work!</p>
          `;
          
          sentCount++;
        } catch (error) {
          console.error(`Failed to send email to ${entry.staff.fullName}:`, error);
          failedCount++;
        }
      }
      
      res.json({ success: true, sentCount, failedCount });
    } catch (error) {
      res.status(500).json({ error: "Failed to send monthly emails" });
    }
  });

  // Examine Google Sheets structure
  app.get("/api/sync/examine-sheets", isAuthenticated, async (req, res) => {
    try {
      const result = await examineSheetStructure();
      res.json(result);
    } catch (error) {
      console.error("Sheet examination error:", error);
      res.status(500).json({ error: "Failed to examine sheets" });
    }
  });

  // Sync staff from Google Sheets
  app.get("/api/sync/staff", isAuthenticated, async (req, res) => {
    try {
      const staffData = await getStaffFromSheet();
      
      let created = 0;
      let updated = 0;
      
      for (const sheetStaff of staffData) {
        const fullName = sheetStaff.full_name || sheetStaff.fullname || sheetStaff.name || '';
        if (!fullName) continue;
        
        const existingStaff = await storage.findStaffByName(fullName);
        
        const staffRecord = {
          fullName,
          email: sheetStaff.email || '',
          phone: sheetStaff.phone || '',
          roleType: sheetStaff.role_type || sheetStaff.role || 'non-driver',
          status: sheetStaff.status || 'active',
          notes: sheetStaff.notes || '',
        };
        
        if (existingStaff) {
          await storage.updateStaff(existingStaff.id, {
            phone: staffRecord.phone,
            roleType: staffRecord.roleType,
            status: staffRecord.status,
            email: staffRecord.email,
          });
          updated++;
        } else {
          await storage.createStaff(staffRecord);
          created++;
        }
      }
      
      res.json({
        synced: created + updated,
        created,
        updated,
        message: `Synced ${created + updated} staff members (${created} created, ${updated} updated)`
      });
    } catch (error) {
      console.error("Staff sync error:", error);
      res.status(500).json({ error: "Failed to sync staff from sheets" });
    }
  });

  // Get availability for date range
  app.get("/api/availability", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const availability = await storage.getAvailability(startDate as string, endDate as string);
      res.json(availability);
    } catch (error) {
      console.error("Availability fetch error:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // Create/update availability
  app.post("/api/availability", isAuthenticated, async (req, res) => {
    try {
      const { staffId, date, available, notes } = req.body;
      
      if (!staffId || !date || available === undefined) {
        return res.status(400).json({ error: "staffId, date, and available are required" });
      }
      
      const record = await storage.upsertAvailability(staffId, date, available, notes);
      res.json(record);
    } catch (error) {
      console.error("Availability update error:", error);
      res.status(500).json({ error: "Failed to update availability" });
    }
  });

  // Sync availability from Google Sheets
  app.get("/api/sync/availability", isAuthenticated, async (req, res) => {
    try {
      const availabilityData = await getAvailabilityFromSheet();
      
      if (availabilityData && typeof availabilityData === 'object' && 'error' in availabilityData) {
        return res.status(404).json({
          error: availabilityData.error,
          message: availabilityData.message
        });
      }
      
      let synced = 0;
      
      for (const item of availabilityData as any[]) {
        const staffName = item.staff_name || item.name || '';
        const date = item.date || '';
        const available = item.available === 'yes' || item.available === 'true' || item.available === true;
        
        if (!staffName || !date) continue;
        
        const staff = await storage.findStaffByName(staffName);
        if (!staff) continue;
        
        await storage.upsertAvailability(staff.id, date, available, item.notes || '');
        synced++;
      }
      
      res.json({
        synced,
        message: `Synced ${synced} availability records`
      });
    } catch (error) {
      console.error("Availability sync error:", error);
      res.status(500).json({ error: "Failed to sync availability from sheets" });
    }
  });

  // Availability Requests (in-house SMS system)
  // Send availability request SMS to all staff
  app.post("/api/availability-requests/send", isAuthenticated, async (req, res) => {
    try {
      const { sendSMS = true } = req.body;
      
      // Calculate period (next 7 days)
      const today = new Date();
      const periodStart = new Date(today);
      periodStart.setDate(today.getDate() + 1);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      
      // Get all active staff (include ALL active staff, not just those with phone numbers)
      const allStaff = await storage.getAllStaff();
      const activeStaff = allStaff.filter(s => s.status === "active");
      const staffWithPhones = activeStaff.filter(s => s.phone);
      const staffWithoutPhones = activeStaff.filter(s => !s.phone);
      
      // Create request record with 24-hour deadline
      const deadline = new Date(today);
      deadline.setHours(deadline.getHours() + 24);
      
      const request = await storage.createAvailabilityRequest({
        periodStart: periodStart.toISOString().split("T")[0],
        periodEnd: periodEnd.toISOString().split("T")[0],
        deadline: deadline,
        staffIds: activeStaff.map(s => s.id),
        status: "pending",
      });
      
      if (!sendSMS) {
        return res.json({ request, message: "Request created without sending SMS" });
      }
      
      // Generate unique tokens and send SMS to staff with phone numbers
      const { sendAvailabilitySMS } = await import("./twilio");
      let sentCount = 0;
      const errors: string[] = [];
      const skippedNoPhone: string[] = [];
      
      // Pre-calculate days and time slots
      const days = [];
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d).toISOString().split("T")[0]);
      }
      const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
      
      // Process staff with phone numbers (send SMS)
      for (const staff of staffWithPhones) {
        const token = `${staff.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const responseLink = `${req.protocol}://${req.get("host")}/availability-submit/${token}`;
        
        const result = await sendAvailabilitySMS(staff.phone!, responseLink, deadline);
        
        if (result.success) {
          sentCount++;
        } else {
          errors.push(`${staff.fullName}: ${result.error}`);
        }
        
        // Pre-create response records for each day/timeslot
        for (const day of days) {
          for (const slot of timeSlots) {
            await storage.createAvailabilityResponse({
              requestId: request.id,
              staffId: staff.id,
              responseToken: token,
              date: day,
              timeSlot: slot,
              available: undefined,
              submittedAt: undefined,
            });
          }
        }
      }
      
      // Process staff WITHOUT phone numbers (skip SMS but create records)
      for (const staff of staffWithoutPhones) {
        const token = `${staff.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        skippedNoPhone.push(staff.fullName);
        
        // Pre-create response records so they appear in the matrix
        for (const day of days) {
          for (const slot of timeSlots) {
            await storage.createAvailabilityResponse({
              requestId: request.id,
              staffId: staff.id,
              responseToken: token,
              date: day,
              timeSlot: slot,
              available: undefined,
              submittedAt: undefined,
            });
          }
        }
      }
      
      // Update request status
      await storage.updateAvailabilityRequest(request.id, {
        sentCount,
        status: sentCount > 0 ? (errors.length > 0 ? "partial" : "sent") : "failed",
        errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      });
      
      // Build informative message
      let message = `Sent SMS to ${sentCount}/${staffWithPhones.length} staff with phone numbers.`;
      if (skippedNoPhone.length > 0) {
        message += ` ${skippedNoPhone.length} staff without phone numbers were included in the availability matrix but did not receive SMS: ${skippedNoPhone.join(", ")}.`;
      }
      
      res.json({
        request,
        sentCount,
        totalActiveStaff: activeStaff.length,
        staffWithoutPhones: skippedNoPhone.length > 0 ? skippedNoPhone : undefined,
        errors: errors.length > 0 ? errors : undefined,
        message,
      });
    } catch (error: any) {
      console.error("Availability request error:", error);
      res.status(500).json({ error: "Failed to send availability requests", details: error.message });
    }
  });

  // Get recent availability requests
  app.get("/api/availability-requests", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const requests = await storage.getRecentAvailabilityRequests(limit);
      res.json(requests);
    } catch (error) {
      console.error("Availability requests fetch error:", error);
      res.status(500).json({ error: "Failed to fetch availability requests" });
    }
  });

  // Get submission status for a request
  app.get("/api/availability-requests/:requestId/status", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      const statusList = await storage.getStaffSubmissionStatus(requestId);
      res.json(statusList);
    } catch (error) {
      console.error("Submission status fetch error:", error);
      res.status(500).json({ error: "Failed to fetch submission status" });
    }
  });

  // Send reminder SMS to non-responders (automated 24-hour reminder)
  app.post("/api/availability-requests/:requestId/send-reminders", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      
      const request = await storage.getAvailabilityRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Check if reminder already sent
      if (request.reminderSentAt) {
        return res.status(400).json({ error: "Reminder already sent for this request" });
      }

      const statusList = await storage.getStaffSubmissionStatus(requestId);
      const nonResponders = statusList.filter(s => !s.submitted && s.phone);

      if (nonResponders.length === 0) {
        return res.json({ message: "All staff have already submitted", sentCount: 0 });
      }

      const { sendAvailabilityReminderSMS } = await import("./twilio");
      let sentCount = 0;
      const errors: string[] = [];

      for (const staff of nonResponders) {
        const responseLink = `${req.protocol}://${req.get("host")}/availability-submit/${staff.token}`;
        const result = await sendAvailabilityReminderSMS(staff.phone!, responseLink, request.deadline);
        
        if (result.success) {
          sentCount++;
        } else {
          errors.push(`${staff.staffName}: ${result.error}`);
        }
      }

      // Mark reminder as sent
      await storage.updateAvailabilityRequest(requestId, {
        reminderSentAt: new Date()
      });

      res.json({
        sentCount,
        totalNonResponders: nonResponders.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Sent reminders to ${sentCount}/${nonResponders.length} non-responders`
      });
    } catch (error: any) {
      console.error("Reminder send error:", error);
      res.status(500).json({ error: "Failed to send reminders", details: error.message });
    }
  });

  // Manual nudge - send SMS only to non-responders
  app.post("/api/availability-requests/:requestId/nudge", isAuthenticated, async (req, res) => {
    try {
      const { requestId } = req.params;
      
      const request = await storage.getAvailabilityRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      const statusList = await storage.getStaffSubmissionStatus(requestId);
      const nonResponders = statusList.filter(s => !s.submitted && s.phone);

      if (nonResponders.length === 0) {
        return res.json({ message: "All staff have already submitted", sentCount: 0 });
      }

      const { sendAvailabilityReminderSMS } = await import("./twilio");
      let sentCount = 0;
      const errors: string[] = [];

      for (const staff of nonResponders) {
        const responseLink = `${req.protocol}://${req.get("host")}/availability-submit/${staff.token}`;
        const result = await sendAvailabilityReminderSMS(staff.phone!, responseLink, request.deadline);
        
        if (result.success) {
          sentCount++;
        } else {
          errors.push(`${staff.staffName}: ${result.error}`);
        }
      }

      res.json({
        sentCount,
        totalNonResponders: nonResponders.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Nudged ${sentCount}/${nonResponders.length} non-responders`
      });
    } catch (error: any) {
      console.error("Nudge send error:", error);
      res.status(500).json({ error: "Failed to send nudges", details: error.message });
    }
  });

  // Individual nudge - send SMS to a specific staff member
  app.post("/api/availability-requests/:requestId/nudge/:staffId", isAuthenticated, async (req, res) => {
    try {
      const { requestId, staffId } = req.params;
      
      const request = await storage.getAvailabilityRequest(requestId);
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }

      // Get the specific staff member's token
      const responses = await storage.getAvailabilityResponsesByRequestAndStaff(requestId, staffId);

      if (responses.length === 0) {
        return res.status(404).json({ error: "Staff member not in this request" });
      }

      // Check if already submitted
      const hasSubmitted = responses.some(r => r.submittedAt !== null && r.submittedAt !== undefined);
      if (hasSubmitted) {
        return res.status(400).json({ error: "Staff member has already submitted" });
      }

      const token = responses[0].responseToken;
      const staff = await storage.getStaff(staffId);
      
      if (!staff || !staff.phone) {
        return res.status(404).json({ error: "Staff member not found or no phone number" });
      }

      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0]
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
      
      const responseLink = `${baseUrl}/availability-submit/${token}`;

      // Send nudge SMS
      const result = await sendAvailabilitySMS(staff.phone, responseLink);

      if (result.success) {
        res.json({
          message: `Nudge sent to ${staff.fullName}`,
          sentCount: 1,
          staffName: staff.fullName,
        });
      } else {
        res.status(500).json({ error: "Failed to send SMS", details: result.error });
      }
    } catch (error: any) {
      console.error("Error sending individual nudge:", error);
      res.status(500).json({ error: "Failed to send nudge", details: error.message });
    }
  });

  // Get availability responses for a date range
  app.get("/api/availability-responses", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const responses = await storage.getAvailabilityResponsesByDateRange(startDate as string, endDate as string);
      res.json(responses);
    } catch (error) {
      console.error("Availability responses fetch error:", error);
      res.status(500).json({ error: "Failed to fetch availability responses" });
    }
  });

  // Submit availability response (from mobile form)
  app.post("/api/availability-responses", async (req, res) => {
    try {
      const { token, responses } = req.body;
      
      if (!token || !responses || !Array.isArray(responses)) {
        return res.status(400).json({ error: "token and responses array are required" });
      }
      
      // Verify token exists and get staffId
      const existingResponses = await storage.getAvailabilityResponsesByToken(token);
      if (existingResponses.length === 0) {
        return res.status(404).json({ error: "Invalid token" });
      }
      
      // Check if already submitted (final) - prevent re-submissions
      const alreadySubmitted = existingResponses.some(r => r.submittedAt !== null);
      if (alreadySubmitted) {
        return res.status(403).json({ 
          error: "Availability already submitted", 
          message: "Your availability has already been submitted and is final. If you need to make changes, please contact us on WhatsApp." 
        });
      }
      
      const staffId = existingResponses[0].staffId;
      const requestId = existingResponses[0].requestId;
      
      // Add staffId to each response and bulk submit
      const responsesWithStaffId = responses.map(r => ({
        staffId,
        date: r.date,
        timeSlot: r.timeSlot,
        available: r.available
      }));
      
      const submittedResponses = await storage.bulkSubmitAvailability(token, responsesWithStaffId);
      
      // AUTOMATED COMPLIANCE TRACKING: Award points for on-time submission
      if (requestId && submittedResponses.length > 0) {
        try {
          // Check if compliance event already exists (prevent duplicates)
          const alreadyRewarded = await storage.hasAvailabilityComplianceEvent(staffId, requestId);
          
          if (!alreadyRewarded) {
            // Get the availability request to check deadline
            const request = await storage.getAvailabilityRequest(requestId);
            
            if (request) {
              const submissionTime = new Date();
              const deadline = new Date(request.deadline);
              
              // Check if submitted within 24 hours of request
              if (submissionTime <= deadline) {
                // Calculate week start (Monday) for grouping
                const eventDate = new Date(submissionTime);
                const weekStart = new Date(eventDate);
                const dayOfWeek = weekStart.getDay();
                const daysToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
                weekStart.setDate(weekStart.getDate() + daysToMonday);
                weekStart.setHours(0, 0, 0, 0);
                
                // Get staff info
                const staffMember = await storage.getStaff(staffId);
                
                // Create compliance event
                const eventId = `availability-${requestId}-${staffId}`;
                const complianceEvent = await storage.createComplianceEvent({
                  eventId,
                  eventDate: eventDate.toISOString().split('T')[0],
                  weekStart: weekStart.toISOString().split('T')[0],
                  source: "Availability System",
                  staffId,
                  points: 1.0,
                  maxPoints: 1.0,
                  reason: "Submitted availability on time",
                  rawPayload: {
                    src: "availability_submission",
                    event_date: eventDate.toISOString().split('T')[0],
                    staff_member: staffMember?.fullName || "Unknown",
                    staff_id_resolved: staffId,
                    checks: {
                      "Submitted availability on time": true
                    },
                    weights: {
                      "Submitted availability on time": 1.0
                    },
                    form_response_id: requestId,
                    notes: `Submitted within 24 hours of request sent at ${request.requestDate.toISOString()}`
                  },
                  createdByZap: "Availability_Auto_Compliance",
                  linkKey: requestId
                });
                
                console.log(`[Availability Compliance] Created compliance event for ${staffMember?.fullName}: +1.0 points`);
              } else {
                console.log(`[Availability Compliance] Submission after deadline - no points awarded for staff ${staffId}`);
              }
            }
          }
        } catch (complianceError) {
          // Log error but don't fail the submission
          console.error("[Availability Compliance] Failed to create compliance event:", complianceError);
        }
      }
      
      res.json({ success: true, message: "Availability submitted successfully" });
    } catch (error: any) {
      console.error("Availability submission error:", error);
      res.status(500).json({ error: "Failed to submit availability", details: error.message });
    }
  });

  // Get availability data for submission form (by token)
  app.get("/api/availability-responses/:token", async (req, res) => {
    try {
      const { token } = req.params;
      console.log(`[Availability] Token access attempt: ${token}`);
      console.log(`[Availability] Request from: ${req.headers['user-agent']}`);
      
      const formData = await storage.getAvailabilityFormData(token);
      
      if (!formData) {
        console.error(`[Availability] Token not found or invalid: ${token}`);
        return res.status(404).json({ error: "Invalid or expired token" });
      }
      
      console.log(`[Availability] Token validated successfully for staff: ${formData.staff.fullName}, ${formData.responses.length} responses found`);
      console.log(`[Availability] First response submitted status: ${formData.responses[0]?.submittedAt ? 'Already submitted at ' + formData.responses[0].submittedAt : 'Not submitted'}`);
      res.json({ staff: formData.staff, responses: formData.responses });
    } catch (error) {
      console.error("[Availability] Token fetch error:", error);
      res.status(500).json({ error: "Failed to fetch availability data" });
    }
  });

  // Admin Staff Availability Routes
  
  // Get all admin staff
  app.get("/api/admin-staff", isAuthenticated, async (req, res) => {
    try {
      const adminStaff = await storage.getAdminStaff();
      res.json(adminStaff);
    } catch (error) {
      console.error("Admin staff fetch error:", error);
      res.status(500).json({ error: "Failed to fetch admin staff" });
    }
  });

  // Create admin availability request (14-day period with tokens)
  app.post("/api/admin-availability-requests", isAuthenticated, async (req, res) => {
    try {
      // Calculate 14-day period (next 2 weeks)
      const today = new Date();
      const periodStart = new Date(today);
      periodStart.setDate(today.getDate() + 1);
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 13); // 14 days total
      
      const periodStartStr = periodStart.toISOString().split('T')[0];
      const periodEndStr = periodEnd.toISOString().split('T')[0];
      
      // Get all admin staff
      const allAdminStaff = await storage.getAdminStaff();
      const adminStaffIds = allAdminStaff.map(s => s.id);
      
      // Create the request
      const request = await storage.createAdminAvailabilityRequest({
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        adminStaffIds,
        sentCount: 0,
        status: 'pending',
      });
      
      // Create tokens and placeholder responses for each admin staff member
      const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
      const tokenMap = new Map<string, string>(); // staffId -> token
      
      for (const adminStaff of allAdminStaff) {
        // Generate unique token for this staff member
        const token = crypto.randomBytes(32).toString('hex');
        tokenMap.set(adminStaff.id, token);
        
        // Create response records for all days and time slots
        const currentDate = new Date(periodStart);
        while (currentDate <= periodEnd) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          for (const timeSlot of timeSlots) {
            await storage.createAdminAvailabilityResponse({
              requestId: request.id,
              adminStaffId: adminStaff.id,
              responseToken: token,
              date: dateStr,
              timeSlot,
              available: null, // null = no response yet (staff hasn't responded)
              submittedAt: null,
            });
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // Send email reminders to all office staff (StaffA, Alex, StaffB, StaffL)
      const staffToRemind = allAdminStaff;
      let successCount = 0;
      let failureCount = 0;
      const errors: string[] = [];
      
      for (const staff of staffToRemind) {
        const token = tokenMap.get(staff.id);
        if (!token) continue;
        
        const baseUrl = req.protocol + '://' + req.get('host');
        const submissionLink = `${baseUrl}/admin-availability-submit/${token}`;
        
        const result = await sendAdminAvailabilityReminder(
          staff.email,
          staff.fullName,
          submissionLink,
          periodStartStr,
          periodEndStr
        );
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          errors.push(`${staff.fullName}: ${result.error}`);
        }
      }
      
      // Update request with sent count
      await storage.updateAdminAvailabilityRequest(request.id, {
        sentCount: successCount,
        status: successCount > 0 ? 'sent' : 'failed',
      });
      
      res.json({
        success: true,
        requestId: request.id,
        periodStart: periodStartStr,
        periodEnd: periodEndStr,
        totalStaff: staffToRemind.length,
        sentCount: successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      console.error("Admin availability request error:", error);
      res.status(500).json({ error: "Failed to create availability request", details: error.message });
    }
  });

  // UPDATE product
  app.put("/api/ordering/products/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const [updated] = await db
        .update(schema.orderingProducts)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.orderingProducts.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("[UPDATE Product] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE product
  app.delete("/api/ordering/products/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // First, delete all stock movements that reference this product (cascade delete)
      const deletedMovements = await db
        .delete(schema.orderingStockMovements)
        .where(eq(schema.orderingStockMovements.productId, id))
        .returning();
      
      // Then delete the product itself
      const [deleted] = await db
        .delete(schema.orderingProducts)
        .where(eq(schema.orderingProducts.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      res.json({ 
        success: true, 
        deleted, 
        deletedStockMovements: deletedMovements.length 
      });
    } catch (error: any) {
      console.error("[DELETE Product] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // UPDATE supplier
  app.put("/api/ordering/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;
      
      const [updated] = await db
        .update(schema.orderingSuppliers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.orderingSuppliers.id, id))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("[UPDATE Supplier] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE supplier
  app.delete("/api/ordering/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deleted] = await db
        .delete(schema.orderingSuppliers)
        .where(eq(schema.orderingSuppliers.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error("[DELETE Supplier] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // UPDATE order
  app.put("/api/ordering/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { items, ...orderFields } = req.body;
      
      // Use transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Convert date strings to Date objects
        const orderData = { ...orderFields };
        if (orderData.orderDate && typeof orderData.orderDate === 'string') {
          orderData.orderDate = new Date(orderData.orderDate);
        }
        if (orderData.expectedDelivery && typeof orderData.expectedDelivery === 'string') {
          orderData.expectedDelivery = new Date(orderData.expectedDelivery);
        }
        if (orderData.receivedDate && typeof orderData.receivedDate === 'string') {
          orderData.receivedDate = new Date(orderData.receivedDate);
        }
        
        // If items are provided, validate and update them
        if (items && Array.isArray(items)) {
          // Validate items
          const itemSchemaWithoutOrderId = insertOrderingOrderItemSchema.omit({ orderId: true });
          const validatedItems = [];
          
          for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity <= 0 || !item.unitPrice || item.unitPrice <= 0) {
              throw new Error("Invalid item data");
            }
            
            const itemData = {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice
            };
            
            const validatedItem = itemSchemaWithoutOrderId.parse(itemData);
            validatedItems.push(validatedItem);
          }
          
          // Calculate totalAmount from validated items
          const totalAmount = validatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
          orderData.totalAmount = totalAmount;
          
          // Delete existing order items
          await tx.delete(schema.orderingOrderItems).where(eq(schema.orderingOrderItems.orderId, id));
          
          // Insert new items
          if (validatedItems.length > 0) {
            const itemsToCreate = validatedItems.map(item => ({
              ...item,
              orderId: id
            }));
            await tx.insert(schema.orderingOrderItems).values(itemsToCreate);
          }
        }
        
        // Update the order
        const [updated] = await tx
          .update(schema.orderingOrders)
          .set({
            ...orderData,
            updatedAt: new Date(),
          })
          .where(eq(schema.orderingOrders.id, id))
          .returning();
        
        if (!updated) {
          throw new Error("Order not found");
        }
        
        // Fetch updated items
        const updatedItems = await tx
          .select()
          .from(schema.orderingOrderItems)
          .where(eq(schema.orderingOrderItems.orderId, id));
        
        return { order: updated, items: updatedItems };
      });
      
      res.json({
        ...result.order,
        items: result.items
      });
    } catch (error: any) {
      console.error("[UPDATE Order] Error:", error);
      res.status(500).json({ error: error.message || "Failed to update order" });
    }
  });

  // DELETE order
  app.delete("/api/ordering/orders/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Delete related order items first
      await db
        .delete(schema.orderingOrderItems)
        .where(eq(schema.orderingOrderItems.orderId, id));
      
      const [deleted] = await db
        .delete(schema.orderingOrders)
        .where(eq(schema.orderingOrders.id, id))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error("[DELETE Order] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get admin availability responses for dashboard (all staff, date range)
  app.get("/api/admin-availability-responses", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const responses = await storage.getAdminAvailabilityResponsesByDateRange(startDate as string, endDate as string);
      res.json(responses);
    } catch (error) {
      console.error("Admin availability responses fetch error:", error);
      res.status(500).json({ error: "Failed to fetch admin availability responses" });
    }
  });

  // Get admin availability data for submission form (by token)
  app.get("/api/admin-availability-responses/:token", async (req, res) => {
    try {
      const { token } = req.params;
      console.log(`[Admin Availability] Token access attempt: ${token}`);
      console.log(`[Admin Availability] Request from: ${req.headers['user-agent']}`);
      
      const responses = await storage.getAdminAvailabilityResponsesByToken(token);
      
      if (responses.length === 0) {
        console.error(`[Admin Availability] Token not found or invalid: ${token}`);
        return res.status(404).json({ error: "Invalid or expired token" });
      }
      
      // Get admin staff details
      const adminStaffId = responses[0].adminStaffId;
      const adminStaff = await storage.getAdminStaffById(adminStaffId);
      
      if (!adminStaff) {
        console.error(`[Admin Availability] Admin staff not found for ID: ${adminStaffId}`);
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      console.log(`[Admin Availability] Token validated successfully for admin: ${adminStaff.fullName}, ${responses.length} time slots found`);
      console.log(`[Admin Availability] First response submitted status: ${responses[0]?.submittedAt ? 'Already submitted at ' + responses[0].submittedAt : 'Not submitted'}`);
      
      res.json({ staff: adminStaff, responses });
    } catch (error) {
      console.error("[Admin Availability] Token fetch error:", error);
      res.status(500).json({ error: "Failed to fetch admin availability data" });
    }
  });

  // Submit admin availability response (from submission form)
  app.post("/api/admin-availability-responses", async (req, res) => {
    try {
      const { token, responses } = req.body;
      
      if (!token || !responses || !Array.isArray(responses)) {
        return res.status(400).json({ error: "token and responses array are required" });
      }
      
      // Verify token exists
      const existingResponses = await storage.getAdminAvailabilityResponsesByToken(token);
      if (existingResponses.length === 0) {
        return res.status(404).json({ error: "Invalid token" });
      }
      
      const adminStaffId = existingResponses[0].adminStaffId;
      
      // Update each response
      for (const response of responses) {
        await storage.upsertAdminAvailabilityResponse(
          adminStaffId,
          response.date,
          response.timeSlot,
          response.available,
          token
        );
      }
      
      res.json({ success: true, message: "Admin availability submitted successfully" });
    } catch (error: any) {
      console.error("Admin availability submission error:", error);
      res.status(500).json({ error: "Failed to submit admin availability", details: error.message });
    }
  });

  // Admin Staff Management Routes
  
  // Create admin staff
  app.post("/api/admin-staff", isAuthenticated, async (req, res) => {
    try {
      const staff = await storage.createAdminStaff(req.body);
      res.json(staff);
    } catch (error: any) {
      console.error("Admin staff creation error:", error);
      res.status(500).json({ error: "Failed to create admin staff", details: error.message });
    }
  });

  // Update admin staff
  app.put("/api/admin-staff/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const staff = await storage.updateAdminStaff(id, req.body);
      res.json(staff);
    } catch (error: any) {
      console.error("Admin staff update error:", error);
      res.status(500).json({ error: "Failed to update admin staff", details: error.message });
    }
  });

  // Delete admin staff
  app.delete("/api/admin-staff/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAdminStaff(id);
      res.json({ success: true, message: "Admin staff deleted successfully" });
    } catch (error: any) {
      console.error("Admin staff deletion error:", error);
      res.status(500).json({ error: "Failed to delete admin staff", details: error.message });
    }
  });

  // Admin Shift Template Routes
  
  // Get all shift templates (optionally filtered by staffId)
  app.get("/api/admin-shift-templates", isAuthenticated, async (req, res) => {
    try {
      const { staffId } = req.query;
      const templates = await storage.getShiftTemplates(staffId as string | undefined);
      res.json(templates);
    } catch (error: any) {
      console.error("Shift templates fetch error:", error);
      res.status(500).json({ error: "Failed to fetch shift templates", details: error.message });
    }
  });

  // Create shift template
  app.post("/api/admin-shift-templates", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.createShiftTemplate(req.body);
      res.json(template);
    } catch (error: any) {
      console.error("Shift template creation error:", error);
      res.status(500).json({ error: "Failed to create shift template", details: error.message });
    }
  });

  // Update shift template
  app.put("/api/admin-shift-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateShiftTemplate(id, req.body);
      res.json(template);
    } catch (error: any) {
      console.error("Shift template update error:", error);
      res.status(500).json({ error: "Failed to update shift template", details: error.message });
    }
  });

  // Delete shift template
  app.delete("/api/admin-shift-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteShiftTemplate(id);
      res.json({ success: true, message: "Shift template deleted successfully" });
    } catch (error: any) {
      console.error("Shift template deletion error:", error);
      res.status(500).json({ error: "Failed to delete shift template", details: error.message });
    }
  });

  // Admin Scheduled Shift Routes
  
  // Get scheduled shifts (requires startDate and endDate, optional staffId)
  app.get("/api/admin-shifts", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, staffId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const shifts = await storage.getScheduledShifts(
        startDate as string,
        endDate as string,
        staffId as string | undefined
      );
      res.json(shifts);
    } catch (error: any) {
      console.error("Scheduled shifts fetch error:", error);
      res.status(500).json({ error: "Failed to fetch scheduled shifts", details: error.message });
    }
  });

  // Create scheduled shift
  app.post("/api/admin-shifts", isAuthenticated, async (req, res) => {
    try {
      const shift = await storage.createScheduledShift(req.body);
      res.json(shift);
    } catch (error: any) {
      console.error("Scheduled shift creation error:", error);
      res.status(500).json({ error: "Failed to create scheduled shift", details: error.message });
    }
  });

  // Update scheduled shift
  app.put("/api/admin-shifts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const shift = await storage.updateScheduledShift(id, req.body);
      res.json(shift);
    } catch (error: any) {
      console.error("Scheduled shift update error:", error);
      res.status(500).json({ error: "Failed to update scheduled shift", details: error.message });
    }
  });

  // Delete scheduled shift
  app.delete("/api/admin-shifts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteScheduledShift(id);
      res.json({ success: true, message: "Scheduled shift deleted successfully" });
    } catch (error: any) {
      console.error("Scheduled shift deletion error:", error);
      res.status(500).json({ error: "Failed to delete scheduled shift", details: error.message });
    }
  });

  // Generate shifts from templates
  app.post("/api/admin-shifts/generate", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, staffId } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const shifts = await storage.generateShiftsFromTemplates(
        startDate,
        endDate,
        staffId || undefined
      );
      
      res.json({
        success: true,
        shiftsCreated: shifts.length,
        shifts
      });
    } catch (error: any) {
      console.error("Shift generation error:", error);
      res.status(500).json({ error: "Failed to generate shifts from templates", details: error.message });
    }
  });

  // Get weekly hours summary
  app.get("/api/admin-shifts/weekly-summary", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const summary = await storage.getWeeklyHoursSummary(
        startDate as string,
        endDate as string
      );
      res.json(summary);
    } catch (error: any) {
      console.error("Weekly hours summary error:", error);
      res.status(500).json({ error: "Failed to fetch weekly hours summary", details: error.message });
    }
  });

  // Compliance webhook endpoint
  app.post("/api/compliance-webhook", async (req, res) => {
    try {
      // Validate request body
      if (!req.body || typeof req.body !== 'object') {
        console.error("[Compliance Webhook] Invalid request body:", typeof req.body);
        return res.status(400).json({
          error: "Invalid request format",
          details: "Request body must be valid JSON"
        });
      }
      
      // Verify webhook secret
      const webhookSecret = process.env.WEBHOOK_SECRET;
      const providedSecret = req.headers["x-webhook-secret"];

      if (!webhookSecret || providedSecret !== webhookSecret) {
        return res.status(401).json({ error: "Unauthorized: Invalid webhook secret" });
      }

      // Validate payload with detailed error logging
      let payload;
      try {
        payload = compliancePayloadSchema.parse(req.body);
      } catch (validationError) {
        console.error("[Compliance Webhook] Payload validation failed:", validationError);
        return res.status(400).json({
          error: "Invalid payload format",
          details: validationError instanceof Error ? validationError.message : "Schema validation failed"
        });
      }

      // Parse date_of_shift to ISO date format
      let eventDate: string;
      if (payload.date_of_shift.includes("/")) {
        // Parse DD/MM/YYYY format
        const [day, month, year] = payload.date_of_shift.split("/");
        eventDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      } else {
        // Assume ISO format
        eventDate = payload.date_of_shift.split("T")[0];
      }

      // Calculate week_start (Monday of that week)
      const dateObj = new Date(eventDate);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, else go back to Monday
      const monday = new Date(dateObj);
      monday.setDate(dateObj.getDate() + diff);
      const weekStart = monday.toISOString().split("T")[0];

      // Calculate score: sum COMPLIANCE_WEIGHTS for each "yes" answer
      let points = 0;
      const checks = payload.checks || {};
      
      for (const [question, answer] of Object.entries(checks)) {
        if (typeof answer === "string" && answer.toLowerCase() === "yes") {
          const weight = COMPLIANCE_WEIGHTS[question];
          if (weight !== undefined) {
            points += weight;
          }
        }
      }

      // Find staff by name (case-insensitive)
      const staffMember = await storage.findStaffByName(payload.staff_member);
      const staffId = staffMember?.id || "PENDING";

      // Generate deterministic eventId: SHA1 hash
      const source = "Compliance";
      const hashInput = `${source}|${staffId}|${eventDate}|${payload.form_response_id}`;
      const eventId = crypto.createHash("sha1").update(hashInput).digest("hex");

      // Check for duplicate eventId
      const existingEvent = await storage.getComplianceEventById(eventId);
      if (existingEvent) {
        return res.json({
          status: "duplicate",
          event_id: eventId,
        });
      }

      // Create compliance event
      const reason = Object.entries(checks)
        .filter(([_, answer]) => typeof answer === "string" && answer.toLowerCase() === "yes")
        .map(([question]) => question)
        .join("; ");

      const complianceEvent = await storage.createComplianceEvent({
        eventId,
        eventDate,
        weekStart,
        source,
        property: payload.property || "",
        staffId,
        points,
        maxPoints: 15.0,
        reason: reason || "No checks completed",
        rawPayload: {
          src: source,
          event_date: eventDate,
          staff_member: payload.staff_member,
          staff_id_resolved: staffId,
          property: payload.property,
          checks,
          weights: COMPLIANCE_WEIGHTS,
          notes: payload.notes,
          form_response_id: payload.form_response_id,
          auditor: payload.auditor,
        },
        createdByZap: "Compliance_Form_v1",
        linkKey: `${source}|${eventDate}|${staffId}`,
      });

      res.json({
        status: "ok",
        event_id: eventId,
        points,
        max_points: 15.0,
      });
    } catch (error) {
      console.error("Compliance webhook error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid payload", details: error.errors });
      }
      res.status(500).json({ error: "Failed to process compliance webhook" });
    }
  });

  // ===== PROPERLY DAMAGE REPORT WEBHOOK =====

  /**
   * Helper: Extract email data from Mailgun or SendGrid webhook payload
   */
  function extractEmailData(body: any): {
    subject: string;
    bodyText: string;
    senderEmail: string;
    senderName: string;
  } {
    // Mailgun format: { subject, "body-plain", from, sender }
    // SendGrid format: { subject, text, from, to }
    
    const subject = body.subject || '';
    const bodyText = body['body-plain'] || body.text || '';
    const fromField = body.from || '';
    const senderEmail = body.sender || fromField;
    
    // Extract sender name from "Name <email>" format
    const nameMatch = fromField.match(/^(.+?)\s*<.+>$/);
    const senderName = nameMatch ? nameMatch[1].trim() : '';
    
    return { subject, bodyText, senderEmail, senderName };
  }

  /**
   * Helper: Match property by name or address
   */
  async function matchProperty(
    damageReport: any,
    storage: any
  ): Promise<{ propertyId: string; propertyName: string; matchMethod: string }> {
    const allProperties = await storage.getProperties();
    
    if (!allProperties || allProperties.length === 0) {
      throw new Error('No properties found in system');
    }
    
    // Try matching by property name (case-insensitive, partial match)
    if (damageReport.propertyName) {
      const nameMatch = allProperties.find((p: any) =>
        p.name?.toLowerCase().includes(damageReport.propertyName.toLowerCase()) ||
        damageReport.propertyName.toLowerCase().includes(p.name?.toLowerCase())
      );
      
      if (nameMatch) {
        console.log(`[Properly Webhook] Property matched by name: ${nameMatch.name}`);
        return {
          propertyId: nameMatch.id,
          propertyName: nameMatch.name,
          matchMethod: 'name'
        };
      }
    }
    
    // Try matching by address
    if (damageReport.propertyAddress) {
      const addressMatch = allProperties.find((p: any) =>
        p.address?.toLowerCase().includes(damageReport.propertyAddress.toLowerCase()) ||
        damageReport.propertyAddress.toLowerCase().includes(p.address?.toLowerCase())
      );
      
      if (addressMatch) {
        console.log(`[Properly Webhook] Property matched by address: ${addressMatch.name}`);
        return {
          propertyId: addressMatch.id,
          propertyName: addressMatch.name,
          matchMethod: 'address'
        };
      }
    }
    
    // Fallback: Use first property (log warning)
    console.warn('[Properly Webhook] No property match found, using first property as fallback');
    console.warn(`[Properly Webhook] Attempted to match: name="${damageReport.propertyName}", address="${damageReport.propertyAddress}"`);
    
    return {
      propertyId: allProperties[0].id,
      propertyName: allProperties[0].name,
      matchMethod: 'fallback'
    };
  }

  /**
   * Helper: Get maintenance coordinator staff member
   */
  async function getMaintenanceCoordinator(storage: any): Promise<string> {
    // Try environment variable first
    const coordinatorId = process.env.MAINTENANCE_COORDINATOR_ID;
    if (coordinatorId) {
      try {
        const coordinator = await storage.getStaffMember(coordinatorId);
        if (coordinator) {
          console.log(`[Properly Webhook] Using coordinator from env var: ${coordinator.fullName}`);
          return coordinatorId;
        }
      } catch (error) {
        console.warn('[Properly Webhook] Coordinator ID from env var not found, falling back...');
      }
    }
    
    // Fallback: Find first admin or manager
    const allStaff = await storage.getAllStaff();
    const adminOrManager = allStaff.find((s: any) => 
      s.role === 'admin' || s.role === 'manager'
    );
    
    if (adminOrManager) {
      console.log(`[Properly Webhook] Using fallback coordinator: ${adminOrManager.fullName} (${adminOrManager.role})`);
      return adminOrManager.id;
    }
    
    // Last resort: Use any active staff member
    const activeStaff = allStaff.find((s: any) => s.status === 'active');
    if (activeStaff) {
      console.warn('[Properly Webhook] No admin/manager found, using first active staff member');
      return activeStaff.id;
    }
    
    throw new Error('No suitable staff member found for coordinator assignment');
  }

  /**
   * Webhook endpoint: Properly damage report email → Maintenance request
   * Public endpoint (no Replit auth required)
   */
  app.post("/api/maintenance/webhook/properly-damage", async (req, res) => {
    const startTime = Date.now();
    
    try {
      console.log('[Properly Webhook] Received damage report webhook');
      
      // 1. Verify webhook secret
      const webhookSecret = process.env.PROPERLY_WEBHOOK_SECRET;
      const providedSecret = req.headers['x-webhook-secret'] as string;
      
      if (!webhookSecret || providedSecret !== webhookSecret) {
        console.error('[Properly Webhook] Authentication failed - invalid secret');
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'Invalid webhook secret'
        });
      }
      
      // 2. Extract email data (support both Mailgun and SendGrid)
      const { subject, bodyText, senderEmail, senderName } = extractEmailData(req.body);
      
      if (!subject || !bodyText) {
        console.error('[Properly Webhook] Missing required email fields');
        return res.status(400).json({
          error: 'Invalid email data',
          message: 'Email subject and body are required'
        });
      }
      
      console.log(`[Properly Webhook] Email: "${subject}" from ${senderName} <${senderEmail}>`);
      
      // 3. Parse email with AI
      const damageReport = await parseProperlyDamageEmail(
        subject,
        bodyText,
        senderEmail,
        senderName
      );
      
      console.log(`[Properly Webhook] AI Extraction: confidence=${damageReport.extractionConfidence}, priority=${damageReport.priority}, serviceType=${damageReport.serviceType}`);
      
      // 4. Match property
      const { propertyId, propertyName, matchMethod } = await matchProperty(damageReport, storage);
      console.log(`[Properly Webhook] Matched property: ${propertyName} (method: ${matchMethod})`);
      
      // 5. Get maintenance coordinator
      const coordinatorId = await getMaintenanceCoordinator(storage);
      
      // 6. Create maintenance request
      const description = `${damageReport.damageDescription}\n\n---\nAutomatically created from Properly damage report email.\nReported by: ${damageReport.reporterName || senderName} <${damageReport.reporterEmail || senderEmail}>`;
      
      const notes = `AI Extraction Confidence: ${damageReport.extractionConfidence}\nExtraction Notes: ${damageReport.extractionNotes}\nProperty Match Method: ${matchMethod}`;
      
      const maintenanceRequest = await storage.createMaintenanceRequest({
        propertyId,
        title: damageReport.damageTitle,
        description,
        priority: damageReport.priority,
        serviceType: damageReport.serviceType,
        assignedWorkerId: coordinatorId,
        reportedBy: coordinatorId,
        status: 'pending',
        photoGcsPaths: [],
        notes
      });
      
      console.log(`[Properly Webhook] Created maintenance request: ${maintenanceRequest.id}`);
      
      // 7. Log activity
      await ActivityLogger.log({
        userId: 'system',
        action: 'create',
        resourceType: 'maintenance_request',
        resourceId: maintenanceRequest.id,
        details: {
          source: 'properly_webhook',
          propertyName,
          priority: damageReport.priority,
          serviceType: damageReport.serviceType,
          extractionConfidence: damageReport.extractionConfidence,
          propertyMatchMethod: matchMethod,
          processingTimeMs: Date.now() - startTime
        }
      });
      
      // 8. Return success response
      res.json({
        success: true,
        requestId: maintenanceRequest.id,
        property: propertyName,
        priority: damageReport.priority,
        serviceType: damageReport.serviceType,
        extractionConfidence: damageReport.extractionConfidence,
        processingTimeMs: Date.now() - startTime
      });
      
    } catch (error: any) {
      console.error('[Properly Webhook] Error processing damage report:', error);
      
      // Log failed webhook attempt
      try {
        await ActivityLogger.log({
          userId: 'system',
          action: 'error',
          resourceType: 'webhook',
          resourceId: 'properly_damage',
          details: {
            error: error.message,
            stack: error.stack,
            processingTimeMs: Date.now() - startTime
          }
        });
      } catch (logError) {
        console.error('[Properly Webhook] Failed to log error:', logError);
      }
      
      // Return appropriate error response
      if (error.message?.includes('Email parsing failed')) {
        return res.status(400).json({
          error: 'Email parsing failed',
          message: error.message,
          details: 'AI extraction could not process the email content'
        });
      }
      
      if (error.message?.includes('No properties found')) {
        return res.status(404).json({
          error: 'Property matching failed',
          message: 'No properties configured in system',
          details: error.message
        });
      }
      
      if (error.message?.includes('No suitable staff member')) {
        return res.status(500).json({
          error: 'Coordinator assignment failed',
          message: 'No staff members available for assignment',
          details: error.message
        });
      }
      
      // Generic server error
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process damage report webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ===== CLEANING SCHEDULES ROUTES =====

  // Location Groups Routes
  app.post("/api/location-groups", isAuthenticated, async (req, res) => {
    try {
      const locationGroup = await storage.createLocationGroup(req.body);
      res.json(locationGroup);
    } catch (error) {
      console.error("Create location group error:", error);
      res.status(500).json({ error: "Failed to create location group" });
    }
  });

  app.get("/api/location-groups", isAuthenticated, async (req, res) => {
    try {
      const locationGroups = await storage.getLocationGroups();
      res.json(locationGroups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch location groups" });
    }
  });

  app.put("/api/location-groups/:id", isAuthenticated, async (req, res) => {
    try {
      const locationGroup = await storage.updateLocationGroup(req.params.id, req.body);
      res.json(locationGroup);
    } catch (error) {
      console.error("Update location group error:", error);
      res.status(500).json({ error: "Failed to update location group" });
    }
  });

  app.delete("/api/location-groups/:id", isAuthenticated, async (req, res) => {
    try {
      // Check if any properties are assigned to this location group
      const properties = await storage.getPropertiesByLocationGroup(req.params.id);
      if (properties.length > 0) {
        return res.status(400).json({ 
          error: `Cannot delete location group with ${properties.length} assigned properties` 
        });
      }
      await storage.deleteLocationGroup(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete location group error:", error);
      res.status(500).json({ error: "Failed to delete location group" });
    }
  });

  // Properties Routes
  app.post("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const property = await storage.createProperty(req.body);
      res.json(property);
    } catch (error) {
      console.error("Create property error:", error);
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  app.get("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = await storage.getProperties();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.put("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const property = await storage.updateProperty(req.params.id, req.body);
      res.json(property);
    } catch (error) {
      console.error("Update property error:", error);
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProperty(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // Get property details
  app.get("/api/properties/:id/details", isAuthenticated, async (req, res) => {
    try {
      const property = await storage.getPropertyDetails(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get travel times from this property to nearby properties
  app.get("/api/properties/:id/travel-times", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const travelTimes = await storage.calculateTravelTimes(req.params.id, limit);
      res.json(travelTimes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export all properties as CSV
  app.get("/api/properties/export", isAuthenticated, async (req, res) => {
    try {
      const properties = await storage.getProperties();
      
      const headers = [
        "name", "address", "uplistingId", "locationGroup", "active", 
        "defaultCleanDuration", "priorityRank", "propertyType", "bedrooms", 
        "bathrooms", "cleaningFrequency", "specialInstructions", 
        "latitude", "longitude", "notes", "preferredStaffIds"
      ];
      
      const locationGroups = await storage.getLocationGroups();
      const locationGroupMap = new Map(locationGroups.map(lg => [lg.id, lg.slug]));
      
      const rows = properties.map(p => {
        const locationGroupSlug = p.locationGroupId 
          ? locationGroupMap.get(p.locationGroupId) || ""
          : "";
        
        return [
          escapeCSV(p.name),
          escapeCSV(p.address),
          escapeCSV(p.uplistingId || ""),
          escapeCSV(locationGroupSlug),
          p.active ? "true" : "false",
          p.defaultCleanDuration?.toString() || "120",
          p.priorityRank?.toString() || "0",
          escapeCSV(p.propertyType || ""),
          p.bedrooms?.toString() || "",
          p.bathrooms?.toString() || "",
          escapeCSV(p.cleaningFrequency || ""),
          escapeCSV(p.specialInstructions || ""),
          p.latitude?.toString() || "",
          p.longitude?.toString() || "",
          escapeCSV(p.notes || ""),
          p.preferredStaffIds?.join(",") || ""
        ].join(",");
      });
      
      const csv = [headers.join(","), ...rows].join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="properties-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Download property CSV template
  app.get("/api/properties/template", isAuthenticated, async (req, res) => {
    try {
      const headers = [
        "name", "address", "uplistingId", "locationGroup", "active", 
        "defaultCleanDuration", "priorityRank", "propertyType", "bedrooms", 
        "bathrooms", "cleaningFrequency", "specialInstructions", 
        "latitude", "longitude", "notes", "preferredStaffIds"
      ];
      
      const csv = headers.join(",");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="properties-template.csv"');
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk import properties from CSV
  app.post("/api/properties/bulk-import", isAuthenticated, async (req, res) => {
    try {
      const { properties: importData } = req.body;
      
      if (!Array.isArray(importData)) {
        return res.status(400).json({ message: "Invalid import data" });
      }
      
      console.log(`[IMPORT] Starting bulk import of ${importData.length} properties`);
      const result = await storage.bulkImportProperties(importData);
      console.log(`[IMPORT] Result:`, result);
      
      if (result.errors.length > 0) {
        console.error(`[IMPORT] First 5 errors:`, result.errors.slice(0, 5));
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("[IMPORT] Fatal error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Import Batches Routes
  app.get("/api/import/batches", isAuthenticated, async (req, res) => {
    try {
      const batches = await storage.getImportBatches();
      res.json(batches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch import batches" });
    }
  });

  // Import Uplisting CSV and match properties
  app.post("/api/import/uplisting", isAuthenticated, async (req, res) => {
    try {
      const { jobs, fileName, weekStart } = req.body;
      
      if (!Array.isArray(jobs) || jobs.length === 0) {
        return res.status(400).json({ error: "No jobs provided" });
      }

      // Create import batch
      const batch = await storage.createImportBatch({
        source: "uplisting",
        weekStart,
        fileName: fileName || "upload.csv",
        rowCount: jobs.length,
        status: "processing",
      });

      let matchedCount = 0;
      let unmatchedCount = 0;
      const createdJobs = [];

      for (const job of jobs) {
        let property = null;
        let autoMatched = false;
        let matchConfidence = null;

        // Try exact match on uplistingId
        if (job.uplistingId) {
          property = await storage.findPropertyByUplistingId(job.uplistingId);
          if (property) {
            autoMatched = true;
            matchConfidence = "exact";
            matchedCount++;
          }
        }

        // Fallback: case-insensitive name match
        if (!property && job.propertyName) {
          property = await storage.findPropertyByName(job.propertyName);
          if (property) {
            autoMatched = true;
            matchConfidence = "fuzzy";
            matchedCount++;
          }
        }

        // Check aliases if still no match
        if (!property && job.propertyName) {
          const allProperties = await storage.getProperties();
          for (const prop of allProperties) {
            const aliases = await storage.getPropertyAliases(prop.id);
            const aliasMatch = aliases.find(a => 
              a.aliasName.toLowerCase() === job.propertyName.toLowerCase()
            );
            if (aliasMatch) {
              property = prop;
              autoMatched = true;
              matchConfidence = "alias";
              matchedCount++;
              break;
            }
          }
        }

        // Create cleaning job
        const createdJob = await storage.createCleaningJob({
          importBatchId: batch.id,
          propertyId: property?.id || null,
          scheduledDate: job.scheduledDate,
          checkOutTime: job.checkOutTime,
          checkInTime: job.checkInTime,
          guestName: job.guestName,
          bookingReference: job.bookingReference,
          autoMatched,
          matchConfidence,
          status: property ? "pending" : "unmatched",
        });

        createdJobs.push(createdJob);

        // Create matching issue if no property found
        if (!property) {
          unmatchedCount++;
          await storage.createMatchingIssue({
            importBatchId: batch.id,
            csvPropertyName: job.propertyName || "",
            csvAddress: job.address || "",
            possibleMatches: [],
            resolved: false,
          });
        }
      }

      // Update batch with final counts
      await storage.updateImportBatch(batch.id, {
        matchedCount,
        unmatchedCount,
        status: "completed",
      });

      res.json({
        success: true,
        batchId: batch.id,
        imported: jobs.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
        jobs: createdJobs,
      });
    } catch (error) {
      console.error("Uplisting import error:", error);
      res.status(500).json({ error: "Failed to import Uplisting data" });
    }
  });

  // Cleaning Jobs Routes
  app.get("/api/cleaning-jobs", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const jobs = await storage.getCleaningJobs({
        startDate: startDate as string,
        endDate: endDate as string,
        status: status as string,
      });
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cleaning jobs" });
    }
  });

  app.put("/api/cleaning-jobs/:id", isAuthenticated, async (req, res) => {
    try {
      const job = await storage.updateCleaningJob(req.params.id, req.body);
      res.json(job);
    } catch (error) {
      console.error("Update cleaning job error:", error);
      res.status(500).json({ error: "Failed to update cleaning job" });
    }
  });

  // Cleaning Assignments Routes
  app.get("/api/cleaning-assignments", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, staffId } = req.query;
      const assignments = await storage.getCleaningAssignments({
        startDate: startDate as string,
        endDate: endDate as string,
        staffId: staffId as string,
      });
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cleaning assignments" });
    }
  });

  app.put("/api/cleaning-assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.updateCleaningAssignment(req.params.id, req.body);
      res.json(assignment);
    } catch (error) {
      console.error("Update assignment error:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  // Auto-generate cleaning schedule
  app.post("/api/cleaning-jobs/generate-schedule", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start and end dates are required" });
      }

      // Fetch pending cleaning jobs for the week
      const jobs = await storage.getCleaningJobs({
        startDate,
        endDate,
        status: "pending",
      });

      if (jobs.length === 0) {
        return res.json({ assignments: [], message: "No pending jobs for this period" });
      }

      // Fetch staff availability for the week
      const availabilityRecords = await storage.getAvailability(startDate, endDate);
      
      // Fetch all staff
      const allStaff = await storage.getAllStaff();
      const activeStaff = allStaff.filter(s => s.status === "active");

      // Fetch all properties and location groups
      const properties = await storage.getProperties();
      const locationGroups = await storage.getLocationGroups();

      // Build availability map: date -> staffId -> available
      const availabilityMap = new Map<string, Map<string, boolean>>();
      for (const record of availabilityRecords) {
        if (!availabilityMap.has(record.date)) {
          availabilityMap.set(record.date, new Map());
        }
        availabilityMap.get(record.date)!.set(record.staffId, record.available);
      }

      // Group jobs by date and location group
      const jobsByDateAndLocation = new Map<string, Map<string, typeof jobs>>();
      
      for (const job of jobs) {
        if (!job.propertyId) continue; // Skip unmatched properties
        
        const property = properties.find(p => p.id === job.propertyId);
        if (!property) continue;

        const locationGroupId = property.locationGroupId || "unassigned";
        
        if (!jobsByDateAndLocation.has(job.scheduledDate)) {
          jobsByDateAndLocation.set(job.scheduledDate, new Map());
        }
        
        const dateMap = jobsByDateAndLocation.get(job.scheduledDate)!;
        if (!dateMap.has(locationGroupId)) {
          dateMap.set(locationGroupId, []);
        }
        
        dateMap.get(locationGroupId)!.push(job);
      }

      // Track assignments per staff per day
      const staffAssignmentCount = new Map<string, Map<string, number>>();

      const createdAssignments = [];

      // Assign jobs to staff
      for (const [date, locationMap] of Array.from(jobsByDateAndLocation.entries())) {
        for (const [locationGroupId, locationJobs] of Array.from(locationMap.entries())) {
          const locationGroup = locationGroups.find(lg => lg.id === locationGroupId);
          const maxJobsPerDay = locationGroup?.maxJobsPerDay || 10;

          // Get available staff for this date
          const availableStaff = activeStaff.filter(staff => {
            const staffAvailability = availabilityMap.get(date)?.get(staff.id);
            // If no availability record, assume available (default true)
            return staffAvailability !== false;
          });

          // Sort jobs by priority
          const sortedJobs = [...locationJobs].sort((a, b) => {
            const propA = properties.find(p => p.id === a.propertyId);
            const propB = properties.find(p => p.id === b.propertyId);
            return (propB?.priorityRank || 0) - (propA?.priorityRank || 0);
          });

          // Assign each job to a staff member
          for (const job of sortedJobs) {
            const property = properties.find(p => p.id === job.propertyId);
            
            // Try preferred staff first
            let assignedStaff = null;
            if (property?.preferredStaffIds && property.preferredStaffIds.length > 0) {
              for (const preferredStaffId of property.preferredStaffIds) {
                const staff = availableStaff.find(s => s.id === preferredStaffId);
                if (staff) {
                  const currentCount = staffAssignmentCount.get(date)?.get(staff.id) || 0;
                  if (currentCount < maxJobsPerDay) {
                    assignedStaff = staff;
                    break;
                  }
                }
              }
            }

            // Fallback: assign to any available staff with capacity
            if (!assignedStaff) {
              for (const staff of availableStaff) {
                const currentCount = staffAssignmentCount.get(date)?.get(staff.id) || 0;
                if (currentCount < maxJobsPerDay) {
                  assignedStaff = staff;
                  break;
                }
              }
            }

            // Create assignment if staff found
            if (assignedStaff) {
              const assignment = await storage.createCleaningAssignment({
                cleaningJobId: job.id,
                staffId: assignedStaff.id,
                assignedDate: date,
                assignedSlotStart: job.slotStart || null,
                assignedSlotEnd: job.slotEnd || null,
                assignmentMethod: "auto",
                status: "draft",
              });

              createdAssignments.push(assignment);

              // Update assignment count
              if (!staffAssignmentCount.has(date)) {
                staffAssignmentCount.set(date, new Map());
              }
              const dateMap = staffAssignmentCount.get(date)!;
              dateMap.set(assignedStaff.id, (dateMap.get(assignedStaff.id) || 0) + 1);

              // Update job status
              await storage.updateCleaningJob(job.id, { status: "assigned" });
            }
          }
        }
      }

      res.json({
        success: true,
        assignments: createdAssignments,
        message: `Generated ${createdAssignments.length} assignments for ${jobs.length} jobs`,
      });
    } catch (error) {
      console.error("Generate schedule error:", error);
      res.status(500).json({ error: "Failed to generate schedule" });
    }
  });

  // Send schedules to cleaners
  app.post("/api/cleaning-assignments/send", isAuthenticated, async (req, res) => {
    try {
      const { assignmentIds, channel } = req.body;

      if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        return res.status(400).json({ error: "No assignments provided" });
      }

      const sentNotifications = [];

      for (const assignmentId of assignmentIds) {
        const assignment = await storage.getCleaningAssignment(assignmentId);
        if (!assignment) continue;

        const job = await storage.getCleaningJob(assignment.cleaningJobId);
        const property = job?.propertyId ? await storage.getProperty(job.propertyId) : null;
        const staffMember = await storage.getStaff(assignment.staffId);

        if (!staffMember) continue;

        const message = `
Cleaning Assignment:
Property: ${property?.name || "Unknown"}
Date: ${assignment.assignedDate}
Time: ${assignment.assignedSlotStart || "TBD"} - ${assignment.assignedSlotEnd || "TBD"}
        `.trim();

        // Create notification record
        const notification = await storage.createAssignmentNotification({
          assignmentId: assignment.id,
          staffId: staffMember.id,
          channel: channel || "email",
          status: "sent",
          sentAt: new Date(),
        });

        sentNotifications.push(notification);

        // Update assignment status
        await storage.updateCleaningAssignment(assignment.id, {
          status: "sent",
          sentAt: new Date(),
        });

        // TODO: Integrate with Gmail/Twilio to actually send notifications
        // For now, just log the message
        console.log(`Would send to ${staffMember.email}:`, message);
      }

      res.json({
        success: true,
        sent: sentNotifications.length,
        notifications: sentNotifications,
      });
    } catch (error) {
      console.error("Send schedules error:", error);
      res.status(500).json({ error: "Failed to send schedules" });
    }
  });

  // Matching Issues Routes
  app.get("/api/matching-issues", isAuthenticated, async (req, res) => {
    try {
      const { batchId } = req.query;
      const issues = await storage.getMatchingIssues(batchId as string);
      res.json(issues);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matching issues" });
    }
  });

  app.post("/api/matching-issues/:id/resolve", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.body;
      const issue = await storage.resolveMatchingIssue(req.params.id, propertyId);
      res.json(issue);
    } catch (error) {
      console.error("Resolve matching issue error:", error);
      res.status(500).json({ error: "Failed to resolve matching issue" });
    }
  });

  // Test SMS endpoint - sends a REAL availability link to any phone number
  app.post("/api/test-sms", isAuthenticated, async (req, res) => {
    try {
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }
      
      console.log(`🧪 Creating test availability request for ${phone}...`);
      
      // Try to find staff member with this phone number
      const allStaff = await storage.getAllStaff();
      let staffMember = allStaff.find(s => s.phone === phone);
      
      // If not found, use first staff member or create a test one
      if (!staffMember) {
        staffMember = allStaff[0]; // Use first staff member as template
        if (!staffMember) {
          return res.status(404).json({ error: "No staff members found in the system" });
        }
      }
      
      // Create availability request for next 7 days
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 6);
      
      const deadline = new Date(today);
      deadline.setHours(deadline.getHours() + 24);
      
      const request = await storage.createAvailabilityRequest({
        periodStart: format(today, "yyyy-MM-dd"),
        periodEnd: format(endDate, "yyyy-MM-dd"),
        deadline: deadline,
        staffIds: [staffMember.id],
        status: "sent"
      });
      
      // Generate token and create response records
      const token = `${staffMember.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
      
      let currentDate = new Date(today);
      while (currentDate <= endDate) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        for (const timeSlot of timeSlots) {
          await storage.upsertAvailabilityResponse(staffMember.id, dateStr, timeSlot, true, token);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Build the actual availability link
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000";
      const protocol = domain.includes("localhost") ? "http" : "https";
      const availabilityLink = `${protocol}://${domain}/availability-submit/${token}`;
      
      console.log(`📱 Sending REAL availability SMS to ${phone}...`);
      console.log("🔗 Link:", availabilityLink);
      
      // Send SMS with the availability link
      const result = await sendAvailabilitySMS(phone, availabilityLink);
      
      console.log("📊 SMS Result:", JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log("✅ Availability SMS sent successfully!");
        res.json({
          success: true,
          messageId: result.messageId,
          message: `Test availability link sent to ${phone}!`,
          phone: phone,
          link: availabilityLink
        });
      } else {
        console.error("❌ SMS failed:", result.error);
        res.status(500).json({
          success: false,
          error: result.error,
          message: "Failed to send test SMS"
        });
      }
    } catch (error: any) {
      console.error("❌ Test SMS error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to send test SMS"
      });
    }
  });

  // ===== RECRUITMENT PIPELINE ROUTES =====
  
  // Screening Links Routes
  app.post("/api/screening/links", isAuthenticated, async (req, res) => {
    try {
      const validated = insertScreeningLinkSchema.parse(req.body);
      const link = await storage.createScreeningLink(validated);
      res.json(link);
    } catch (error) {
      console.error("Create screening link error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create screening link" });
    }
  });

  app.get("/api/screening/links/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const link = await storage.getScreeningLinkByToken(token);
      
      if (!link) {
        return res.status(404).json({ error: "Screening link not found or expired" });
      }
      
      res.json(link);
    } catch (error) {
      console.error("Get screening link error:", error);
      res.status(500).json({ error: "Failed to fetch screening link" });
    }
  });

  // Screening Responses Routes
  app.post("/api/screening/responses", async (req, res) => {
    try {
      const validated = insertScreeningResponseSchema.parse(req.body);
      const response = await storage.createScreeningResponse(validated);
      res.json(response);
    } catch (error) {
      console.error("Create screening response error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit screening response" });
    }
  });

  app.post("/api/screening/submit", async (req, res) => {
    try {
      const { token, responses } = req.body;

      if (!token || !Array.isArray(responses)) {
        return res.status(400).json({ error: "Invalid request data" });
      }

      const screeningLink = await storage.getScreeningLinkByToken(token);
      if (!screeningLink) {
        return res.status(404).json({ error: "Screening link not found" });
      }

      if (screeningLink.completedAt) {
        return res.status(400).json({ error: "Screening already completed" });
      }

      if (screeningLink.expiresAt && new Date(screeningLink.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Screening link expired" });
      }

      // Get settings to access passing threshold and question weights
      const settings = await storage.getSettings();
      if (!settings) {
        return res.status(500).json({ error: "Settings not configured" });
      }

      const questions = screeningLink.roleType === "driver"
        ? settings.driverScreeningQuestions
        : settings.nonDriverScreeningQuestions;
      
      const passingThreshold = screeningLink.roleType === "driver"
        ? settings.passingScoreDriver
        : settings.passingScoreNonDriver;

      // Calculate weighted score - only count auto-graded questions
      // Questions without correctAnswer are for manual review and don't affect pass/fail
      let totalWeight = 0;
      let earnedWeight = 0;

      for (const response of responses) {
        // Find the matching question to get its weight
        const question = questions.find((q: any) => q.id === response.questionId || q.prompt === response.questionText);
        
        if (question) {
          // Check if this question has a valid correctAnswer (is auto-graded)
          const hasCorrectAnswer = question.correctAnswer !== undefined && 
                                  question.correctAnswer !== null && 
                                  (typeof question.correctAnswer === 'string' 
                                    ? question.correctAnswer.trim() !== '' 
                                    : Array.isArray(question.correctAnswer) 
                                      ? question.correctAnswer.length > 0 && question.correctAnswer.some((ans: string) => ans.trim() !== '')
                                      : false);
          
          // Only count questions that can be auto-graded in the score calculation
          if (hasCorrectAnswer) {
            const weight = question.weight || 1;
            totalWeight += weight;
            if (response.isCorrect) {
              earnedWeight += weight;
            }
          }
        }

        // Store the response regardless (for manual review if needed)
        await storage.createScreeningResponse({
          screeningLinkId: screeningLink.id,
          candidateId: screeningLink.candidateId,
          questionText: response.questionText,
          answer: response.answer,
          isCorrect: response.isCorrect,
        });
      }

      // Calculate percentage score
      const scorePercentage = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
      const passed = scorePercentage >= passingThreshold;

      await storage.updateScreeningLink(screeningLink.id, {
        passed,
        completedAt: new Date(),
      });

      await storage.updateCandidate(screeningLink.candidateId, {
        status: passed ? "screened" : "uploaded",
      });

      // Send automated communication (async, non-blocking)
      setImmediate(async () => {
        try {
          if (passed) {
            await sendScreeningPassedEmail(screeningLink.candidateId);
          } else {
            await sendScreeningFailedEmail(screeningLink.candidateId);
          }
        } catch (commError) {
          console.error('Screening communication failed:', commError);
        }
      });

      // Auto-schedule meeting if candidate passed screening
      if (passed) {
        const settings = await storage.getSettings();
        if (settings?.recurringMeetingEnabled) {
          const schedulingResult = await storage.autoScheduleCandidate(screeningLink.candidateId);
          
          if (schedulingResult.success) {
            console.log(`[Screening Submit] Successfully auto-scheduled candidate ${screeningLink.candidateId} for interview at ${schedulingResult.scheduledAt}`);
            
            // Send meeting scheduled email with confirmation link
            setImmediate(async () => {
              try {
                const meeting = await storage.getGroupMeeting(schedulingResult.meetingId!);
                const confirmations = await storage.getMeetingConfirmationsByMeeting(schedulingResult.meetingId!);
                const candidateConfirmation = confirmations.find(c => c.candidateId === screeningLink.candidateId);
                
                const meetingDateFormatted = schedulingResult.scheduledAt 
                  ? format(new Date(schedulingResult.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a")
                  : '';
                const meetingLink = meeting?.googleCalendarMeetingLink || '';
                const confirmationLink = candidateConfirmation 
                  ? `${process.env.REPLIT_DEV_DOMAIN || 'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co'}/meeting-confirm/${candidateConfirmation.token}`
                  : '';
                
                await sendMeetingScheduledEmail(
                  screeningLink.candidateId,
                  meetingDateFormatted,
                  meetingLink,
                  confirmationLink
                );
              } catch (emailError) {
                console.error('Failed to send meeting scheduled email:', emailError);
              }
            });
          } else {
            console.error(`[Screening Submit] Failed to auto-schedule meeting: ${schedulingResult.error}`);
          }
        }
      }

      res.json({ 
        success: true, 
        passed,
        score: scorePercentage,
        message: passed 
          ? "Screening passed! You'll receive a meeting invite soon."
          : "Thank you for completing the screening."
      });
    } catch (error) {
      console.error("Submit screening error:", error);
      res.status(500).json({ error: "Failed to submit screening" });
    }
  });

  // Onboarding Submissions Routes
  app.post("/api/onboarding/submissions", async (req, res) => {
    try {
      const validated = insertOnboardingSubmissionSchema.parse(req.body);
      const submission = await storage.createOnboardingSubmission(validated);
      res.json(submission);
    } catch (error) {
      console.error("Create onboarding submission error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit onboarding data" });
    }
  });

  app.get("/api/onboarding/submissions/:candidateId", isAuthenticated, async (req, res) => {
    try {
      const { candidateId } = req.params;
      const submission = await storage.getOnboardingSubmissionByCandidate(candidateId);
      
      if (!submission) {
        return res.status(404).json({ error: "Onboarding submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Get onboarding submission error:", error);
      res.status(500).json({ error: "Failed to fetch onboarding submission" });
    }
  });

  // Get onboarding data by token (public endpoint for candidate form)
  app.get("/api/onboarding/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const submission = await storage.getOnboardingSubmissionByToken(token);
      
      if (!submission) {
        return res.status(404).json({ error: "Onboarding link not found or expired" });
      }
      
      if (submission.submittedAt) {
        return res.status(400).json({ error: "Onboarding form already submitted" });
      }
      
      // Get candidate details
      const candidate = await storage.getCandidate(submission.candidateId);
      if (!candidate) {
        return res.status(404).json({ error: "Candidate not found" });
      }
      
      res.json({
        submission,
        candidate: {
          id: candidate.id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          phone: candidate.phone,
          roleType: candidate.roleType,
        },
      });
    } catch (error) {
      console.error("Get onboarding by token error:", error);
      res.status(500).json({ error: "Failed to fetch onboarding data" });
    }
  });

  // Submit onboarding form (public endpoint for candidate)
  app.post("/api/onboarding/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { fullName, email, phone, niNumber, photoIdUploadId, unavailableDays } = req.body;
      
      const submission = await storage.getOnboardingSubmissionByToken(token);
      
      if (!submission) {
        return res.status(404).json({ error: "Onboarding link not found" });
      }
      
      if (submission.submittedAt) {
        return res.status(400).json({ error: "Onboarding form already submitted" });
      }
      
      // Update onboarding submission
      await storage.updateOnboardingSubmission(submission.id, {
        fullName,
        email,
        phone,
        niNumber,
        photoIdUploadId,
        availabilityData: unavailableDays, // Store unavailableDays as availabilityData for backward compatibility
        submittedAt: new Date(),
      });
      
      // Update candidate status to "hired"
      await storage.updateCandidate(submission.candidateId, {
        status: "hired",
        onboardingFormData: {
          niNumber,
          unavailableDays,
        },
      });
      
      // Send automated communication (async, non-blocking)
      setImmediate(async () => {
        try {
          await sendHiredEmail(submission.candidateId);
        } catch (commError) {
          console.error('Hired communication failed:', commError);
        }
      });
      
      // Trial shift auto-matcher will be triggered by the status update in the PATCH /api/candidates/:id route
      
      res.json({
        success: true,
        message: "Thank you! You'll receive your trial shift schedule soon.",
      });
    } catch (error) {
      console.error("Submit onboarding form error:", error);
      res.status(500).json({ error: "Failed to submit onboarding form" });
    }
  });

  // Get signed upload URL for photo ID
  app.post("/api/onboarding/photo-upload", async (req, res) => {
    try {
      const { candidateId, fileName, mimeType } = req.body;
      
      if (!candidateId || !fileName || !mimeType) {
        return res.status(400).json({ error: "Missing required fields: candidateId, fileName, mimeType" });
      }
      
      // Import PhotoIdStorageService
      const { PhotoIdStorageService } = await import('./object-storage');
      const photoStorageService = new PhotoIdStorageService();
      
      // Get signed upload URL
      const { uploadURL, storageKey } = await photoStorageService.getPhotoIdUploadURL(
        candidateId,
        fileName,
        mimeType
      );
      
      // Create photo ID upload record
      const fileSize = 0; // Will be updated after upload
      const photoIdUpload = await storage.createPhotoIdUpload({
        candidateId,
        fileName,
        fileSize,
        mimeType,
        storageKey,
      });
      
      res.json({
        uploadURL,
        photoIdUploadId: photoIdUpload.id,
        storageKey,
      });
    } catch (error) {
      console.error("Photo upload URL error:", error);
      res.status(500).json({ 
        error: "Failed to generate upload URL",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Meeting Attendance Routes
  app.post("/api/meetings/:meetingId/attendance", isAuthenticated, async (req: any, res) => {
    try {
      const { meetingId } = req.params;
      const userId = req.user?.claims?.sub;
      
      const validated = insertMeetingAttendanceSchema.parse({
        ...req.body,
        meetingId,
        markedBy: userId
      });
      
      const attendance = await storage.createMeetingAttendance(validated);
      res.json(attendance);
    } catch (error) {
      console.error("Create meeting attendance error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to mark attendance" });
    }
  });

  app.get("/api/meetings/:meetingId/attendance", isAuthenticated, async (req, res) => {
    try {
      const { meetingId } = req.params;
      const attendanceRecords = await storage.getMeetingAttendanceByMeeting(meetingId);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Get meeting attendance error:", error);
      res.status(500).json({ error: "Failed to fetch meeting attendance" });
    }
  });

  // TASK 19: Onboarding Checklist Routes
  
  // Get onboarding checklist for candidate/staff with enriched template data
  app.get("/api/onboarding/checklist/:candidateId", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getOnboardingChecklistItems(req.params.candidateId);
      const templates = await storage.getOnboardingChecklistTemplates();
      
      // Join items with template details
      const enrichedItems = items.map(item => {
        const template = templates.find(t => t.id === item.templateId);
        return { ...item, template };
      });
      
      res.json(enrichedItems);
    } catch (error) {
      console.error("Get onboarding checklist error:", error);
      res.status(500).json({ error: "Failed to fetch checklist" });
    }
  });

  // Update checklist item (mark complete, add notes)
  app.patch("/api/onboarding/checklist/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const { status, notes } = req.body;
      const userId = req.user?.claims?.sub;
      
      const updated = await storage.updateOnboardingChecklistItem(req.params.itemId, {
        status,
        notes,
        completedAt: status === "completed" ? new Date() : undefined,
        completedBy: status === "completed" ? (userId || "system") : undefined,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Update checklist item error:", error);
      res.status(500).json({ error: "Failed to update checklist item" });
    }
  });

  // Initialize default onboarding templates
  app.post("/api/onboarding/templates/init", isAuthenticated, async (req, res) => {
    try {
      await storage.initializeDefaultOnboardingTemplates();
      res.json({ success: true, message: "Default onboarding templates initialized" });
    } catch (error) {
      console.error("Initialize templates error:", error);
      res.status(500).json({ error: "Failed to initialize templates" });
    }
  });

  // Get pending onboarding items summary
  app.get("/api/onboarding/pending-summary", isAuthenticated, async (req, res) => {
    try {
      const pendingItems = await storage.getPendingOnboardingItems();
      res.json(pendingItems);
    } catch (error) {
      console.error("Get pending onboarding summary error:", error);
      res.status(500).json({ error: "Failed to fetch pending onboarding items" });
    }
  });

  // Pipeline Analytics Routes
  app.get("/api/analytics/pipeline-metrics", isAuthenticated, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const metrics = await storage.getPipelineMetrics(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );
      
      res.json(metrics);
    } catch (error) {
      console.error("Get pipeline metrics error:", error);
      res.status(500).json({ error: "Failed to fetch pipeline metrics" });
    }
  });

  app.get("/api/analytics/time-to-hire", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getTimeToHireMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Get time-to-hire metrics error:", error);
      res.status(500).json({ error: "Failed to fetch time-to-hire metrics" });
    }
  });

  app.get("/api/analytics/funnel", isAuthenticated, async (req, res) => {
    try {
      const funnel = await storage.getCandidateFunnel();
      res.json(funnel);
    } catch (error) {
      console.error("Get funnel error:", error);
      res.status(500).json({ error: "Failed to fetch funnel data" });
    }
  });

  app.get("/api/analytics/bottlenecks", isAuthenticated, async (req, res) => {
    try {
      const bottlenecks = await storage.getBottleneckAnalysis();
      res.json(bottlenecks);
    } catch (error) {
      console.error("Get bottlenecks error:", error);
      res.status(500).json({ error: "Failed to fetch bottleneck analysis" });
    }
  });

  app.get("/api/analytics/weekly-activity", isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getWeeklyActivity();
      res.json(activity);
    } catch (error) {
      console.error("Get weekly activity error:", error);
      res.status(500).json({ error: "Failed to fetch weekly activity" });
    }
  });

  // Hiring Analytics Routes (dedicated endpoints)
  app.get("/api/hiring-analytics/pipeline-metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getHiringPipelineMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Get hiring pipeline metrics error:", error);
      res.status(500).json({ error: "Failed to fetch hiring pipeline metrics" });
    }
  });

  app.get("/api/hiring-analytics/source-performance", isAuthenticated, async (req, res) => {
    try {
      const performance = await storage.getSourcePerformance();
      res.json(performance);
    } catch (error) {
      console.error("Get source performance error:", error);
      res.status(500).json({ error: "Failed to fetch source performance metrics" });
    }
  });

  app.get("/api/hiring-analytics/time-to-hire", isAuthenticated, async (req, res) => {
    try {
      const timeMetrics = await storage.getTimeToHireAnalytics();
      res.json(timeMetrics);
    } catch (error) {
      console.error("Get time-to-hire analytics error:", error);
      res.status(500).json({ error: "Failed to fetch time-to-hire metrics" });
    }
  });

  // Compliance Analytics Routes
  app.get("/api/analytics/compliance-overview", isAuthenticated, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const overview = await storage.getComplianceOverview(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );
      
      res.json(overview);
    } catch (error) {
      console.error("Get compliance overview error:", error);
      res.status(500).json({ error: "Failed to fetch compliance overview" });
    }
  });

  app.get("/api/analytics/compliance-issues", isAuthenticated, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const issues = await storage.getCommonComplianceIssues(
        dateFrom ? new Date(dateFrom as string) : undefined,
        dateTo ? new Date(dateTo as string) : undefined
      );
      
      res.json(issues);
    } catch (error) {
      console.error("Get compliance issues error:", error);
      res.status(500).json({ error: "Failed to fetch compliance issues" });
    }
  });

  app.get("/api/analytics/compliance-trends", isAuthenticated, async (req, res) => {
    try {
      const weeksBack = req.query.weeksBack ? parseInt(req.query.weeksBack as string) : 12;
      const trends = await storage.getWeeklyComplianceTrends(weeksBack);
      
      res.json(trends);
    } catch (error) {
      console.error("Get compliance trends error:", error);
      res.status(500).json({ error: "Failed to fetch compliance trends" });
    }
  });

  app.get("/api/analytics/property-compliance", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getPropertyComplianceStats();
      res.json(stats);
    } catch (error) {
      console.error("Get property compliance error:", error);
      res.status(500).json({ error: "Failed to fetch property compliance stats" });
    }
  });

  app.get("/api/analytics/training-needs", isAuthenticated, async (req, res) => {
    try {
      const needs = await storage.getTrainingNeeds();
      res.json(needs);
    } catch (error) {
      console.error("Get training needs error:", error);
      res.status(500).json({ error: "Failed to fetch training needs" });
    }
  });

  // Master Analytics Dashboard TEST ENDPOINT - For testing without authentication
  app.get("/api/analytics/master-test", async (req, res) => {
    try {
      // Mock test data for comprehensive testing
      const masterAnalytics: MasterAnalytics = {
        hero: {
          totalCandidates: 42,
          complianceScore: 15.5,
          openMaintenance: 7,
          revenue: 185000,
          activeStaff: 28,
          occupancyRate: 87.5,
          taskCompletionRate: 92,
          lowStockAlerts: 3,
        },
        hiring: {
          totalCandidates: 42,
          byStage: {
            uploaded: 12,
            screened: 8,
            scheduled: 6,
            attended: 10,
            hired: 6,
          },
          bySource: {
            indeed: 20,
            referral: 10,
            website: 8,
            linkedin: 4,
          },
          conversionRate: 14.3,
          avgTimeToHire: 8.5,
        },
        staff: {
          total: 35,
          active: 28,
          complianceScore: 15.5,
          complianceRate: 91.2,
          totalComplianceEvents: 487,
        },
        maintenance: {
          total: 25,
          open: 7,
          byStatus: {
            pending: 4,
            in_progress: 3,
            completed: 18,
          },
          byPriority: {
            low: 8,
            medium: 10,
            high: 5,
            urgent: 2,
          },
        },
        properties: {
          total: 48,
          active: 42,
          occupancyRate: 87.5,
        },
        financial: {
          revenue: 185000,
          expenses: 125000,
          profit: 60000,
          profitMargin: 32.4,
        },
        ordering: {
          totalSpent: 45678,
          totalOrders: 123,
          lowStockCount: 3,
          lowStockProducts: [
            { productId: "prod-1", productName: "Toilet Paper", currentStock: 5, minStock: 20 },
            { productId: "prod-2", productName: "Hand Soap", currentStock: 8, minStock: 15 },
            { productId: "prod-3", productName: "Paper Towels", currentStock: 3, minStock: 10 },
          ],
        },
        tasks: {
          todayTotal: 25,
          todayCompleted: 23,
          todayCompletionRate: 92,
          overdue: 2,
        },
        ast: {
          totalProperties: 15,
          activeTenancies: 12,
          totalTenancies: 14,
          rentCollectionRate: 95,
        },
        training: {
          totalVideos: 24,
          totalCompletions: 186,
          completionRate: 77.5,
          byVideo: {},
        },
        customers: {
          totalLandlords: 18,
          activeLandlords: 16,
          totalContractors: 12,
          activeContractors: 10,
        },
        ai: {
          chatbotInteractions: 0,
          automatedTasks: 0,
          aiGeneratedInsights: 0,
        },
      };
      
      res.json(masterAnalytics);
    } catch (error) {
      console.error("Error in test endpoint:", error);
      res.status(500).json({ error: "Failed to fetch test analytics data" });
    }
  });

  // Master Analytics Dashboard - Aggregates all metrics
  app.get("/api/analytics/master", isAuthenticated, async (req, res) => {
    try {
      // Fetch all analytics data in parallel
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const [
        hiringMetrics,
        timeToHire,
        complianceOverview,
        allStaff,
        allProperties,
        maintenanceRequests,
        orderingAnalytics,
        dailyTasks,
        astProperties,
        astTenancies,
        trainingAnalytics,
      ] = await Promise.all([
        storage.getHiringPipelineMetrics().catch(() => ({ totalCandidates: 0, byStage: {}, bySource: {}, conversionRates: { overallConversion: 0 } })),
        storage.getTimeToHireAnalytics().catch(() => ({ averageDays: 0 })),
        storage.getComplianceOverview().catch(() => ({ totalEvents: 0, averageScore: 0, complianceRate: 0 })),
        storage.getAllStaff().catch(() => []),
        storage.getProperties().catch(() => []),
        storage.getMaintenanceRequests().catch(() => []),
        storage.getOrderingAnalytics().catch(() => ({ totalSpent: 0, totalOrders: 0, lowStockProducts: [] })),
        storage.getDailyTaskInstances(todayStr).catch(() => []),
        storage.getAstProperties().catch(() => []),
        storage.getAstTenancies().catch(() => []),
        storage.getTrainingAnalytics().catch(() => ({ totalVideos: 0, totalCompletions: 0, completionRate: 0 })),
      ]);

      // Calculate staff metrics
      const totalStaff = allStaff.length;
      const activeStaff = allStaff.filter(s => s.status === 'active').length;

      // Calculate maintenance metrics
      const openMaintenance = maintenanceRequests.filter(m => m.status === 'pending' || m.status === 'in_progress').length;
      const totalMaintenance = maintenanceRequests.length;
      const maintenanceByStatus = {
        pending: maintenanceRequests.filter(m => m.status === 'pending').length,
        in_progress: maintenanceRequests.filter(m => m.status === 'in_progress').length,
        completed: maintenanceRequests.filter(m => m.status === 'completed').length,
      };
      const maintenanceByPriority = {
        low: maintenanceRequests.filter(m => m.priority === 'low').length,
        medium: maintenanceRequests.filter(m => m.priority === 'medium').length,
        high: maintenanceRequests.filter(m => m.priority === 'high').length,
        urgent: maintenanceRequests.filter(m => m.priority === 'urgent').length,
      };

      // Calculate property metrics
      const totalProperties = allProperties.length;
      const activeProperties = allProperties.filter(p => p.status === 'active').length;
      const occupancyRate = totalProperties > 0 ? (activeProperties / totalProperties) * 100 : 0;

      // Calculate task metrics (dailyTasks contains today's tasks only)
      const todayCompleted = dailyTasks.filter(t => t.status === 'completed').length;
      const todayTotal = dailyTasks.length;
      const todayCompletionRate = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;
      
      // TODO: For overdue tasks, need to query past dates separately
      const overdueTasks = 0;

      // Calculate AST metrics
      const totalAstProperties = astProperties.length;
      const activeTenancies = astTenancies.filter(t => t.status === 'active').length;
      const totalTenancies = astTenancies.length;
      
      // Mock financial data (TODO: Replace with actual financial data when available)
      const mockRevenue = 125000;
      const mockExpenses = 87500;
      const mockProfit = mockRevenue - mockExpenses;

      // Aggregate response
      const masterAnalytics: MasterAnalytics = {
        // Hero KPIs
        hero: {
          totalCandidates: hiringMetrics.totalCandidates || 0,
          complianceScore: complianceOverview.averageScore || 0,
          openMaintenance: openMaintenance,
          revenue: mockRevenue, // TODO: Replace with actual
          activeStaff: activeStaff,
          occupancyRate: occupancyRate,
          taskCompletionRate: todayCompletionRate,
          lowStockAlerts: orderingAnalytics.lowStockProducts?.length || 0,
        },
        
        // Hiring Section
        hiring: {
          totalCandidates: hiringMetrics.totalCandidates || 0,
          byStage: hiringMetrics.byStage || {},
          bySource: hiringMetrics.bySource || {},
          conversionRate: hiringMetrics.conversionRates?.overallConversion || 0,
          avgTimeToHire: timeToHire.averageDays || 0,
        },
        
        // Staff Section
        staff: {
          total: totalStaff,
          active: activeStaff,
          complianceScore: complianceOverview.averageScore || 0,
          complianceRate: complianceOverview.complianceRate || 0,
          totalComplianceEvents: complianceOverview.totalEvents || 0,
        },
        
        // Maintenance Section
        maintenance: {
          total: totalMaintenance,
          open: openMaintenance,
          byStatus: maintenanceByStatus,
          byPriority: maintenanceByPriority,
        },
        
        // Properties Section
        properties: {
          total: totalProperties,
          active: activeProperties,
          occupancyRate: occupancyRate,
        },
        
        // Financial Section (Mock data)
        financial: {
          revenue: mockRevenue, // TODO: Replace with actual
          expenses: mockExpenses, // TODO: Replace with actual
          profit: mockProfit, // TODO: Replace with actual
          profitMargin: mockRevenue > 0 ? (mockProfit / mockRevenue) * 100 : 0,
        },
        
        // Ordering Section
        ordering: {
          totalSpent: orderingAnalytics.totalSpent || 0,
          totalOrders: orderingAnalytics.totalOrders || 0,
          lowStockCount: orderingAnalytics.lowStockProducts?.length || 0,
          lowStockProducts: orderingAnalytics.lowStockProducts || [],
        },
        
        // Tasks Section
        tasks: {
          todayTotal: todayTotal,
          todayCompleted: todayCompleted,
          todayCompletionRate: todayCompletionRate,
          overdue: overdueTasks,
        },
        
        // AST Properties Section
        ast: {
          totalProperties: totalAstProperties,
          activeTenancies: activeTenancies,
          totalTenancies: totalTenancies,
          occupancyRate: totalTenancies > 0 ? (activeTenancies / totalTenancies) * 100 : 0,
          // TODO: Add rent collection rate when payment tracking is implemented
          rentCollectionRate: 85, // Mock data
        },
        
        // Training Section
        training: {
          totalVideos: trainingAnalytics.totalVideos || 0,
          totalCompletions: trainingAnalytics.totalCompletions || 0,
          completionRate: trainingAnalytics.completionRate || 0,
        },
      };

      res.json(masterAnalytics);
    } catch (error) {
      console.error("Get master analytics error:", error);
      res.status(500).json({ error: "Failed to fetch master analytics" });
    }
  });

  // ===== Schedule Collaboration (AI Chatbot) Routes =====
  // Note: These endpoints allow unauthenticated access for collaborative chatbot workflow
  
  app.post("/api/schedule-conversations", async (req: any, res) => {
    try {
      const { weekStart } = req.body;
      
      if (!weekStart) {
        return res.status(400).json({ error: "weekStart is required" });
      }
      
      // Use authenticated user ID if available, otherwise use "anonymous" for collaborative workflow
      const userId = req.user?.claims?.sub || "anonymous";
      
      const { createConversation } = await import("./conversation-service");
      const conversation = await createConversation(userId, weekStart);
      
      res.json(conversation);
    } catch (error: any) {
      console.error("Create conversation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  
  app.get("/api/schedule-conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const { getConversation } = await import("./conversation-service");
      const conversation = await getConversation(id);
      
      res.json(conversation);
    } catch (error: any) {
      console.error("Get conversation error:", error);
      if (error.message === "Conversation not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  
  app.post("/api/schedule-conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "message is required and must be a string" });
      }
      
      const { sendMessage } = await import("./conversation-service");
      const result = await sendMessage(id, message);
      
      res.json(result);
    } catch (error: any) {
      console.error("Send message error:", error);
      if (error.message === "Conversation not found") {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  app.get("/api/schedule-drafts", async (req, res) => {
    try {
      const { weekStart } = req.query;
      
      const drafts = await storage.getScheduleDrafts(weekStart ? String(weekStart) : undefined);
      
      res.json(drafts);
    } catch (error: any) {
      console.error("Get drafts error:", error);
      res.status(500).json({ error: "Failed to fetch drafts" });
    }
  });
  
  app.patch("/api/schedule-drafts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const { updateDraft } = await import("./conversation-service");
      const draft = await updateDraft(id, updates);
      
      res.json(draft);
    } catch (error: any) {
      console.error("Update draft error:", error);
      res.status(500).json({ error: "Failed to update draft" });
    }
  });
  
  app.post("/api/schedule-drafts/:id/finalize", async (req, res) => {
    try {
      const { id } = req.params;
      
      const { finalizeDraft } = await import("./conversation-service");
      const result = await finalizeDraft(id);
      
      res.json(result);
    } catch (error: any) {
      console.error("Finalize draft error:", error);
      if (error.message === "Draft not found" || error.message === "Draft already finalized" || error.message === "Cannot finalize empty draft") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to finalize draft" });
    }
  });

  // ===== Personal Staff Calendar Routes =====
  
  app.post("/api/staff/:staffId/calendar-token", isAuthenticated, async (req, res) => {
    try {
      const { staffId } = req.params;
      const { expiresInDays } = req.body;
      
      const { generateCalendarToken } = await import("./calendar-token-service");
      const result = await generateCalendarToken(staffId, expiresInDays);
      
      // Return token (only time it's shown!)
      res.json({
        id: result.id,
        token: result.token,
        staffId,
        expiresInDays: expiresInDays || null,
      });
    } catch (error: any) {
      console.error("Generate calendar token error:", error);
      res.status(500).json({ error: "Failed to generate calendar token" });
    }
  });
  
  app.get("/api/calendar/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { weekStart } = req.query;
      
      if (!weekStart || typeof weekStart !== "string") {
        return res.status(400).json({ error: "weekStart query parameter is required" });
      }
      
      const { verifyCalendarToken, getStaffCalendar } = await import("./calendar-token-service");
      
      // Verify token
      const verification = await verifyCalendarToken(token);
      if (!verification.valid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      // Get calendar
      const assignments = await getStaffCalendar(verification.staffId, weekStart);
      
      res.json({
        staffId: verification.staffId,
        weekStart,
        assignments,
      });
    } catch (error: any) {
      console.error("Get calendar error:", error);
      if (error.message && error.message.includes("Invalid")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch calendar" });
    }
  });
  
  app.delete("/api/staff/calendar-tokens/:tokenId", isAuthenticated, async (req, res) => {
    try {
      const { tokenId } = req.params;
      
      const { revokeCalendarToken } = await import("./calendar-token-service");
      const revoked = await revokeCalendarToken(tokenId);
      
      if (!revoked) {
        return res.status(404).json({ error: "Token not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Revoke calendar token error:", error);
      res.status(500).json({ error: "Failed to revoke token" });
    }
  });

  // ===== Manual Onboarding Routes =====
  
  app.post("/api/staff/:staffId/onboarding-request", isAuthenticated, async (req, res) => {
    try {
      const { staffId } = req.params;
      const { requestedFields } = req.body;
      
      if (!requestedFields || !Array.isArray(requestedFields) || requestedFields.length === 0) {
        return res.status(400).json({ error: "requestedFields array is required" });
      }
      
      const { sendOnboardingRequest } = await import("./manual-onboarding-service");
      const result = await sendOnboardingRequest(staffId, requestedFields);
      
      res.json({
        requestId: result.requestId,
        message: "Onboarding request sent successfully",
      });
    } catch (error: any) {
      console.error("Send onboarding request error:", error);
      if (error.message.includes("not found") || error.message.includes("no phone")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to send onboarding request" });
    }
  });
  
  app.get("/api/staff-onboarding/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const { verifyOnboardingToken } = await import("./manual-onboarding-service");
      const verification = await verifyOnboardingToken(token);
      
      if (!verification.valid) {
        return res.status(401).json({ 
          error: verification.message || "Invalid or expired token" 
        });
      }
      
      res.json({
        requestId: verification.request!.id,
        staffId: verification.request!.staffId,
        requestedFields: verification.request!.requestedFields,
        status: verification.request!.status,
      });
    } catch (error: any) {
      console.error("Verify onboarding token error:", error);
      res.status(500).json({ error: "Failed to verify token" });
    }
  });
  
  app.post("/api/staff-onboarding/:token/submit", async (req, res) => {
    try {
      const { token } = req.params;
      const data = req.body;
      
      const { submitOnboardingData } = await import("./manual-onboarding-service");
      const result = await submitOnboardingData(token, data);
      
      res.json({
        success: true,
        staffId: result.staffId,
        message: "Onboarding data submitted successfully",
      });
    } catch (error: any) {
      console.error("Submit onboarding data error:", error);
      if (error.message.includes("Invalid") || error.message.includes("expired")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to submit onboarding data" });
    }
  });

  // ===== Staff Communication Routes (SMS & Call) =====
  
  // Send SMS to a staff member via Twilio
  app.post("/api/staff/:staffId/send-sms", isAuthenticated, async (req, res) => {
    try {
      const { staffId } = req.params;
      const { message } = req.body;
      
      if (!message || message.trim() === "") {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Get staff member
      const staff = await storage.getStaffById(staffId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      if (!staff.phone) {
        return res.status(400).json({ error: "Staff member has no phone number" });
      }
      
      // Send SMS via Twilio
      const result = await sendGenericSMS(staff.phone, message);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send SMS" });
      }
      
      res.json({ 
        success: true, 
        message: "SMS sent successfully",
        messageId: result.messageId 
      });
    } catch (error: any) {
      console.error("Send staff SMS error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });
  
  // Initiate call to a staff member via JustCall
  app.post("/api/staff/:staffId/initiate-call", isAuthenticated, async (req, res) => {
    try {
      const { staffId } = req.params;
      
      // Get staff member
      const staff = await storage.getStaffById(staffId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      if (!staff.phone) {
        return res.status(400).json({ error: "Staff member has no phone number" });
      }
      
      // Initiate call via JustCall
      const result = await initiateCall(staff.phone, staff.fullName);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to initiate call" });
      }
      
      res.json({ 
        success: true, 
        message: "Call initiated successfully",
        callId: result.callId 
      });
    } catch (error: any) {
      console.error("Initiate staff call error:", error);
      res.status(500).json({ error: "Failed to initiate call" });
    }
  });

  // ===== Maintenance Management Routes =====
  
  // Get all maintenance requests
  app.get("/api/maintenance/requests", isAuthenticated, async (req, res) => {
    try {
      const { propertyId, status, priority, serviceType } = req.query;
      
      const filters: any = {};
      if (propertyId) filters.propertyId = propertyId;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (serviceType) filters.serviceType = serviceType;
      
      const requests = await storage.getMaintenanceRequests(filters);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching maintenance requests:", error);
      res.status(500).json({ error: "Failed to fetch maintenance requests" });
    }
  });

  // Get signed upload URL for maintenance photo
  app.post("/api/maintenance/photos/upload-url", isAuthenticated, async (req: any, res) => {
    try {
      // CRITICAL: Use Zod to validate all inputs including fileSize as positive finite number
      const uploadUrlSchema = z.object({
        maintenanceRequestId: z.string().min(1),
        fileName: z.string().min(1),
        mimeType: z.string().regex(/^image\/(jpeg|jpg|png)$/),
        fileSize: z.number().finite().positive().max(10 * 1024 * 1024), // Max 10MB
      });

      const validated = uploadUrlSchema.parse(req.body);
      
      const { maintenancePhotoStorage } = await import("./object-storage");
      
      // Additional validation through service (redundant but defensive)
      maintenancePhotoStorage.validateFileSize(validated.fileSize);
      maintenancePhotoStorage.validateMimeType(validated.mimeType);
      
      const { uploadURL, storageKey } = await maintenancePhotoStorage.getPhotoUploadURL(
        validated.maintenanceRequestId,
        validated.fileName,
        validated.mimeType
      );
      
      res.json({ uploadURL, storageKey });
    } catch (error: any) {
      // Handle Zod validation errors
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          error: "Invalid upload request", 
          details: error.errors 
        });
      }
      console.error("Error generating maintenance photo upload URL:", error);
      res.status(400).json({ error: error.message || "Failed to generate upload URL" });
    }
  });

  // Get signed download URL for maintenance photo
  app.get("/api/maintenance/photos/:storageKey/download-url", isAuthenticated, async (req, res) => {
    try {
      const { storageKey } = req.params;
      const decodedKey = decodeURIComponent(storageKey);
      
      const { maintenancePhotoStorage } = await import("./object-storage");
      const downloadURL = await maintenancePhotoStorage.getSignedDownloadURL(decodedKey);
      
      res.json({ downloadURL });
    } catch (error: any) {
      console.error("Error generating maintenance photo download URL:", error);
      res.status(404).json({ error: error.message || "Failed to generate download URL" });
    }
  });

  // Delete maintenance photo
  app.delete("/api/maintenance/photos/:storageKey", isAuthenticated, async (req, res) => {
    try {
      const { storageKey } = req.params;
      const decodedKey = decodeURIComponent(storageKey);
      
      const { maintenancePhotoStorage } = await import("./object-storage");
      await maintenancePhotoStorage.deletePhoto(decodedKey);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting maintenance photo:", error);
      res.status(404).json({ error: error.message || "Failed to delete photo" });
    }
  });

  // Suggest contractor for maintenance request
  app.post("/api/maintenance/suggest-contractor", isAuthenticated, async (req: any, res) => {
    try {
      const { serviceType, propertyId } = req.body;

      if (!serviceType || !propertyId) {
        return res.status(400).json({ error: "serviceType and propertyId are required" });
      }

      const { suggestContractor, getContractorSuggestionReason } = await import("./services/contractor-suggestion");
      
      const suggestedContractorId = await suggestContractor(serviceType, propertyId, storage);
      
      if (!suggestedContractorId) {
        return res.json({ suggestedContractorId: null, reason: null });
      }

      const reason = await getContractorSuggestionReason(
        suggestedContractorId,
        serviceType,
        propertyId,
        storage
      );

      const contractor = await storage.getContractor(suggestedContractorId);
      
      res.json({
        suggestedContractorId,
        contractor,
        reason,
      });
    } catch (error) {
      console.error("Error suggesting contractor:", error);
      res.status(500).json({ error: "Failed to suggest contractor" });
    }
  });

  // Create new maintenance request (JSON with cloud storage keys)
  app.post("/api/maintenance/requests", isAuthenticated, async (req: any, res) => {
    try {
      console.log("[Maintenance] Request received (cloud storage)");
      console.log("[Maintenance] Content-Type:", req.headers['content-type']);
      
      // Validate request body is valid JSON
      if (!req.body || typeof req.body !== 'object') {
        console.error("[Maintenance] Invalid request body:", typeof req.body);
        return res.status(400).json({
          error: "Invalid request format",
          details: "Request body must be valid JSON"
        });
      }

      // Parse request data (now JSON, not FormData)
      const formData = {
        propertyId: req.body.propertyId,
        title: req.body.title,
        description: req.body.description,
        priority: req.body.priority,
        serviceType: req.body.serviceType,
        assignedWorkerId: req.body.assignedWorkerId,
        reportedBy: req.body.reportedBy,
        suggestedContractorId: req.body.suggestedContractorId || undefined,
        googleDriveLink: req.body.googleDriveLink || undefined,
        guestName: req.body.guestName || undefined,
        guestPhone: req.body.guestPhone || undefined,
        availabilityDate: req.body.availabilityDate ? new Date(req.body.availabilityDate) : undefined,
        availabilityTime: req.body.availabilityTime || undefined,
        propertyAddress: req.body.propertyAddress || undefined,
        accessCode: req.body.accessCode || undefined,
        wifiDetails: req.body.wifiDetails || undefined,
        checkInDetails: req.body.checkInDetails || undefined,
        detailsVerified: req.body.detailsVerified === true || req.body.detailsVerified === "true",
        landlordId: req.body.landlordId && req.body.landlordId !== "" ? parseInt(req.body.landlordId) : undefined,
        likelyCost: req.body.likelyCost && req.body.likelyCost !== "" ? parseFloat(req.body.likelyCost) : undefined,
        notifyClient: req.body.notifyClient === true || req.body.notifyClient === "true",
        notes: req.body.notes || undefined,
        photoGcsPaths: req.body.photoGcsPaths || [] as string[],
      };

      // Log cloud storage photos
      if (formData.photoGcsPaths && formData.photoGcsPaths.length > 0) {
        console.log(`[Maintenance] Using ${formData.photoGcsPaths.length} cloud storage photo(s):`, formData.photoGcsPaths);
      }

      // Log the data being validated
      console.log("[Maintenance] Validating form data:", JSON.stringify(formData, null, 2));

      // Validate the complete form data
      const validated = insertMaintenanceRequestSchema.parse(formData);
        
        // Auto-suggest contractor if not provided and service type requires one
        if (!validated.suggestedContractorId && validated.serviceType !== 'general') {
          const { suggestContractor } = await import("./services/contractor-suggestion");
          const suggestedId = await suggestContractor(
            validated.serviceType,
            validated.propertyId,
            storage
          );
          if (suggestedId) {
            validated.suggestedContractorId = suggestedId;
            console.log(`[Maintenance] Auto-suggested contractor: ${suggestedId} for service type: ${validated.serviceType}`);
          }
        }
        
        const request = await storage.createMaintenanceRequest(validated);
      
      // Log activity
      await ActivityLogger.logFromRequest(req, {
        action: 'created',
        resourceType: 'maintenance_request',
        resourceId: request.id,
        resourceName: request.title,
        details: {
          serviceType: request.serviceType,
          priority: request.priority,
          propertyId: request.propertyId,
          assignedWorkerId: request.assignedWorkerId,
          notifyClient: request.notifyClient,
        },
      });
      
      // Send notifications asynchronously (don't block response)
      // Use Promise.allSettled to ensure all notifications are attempted regardless of failures
      (async () => {
        try {
          // Fetch related data for notifications
          const [assignedWorker, reportedBy, landlord] = await Promise.all([
            storage.getStaffMember(request.assignedWorkerId),
            storage.getStaffMember(request.reportedBy),
            request.landlordId ? storage.getLandlord(request.landlordId) : Promise.resolve(null)
          ]);
          
          // Format dates nicely
          const formatDate = (date: Date | null) => {
            if (!date) return "Not specified";
            const d = new Date(date);
            const day = d.getDate();
            const suffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                          day === 2 || day === 22 ? 'nd' : 
                          day === 3 || day === 23 ? 'rd' : 'th';
            const month = d.toLocaleString('en-GB', { month: 'long' });
            const year = d.getFullYear();
            return `${day}${suffix} ${month} ${year}`;
          };
          
          const availabilityDate = formatDate(request.availabilityDate);
          const availabilityTime = request.availabilityTime || "Not specified";
          const assignedWorkerName = assignedWorker?.fullName || "Staff member";
          const reportedByName = reportedBy?.fullName || "Team member";
          
          // Prepare notification promises
          const notificationPromises: Promise<any>[] = [];
          
          // 1. SMS to Guest (if guestPhone exists)
          if (request.guestPhone && request.guestName) {
            console.log('[Maintenance Notification] Sending guest SMS...');
            notificationPromises.push(
              sendMaintenanceGuestNotificationSMS(
                request.guestPhone,
                request.guestName,
                request.propertyAddress || "the property",
                availabilityDate,
                availabilityTime,
                assignedWorkerName
              ).then(result => ({ type: 'guest_sms', ...result }))
            );
          } else {
            console.log('[Maintenance Notification] Skipping guest SMS - no guest contact info');
          }
          
          // 2. Email to Landlord (if landlordId exists)
          if (request.landlordId && landlord) {
            console.log('[Maintenance Notification] Sending landlord email...');
            notificationPromises.push(
              sendMaintenanceLandlordEmail(
                landlord.email,
                landlord.name,
                {
                  propertyAddress: request.propertyAddress || "Unknown property",
                  title: request.title,
                  description: request.description,
                  priority: request.priority,
                  reportedByName,
                  assignedWorkerName,
                  likelyCost: request.likelyCost,
                  availabilityDate,
                  availabilityTime
                }
              ).then(result => ({ type: 'landlord_email', ...result }))
            );
          } else {
            console.log('[Maintenance Notification] Skipping landlord email - no landlord reference');
          }
          
          // 3. SMS to Contractor/Assigned Staff (always sent)
          if (assignedWorker?.phone) {
            console.log('[Maintenance Notification] Sending staff SMS...');
            notificationPromises.push(
              sendMaintenanceStaffSMS(
                assignedWorker.phone,
                {
                  propertyAddress: request.propertyAddress || "Unknown property",
                  title: request.title,
                  description: request.description,
                  availabilityDate,
                  availabilityTime,
                  accessCode: request.accessCode || "Not specified",
                  wifiDetails: request.wifiDetails || "Not specified",
                  guestName: request.guestName || "Not specified",
                  guestPhone: request.guestPhone || "Not specified",
                  checkInDetails: request.checkInDetails || "Not specified",
                  photos: request.photoGcsPaths || []
                }
              ).then(result => ({ type: 'staff_sms', ...result }))
            );
          } else {
            console.warn('[Maintenance Notification] WARNING: Cannot send staff SMS - assigned worker has no phone number');
          }
          
          // Send all notifications and log results
          const results = await Promise.allSettled(notificationPromises);
          
          results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              const { type, success, error } = result.value;
              if (success) {
                console.log(`[Maintenance Notification] ✓ ${type} sent successfully`);
              } else {
                console.error(`[Maintenance Notification] ✗ ${type} failed:`, error);
              }
            } else {
              console.error('[Maintenance Notification] ✗ Notification promise rejected:', result.reason);
            }
          });
          
        } catch (notificationError) {
          console.error('[Maintenance Notification] Error sending notifications:', notificationError);
        }
      })();
      
      // Return the created request immediately (don't wait for notifications)
      res.json(request);
    } catch (error: any) {
      if (error.name === "ZodError") {
        console.error("[Maintenance] Zod validation failed:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Error creating maintenance request:", error);
      res.status(500).json({ error: "Failed to create maintenance request", details: error.message });
    }
  });

  // Get single maintenance request
  app.get("/api/maintenance/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const request = await storage.getMaintenanceRequest(id);
      
      if (!request) {
        return res.status(404).json({ error: "Maintenance request not found" });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error fetching maintenance request:", error);
      res.status(500).json({ error: "Failed to fetch maintenance request" });
    }
  });

  // Update maintenance request
  app.patch("/api/maintenance/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const request = await storage.updateMaintenanceRequest(id, updates);
      res.json(request);
    } catch (error) {
      console.error("Error updating maintenance request:", error);
      res.status(500).json({ error: "Failed to update maintenance request" });
    }
  });

  // Delete maintenance request
  app.delete("/api/maintenance/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMaintenanceRequest(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting maintenance request:", error);
      res.status(500).json({ error: "Failed to delete maintenance request" });
    }
  });

  // Assign maintenance request to contractor
  app.post("/api/maintenance/requests/:id/assign", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { contractorId, scheduledDate, estimatedCost } = req.body;
      
      if (!contractorId) {
        return res.status(400).json({ error: "contractorId is required" });
      }
      
      const assignment = await storage.assignMaintenanceRequest(
        id,
        contractorId,
        scheduledDate ? new Date(scheduledDate) : undefined,
        estimatedCost
      );
      
      // Send SMS notification to contractor if they have a phone number
      try {
        const contractor = await storage.getContractor(contractorId);
        const request = await storage.getMaintenanceRequest(id);
        
        if (contractor?.phone && request) {
          const { sendSMS } = await import("./twilio");
          await sendSMS(
            contractor.phone,
            `New maintenance assignment: ${request.title} at property. ${scheduledDate ? `Scheduled for ${new Date(scheduledDate).toLocaleDateString()}` : 'Please contact for scheduling.'}`
          );
        }
      } catch (smsError) {
        console.error("Failed to send SMS to contractor:", smsError);
        // Don't fail the assignment if SMS fails
      }
      
      res.json(assignment);
    } catch (error) {
      console.error("Error assigning maintenance request:", error);
      res.status(500).json({ error: "Failed to assign maintenance request" });
    }
  });

  // Complete maintenance request
  app.post("/api/maintenance/requests/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { actualCost, notes } = req.body;
      
      const request = await storage.completeMaintenanceRequest(id, actualCost, notes);
      res.json(request);
    } catch (error) {
      console.error("Error completing maintenance request:", error);
      res.status(500).json({ error: "Failed to complete maintenance request" });
    }
  });

  // Get all contractors
  app.get("/api/maintenance/contractors", isAuthenticated, async (req, res) => {
    try {
      const { isActive, specialty } = req.query;
      
      const filters: any = {};
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (specialty) filters.specialty = specialty;
      
      const contractors = await storage.getContractors(filters);
      res.json(contractors);
    } catch (error) {
      console.error("Error fetching contractors:", error);
      res.status(500).json({ error: "Failed to fetch contractors" });
    }
  });

  // Create new contractor
  app.post("/api/maintenance/contractors", isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertContractorSchema.parse(req.body);
      const contractor = await storage.createContractor(validated);
      res.json(contractor);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid contractor data", details: error.errors });
      }
      console.error("Error creating contractor:", error);
      res.status(500).json({ error: "Failed to create contractor" });
    }
  });

  // Get single contractor
  app.get("/api/maintenance/contractors/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const contractor = await storage.getContractor(id);
      
      if (!contractor) {
        return res.status(404).json({ error: "Contractor not found" });
      }
      
      res.json(contractor);
    } catch (error) {
      console.error("Error fetching contractor:", error);
      res.status(500).json({ error: "Failed to fetch contractor" });
    }
  });

  // Update contractor
  app.patch("/api/maintenance/contractors/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Validate the update data using insertContractorSchema (partial)
      const validatedUpdates = insertContractorSchema.partial().parse(updates);
      
      const contractor = await storage.updateContractor(id, validatedUpdates);
      res.json(contractor);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid contractor data", details: error.errors });
      }
      console.error("Error updating contractor:", error);
      res.status(500).json({ error: "Failed to update contractor" });
    }
  });

  // Delete contractor
  app.delete("/api/maintenance/contractors/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteContractor(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contractor:", error);
      res.status(500).json({ error: "Failed to delete contractor" });
    }
  });

  // Get maintenance statistics
  app.get("/api/maintenance/stats", isAuthenticated, async (req, res) => {
    try {
      const [propertyStats, contractorPerformance] = await Promise.all([
        storage.getMaintenanceStatsByProperty(),
        storage.getContractorPerformance()
      ]);
      
      res.json({
        propertyStats,
        contractorPerformance
      });
    } catch (error) {
      console.error("Error fetching maintenance statistics:", error);
      res.status(500).json({ error: "Failed to fetch maintenance statistics" });
    }
  });

  // Get maintenance requests by staff member
  app.get("/api/maintenance/requests/staff/:staffId", isAuthenticated, async (req, res) => {
    try {
      const { staffId } = req.params;
      const requests = await storage.getMaintenanceRequestsByStaff(staffId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching staff maintenance requests:", error);
      res.status(500).json({ error: "Failed to fetch staff maintenance requests" });
    }
  });

  // ===== Inspection System Routes =====

  // Get all inspection templates
  app.get("/api/inspections/templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getInspectionTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching inspection templates:", error);
      res.status(500).json({ error: "Failed to fetch inspection templates" });
    }
  });

  // Create new inspection template
  app.post("/api/inspections/templates", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.createInspectionTemplate(req.body);
      res.json(template);
    } catch (error) {
      console.error("Error creating inspection template:", error);
      res.status(500).json({ error: "Failed to create inspection template" });
    }
  });

  // Get single inspection template
  app.get("/api/inspections/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.getInspectionTemplate(id);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching inspection template:", error);
      res.status(500).json({ error: "Failed to fetch inspection template" });
    }
  });

  // Update inspection template
  app.patch("/api/inspections/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const template = await storage.updateInspectionTemplate(id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating inspection template:", error);
      res.status(500).json({ error: "Failed to update inspection template" });
    }
  });

  // Delete inspection template
  app.delete("/api/inspections/templates/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInspectionTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting inspection template:", error);
      res.status(500).json({ error: "Failed to delete inspection template" });
    }
  });

  // Get all inspection reports
  app.get("/api/inspections/reports", isAuthenticated, async (req, res) => {
    try {
      const reports = await storage.getInspectionReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching inspection reports:", error);
      res.status(500).json({ error: "Failed to fetch inspection reports" });
    }
  });

  // Create new inspection report
  app.post("/api/inspections/reports", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.createInspectionReport(req.body);
      res.json(report);
    } catch (error) {
      console.error("Error creating inspection report:", error);
      res.status(500).json({ error: "Failed to create inspection report" });
    }
  });

  // Get single inspection report
  app.get("/api/inspections/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const report = await storage.getInspectionReport(id);
      
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      // Get items and issues for this report
      const [items, issues] = await Promise.all([
        storage.getInspectionItems(id),
        storage.getInspectionIssues(id)
      ]);
      
      res.json({ ...report, items, issues });
    } catch (error) {
      console.error("Error fetching inspection report:", error);
      res.status(500).json({ error: "Failed to fetch inspection report" });
    }
  });

  // Update inspection report
  app.patch("/api/inspections/reports/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const report = await storage.updateInspectionReport(id, req.body);
      res.json(report);
    } catch (error) {
      console.error("Error updating inspection report:", error);
      res.status(500).json({ error: "Failed to update inspection report" });
    }
  });

  // Complete inspection report
  app.post("/api/inspections/reports/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { overallScore } = req.body;
      
      if (overallScore === undefined || overallScore < 0 || overallScore > 100) {
        return res.status(400).json({ error: "Invalid overall score. Must be between 0 and 100." });
      }
      
      const report = await storage.completeInspection(id, overallScore);
      res.json(report);
    } catch (error) {
      console.error("Error completing inspection:", error);
      res.status(500).json({ error: "Failed to complete inspection" });
    }
  });

  // Submit inspection checklist items
  app.post("/api/inspections/reports/:id/items", isAuthenticated, async (req, res) => {
    try {
      const { id: reportId } = req.params;
      const { items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Items must be an array" });
      }
      
      // Add reportId to each item
      const itemsWithReportId = items.map(item => ({ ...item, reportId }));
      const createdItems = await storage.bulkCreateInspectionItems(itemsWithReportId);
      res.json(createdItems);
    } catch (error) {
      console.error("Error creating inspection items:", error);
      res.status(500).json({ error: "Failed to create inspection items" });
    }
  });

  // Update inspection item
  app.patch("/api/inspections/items/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.updateInspectionItem(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating inspection item:", error);
      res.status(500).json({ error: "Failed to update inspection item" });
    }
  });

  // Log inspection issue
  app.post("/api/inspections/reports/:id/issues", isAuthenticated, async (req, res) => {
    try {
      const { id: reportId } = req.params;
      const issueData = { ...req.body, reportId };
      const issue = await storage.createInspectionIssue(issueData);
      res.json(issue);
    } catch (error) {
      console.error("Error creating inspection issue:", error);
      res.status(500).json({ error: "Failed to create inspection issue" });
    }
  });

  // Get all inspection issues
  app.get("/api/inspections/issues", isAuthenticated, async (req, res) => {
    try {
      const { reportId } = req.query;
      const issues = await storage.getInspectionIssues(reportId as string);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching inspection issues:", error);
      res.status(500).json({ error: "Failed to fetch inspection issues" });
    }
  });

  // Update inspection issue
  app.patch("/api/inspections/issues/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const issue = await storage.updateInspectionIssue(id, req.body);
      res.json(issue);
    } catch (error) {
      console.error("Error updating inspection issue:", error);
      res.status(500).json({ error: "Failed to update inspection issue" });
    }
  });

  // Link issue to maintenance request
  app.post("/api/inspections/issues/:id/link-maintenance", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { maintenanceRequestId } = req.body;
      
      if (!maintenanceRequestId) {
        return res.status(400).json({ error: "Maintenance request ID is required" });
      }
      
      const issue = await storage.linkIssueToMaintenanceRequest(id, maintenanceRequestId);
      res.json(issue);
    } catch (error) {
      console.error("Error linking issue to maintenance request:", error);
      res.status(500).json({ error: "Failed to link issue to maintenance request" });
    }
  });

  // Get property inspection history
  app.get("/api/inspections/properties/:propertyId/history", isAuthenticated, async (req, res) => {
    try {
      const { propertyId } = req.params;
      const history = await storage.getPropertyInspectionHistory(propertyId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching property inspection history:", error);
      res.status(500).json({ error: "Failed to fetch property inspection history" });
    }
  });

  // Get inspection analytics
  app.get("/api/inspections/analytics", isAuthenticated, async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      
      const fromDate = dateFrom ? new Date(dateFrom as string) : undefined;
      const toDate = dateTo ? new Date(dateTo as string) : undefined;
      
      const analytics = await storage.getInspectionAnalytics(fromDate, toDate);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching inspection analytics:", error);
      res.status(500).json({ error: "Failed to fetch inspection analytics" });
    }
  });

  // Get all notification settings
  app.get("/api/inspections/notification-settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getNotificationSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ error: "Failed to fetch notification settings" });
    }
  });

  // Create notification setting
  app.post("/api/inspections/notification-settings", isAuthenticated, async (req, res) => {
    try {
      const setting = await storage.createNotificationSetting(req.body);
      res.json(setting);
    } catch (error) {
      console.error("Error creating notification setting:", error);
      res.status(500).json({ error: "Failed to create notification setting" });
    }
  });

  // Update notification setting
  app.patch("/api/inspections/notification-settings/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const setting = await storage.updateNotificationSetting(id, req.body);
      res.json(setting);
    } catch (error) {
      console.error("Error updating notification setting:", error);
      res.status(500).json({ error: "Failed to update notification setting" });
    }
  });

  // Delete notification setting
  app.delete("/api/inspections/notification-settings/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNotificationSetting(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification setting:", error);
      res.status(500).json({ error: "Failed to delete notification setting" });
    }
  });

  // Test endpoint for debugging
  app.post("/api/inspections/test-upload", isAuthenticated, async (req, res) => {
    console.log("[TEST-UPLOAD] Test endpoint hit!");
    res.json({ success: true, message: "Test endpoint works!" });
  });

  // Upload PDF inspection report with AI extraction
  app.post("/api/inspections/upload-pdf", isAuthenticated, async (req: any, res) => {
    console.log("[INSPECTION-UPLOAD] Route hit! Starting upload process...");
    console.log("[INSPECTION-UPLOAD] Content-Type:", req.headers['content-type']);
    
    try {
      console.log("[INSPECTION-UPLOAD] Importing upload config...");
      const { uploadConfigs } = await import("./upload-config");
      const upload = uploadConfigs.inspections;
      
      console.log("[INSPECTION-UPLOAD] Setting up multer handler for 'pdf' field...");
      upload.single("pdf")(req, res, async (err: any) => {
        console.log("[INSPECTION-UPLOAD] Multer callback invoked");
        
        if (err) {
          console.error("[INSPECTION-UPLOAD] Multer error:", err);
          console.error("[INSPECTION-UPLOAD] Error details:", {
            message: err.message,
            code: err.code,
            field: err.field,
            stack: err.stack
          });
          return res.status(400).json({ 
            error: err.message || "File upload failed",
            details: err.toString()
          });
        }
        
        console.log("[INSPECTION-UPLOAD] File object:", req.file ? 'Present' : 'Missing');
        
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        if (req.file.mimetype !== "application/pdf") {
          return res.status(400).json({ error: "Only PDF files are allowed" });
        }
        
        try {
          // File is already saved to disk, just use the local URL
          console.log("[INSPECTION-UPLOAD] File saved locally:", req.file.filename);
          const pdfUrl = `/uploads/inspections/${req.file.filename}`;
          
          // Get properties and templates for auto-matching
          const properties = await storage.getProperties();
          const templates = await storage.getInspectionTemplates();
          
          // Use first template or create a default one
          let templateId = req.body.templateId;
          if (!templateId && templates.length > 0) {
            templateId = templates[0].id;
          }
          
          console.log("[INSPECTION-UPLOAD] Creating inspection record...");
          const inspection = await storage.createPdfInspection({
            pdfUrl,
            sourceType: "rentcheck",
            propertyId: req.body.propertyId || properties[0]?.id || null,
            inspectorId: req.body.inspectorId || null,
            templateId: templateId || null,
          });
          
          console.log(`[INSPECTION-UPLOAD] Inspection ${inspection.id} created, triggering AI extraction...`);
          
          const { extractInspectionData } = await import("./services/inspection-extraction");
          extractInspectionData(inspection.id).catch(error => {
            console.error(`[INSPECTION-UPLOAD] Background AI extraction failed for ${inspection.id}:`, error);
          });
          
          res.json({ 
            id: inspection.id,
            status: "in_progress",
            message: "PDF uploaded successfully. AI extraction in progress.",
          });
        } catch (uploadError) {
          console.error("[INSPECTION-UPLOAD] Error during upload:", uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : "Unknown error";
          return res.status(500).json({ 
            error: `Failed to upload inspection PDF: ${errorMessage}`
          });
        }
      });
    } catch (error) {
      console.error("[INSPECTION-UPLOAD] Error in upload endpoint:", error);
      res.status(500).json({ error: "Failed to process inspection upload" });
    }
  });

  // Reviews & Complaints Routes
  
  // Get all reviews with filters
  app.get('/api/reviews', isAuthenticated, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.propertyId) filters.propertyId = req.query.propertyId as string;
      if (req.query.type) filters.type = req.query.type as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.priority) filters.priority = req.query.priority as string;
      if (req.query.sentiment) filters.sentiment = req.query.sentiment as string;
      if (req.query.source) filters.source = req.query.source as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      
      const reviews = await storage.getReviews(filters);
      
      // Get categories and themes for each review
      const reviewsWithExtras = await Promise.all(
        reviews.map(async (review) => ({
          ...review,
          categories: await storage.getReviewCategories(review.id),
          themes: await storage.getReviewThemes(review.id),
        }))
      );
      
      res.json(reviewsWithExtras);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });
  
  // Get review analytics
  app.get('/api/reviews/analytics', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const dateFrom = startDate ? new Date(startDate as string) : undefined;
      const dateTo = endDate ? new Date(endDate as string) : undefined;
      
      const analytics = await storage.getReviewAnalytics(dateFrom, dateTo);
      res.json(analytics);
    } catch (error) {
      console.error("Error getting review analytics:", error);
      res.status(500).json({ error: "Failed to get review analytics" });
    }
  });

  // Get comprehensive complaint analytics for improvement
  app.get('/api/complaints/analytics', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const dateFrom = startDate ? new Date(startDate as string) : undefined;
      const dateTo = endDate ? new Date(endDate as string) : undefined;
      
      const analytics = await storage.getComplaintAnalytics(dateFrom, dateTo);
      res.json(analytics);
    } catch (error) {
      console.error("Error getting complaint analytics:", error);
      res.status(500).json({ error: "Failed to get complaint analytics" });
    }
  });
  
  // Get critical alerts
  app.get('/api/reviews/alerts', isAuthenticated, async (req, res) => {
    try {
      const alerts = await storage.getCriticalAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      return res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });
  
  // Get themes summary with aggregated statistics
  app.get('/api/reviews/themes-summary', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const dateFrom = startDate ? new Date(startDate as string) : undefined;
      const dateTo = endDate ? new Date(endDate as string) : undefined;
      
      const themes = await storage.getThemesSummary(dateFrom, dateTo);
      res.json(themes);
    } catch (error) {
      console.error("Error fetching themes summary:", error);
      return res.status(500).json({ error: "Failed to fetch themes summary" });
    }
  });
  
  // Legacy endpoint - Get common complaint themes (kept for backward compatibility)
  app.get('/api/reviews/themes', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const themes = await storage.getCommonComplaintThemes(limit);
      res.json(themes);
    } catch (error) {
      console.error("Error fetching themes:", error);
      res.status(500).json({ error: "Failed to fetch themes" });
    }
  });
  
  // Get property review trends
  app.get('/api/reviews/trends/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const trends = await storage.getPropertyReviewTrends(req.params.propertyId, days);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching trends:", error);
      res.status(500).json({ error: "Failed to fetch trends" });
    }
  });
  
  // Get a single review
  app.get('/api/reviews/:id', isAuthenticated, async (req, res) => {
    try {
      const review = await storage.getReview(req.params.id);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      
      // Get categories, action items, and themes
      const categories = await storage.getReviewCategories(review.id);
      const actionItems = await storage.getActionItems({ reviewId: review.id });
      const themes = await storage.getReviewThemes(review.id);
      
      res.json({
        ...review,
        categories,
        actionItems,
        themes,
      });
    } catch (error) {
      console.error("Error fetching review:", error);
      res.status(500).json({ error: "Failed to fetch review" });
    }
  });
  
  // Create a new review
  app.post('/api/reviews', isAuthenticated, async (req, res) => {
    try {
      const review = await storage.createReview(req.body);
      
      // Automatically analyze themes using AI (async, don't block response)
      if (review.content && review.title) {
        import('./services/review-analysis')
          .then(({ analyzeReviewThemes }) => {
            return analyzeReviewThemes(review.content, review.title, review.rating);
          })
          .then((detectedThemes) => {
            if (detectedThemes.length > 0) {
              return storage.saveReviewThemes(
                review.id,
                detectedThemes.map(t => ({
                  theme: t.theme,
                  confidence: t.confidence,
                }))
              );
            }
          })
          .then(() => {
            console.log(`[AI Theme Analysis] Auto-analyzed review ${review.id}`);
          })
          .catch((error) => {
            console.error(`[AI Theme Analysis] Failed to auto-analyze review ${review.id}:`, error);
          });
      }
      
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });
  
  // Update a review
  app.patch('/api/reviews/:id', isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateReview(req.params.id, req.body);
      
      // Re-analyze themes if content or title changed (async, don't block response)
      if (req.body.content || req.body.title) {
        import('./services/review-analysis')
          .then(({ analyzeReviewThemes }) => {
            return analyzeReviewThemes(
              updated.content, 
              updated.title, 
              updated.rating
            );
          })
          .then((detectedThemes) => {
            if (detectedThemes.length > 0) {
              // Delete old themes first
              return storage.deleteReviewThemes(updated.id)
                .then(() => storage.saveReviewThemes(
                  updated.id,
                  detectedThemes.map(t => ({
                    theme: t.theme,
                    confidence: t.confidence,
                  }))
                ));
            }
          })
          .then(() => {
            console.log(`[AI Theme Analysis] Re-analyzed updated review ${updated.id}`);
          })
          .catch((error) => {
            console.error(`[AI Theme Analysis] Failed to re-analyze review ${updated.id}:`, error);
          });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({ error: "Failed to update review" });
    }
  });
  
  // Respond to a review
  app.post('/api/reviews/:id/respond', isAuthenticated, async (req: any, res) => {
    try {
      const { responseText } = req.body;
      const staffId = req.user.claims.sub;
      
      // Get the staff member
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      const updated = await storage.respondToReview(
        req.params.id,
        responseText,
        staff.id
      );
      
      res.json(updated);
    } catch (error) {
      console.error("Error responding to review:", error);
      res.status(500).json({ error: "Failed to respond to review" });
    }
  });
  
  // Create an action item for a review
  app.post('/api/reviews/:id/action', isAuthenticated, async (req, res) => {
    try {
      const actionItem = await storage.createActionItem({
        ...req.body,
        reviewId: req.params.id,
      });
      res.status(201).json(actionItem);
    } catch (error) {
      console.error("Error creating action item:", error);
      res.status(500).json({ error: "Failed to create action item" });
    }
  });
  
  // Action Items Routes
  
  // Get all action items
  app.get('/api/action-items', isAuthenticated, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.reviewId) filters.reviewId = req.query.reviewId as string;
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo as string;
      
      const items = await storage.getActionItems(filters);
      res.json(items);
    } catch (error) {
      console.error("Error fetching action items:", error);
      res.status(500).json({ error: "Failed to fetch action items" });
    }
  });
  
  // Update an action item
  app.patch('/api/action-items/:id', isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateActionItem(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating action item:", error);
      res.status(500).json({ error: "Failed to update action item" });
    }
  });
  
  // Complete an action item
  app.post('/api/action-items/:id/complete', isAuthenticated, async (req, res) => {
    try {
      const completed = await storage.completeActionItem(req.params.id);
      res.json(completed);
    } catch (error) {
      console.error("Error completing action item:", error);
      res.status(500).json({ error: "Failed to complete action item" });
    }
  });
  
  // ======== REVIEW THEMES ANALYSIS ROUTES ========
  
  // Analyze themes for a single review
  app.post('/api/reviews/:id/analyze-themes', isAuthenticated, async (req, res) => {
    try {
      const { analyzeReviewThemes } = await import('./services/review-analysis');
      
      const review = await storage.getReview(req.params.id);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }
      
      // Analyze the review to detect themes
      const detectedThemes = await analyzeReviewThemes(
        review.content,
        review.title,
        review.rating
      );
      
      // Save themes to database
      const themes = await storage.saveReviewThemes(
        review.id,
        detectedThemes.map(t => ({
          theme: t.theme,
          confidence: t.confidence,
        }))
      );
      
      res.json({ 
        reviewId: review.id, 
        themes,
        message: `Detected ${themes.length} themes` 
      });
    } catch (error) {
      console.error("Error analyzing review themes:", error);
      res.status(500).json({ error: "Failed to analyze review themes" });
    }
  });
  
  // Batch analyze themes for all reviews (or filtered reviews)
  app.post('/api/reviews/analyze-all-themes', isAuthenticated, async (req, res) => {
    try {
      const { batchAnalyzeReviewThemes } = await import('./services/review-analysis');
      
      // Get filters from request body
      const filters = req.body.filters || {};
      
      // Fetch reviews to analyze
      const reviews = await storage.getReviews(filters);
      
      if (reviews.length === 0) {
        return res.json({ message: "No reviews to analyze", analyzed: 0 });
      }
      
      // Prepare review data for batch analysis
      const reviewsToAnalyze = reviews.map(r => ({
        id: r.id,
        title: r.title,
        content: r.content,
        rating: r.rating,
      }));
      
      // Start batch analysis (this will take time)
      console.log(`[Theme Analysis] Starting batch analysis of ${reviewsToAnalyze.length} reviews`);
      const themesMap = await batchAnalyzeReviewThemes(reviewsToAnalyze);
      
      // Save all themes to database
      let totalThemes = 0;
      for (const [reviewId, detectedThemes] of themesMap.entries()) {
        if (detectedThemes.length > 0) {
          await storage.saveReviewThemes(
            reviewId,
            detectedThemes.map(t => ({
              theme: t.theme,
              confidence: t.confidence,
            }))
          );
          totalThemes += detectedThemes.length;
        }
      }
      
      res.json({ 
        message: `Analyzed ${reviews.length} reviews`,
        analyzed: reviews.length,
        totalThemes,
        avgThemesPerReview: (totalThemes / reviews.length).toFixed(2),
      });
    } catch (error) {
      console.error("Error batch analyzing themes:", error);
      res.status(500).json({ error: "Failed to batch analyze themes" });
    }
  });
  
  // ======== COMPLAINT SUBMISSION TOKEN ROUTES ========
  
  // Create complaint submission token
  app.post('/api/complaints/tokens', isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId, guestName, guestContact } = req.body;
      
      if (!propertyId || !guestContact) {
        return res.status(400).json({ error: "Property ID and guest contact are required" });
      }
      
      // Generate raw token (64 character hex string)
      const rawToken = crypto.randomBytes(32).toString('hex');
      
      // Hash the token for storage
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      // Set expiry to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // Get staff ID from authenticated user
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      const createdBy = staff?.id || null;
      
      const token = await storage.createComplaintToken({
        hashedToken,
        propertyId,
        guestName: guestName || null,
        guestContact,
        expiresAt,
        maxUses: 1,
        remainingUses: 1,
        status: 'active',
        submissionMethod: null,
        metadata: { rawToken }, // Store raw token in metadata for SMS sending
        createdBy
      });
      
      // Return the token ID and raw token (for link generation)
      res.status(201).json({
        id: token.id,
        rawToken: rawToken, // Return raw token for client to build link
        propertyId: token.propertyId,
        expiresAt: token.expiresAt
      });
    } catch (error) {
      console.error("Error creating complaint token:", error);
      res.status(500).json({ error: "Failed to create complaint token" });
    }
  });

  // Get all complaint submission tokens
  app.get('/api/complaints/tokens', isAuthenticated, async (req, res) => {
    try {
      const tokens = await storage.getAllComplaintTokens();
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching complaint tokens:", error);
      res.status(500).json({ error: "Failed to fetch complaint tokens" });
    }
  });
  
  // Send SMS with complaint form link
  app.post('/api/complaints/tokens/:id/send-sms', isAuthenticated, async (req, res) => {
    try {
      const tokenId = req.params.id;
      
      // Fetch token by ID from database
      const token = await storage.getComplaintTokenById(tokenId);
      
      if (!token) {
        return res.status(404).json({ error: "Token not found" });
      }
      
      // Extract rawToken from metadata
      const rawToken = token.metadata?.rawToken;
      if (!rawToken) {
        return res.status(500).json({ error: "Token data is missing" });
      }
      
      // Get the property name
      const property = await storage.getProperty(token.propertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      // Build the complaint form URL
      const complaintUrl = `${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.replit.app` : 'http://localhost:5000'}/complaint/${rawToken}`;
      
      // Compose SMS message
      const guestNamePart = token.guestName ? `${token.guestName}, ` : '';
      const smsBody = `Hi ${guestNamePart}we'd like to hear about your recent stay at ${property.name}. Please share your feedback: ${complaintUrl}`;
      
      // Send SMS using JustCall
      const smsResult = await sendSMS(token.guestContact, smsBody);
      
      // Log SMS status in token metadata
      const smsLog = {
        sentAt: new Date().toISOString(),
        status: smsResult.success ? 'sent' as const : 'failed' as const,
        sid: smsResult.messageId,
        error: smsResult.error
      };
      
      const updatedMetadata = {
        ...token.metadata,
        sentVia: 'sms' as const,
        smsLog: [...(token.metadata?.smsLog || []), smsLog]
      };
      
      await storage.updateTokenStatus(tokenId, token.status, updatedMetadata);
      
      if (smsResult.success) {
        res.json({ success: true, messageId: smsResult.messageId });
      } else {
        res.status(500).json({ success: false, error: smsResult.error });
      }
    } catch (error: any) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ error: error.message || "Failed to send SMS" });
    }
  });
  
  // Generate AI response for existing complaint
  app.post('/api/complaints/:id/generate-response', isAuthenticated, async (req, res) => {
    try {
      const complaint = await storage.getReview(req.params.id);
      
      if (!complaint) {
        return res.status(404).json({ error: "Complaint not found" });
      }
      
      if (complaint.type !== 'complaint') {
        return res.status(400).json({ error: "This is not a complaint" });
      }
      
      // Get property name
      const property = await storage.getProperty(complaint.propertyId);
      
      // Prepare complaint details for AI
      const { generateComplaintResponse } = require('./services/complaint-response-generator');
      const complaintDetails = {
        guestName: complaint.guestName || 'Guest',
        property: property?.name || 'our property',
        cleaningIssues: complaint.cleaningIssues || undefined,
        maintenanceIssues: complaint.maintenanceIssues || undefined,
        customerServiceIssues: complaint.customerServiceIssues || undefined,
        linenIssues: complaint.linenIssues || undefined,
        compensationOffered: complaint.compensationOffered || undefined,
        fullDescription: complaint.content
      };
      
      // Generate AI response
      const aiResponse = await generateComplaintResponse(complaintDetails);
      
      // Update complaint with AI response
      const updated = await storage.updateReview(req.params.id, {
        responseDraftSubject: aiResponse.subject,
        responseDraftBody: aiResponse.body,
        compensationAdvice: aiResponse.compensationAdvice,
        aiResponseGenerated: true
      });
      
      res.json({
        subject: aiResponse.subject,
        body: aiResponse.body,
        compensationAdvice: aiResponse.compensationAdvice
      });
    } catch (error: any) {
      console.error("Error generating AI response:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI response" });
    }
  });
  
  // ======== PUBLIC COMPLAINT SUBMISSION ROUTES (NO AUTH) ========
  
  // Get complaint form config by token
  app.get('/api/public/complaints/:token', async (req, res) => {
    try {
      const rawToken = req.params.token;
      
      // Hash the token to look it up
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      const token = await storage.getComplaintTokenByHash(hashedToken);
      
      if (!token) {
        return res.status(404).json({ error: "Invalid token" });
      }
      
      // Check if token is expired
      if (new Date() > new Date(token.expiresAt)) {
        return res.status(410).json({ error: "This link has expired" });
      }
      
      // Check if token has been used up
      if (token.remainingUses <= 0 || token.status !== 'active') {
        return res.status(410).json({ error: "This link has already been used" });
      }
      
      // Get property info (minimal, non-sensitive)
      const property = await storage.getProperty(token.propertyId);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      // Return minimal, safe information for form display
      res.json({
        propertyName: property.name,
        guestName: token.guestName || '',
        expiresAt: token.expiresAt
      });
    } catch (error) {
      console.error("Error fetching complaint form config:", error);
      res.status(500).json({ error: "Failed to load form" });
    }
  });
  
  // Submit complaint via token
  app.post('/api/public/complaints/:token', async (req, res) => {
    try {
      const rawToken = req.params.token;
      const {
        guestName,
        guestEmail,
        cleaningIssues,
        maintenanceIssues,
        customerServiceIssues,
        linenIssues,
        compensationOffered,
        fullDescription
      } = req.body;
      
      // Validate required fields
      if (!guestName || !guestEmail || !fullDescription) {
        return res.status(400).json({ error: "Guest name, email, and description are required" });
      }
      
      // Hash and validate token
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      
      const validation = await storage.validateAndUseToken(hashedToken);
      
      if (!validation.valid) {
        return res.status(410).json({ error: "Invalid or expired link" });
      }
      
      // Get client IP for logging
      const submissionIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      
      // Generate a title based on issue types
      const issueTypes = [];
      if (cleaningIssues) issueTypes.push('Cleaning');
      if (maintenanceIssues) issueTypes.push('Maintenance');
      if (customerServiceIssues) issueTypes.push('Service');
      if (linenIssues) issueTypes.push('Linen');
      const title = issueTypes.length > 0 
        ? `${issueTypes.join(' & ')} Complaint` 
        : 'Guest Complaint';
      
      // Create complaint in database
      const complaint = await storage.createReview({
        type: 'complaint',
        propertyId: validation.propertyId!,
        guestName,
        guestEmail,
        title,
        content: fullDescription,
        cleaningIssues: cleaningIssues || null,
        maintenanceIssues: maintenanceIssues || null,
        customerServiceIssues: customerServiceIssues || null,
        linenIssues: linenIssues || null,
        compensationOffered: compensationOffered || null,
        submissionMethod: 'public_form',
        submissionTokenId: validation.token!.id,
        submissionIp,
        status: 'new',
        priority: 'medium',
        source: 'complaint_form',
        rating: null,
        sentiment: 'negative',
        sentimentScore: -0.5,
        responseText: null,
        respondedAt: null,
        respondedBy: null,
        responseDraftSubject: null,
        responseDraftBody: null,
        compensationAdvice: null,
        aiResponseGenerated: false,
        aiResponseUsed: false
      });
      
      // Automatically analyze themes using AI (async, don't block response)
      import('./services/review-analysis')
        .then(({ analyzeReviewThemes }) => {
          return analyzeReviewThemes(complaint.content, complaint.title, null);
        })
        .then((detectedThemes) => {
          if (detectedThemes.length > 0) {
            return storage.saveReviewThemes(
              complaint.id,
              detectedThemes.map(t => ({
                theme: t.theme,
                confidence: t.confidence,
              }))
            );
          }
        })
        .then(() => {
          console.log(`[AI Theme Analysis] Auto-analyzed complaint ${complaint.id}`);
        })
        .catch((error) => {
          console.error(`[AI Theme Analysis] Failed to auto-analyze complaint ${complaint.id}:`, error);
        });
      
      res.status(201).json({
        success: true,
        message: "Thank you for your feedback. We take all complaints seriously and will review this promptly."
      });
    } catch (error) {
      console.error("Error submitting complaint:", error);
      res.status(500).json({ error: "Failed to submit complaint" });
    }
  });

  // ======== ORDERING SYSTEM ROUTES ========
  
  // Supplier Routes
  app.get('/api/ordering/suppliers', isAuthenticated, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
      if (req.query.type) filters.type = req.query.type as string;
      
      const suppliers = await storage.getSuppliers(filters);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });
  
  app.post('/api/ordering/suppliers', isAuthenticated, async (req, res) => {
    try {
      console.log("[Supplier Creation] Received data:", JSON.stringify(req.body, null, 2));
      const validated = insertOrderingSupplierSchema.parse(req.body);
      console.log("[Supplier Creation] Validated data:", JSON.stringify(validated, null, 2));
      const supplier = await storage.createSupplier(validated);
      console.log("[Supplier Creation] Success! Created supplier:", supplier.id);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("[Supplier Creation] Error:", error);
      if (error instanceof Error) {
        console.error("[Supplier Creation] Error message:", error.message);
        console.error("[Supplier Creation] Error stack:", error.stack);
      }
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });
  
  app.patch('/api/ordering/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateSupplier(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });
  
  app.delete('/api/ordering/suppliers/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });
  
  // Product Routes
  app.get('/api/ordering/products', isAuthenticated, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.supplier) filters.supplier = req.query.supplier as string;
      if (req.query.isActive !== undefined) filters.isActive = req.query.isActive === 'true';
      if (req.query.lowStock !== undefined) filters.lowStock = req.query.lowStock === 'true';
      
      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });
  
  app.get('/api/ordering/products/low-stock', isAuthenticated, async (req, res) => {
    try {
      const products = await storage.getLowStockProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      res.status(500).json({ error: "Failed to fetch low stock products" });
    }
  });
  
  app.get('/api/ordering/products/:id', isAuthenticated, async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });
  
  app.post('/api/ordering/products', isAuthenticated, async (req, res) => {
    try {
      const validated = insertOrderingProductSchema.parse(req.body);
      const product = await storage.createProduct(validated);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  });
  
  app.patch('/api/ordering/products/:id', isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateProduct(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  });
  
  app.delete('/api/ordering/products/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });
  
  app.post('/api/ordering/products/:id/stock', isAuthenticated, async (req: any, res) => {
    try {
      const { adjustment, reason } = req.body;
      const staffEmail = req.user.claims.email;
      const staff = await storage.getStaffByEmail(staffEmail);
      
      const movement = await storage.adjustStock(
        req.params.id,
        adjustment,
        reason,
        staff?.id
      );
      
      res.json(movement);
    } catch (error) {
      console.error("Error adjusting stock:", error);
      res.status(500).json({ error: "Failed to adjust stock" });
    }
  });
  
  app.get('/api/products/:id/price-history', isAuthenticated, async (req, res) => {
    try {
      const priceHistory = await storage.getProductPriceHistory(req.params.id);
      res.json(priceHistory);
    } catch (error) {
      console.error("Error fetching price history:", error);
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });
  
  app.post('/api/ordering/products/import', isAuthenticated, async (req, res) => {
    try {
      const products = req.body.products;
      const result = await storage.bulkImportProducts(products);
      res.json(result);
    } catch (error) {
      console.error("Error importing products:", error);
      res.status(500).json({ error: "Failed to import products" });
    }
  });
  
  // Bulk import Hoopers product catalog
  app.post('/api/ordering/products/bulk-hoopers', isAuthenticated, async (req, res) => {
    try {
      // Check if Hoopers supplier exists, create if not
      let suppliers = await storage.getSuppliers({ isActive: true });
      let hoopersSupplier = suppliers.find(s => s.name === "Hoopers");
      
      if (!hoopersSupplier) {
        console.log("[Hoopers Import] Creating Hoopers supplier...");
        hoopersSupplier = await storage.createSupplier({
          name: "Hoopers",
          contactEmail: "team@example.com",
          phone: "",
          isActive: true,
          type: "cleaning_supplies"
        });
      }
      
      // Define Hoopers products
      const hoopersProducts = [
        { name: "Astonish Anti Bac Sp 750m(x12)", category: "cleaning_supplies", quantity: 4, vatRate: 0.20, unitPrice: 13.49 },
        { name: "Centrefeed Blue 150m (x6)", category: "cleaning_supplies", quantity: 12, vatRate: 0.20, unitPrice: 10.29 },
        { name: "Certex H/Wash 500ml (x12)", category: "cleaning_supplies", quantity: 4, vatRate: 0.20, unitPrice: 7.98 },
        { name: "Cif Floor Ocean 1 Ltr (x8)", category: "cleaning_supplies", quantity: 1, vatRate: 0.20, unitPrice: 10.99 },
        { name: "Cif Floor Wild Orchid 950m(x8)", category: "cleaning_supplies", quantity: 1, vatRate: 0.20, unitPrice: 10.99 },
        { name: "Easy Bleach Orig 750ml (x12)", category: "cleaning_supplies", quantity: 5, vatRate: 0.20, unitPrice: 5.49 },
        { name: "Easy Toilet Clnr Ocean750m(x12)", category: "cleaning_supplies", quantity: 5, vatRate: 0.20, unitPrice: 5.99 },
        { name: "Easy Wash Up Original 500ml(x8)", category: "cleaning_supplies", quantity: 4, vatRate: 0.20, unitPrice: 3.39 },
        { name: "Elm Water 500ml (x24)", category: "cleaning_supplies", quantity: 15, vatRate: 0.20, unitPrice: 3.19 },
        { name: "Fairy Lqd Tabs 12's PM (x4)", category: "cleaning_supplies", quantity: 2, vatRate: 0.20, unitPrice: 11.99 },
        { name: "Refuse Sack Heavy D 20's (x20)", category: "cleaning_supplies", quantity: 2, vatRate: 0.20, unitPrice: 16.99 },
        { name: "S/Brite Sponge Scour10pk (x10)", category: "cleaning_supplies", quantity: 3, vatRate: 0.20, unitPrice: 3.99 },
        { name: "Softesse T/Roll 18's (x3)", category: "cleaning_supplies", quantity: 15, vatRate: 0.20, unitPrice: 6.49 },
        { name: "Swing Bin Liners Scented (x30)", category: "cleaning_supplies", quantity: 2, vatRate: 0.20, unitPrice: 29.49 },
      ];
      
      // Transform to InsertOrderingProduct format
      const productsToImport = hoopersProducts.map(p => ({
        name: p.name,
        description: `${p.name} from Hoopers`,
        category: p.category,
        supplierId: hoopersSupplier!.id,
        sku: `HOOPERS-${p.name.substring(0, 10).toUpperCase().replace(/\s+/g, '-')}`,
        unitPrice: p.unitPrice,
        vatRate: p.vatRate,
        currentStock: p.quantity * 2, // Initial stock is 2x the typical order quantity
        reorderPoint: Math.floor(p.quantity / 2), // Reorder when stock drops to half the typical order quantity
        reorderQuantity: p.quantity, // Reorder the typical quantity
        isActive: true
      }));
      
      console.log(`[Hoopers Import] Importing ${productsToImport.length} products...`);
      const result = await storage.bulkImportProducts(productsToImport);
      
      console.log(`[Hoopers Import] Complete - Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`);
      res.json({
        success: true,
        message: `Successfully imported Hoopers catalog`,
        ...result
      });
    } catch (error) {
      console.error("Error importing Hoopers products:", error);
      res.status(500).json({ error: "Failed to import Hoopers products" });
    }
  });
  
  // Order Routes
  app.get('/api/ordering/orders', isAuthenticated, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status as string;
      if (req.query.supplier) filters.supplier = req.query.supplier as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      
      const orders = await storage.getOrders(filters);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });
  
  app.get('/api/ordering/orders/:id', isAuthenticated, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const items = await storage.getOrderItems(order.id);
      
      res.json({
        ...order,
        items
      });
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });
  
  app.post('/api/ordering/orders', isAuthenticated, async (req: any, res) => {
    try {
      const staffEmail = req.user.claims.email;
      const staff = await storage.getStaffByEmail(staffEmail);
      
      const { items, ...orderFields } = req.body;
      
      // Validate that items array exists and has at least one item
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Order must have at least one item" });
      }
      
      // Pre-validate all items BEFORE creating anything
      const validatedItems = [];
      const itemSchemaWithoutOrderId = insertOrderingOrderItemSchema.omit({ orderId: true });
      
      for (const item of items) {
        // Validate quantity and unitPrice are positive
        if (!item.quantity || item.quantity <= 0) {
          return res.status(400).json({ error: "Item quantity must be greater than 0" });
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          return res.status(400).json({ error: "Item unit price must be greater than 0" });
        }
        if (!item.productId) {
          return res.status(400).json({ error: "Item must have a product selected" });
        }
        
        const itemData = {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.quantity * item.unitPrice
        };
        
        // Validate item schema without orderId (will throw if invalid)
        const validatedItem = itemSchemaWithoutOrderId.parse(itemData);
        validatedItems.push(validatedItem);
      }
      
      // Convert orderDate string to Date object if it's a string
      const orderData = {
        ...orderFields,
        orderedBy: staff?.id
      };
      
      if (orderData.orderDate && typeof orderData.orderDate === 'string') {
        orderData.orderDate = new Date(orderData.orderDate);
      }
      
      // Calculate totalAmount from validated items
      const totalAmount = validatedItems.reduce((sum, item) => {
        return sum + item.totalPrice;
      }, 0);
      
      orderData.totalAmount = totalAmount;
      
      // Use transaction to ensure atomicity
      const result = await db.transaction(async (tx) => {
        // Generate order number inside transaction
        const existingOrders = await tx
          .select({ orderNumber: schema.orderingOrders.orderNumber })
          .from(schema.orderingOrders)
          .orderBy(sql`CAST(SUBSTRING(${schema.orderingOrders.orderNumber} FROM 5) AS INTEGER) DESC`)
          .limit(1);
        
        let nextNumber = 1;
        if (existingOrders.length > 0 && existingOrders[0].orderNumber) {
          const currentNumber = parseInt(existingOrders[0].orderNumber.replace('ORD-', ''));
          nextNumber = currentNumber + 1;
        }
        
        const generatedOrderNumber = `ORD-${String(nextNumber).padStart(3, '0')}`;
        
        const validated = insertOrderingOrderSchema.parse(orderData);
        
        // Create order with the generated order number (add it back after validation since it's omitted from insert schema)
        const [order] = await tx.insert(schema.orderingOrders).values({
          ...validated,
          orderNumber: generatedOrderNumber
        }).returning();
        
        // Create all order items
        const itemsToCreate = validatedItems.map(item => ({
          ...item,
          orderId: order.id
        }));
        
        const createdItems = await tx.insert(schema.orderingOrderItems).values(itemsToCreate).returning();
        
        return { order, items: createdItems };
      });
      
      // Return order with items
      res.status(201).json({
        ...result.order,
        items: result.items
      });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });
  
  app.patch('/api/ordering/orders/:id', isAuthenticated, async (req, res) => {
    try {
      console.log("[UPDATE Order] Request body:", req.body);
      
      // Convert all date string fields to Date objects
      const orderData = { ...req.body };
      
      // Convert orderDate
      if (orderData.orderDate && typeof orderData.orderDate === 'string') {
        orderData.orderDate = new Date(orderData.orderDate);
      }
      
      // Convert expectedDelivery
      if (orderData.expectedDelivery && typeof orderData.expectedDelivery === 'string') {
        orderData.expectedDelivery = new Date(orderData.expectedDelivery);
      }
      
      // Convert receivedDate
      if (orderData.receivedDate && typeof orderData.receivedDate === 'string') {
        orderData.receivedDate = new Date(orderData.receivedDate);
      }
      
      console.log("[UPDATE Order] Converted data:", orderData);
      
      const updated = await storage.updateOrder(req.params.id, orderData);
      res.json(updated);
    } catch (error) {
      console.error("[UPDATE Order] Error:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });
  
  app.delete('/api/ordering/orders/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.deleteOrder(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ error: "Failed to delete order" });
    }
  });
  
  app.post('/api/ordering/orders/:id/receive', isAuthenticated, async (req, res) => {
    try {
      const { items } = req.body;
      await storage.receiveOrderItems(req.params.id, items);
      res.json({ success: true });
    } catch (error) {
      console.error("Error receiving order items:", error);
      res.status(500).json({ error: "Failed to receive order items" });
    }
  });
  
  // Order Item Routes
  app.get('/api/ordering/orders/:orderId/items', isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getOrderItems(req.params.orderId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching order items:", error);
      res.status(500).json({ error: "Failed to fetch order items" });
    }
  });
  
  app.post('/api/ordering/orders/:orderId/items', isAuthenticated, async (req, res) => {
    try {
      const validated = insertOrderingOrderItemSchema.parse({
        ...req.body,
        orderId: req.params.orderId
      });
      
      const item = await storage.addOrderItem(validated);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error adding order item:", error);
      res.status(500).json({ error: "Failed to add order item" });
    }
  });
  
  app.patch('/api/ordering/items/:id', isAuthenticated, async (req, res) => {
    try {
      const updated = await storage.updateOrderItem(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating order item:", error);
      res.status(500).json({ error: "Failed to update order item" });
    }
  });
  
  app.delete('/api/ordering/items/:id', isAuthenticated, async (req, res) => {
    try {
      await storage.removeOrderItem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing order item:", error);
      res.status(500).json({ error: "Failed to remove order item" });
    }
  });
  
  // Stock Management Routes
  app.get('/api/ordering/stock-movements', isAuthenticated, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.productId) filters.productId = req.query.productId as string;
      if (req.query.movementType) filters.movementType = req.query.movementType as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      
      const movements = await storage.getStockMovements(filters);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ error: "Failed to fetch stock movements" });
    }
  });
  
  app.post('/api/ordering/stock-movements', isAuthenticated, async (req: any, res) => {
    try {
      const { z } = await import("zod");
      
      // Validate request body
      const stockAdjustmentSchema = z.object({
        productId: z.string().min(1, "Product ID is required"),
        adjustment: z.number().int("Adjustment must be an integer").finite("Adjustment must be a finite number"),
        reason: z.string().min(1, "Reason is required"),
      });
      
      const validation = stockAdjustmentSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid request data",
          details: validation.error.issues 
        });
      }
      
      const { productId, adjustment, reason } = validation.data;
      
      const staffEmail = req.user?.claims?.email;
      const staff = staffEmail ? await storage.getStaffByEmail(staffEmail) : null;
      
      const movement = await storage.adjustStock(
        productId,
        adjustment,
        reason,
        staff?.id
      );
      
      res.json(movement);
    } catch (error) {
      console.error("Error adjusting stock:", error);
      res.status(500).json({ error: "Failed to adjust stock" });
    }
  });
  
  app.post('/api/ordering/stock/allocate', isAuthenticated, async (req: any, res) => {
    try {
      const { productId, propertyId, quantity } = req.body;
      const staffEmail = req.user.claims.email;
      const staff = await storage.getStaffByEmail(staffEmail);
      
      const movement = await storage.allocateStockToProperty(
        productId,
        propertyId,
        quantity,
        staff?.id
      );
      
      res.json(movement);
    } catch (error) {
      console.error("Error allocating stock:", error);
      res.status(500).json({ error: "Failed to allocate stock" });
    }
  });
  
  app.get('/api/ordering/stock/property/:propertyId', isAuthenticated, async (req, res) => {
    try {
      const stock = await storage.getStockByProperty(req.params.propertyId);
      res.json(stock);
    } catch (error) {
      console.error("Error fetching property stock:", error);
      res.status(500).json({ error: "Failed to fetch property stock" });
    }
  });
  
  // Quick Order Routes
  app.post('/api/ordering/quick-order', isAuthenticated, async (req, res) => {
    try {
      const { productIds } = req.body;
      const result = await storage.quickReorder(productIds);
      res.json(result);
    } catch (error) {
      console.error("Error creating quick order:", error);
      res.status(500).json({ error: "Failed to create quick order" });
    }
  });
  
  app.post('/api/ordering/quick-reorder', isAuthenticated, async (req, res) => {
    try {
      const { productIds } = req.body;
      const result = await storage.quickReorder(productIds);
      res.json(result);
    } catch (error) {
      console.error("Error creating quick reorder:", error);
      res.status(500).json({ error: "Failed to create quick reorder" });
    }
  });
  
  app.get('/api/ordering/products/:id/reorder-suggestions', isAuthenticated, async (req, res) => {
    try {
      const suggestions = await storage.suggestReorderQuantities(req.params.id);
      res.json(suggestions);
    } catch (error) {
      console.error("Error getting reorder suggestions:", error);
      res.status(500).json({ error: "Failed to get reorder suggestions" });
    }
  });
  
  // Analytics Routes
  app.get('/api/ordering/analytics', isAuthenticated, async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      const analytics = await storage.getOrderingAnalytics(dateFrom, dateTo);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching ordering analytics:", error);
      res.status(500).json({ error: "Failed to fetch ordering analytics" });
    }
  });
  
  app.get('/api/ordering/products/:id/usage', isAuthenticated, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const usage = await storage.getProductUsageHistory(req.params.id, days);
      res.json(usage);
    } catch (error) {
      console.error("Error fetching product usage:", error);
      res.status(500).json({ error: "Failed to fetch product usage" });
    }
  });
  
  app.get('/api/ordering/suppliers/:id/performance', isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getSupplierPerformanceMetrics(req.params.id);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching supplier performance:", error);
      res.status(500).json({ error: "Failed to fetch supplier performance" });
    }
  });

  // ======== INVENTORY COUNTING & AUTO-ORDERING ROUTES ========
  // Submit stock count
  app.post('/api/inventory/counts', isAuthenticated, async (req, res) => {
    try {
      const { productId, locationCode, countedQuantity, notes } = req.body;
      const countedBy = req.user?.id;
      
      const count = await storage.createStockCount({
        productId,
        locationCode: locationCode || 'HEAD_OFFICE',
        countedQuantity: parseInt(countedQuantity),
        countDate: new Date(),
        countedBy,
        notes
      });
      
      res.json(count);
    } catch (error) {
      console.error("Error creating stock count:", error);
      res.status(500).json({ error: "Failed to create stock count" });
    }
  });
  
  // Get all stock counts with filters
  app.get('/api/inventory/counts', isAuthenticated, async (req, res) => {
    try {
      const { productId, locationCode, startDate, endDate } = req.query;
      const filters: any = {};
      
      if (productId) filters.productId = productId as string;
      if (locationCode) filters.locationCode = locationCode as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const counts = await storage.getStockCounts(filters);
      res.json(counts);
    } catch (error) {
      console.error("Error fetching stock counts:", error);
      res.status(500).json({ error: "Failed to fetch stock counts" });
    }
  });
  
  // Get latest stock counts per product
  app.get('/api/inventory/counts/latest', isAuthenticated, async (req, res) => {
    try {
      const { locationCode } = req.query;
      const counts = await storage.getLatestStockCounts(locationCode as string);
      res.json(counts);
    } catch (error) {
      console.error("Error fetching latest stock counts:", error);
      res.status(500).json({ error: "Failed to fetch latest stock counts" });
    }
  });
  
  // Update product target quantity
  app.patch('/api/inventory/products/:id/target', isAuthenticated, async (req, res) => {
    try {
      const { targetQuantity } = req.body;
      const product = await storage.updateProductTargetQuantity(
        req.params.id, 
        parseInt(targetQuantity)
      );
      res.json(product);
    } catch (error) {
      console.error("Error updating target quantity:", error);
      res.status(500).json({ error: "Failed to update target quantity" });
    }
  });
  
  // Calculate order quantities based on latest counts
  app.get('/api/inventory/orders/calculate', isAuthenticated, async (req, res) => {
    try {
      const { locationCode } = req.query;
      const { calculateOrderQuantities } = await import('./services/inventory-ordering');
      const orders = await calculateOrderQuantities(locationCode as string || 'HEAD_OFFICE');
      res.json(orders);
    } catch (error) {
      console.error("Error calculating order quantities:", error);
      res.status(500).json({ error: "Failed to calculate order quantities" });
    }
  });
  
  // Send Imperial Laundry email order
  app.post('/api/inventory/orders/send-imperial', isAuthenticated, async (req, res) => {
    try {
      const { items } = req.body;
      const { sendImperialLaundryEmail } = await import('./services/order-emails');
      const result = await sendImperialLaundryEmail(items);
      res.json(result);
    } catch (error) {
      console.error("Error sending Imperial Laundry email:", error);
      res.status(500).json({ error: "Failed to send Imperial Laundry email" });
    }
  });
  
  // Send Hoopers email order
  app.post('/api/inventory/orders/send-hoopers', isAuthenticated, async (req, res) => {
    try {
      const { items } = req.body;
      const { sendHoopersEmail } = await import('./services/order-emails');
      const result = await sendHoopersEmail(items);
      res.json(result);
    } catch (error) {
      console.error("Error sending Hoopers email:", error);
      res.status(500).json({ error: "Failed to send Hoopers email" });
    }
  });
  
  // Send Amazon SMS to Alex
  app.post('/api/inventory/orders/send-amazon-sms', isAuthenticated, async (req, res) => {
    try {
      const { items, phoneNumber } = req.body;
      const { sendAmazonSMS } = await import('./services/order-emails');
      const result = await sendAmazonSMS(items, phoneNumber);
      res.json(result);
    } catch (error) {
      console.error("Error sending Amazon SMS:", error);
      res.status(500).json({ error: "Failed to send Amazon SMS" });
    }
  });

  // ======== INVOICE MANAGEMENT ROUTES ========
  
  // Upload invoice with AI extraction
  app.post('/api/ordering/invoices/upload', isAuthenticated, async (req: any, res) => {
    try {
      const multerImport = await import("multer");
      const { processInvoiceFile } = await import("./services/invoice-parser");
      const { uploadConfigs } = await import("./upload-config");
      
      const upload = uploadConfigs.invoices;
      
      upload.single('invoice')(req, res, async (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ error: 'File upload failed' });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        
        try {
          const { supplier, invoiceDate } = req.body;
          const userId = req.user.claims.sub;
          
          if (!supplier || !invoiceDate) {
            return res.status(400).json({ error: 'Supplier and invoice date are required' });
          }
          
          // File is already saved to disk
          console.log('[Invoice Upload] File saved locally:', req.file.filename);
          const fileStoragePath = `/uploads/invoices/${req.file.filename}`;
          
          // Read file from disk for AI processing
          const fileBuffer = await fs.readFile(req.file.path);
          
          // Create invoice record
          const invoice = await storage.createInvoice({
            invoiceNumber: 'PENDING',
            supplier,
            invoiceDate,
            fileStoragePath,
            fileSize: req.file.size,
            uploadedBy: userId,
            aiProcessed: false,
          });
          
          // Process with AI extraction in background (don't block response)
          processInvoiceFile(fileBuffer, req.file.mimetype, supplier)
            .then(async (extractedData) => {
              console.log('[Invoice AI] Extraction complete:', extractedData);
              
              // Update invoice with extracted data
              await storage.updateInvoice(invoice.id, {
                invoiceNumber: extractedData.invoiceNumber || invoice.invoiceNumber,
                extractedData,
                totalAmount: extractedData.total,
                aiProcessed: true,
              });
              
              // Auto-populate products and orders
              try {
                // 1. Find or create supplier
                let supplierRecord = await storage.getSupplierByName(supplier);
                if (!supplierRecord) {
                  supplierRecord = await storage.createSupplier({
                    name: supplier,
                    isActive: true,
                    type: 'product',
                  });
                }
                
                // 2. Create order
                const orderNumber = await storage.generateOrderNumber();
                const order = await storage.createOrder({
                  orderNumber,
                  supplierId: supplierRecord.id,
                  orderDate: invoiceDate,
                  status: 'received',
                  receivedDate: invoiceDate,
                  totalAmount: extractedData.total,
                  notes: `Auto-created from invoice ${extractedData.invoiceNumber}`,
                });
                
                // 3. Process line items
                for (const item of extractedData.lineItems || []) {
                  // Find or create product
                  let product = await storage.getProductByNameAndSupplier(
                    item.description,
                    supplier
                  );
                  
                  if (!product) {
                    product = await storage.createProduct({
                      name: item.description,
                      supplier,
                      supplierId: supplierRecord.id,
                      category: 'General',
                      unit: 'unit',
                      currentStock: 0,
                      isActive: true,
                      lastPrice: item.unitPrice,
                      averagePrice: item.unitPrice,
                    });
                  } else {
                    // Track price change
                    if (product.lastPrice && product.lastPrice !== item.unitPrice) {
                      const priceChangePercent = 
                        ((item.unitPrice - product.lastPrice) / product.lastPrice) * 100;
                      
                      await storage.createPriceHistory({
                        productId: product.id,
                        supplier,
                        supplierId: supplierRecord.id,
                        price: item.unitPrice,
                        priceDate: invoiceDate,
                        invoiceId: invoice.id,
                        orderId: order.id,
                        priceChangePercent,
                      });
                      
                      // Update product prices
                      const newAverage = ((product.averagePrice || item.unitPrice) + item.unitPrice) / 2;
                      await storage.updateProduct(product.id, {
                        lastPrice: item.unitPrice,
                        averagePrice: newAverage,
                      });
                    }
                  }
                  
                  // Create order item
                  await storage.addOrderItem({
                    orderId: order.id,
                    productId: product.id,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                  });
                  
                  // Create stock movement
                  await storage.adjustStock(
                    product.id,
                    item.quantity,
                    `Received from order ${orderNumber}`,
                    userId
                  );
                }
                
                // Link invoice to order
                await storage.updateInvoice(invoice.id, {
                  orderId: order.id,
                });
                
                console.log('[Invoice AI] Auto-population complete');
              } catch (error) {
                console.error('[Invoice AI] Auto-population failed:', error);
                await storage.updateInvoice(invoice.id, {
                  aiErrors: `Auto-population failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
              }
            })
            .catch(async (error) => {
              console.error('[Invoice AI] Extraction failed:', error);
              await storage.updateInvoice(invoice.id, {
                aiProcessed: true,
                aiErrors: `AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              });
            });
          
          res.status(201).json({
            invoice,
            message: 'Invoice uploaded. AI processing in background...',
          });
        } catch (error) {
          console.error('Invoice processing error:', error);
          res.status(500).json({ error: 'Failed to process invoice' });
        }
      });
    } catch (error) {
      console.error('Error in invoice upload:', error);
      res.status(500).json({ error: 'Failed to upload invoice' });
    }
  });
  
  // Get invoices with optional filters
  app.get('/api/ordering/invoices', isAuthenticated, async (req, res) => {
    try {
      const { supplier, startDate, endDate } = req.query;
      const filters: any = {};
      
      if (supplier) filters.supplier = supplier as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const invoices = await storage.getInvoices(filters);
      res.json(invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Failed to fetch invoices' });
    }
  });
  
  // Get specific invoice
  app.get('/api/ordering/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({ error: 'Failed to fetch invoice' });
    }
  });
  
  // Get product price history
  app.get('/api/ordering/products/:id/price-history', isAuthenticated, async (req, res) => {
    try {
      const history = await storage.getProductPriceHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error('Error fetching price history:', error);
      res.status(500).json({ error: 'Failed to fetch price history' });
    }
  });
  
  // Get price analytics
  app.get('/api/ordering/price-analytics', isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getPriceAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching price analytics:', error);
      res.status(500).json({ error: 'Failed to fetch price analytics' });
    }
  });

  // ======== STOCK COUNTING SYSTEM ROUTES ========
  // Get stock counts with filters
  app.get('/api/stock-counts', isAuthenticated, async (req, res) => {
    try {
      const { locationCode, productId, startDate, endDate } = req.query;
      const filters: any = {};
      
      if (locationCode) filters.locationCode = locationCode as string;
      if (productId) filters.productId = productId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const counts = await storage.getStockCounts(filters);
      res.json(counts);
    } catch (error) {
      console.error('Error fetching stock counts:', error);
      res.status(500).json({ error: 'Failed to fetch stock counts' });
    }
  });
  
  // Get latest stock counts for a location
  app.get('/api/stock-counts/latest/:locationCode', isAuthenticated, async (req, res) => {
    try {
      const { locationCode } = req.params;
      const counts = await storage.getLatestStockCounts(locationCode);
      res.json(counts);
    } catch (error) {
      console.error('Error fetching latest stock counts:', error);
      res.status(500).json({ error: 'Failed to fetch latest stock counts' });
    }
  });
  
  // Submit new stock count
  app.post('/api/stock-counts', isAuthenticated, async (req: any, res) => {
    try {
      // Auth guard - check for user claims
      if (!req.user?.claims?.email) {
        return res.status(401).json({ error: "Unauthorized - missing user claims" });
      }
      
      const staffEmail = req.user.claims.email;
      const staff = await storage.getStaffByEmail(staffEmail);
      
      if (!staff) {
        return res.status(403).json({ error: "Staff not found" });
      }

      // Validate with schema, enforce locationCode and countedBy from server-side
      const validated = insertStockCountSchema.parse({
        productId: req.body.productId,
        locationCode: "HEAD_OFFICE", // Hardcode location for this endpoint
        countedQuantity: Number(req.body.countedQuantity), // Coerce to number
        countDate: req.body.countDate ? new Date(req.body.countDate) : new Date(),
        countedBy: staff.id, // Server-derived, not client-supplied
        notes: req.body.notes
      });
      
      const stockCount = await storage.createStockCount(validated);
      
      // Log activity
      await ActivityLogger.log({
        userId: req.user.claims.sub,
        userEmail: req.user.claims.email,
        userName: req.user.claims.name || req.user.claims.email,
        action: "create",
        resourceType: "stock_count",
        resourceId: stockCount.id,
        details: { locationCode: validated.locationCode, productId: validated.productId, countedQuantity: validated.countedQuantity }
      });
      
      // Auto-complete any related daily tasks
      try {
        const countDate = validated.countDate.toISOString().split('T')[0];
        const { autoCompleteLinenCountTasks } = await import('./services/task-auto-completion');
        const completedTasks = await autoCompleteLinenCountTasks(validated.locationCode, countDate);
        if (completedTasks > 0) {
          console.log(`[Stock Count] Auto-completed ${completedTasks} daily tasks for ${validated.locationCode}`);
        }
      } catch (error) {
        console.error('[Stock Count] Error auto-completing tasks:', error);
        // Don't fail the stock count submission if auto-completion fails
      }
      
      res.status(201).json(stockCount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating stock count:", error);
      res.status(500).json({ error: "Failed to create stock count" });
    }
  });

  // ======== WAGE REPORTING SYSTEM ROUTES ========
  // Get wage reports with optional filters
  app.get('/api/wages/reports', isAuthenticated, async (req, res) => {
    try {
      const { staffId, month, year, status } = req.query;
      const filters: any = {};
      if (staffId) filters.staffId = staffId as string;
      if (month) filters.month = parseInt(month as string);
      if (year) filters.year = parseInt(year as string);
      if (status) filters.status = status as string;
      
      const reports = await storage.getWageReports(filters);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching wage reports:", error);
      res.status(500).json({ error: "Failed to fetch wage reports" });
    }
  });

  // Get specific month's wage report
  app.get('/api/wages/reports/:month/:year', isAuthenticated, async (req, res) => {
    try {
      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      const staffId = req.query.staffId as string;
      
      if (staffId) {
        const report = await storage.getWageReportByStaffAndMonth(staffId, month, year);
        res.json(report || null);
      } else {
        const reports = await storage.getWageReports({ month, year });
        res.json(reports);
      }
    } catch (error) {
      console.error("Error fetching month wage report:", error);
      res.status(500).json({ error: "Failed to fetch month wage report" });
    }
  });

  // Create or update wage report
  app.post('/api/wages/reports', isAuthenticated, async (req, res) => {
    try {
      const report = await storage.createWageReport(req.body);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating wage report:", error);
      res.status(500).json({ error: "Failed to create wage report" });
    }
  });

  // Calculate wages for a month
  app.post('/api/wages/calculate', isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.body;
      const reports = await storage.calculateMonthlyWages(month, year);
      res.json(reports);
    } catch (error) {
      console.error("Error calculating wages:", error);
      res.status(500).json({ error: "Failed to calculate wages" });
    }
  });

  // Export payroll CSV
  app.get('/api/wages/export', isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.query;
      const csv = await storage.exportPayrollCSV(
        parseInt(month as string),
        parseInt(year as string)
      );
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payroll-${month}-${year}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting payroll CSV:", error);
      res.status(500).json({ error: "Failed to export payroll CSV" });
    }
  });

  // Wage Settings Routes
  app.get('/api/wages/settings', isAuthenticated, async (req, res) => {
    try {
      const { staffId } = req.query;
      if (staffId) {
        const settings = await storage.getWageSettings(staffId as string);
        res.json(settings);
      } else {
        const settings = await storage.getAllWageSettings();
        res.json(settings);
      }
    } catch (error) {
      console.error("Error fetching wage settings:", error);
      res.status(500).json({ error: "Failed to fetch wage settings" });
    }
  });

  app.post('/api/wages/settings', isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.createWageSettings(req.body);
      res.status(201).json(settings);
    } catch (error) {
      console.error("Error creating wage settings:", error);
      res.status(500).json({ error: "Failed to create wage settings" });
    }
  });

  // Timesheet Routes
  app.get('/api/wages/timesheets', isAuthenticated, async (req, res) => {
    try {
      const { staffId, startDate, endDate, status } = req.query;
      const filters: any = {};
      if (staffId) filters.staffId = staffId as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status as string;
      
      const timesheets = await storage.getTimesheets(filters);
      res.json(timesheets);
    } catch (error) {
      console.error("Error fetching timesheets:", error);
      res.status(500).json({ error: "Failed to fetch timesheets" });
    }
  });

  app.post('/api/wages/timesheets', isAuthenticated, async (req, res) => {
    try {
      const timesheet = await storage.createTimesheet(req.body);
      res.status(201).json(timesheet);
    } catch (error) {
      console.error("Error creating timesheet:", error);
      res.status(500).json({ error: "Failed to create timesheet" });
    }
  });

  // ======== WAGE DOCUMENT PROCESSING ROUTES ========
  
  // Wage Periods
  app.post('/api/wages/periods', isAuthenticated, async (req, res) => {
    try {
      const period = await storage.createWagePeriod({
        ...req.body,
        status: 'draft',
        totalAmount: '0'
      });
      res.status(201).json(period);
    } catch (error) {
      console.error("Error creating wage period:", error);
      res.status(500).json({ error: "Failed to create wage period" });
    }
  });

  app.get('/api/wages/periods', isAuthenticated, async (req, res) => {
    try {
      const periods = await storage.getWagePeriods();
      res.json(periods);
    } catch (error) {
      console.error("Error fetching wage periods:", error);
      res.status(500).json({ error: "Failed to fetch wage periods" });
    }
  });

  app.get('/api/wages/periods/:id', isAuthenticated, async (req, res) => {
    try {
      const period = await storage.getWagePeriod(req.params.id);
      if (!period) {
        return res.status(404).json({ error: "Wage period not found" });
      }
      
      const cleaners = await storage.getCleanerWages(req.params.id);
      const reports = await storage.getWageDocumentUploads(req.params.id);
      
      res.json({ ...period, cleaners, reports });
    } catch (error) {
      console.error("Error fetching wage period:", error);
      res.status(500).json({ error: "Failed to fetch wage period" });
    }
  });

  app.post('/api/wages/periods/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const analytics = await storage.getWageDocumentAnalytics(req.params.id);
      const period = await storage.updateWagePeriod(req.params.id, {
        status: 'verified',
        verifiedAt: new Date(),
        totalAmount: analytics.totalWageBill.toFixed(2)
      });
      res.json(period);
    } catch (error) {
      console.error("Error approving wage period:", error);
      res.status(500).json({ error: "Failed to approve wage period" });
    }
  });

  // Document Uploads with Multer
  const wageUpload = multer({ dest: 'uploads/wages/' });
  const landlordImportUpload = multer({ dest: 'uploads/landlords/' });
  
  // Duplicate detection endpoint
  app.post('/api/wage-reports/check-duplicate', isAuthenticated, wageUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { wagePeriodId } = req.body;
      if (!wagePeriodId) {
        return res.status(400).json({ error: "Wage period ID is required" });
      }

      // Calculate file hash
      const fileBuffer = await fs.readFile(req.file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check for duplicates in the same period
      const existingUploads = await storage.getWageDocumentUploads(wagePeriodId);
      const duplicate = existingUploads.find(upload => upload.fileHash === fileHash);

      // Clean up temporary file
      await fs.unlink(req.file.path);

      if (duplicate) {
        return res.status(409).json({ 
          isDuplicate: true, 
          message: `This file has already been uploaded for this period (${duplicate.fileName} on ${format(new Date(duplicate.uploadDate), 'PPp')})`,
          existingUpload: duplicate
        });
      }

      res.json({ isDuplicate: false });
    } catch (error) {
      console.error("Error checking duplicate:", error);
      res.status(500).json({ error: "Failed to check for duplicate" });
    }
  });
  
  app.post('/api/wages/periods/:id/reports/upload', isAuthenticated, wageUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { reportType } = req.body;
      if (!reportType || (reportType !== 'properly' && reportType !== 'connect')) {
        return res.status(400).json({ error: "Invalid report type. Must be 'properly' or 'connect'" });
      }

      // Calculate file hash for duplicate detection
      const fileBuffer = await fs.readFile(req.file.path);
      const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Check for duplicates before creating the upload record
      const existingUploads = await storage.getWageDocumentUploads(req.params.id);
      const duplicate = existingUploads.find(upload => upload.fileHash === fileHash);

      if (duplicate) {
        await fs.unlink(req.file.path); // Clean up temp file
        return res.status(409).json({ 
          error: `Duplicate file detected. This file was already uploaded as "${duplicate.fileName}" on ${format(new Date(duplicate.uploadDate), 'PPp')}`
        });
      }

      const upload = await storage.createWageDocumentUpload({
        wagePeriodId: req.params.id,
        reportType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileHash,
        status: 'pending'
      });

      res.status(201).json(upload);
    } catch (error) {
      console.error("Error uploading wage document:", error);
      res.status(500).json({ error: "Failed to upload wage document" });
    }
  });

  app.post('/api/wages/periods/:periodId/reports/:reportId/extract', isAuthenticated, async (req, res) => {
    try {
      const { extractWageDocument } = await import('./services/wage-extraction.js');
      
      const upload = await storage.getWageDocumentUpload(req.params.reportId);
      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }

      const extractedData = await extractWageDocument(upload.filePath, upload.reportType);
      
      await storage.updateWageDocumentUpload(req.params.reportId, {
        status: 'processed',
        processedAt: new Date(),
        extractedData: extractedData as any
      });

      const existingWages = await storage.getCleanerWages(req.params.periodId);
      const wageMap = new Map(existingWages.map(w => [w.cleanerName.toLowerCase(), w]));

      for (const [cleanerName, data] of Object.entries(extractedData)) {
        const existing = wageMap.get(cleanerName.toLowerCase());
        const wageData: any = data;

        if (existing) {
          if (upload.reportType === 'properly') {
            await storage.updateCleanerWage(existing.id, {
              fixedCleaningEarnings: wageData.totalEarnings.toFixed(2),
              fixedCleaningJobs: wageData.jobCount,
              totalEarnings: (parseFloat(existing.hourlyEarnings.toString()) + wageData.totalEarnings).toFixed(2)
            });
          } else {
            await storage.updateCleanerWage(existing.id, {
              hourlyEarnings: wageData.totalEarnings.toFixed(2),
              hourlyHours: wageData.hoursWorked,
              totalEarnings: (parseFloat(existing.fixedCleaningEarnings.toString()) + wageData.totalEarnings).toFixed(2)
            });
          }
        } else {
          await storage.createCleanerWage({
            wagePeriodId: req.params.periodId,
            cleanerName: cleanerName,
            cleanerPhone: wageData.phone || '',
            fixedCleaningEarnings: upload.reportType === 'properly' ? wageData.totalEarnings.toFixed(2) : '0',
            fixedCleaningJobs: upload.reportType === 'properly' ? wageData.jobCount : 0,
            hourlyEarnings: upload.reportType === 'connect' ? wageData.totalEarnings.toFixed(2) : '0',
            hourlyHours: upload.reportType === 'connect' ? wageData.hoursWorked : 0,
            totalEarnings: wageData.totalEarnings.toFixed(2),
            smsStatus: 'pending'
          });
        }
      }

      res.json({ success: true, extractedData });
    } catch (error) {
      console.error("Error extracting wage document:", error);
      res.status(500).json({ error: "Failed to extract wage document" });
    }
  });

  // Cleaner Wages
  app.get('/api/wages/periods/:id/cleaners', isAuthenticated, async (req, res) => {
    try {
      const cleaners = await storage.getCleanerWages(req.params.id);
      res.json(cleaners);
    } catch (error) {
      console.error("Error fetching cleaner wages:", error);
      res.status(500).json({ error: "Failed to fetch cleaner wages" });
    }
  });

  app.patch('/api/wages/periods/:periodId/cleaners/:cleanerId', isAuthenticated, async (req, res) => {
    try {
      const { fixedCleaningEarnings, hourlyEarnings, cleanerPhone } = req.body;
      
      const updates: any = {};
      if (fixedCleaningEarnings !== undefined) updates.fixedCleaningEarnings = fixedCleaningEarnings;
      if (hourlyEarnings !== undefined) updates.hourlyEarnings = hourlyEarnings;
      if (cleanerPhone !== undefined) updates.cleanerPhone = cleanerPhone;
      
      if (fixedCleaningEarnings !== undefined || hourlyEarnings !== undefined) {
        const cleaner = await storage.getCleanerWage(req.params.cleanerId);
        if (cleaner) {
          const fixed = fixedCleaningEarnings !== undefined ? parseFloat(fixedCleaningEarnings) : parseFloat(cleaner.fixedCleaningEarnings.toString());
          const hourly = hourlyEarnings !== undefined ? parseFloat(hourlyEarnings) : parseFloat(cleaner.hourlyEarnings.toString());
          updates.totalEarnings = (fixed + hourly).toFixed(2);
        }
      }
      
      const updated = await storage.updateCleanerWage(req.params.cleanerId, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating cleaner wage:", error);
      res.status(500).json({ error: "Failed to update cleaner wage" });
    }
  });

  // SMS Notifications
  app.post('/api/wages/periods/:id/send-sms', isAuthenticated, async (req, res) => {
    try {
      const { sendWageSMS } = await import('./services/wage-sms.js');
      const period = await storage.getWagePeriod(req.params.id);
      if (!period) {
        return res.status(404).json({ error: "Period not found" });
      }

      const cleaners = await storage.getCleanerWages(req.params.id);
      const results = [];

      for (const cleaner of cleaners) {
        if (cleaner.cleanerPhone && cleaner.smsStatus !== 'sent') {
          try {
            await sendWageSMS(cleaner, period.month, period.year);
            await storage.updateCleanerWage(cleaner.id, {
              smsStatus: 'sent',
              smsSentAt: new Date()
            });
            results.push({ cleanerId: cleaner.id, status: 'sent' });
          } catch (error) {
            await storage.updateCleanerWage(cleaner.id, { smsStatus: 'failed' });
            results.push({ cleanerId: cleaner.id, status: 'failed', error: String(error) });
          }
        }
      }

      await storage.updateWagePeriod(req.params.id, { status: 'sent' });
      res.json({ results });
    } catch (error) {
      console.error("Error sending SMS notifications:", error);
      res.status(500).json({ error: "Failed to send SMS notifications" });
    }
  });

  app.post('/api/wages/periods/:periodId/cleaners/:cleanerId/send-sms', isAuthenticated, async (req, res) => {
    try {
      const { sendWageSMS } = await import('./services/wage-sms.js');
      
      const cleaner = await storage.getCleanerWage(req.params.cleanerId);
      const period = await storage.getWagePeriod(req.params.periodId);
      
      if (!cleaner || !period) {
        return res.status(404).json({ error: "Cleaner or period not found" });
      }

      if (!cleaner.cleanerPhone) {
        return res.status(400).json({ error: "Cleaner has no phone number" });
      }

      await sendWageSMS(cleaner, period.month, period.year);
      await storage.updateCleanerWage(req.params.cleanerId, {
        smsStatus: 'sent',
        smsSentAt: new Date()
      });

      res.json({ success: true });
    } catch (error) {
      await storage.updateCleanerWage(req.params.cleanerId, { smsStatus: 'failed' });
      console.error("Error sending SMS:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // Analytics
  app.get('/api/wages/analytics', isAuthenticated, async (req, res) => {
    try {
      const { wagePeriodId } = req.query;
      if (!wagePeriodId) {
        return res.status(400).json({ error: "wagePeriodId is required" });
      }

      const analytics = await storage.getWageDocumentAnalytics(wagePeriodId as string);
      const period = await storage.getWagePeriod(wagePeriodId as string);
      
      if (!period) {
        return res.status(404).json({ error: "Period not found" });
      }

      const comparison = await storage.getWagePeriodComparison(period.month, period.year, 6);
      
      res.json({ ...analytics, comparison });
    } catch (error) {
      console.error("Error fetching wage analytics:", error);
      res.status(500).json({ error: "Failed to fetch wage analytics" });
    }
  });

  // Public Wage Breakdown Route (no auth required)
  app.get('/cleaner/wage/:token', async (req, res) => {
    try {
      const { token } = req.params;

      // Get wage token from database
      const wageToken = await storage.getWageTokenByToken(token);

      if (!wageToken) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invalid Link</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #f5f5f5; }
              .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
              h1 { color: #e53e3e; margin-bottom: 10px; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Invalid Link</h1>
              <p>This wage breakdown link is not valid. Please contact your manager if you believe this is an error.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Check if token is expired
      if (new Date() > new Date(wageToken.expiresAt)) {
        return res.status(410).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Link Expired</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #f5f5f5; }
              .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
              h1 { color: #e53e3e; margin-bottom: 10px; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Link Expired</h1>
              <p>This wage breakdown link has expired. Links are valid for 7 days. Please contact your manager for a new link.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Get cleaner wage details
      const cleanerWage = await storage.getCleanerWage(wageToken.cleanerWageId);
      
      if (!cleanerWage) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Not Found</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #f5f5f5; }
              .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
              h1 { color: #e53e3e; margin-bottom: 10px; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Not Found</h1>
              <p>Wage details not found. Please contact your manager.</p>
            </div>
          </body>
          </html>
        `);
      }

      // Mark token as viewed (only first time)
      if (!wageToken.viewedAt) {
        await storage.markWageTokenViewed(wageToken.id);
      }

      // Get wage period details
      const wagePeriod = await storage.getWagePeriod(cleanerWage.wagePeriodId);
      
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthName = wagePeriod ? monthNames[wagePeriod.month - 1] : '';
      const year = wagePeriod?.year || '';

      // Format amounts
      const fixedAmount = parseFloat(cleanerWage.fixedCleaningEarnings.toString()).toFixed(2);
      const hourlyAmount = parseFloat(cleanerWage.hourlyEarnings.toString()).toFixed(2);
      const totalAmount = parseFloat(cleanerWage.totalEarnings.toString()).toFixed(2);
      const hourlyHours = parseFloat(cleanerWage.hourlyHours.toString()).toFixed(1);

      // Build and send HTML response
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Wage Breakdown - ${cleanerWage.cleanerName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              max-width: 600px;
              margin: 0 auto;
              background: #f5f5f5;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #2d3748;
              margin-bottom: 10px;
              font-size: 24px;
            }
            .period {
              color: #718096;
              margin-bottom: 30px;
              font-size: 16px;
            }
            .breakdown {
              margin: 20px 0;
            }
            .breakdown-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .breakdown-item:last-child {
              border-bottom: none;
            }
            .breakdown-label {
              color: #4a5568;
              font-size: 15px;
            }
            .breakdown-detail {
              color: #718096;
              font-size: 13px;
              margin-top: 4px;
            }
            .breakdown-amount {
              color: #2d3748;
              font-size: 18px;
              font-weight: 600;
            }
            .total {
              background: #edf2f7;
              padding: 20px;
              border-radius: 6px;
              margin-top: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .total-label {
              color: #2d3748;
              font-size: 18px;
              font-weight: 600;
            }
            .total-amount {
              color: #2d3748;
              font-size: 28px;
              font-weight: 700;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #718096;
              font-size: 14px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Wage Breakdown</h1>
            <div class="period">${cleanerWage.cleanerName} - ${monthName} ${year}</div>
            
            <div class="breakdown">
              ${parseFloat(fixedAmount) > 0 ? `
              <div class="breakdown-item">
                <div>
                  <div class="breakdown-label">Fixed Cleaning</div>
                  <div class="breakdown-detail">${cleanerWage.fixedCleaningJobs} jobs completed</div>
                </div>
                <div class="breakdown-amount">£${fixedAmount}</div>
              </div>
              ` : ''}
              
              ${parseFloat(hourlyAmount) > 0 ? `
              <div class="breakdown-item">
                <div>
                  <div class="breakdown-label">Hourly Work</div>
                  <div class="breakdown-detail">${hourlyHours} hours worked</div>
                </div>
                <div class="breakdown-amount">£${hourlyAmount}</div>
              </div>
              ` : ''}
            </div>
            
            <div class="total">
              <div class="total-row">
                <div class="total-label">Total Earnings</div>
                <div class="total-amount">£${totalAmount}</div>
              </div>
            </div>
            
            <div class="footer">
              Payment will be processed shortly.<br>
              If you have any questions, please contact your manager.
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error displaying wage breakdown:", error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
            h1 { color: #e53e3e; margin-bottom: 10px; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Error</h1>
            <p>An error occurred while loading your wage breakdown. Please try again later or contact your manager.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  // ======== BUSINESS PERFORMANCE ANALYTICS ROUTES ========
  // Main Analytics Dashboard
  app.get('/api/analytics/dashboard', isAuthenticated, async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      const dashboard = await storage.getBusinessAnalyticsDashboard(dateFrom, dateTo);
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching analytics dashboard:", error);
      res.status(500).json({ error: "Failed to fetch analytics dashboard" });
    }
  });

  // Revenue Analytics
  app.get('/api/analytics/revenue', isAuthenticated, async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      // TODO: Implement actual data aggregation from QuickBooks and booking sources
      const revenue = {
        totalRevenue: 0,
        monthlyTrend: [],
        propertyRevenue: [],
        occupancyRate: 0,
        averageDailyRate: 0,
        revenuePerAvailableRoom: 0
      };
      
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      res.status(500).json({ error: "Failed to fetch revenue analytics" });
    }
  });

  // Operations Analytics
  app.get('/api/analytics/operations', isAuthenticated, async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      // TODO: Implement actual data aggregation from maintenance, cleaning, and inspection modules
      const operations = {
        maintenanceCosts: 0,
        cleaningEfficiency: 0,
        guestSatisfaction: 0,
        responseTime: 0,
        propertyUtilization: 0
      };
      
      res.json(operations);
    } catch (error) {
      console.error("Error fetching operations analytics:", error);
      res.status(500).json({ error: "Failed to fetch operations analytics" });
    }
  });

  // Staff Performance Analytics
  app.get('/api/analytics/staff', isAuthenticated, async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      // TODO: Implement actual data aggregation from compliance, wage, and attendance modules
      const staffAnalytics = {
        laborCosts: 0,
        productivityScores: [],
        complianceRate: 0,
        retentionRate: 0,
        trainingCompletion: 0
      };
      
      res.json(staffAnalytics);
    } catch (error) {
      console.error("Error fetching staff analytics:", error);
      res.status(500).json({ error: "Failed to fetch staff analytics" });
    }
  });

  // Property Performance Analytics
  app.get('/api/analytics/properties', isAuthenticated, async (req, res) => {
    try {
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      // TODO: Implement actual data aggregation from all modules
      const propertyAnalytics = {
        topPerforming: [],
        needingAttention: [],
        costBreakdown: [],
        maintenanceRatios: []
      };
      
      res.json(propertyAnalytics);
    } catch (error) {
      console.error("Error fetching property analytics:", error);
      res.status(500).json({ error: "Failed to fetch property analytics" });
    }
  });

  // ======== UPLISTING BOOKING REPORT ROUTES ========
  
  // Upload and parse Uplisting booking report
  app.post("/api/uplisting/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { fileName, csvContent } = req.body;
      const user = req.user;
      const { parseUplistingBookingReport, extractPeriodFromFilename } = await import('./services/uplisting-parser.js');

      const checkouts = parseUplistingBookingReport(csvContent);
      const { start, end } = extractPeriodFromFilename(fileName);

      const upload = await storage.createUplistingUpload({
        fileName,
        uploadedBy: user.claims.sub,
        periodStart: start,
        periodEnd: end,
        totalBookings: checkouts.length,
      });

      const scheduleItems = checkouts.map(checkout => ({
        uploadId: upload.id,
        checkoutDate: checkout.checkoutDate,
        propertyName: checkout.propertyName,
        originalBookingId: checkout.bookingId,
      }));

      await storage.createCheckoutScheduleItems(scheduleItems);

      res.json({
        success: true,
        uploadId: upload.id,
        totalBookings: checkouts.length,
        checkouts: checkouts,
      });
    } catch (error: any) {
      console.error("Error processing Uplisting upload:", error);
      res.status(500).json({ error: "Failed to process upload", details: error.message });
    }
  });

  // Get all uploads
  app.get("/api/uplisting/uploads", isAuthenticated, async (req, res) => {
    try {
      const uploads = await storage.getUplistingUploads();
      res.json(uploads);
    } catch (error: any) {
      console.error("Error fetching uploads:", error);
      res.status(500).json({ error: "Failed to fetch uploads" });
    }
  });

  // Get checkout schedule for a specific upload
  app.get("/api/uplisting/uploads/:uploadId/schedule", isAuthenticated, async (req, res) => {
    try {
      const { uploadId } = req.params;
      const schedule = await storage.getCheckoutSchedule(uploadId);
      res.json(schedule);
    } catch (error: any) {
      console.error("Error fetching checkout schedule:", error);
      res.status(500).json({ error: "Failed to fetch checkout schedule" });
    }
  });

  // Get all checkout schedules with optional date filters
  app.get("/api/uplisting/checkout-schedule", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const schedule = await storage.getAllCheckoutSchedule({
        startDate: startDate as string,
        endDate: endDate as string,
      });
      res.json(schedule);
    } catch (error: any) {
      console.error("Error fetching checkout schedule:", error);
      res.status(500).json({ error: "Failed to fetch checkout schedule" });
    }
  });

  // Delete upload and associated schedule
  app.delete("/api/uplisting/uploads/:uploadId", isAuthenticated, async (req, res) => {
    try {
      const { uploadId } = req.params;
      await storage.deleteUplistingUpload(uploadId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting upload:", error);
      res.status(500).json({ error: "Failed to delete upload" });
    }
  });

  // AST Lettings - Properties
  app.get("/api/ast/properties", isAuthenticated, async (req, res) => {
    try {
      const properties = await storage.getAstProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching AST properties:", error);
      res.status(500).json({ error: "Failed to fetch AST properties" });
    }
  });

  app.post("/api/ast/properties", isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertAstPropertySchema.parse(req.body);
      const property = await storage.createAstProperty(validated);
      res.json(property);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid property data", details: error.errors });
      }
      console.error("Error creating AST property:", error);
      res.status(500).json({ error: "Failed to create AST property" });
    }
  });

  app.get("/api/ast/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const property = await storage.getAstProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Error fetching AST property:", error);
      res.status(500).json({ error: "Failed to fetch AST property" });
    }
  });

  app.patch("/api/ast/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const property = await storage.updateAstProperty(id, updates);
      res.json(property);
    } catch (error) {
      console.error("Error updating AST property:", error);
      res.status(500).json({ error: "Failed to update AST property" });
    }
  });

  app.delete("/api/ast/properties/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAstProperty(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AST property:", error);
      res.status(500).json({ error: "Failed to delete AST property" });
    }
  });

  // AST Lettings - Buildings
  app.post("/api/ast/buildings", isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertAstBuildingSchema.parse(req.body);
      const building = await storage.createAstBuilding(validated);
      res.json(building);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid building data", details: error.errors });
      }
      console.error("Error creating AST building:", error);
      res.status(500).json({ error: "Failed to create AST building" });
    }
  });

  app.get("/api/ast/buildings", isAuthenticated, async (req, res) => {
    try {
      const buildings = await storage.getAstBuildings();
      res.json(buildings);
    } catch (error) {
      console.error("Error fetching AST buildings:", error);
      res.status(500).json({ error: "Failed to fetch AST buildings" });
    }
  });

  app.get("/api/ast/buildings/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const building = await storage.getAstBuilding(id);
      
      if (!building) {
        return res.status(404).json({ error: "Building not found" });
      }
      
      res.json(building);
    } catch (error) {
      console.error("Error fetching AST building:", error);
      res.status(500).json({ error: "Failed to fetch AST building" });
    }
  });

  app.patch("/api/ast/buildings/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const building = await storage.updateAstBuilding(id, updates);
      res.json(building);
    } catch (error) {
      console.error("Error updating AST building:", error);
      res.status(500).json({ error: "Failed to update AST building" });
    }
  });

  // AST Lettings - Apartments
  app.post("/api/ast/apartments", isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertAstApartmentSchema.parse(req.body);
      const apartment = await storage.createAstApartment(validated);
      res.json(apartment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid apartment data", details: error.errors });
      }
      console.error("Error creating AST apartment:", error);
      res.status(500).json({ error: "Failed to create AST apartment" });
    }
  });

  app.get("/api/ast/apartments/building/:buildingId", isAuthenticated, async (req, res) => {
    try {
      const { buildingId } = req.params;
      const apartments = await storage.getAstApartmentsByBuilding(buildingId);
      res.json(apartments);
    } catch (error) {
      console.error("Error fetching AST apartments:", error);
      res.status(500).json({ error: "Failed to fetch AST apartments" });
    }
  });

  app.get("/api/ast/apartments/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const apartment = await storage.getAstApartment(id);
      
      if (!apartment) {
        return res.status(404).json({ error: "Apartment not found" });
      }
      
      res.json(apartment);
    } catch (error) {
      console.error("Error fetching AST apartment:", error);
      res.status(500).json({ error: "Failed to fetch AST apartment" });
    }
  });

  app.patch("/api/ast/apartments/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const apartment = await storage.updateAstApartment(id, updates);
      res.json(apartment);
    } catch (error) {
      console.error("Error updating AST apartment:", error);
      res.status(500).json({ error: "Failed to update AST apartment" });
    }
  });

  app.delete("/api/ast/apartments/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAstApartment(id);
      res.json({ success: true, message: "Apartment deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting AST apartment:", error);
      if (error.message === "Cannot delete apartment with active tenancies") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete AST apartment" });
    }
  });

  // AST Lettings - Tenancies
  app.get("/api/ast/tenancies", isAuthenticated, async (req, res) => {
    try {
      const { astPropertyId, status } = req.query;
      
      const filters: any = {};
      if (astPropertyId) filters.astPropertyId = astPropertyId;
      if (status) filters.status = status;
      
      const tenancies = await storage.getAstTenancies(filters);
      res.json(tenancies);
    } catch (error) {
      console.error("Error fetching AST tenancies:", error);
      res.status(500).json({ error: "Failed to fetch AST tenancies" });
    }
  });

  app.get("/api/ast/tenancies/with-properties", isAuthenticated, async (req, res) => {
    try {
      const tenancies = await storage.getAstTenanciesWithProperties();
      res.json(tenancies);
    } catch (error) {
      console.error("Error fetching AST tenancies with properties:", error);
      res.status(500).json({ error: "Failed to fetch AST tenancies with properties" });
    }
  });

  app.get("/api/ast/tenancies/with-details", isAuthenticated, async (req, res) => {
    try {
      const tenancies = await storage.getAstTenanciesWithDetails();
      res.json(tenancies);
    } catch (error) {
      console.error("Error fetching AST tenancies with details:", error);
      res.status(500).json({ error: "Failed to fetch AST tenancies with details" });
    }
  });

  app.post("/api/ast/tenancies", isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertAstTenancySchema.parse(req.body);
      
      // If apartment-based tenancy, roomNumber is required
      if (validated.astApartmentId && !validated.roomNumber) {
        return res.status(400).json({
          error: "Room number is required for apartment-based tenancies"
        });
      }
      
      // If property-based tenancy, ensure apartmentId is null (but roomNumber is allowed for HMO)
      if (validated.astPropertyId && validated.astApartmentId) {
        return res.status(400).json({
          error: "Cannot specify both property and apartment"
        });
      }
      
      const tenancy = await storage.createAstTenancy(validated);
      res.json(tenancy);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid tenancy data", details: error.errors });
      }
      console.error("Error creating AST tenancy:", error);
      res.status(500).json({ error: "Failed to create AST tenancy" });
    }
  });

  app.get("/api/ast/tenancies/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const tenancy = await storage.getAstTenancy(id);
      
      if (!tenancy) {
        return res.status(404).json({ error: "Tenancy not found" });
      }
      
      res.json(tenancy);
    } catch (error) {
      console.error("Error fetching AST tenancy:", error);
      res.status(500).json({ error: "Failed to fetch AST tenancy" });
    }
  });

  app.patch("/api/ast/tenancies/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const tenancy = await storage.updateAstTenancy(id, updates);
      res.json(tenancy);
    } catch (error) {
      console.error("Error updating AST tenancy:", error);
      res.status(500).json({ error: "Failed to update AST tenancy" });
    }
  });

  app.delete("/api/ast/tenancies/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAstTenancy(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AST tenancy:", error);
      res.status(500).json({ error: "Failed to delete AST tenancy" });
    }
  });

  // Send SMS to tenant
  app.post("/api/ast/tenancies/:id/send-sms", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;
      
      if (!message || message.trim() === "") {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Get tenancy
      const tenancy = await storage.getAstTenancy(id);
      if (!tenancy) {
        return res.status(404).json({ error: "Tenancy not found" });
      }
      
      if (!tenancy.tenantPhone) {
        return res.status(400).json({ error: "Tenant has no phone number" });
      }
      
      // Send SMS via Twilio
      const result = await sendGenericSMS(tenancy.tenantPhone, message);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send SMS" });
      }
      
      res.json({ 
        success: true, 
        message: "SMS sent successfully",
        messageId: result.messageId 
      });
    } catch (error: any) {
      console.error("Send tenant SMS error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // Initiate call to tenant via JustCall
  app.post("/api/ast/tenancies/:id/initiate-call", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get tenancy
      const tenancy = await storage.getAstTenancy(id);
      if (!tenancy) {
        return res.status(404).json({ error: "Tenancy not found" });
      }
      
      if (!tenancy.tenantPhone) {
        return res.status(400).json({ error: "Tenant has no phone number" });
      }
      
      // Initiate call via JustCall
      const result = await initiateCall(tenancy.tenantPhone, tenancy.tenantName);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to initiate call" });
      }
      
      res.json({ 
        success: true, 
        message: "Call initiated successfully",
        callId: result.callId 
      });
    } catch (error: any) {
      console.error("Initiate tenant call error:", error);
      res.status(500).json({ error: "Failed to initiate call" });
    }
  });

  // Generate rent payment schedule for a tenancy
  app.post("/api/ast/tenancies/:id/generate-schedule", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const payments = await storage.generateRentPaymentSchedule(id);
      res.json(payments);
    } catch (error) {
      console.error("Error generating rent payment schedule:", error);
      res.status(500).json({ error: "Failed to generate rent payment schedule" });
    }
  });

  // AST Lettings - Contracts
  app.get("/api/ast/contracts/:tenancyId", isAuthenticated, async (req, res) => {
    try {
      const { tenancyId } = req.params;
      const contracts = await storage.getAstContractsByTenancy(tenancyId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching AST contracts:", error);
      res.status(500).json({ error: "Failed to fetch AST contracts" });
    }
  });

  app.post("/api/ast/contracts", isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertAstContractSchema.parse(req.body);
      const contract = await storage.createAstContract(validated);
      res.json(contract);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid contract data", details: error.errors });
      }
      console.error("Error creating AST contract:", error);
      res.status(500).json({ error: "Failed to create AST contract" });
    }
  });

  app.delete("/api/ast/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAstContract(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AST contract:", error);
      res.status(500).json({ error: "Failed to delete AST contract" });
    }
  });

  // Extract data from PDF contract (no save to database)
  app.post("/api/ast/contracts/extract", isAuthenticated, async (req: any, res) => {
    try {
      const multer = await import("multer");
      const upload = multer.default({ storage: multer.memoryStorage() });
      
      upload.single("file")(req, res, async (err: any) => {
        if (err) {
          console.error("Error uploading file:", err);
          return res.status(400).json({ error: "File upload failed" });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        
        try {
          const { extractTextFromPDF, extractContractDataWithAI } = await import("./services/contract-extraction");
          
          // Extract text from PDF
          console.log("[CONTRACT-EXTRACT] Extracting text from PDF...");
          const pdfText = await extractTextFromPDF(req.file.buffer);
          
          // Extract data using OpenAI
          console.log("[CONTRACT-EXTRACT] Extracting contract data with AI...");
          const extractedData = await extractContractDataWithAI(pdfText);
          
          console.log("[CONTRACT-EXTRACT] Contract data extracted successfully");
          res.json({ extractedData });
        } catch (extractError) {
          console.error("[CONTRACT-EXTRACT] Error during extraction:", extractError);
          const errorMessage = extractError instanceof Error ? extractError.message : "Unknown error";
          return res.status(500).json({ 
            error: `Failed to extract contract data: ${errorMessage}`
          });
        }
      });
    } catch (error) {
      console.error("Error in contract extract endpoint:", error);
      res.status(500).json({ error: "Failed to process contract extraction" });
    }
  });

  // Upload PDF contract and extract data with AI
  app.post("/api/ast/contracts/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { uploadConfigs } = await import("./upload-config");
      const upload = uploadConfigs.astContracts;
      
      upload.single("file")(req, res, async (err: any) => {
        if (err) {
          console.error("Error uploading file:", err);
          return res.status(400).json({ error: "File upload failed" });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        
        const { tenancyId } = req.body;
        if (!tenancyId) {
          return res.status(400).json({ error: "Missing tenancyId" });
        }
        
        try {
          const { extractTextFromPDF, extractContractDataWithAI } = await import("./services/contract-extraction");
          
          // Read file from disk for processing
          const fileBuffer = await fs.readFile(req.file.path);
          
          // Extract text from PDF
          console.log("[CONTRACT-UPLOAD] Extracting text from PDF...");
          const pdfText = await extractTextFromPDF(fileBuffer);
          
          // Extract data using OpenAI
          console.log("[CONTRACT-UPLOAD] Extracting contract data with AI...");
          const extractedData = await extractContractDataWithAI(pdfText);
          
          // Store file path instead of uploading to Google Cloud
          console.log("[CONTRACT-UPLOAD] File saved locally:", req.file.filename);
          const fileUrl = `/uploads/ast-contracts/${req.file.filename}`;
          
          // Save contract with extracted data
          const contract = await storage.createAstContract({
            tenancyId,
            fileName: req.file.originalname,
            fileUrl, // Store the local file URL
            fileSize: req.file.size,
            uploadedBy: req.user.claims.sub,
            documentType: "tenancy_agreement",
            extractedData,
            extractionStatus: "extracted",
          });
          
          console.log("[CONTRACT-UPLOAD] Contract uploaded and data extracted successfully");
          res.json({ contract, extractedData, fileUrl });
        } catch (extractError) {
          console.error("[CONTRACT-UPLOAD] Error during extraction:", extractError);
          const errorMessage = extractError instanceof Error ? extractError.message : "Unknown error";
          
          try {
            // File is already saved to disk, just save the record
            const fileUrl = `/uploads/ast-contracts/${req.file.filename}`;
            
            // Save contract with failed extraction status
            const contract = await storage.createAstContract({
              tenancyId,
              fileName: req.file.originalname,
              fileUrl, // Store the local file URL
              fileSize: req.file.size,
              uploadedBy: req.user.claims.sub,
              documentType: "tenancy_agreement",
              extractionStatus: "failed",
            });
            
            return res.status(500).json({ 
              error: `Failed to extract contract data: ${errorMessage}`,
              contract,
              fileUrl
            });
          } catch (uploadError) {
            console.error("[CONTRACT-UPLOAD] Failed to save contract record:", uploadError);
            return res.status(500).json({ error: "Failed to save contract file" });
          }
        }
      });
    } catch (error) {
      console.error("Error in contract upload endpoint:", error);
      res.status(500).json({ error: "Failed to process contract upload" });
    }
  });

  // Simple contract upload without AI extraction (for TenancyContractRow)
  app.post("/api/ast/contracts/:tenancyId", isAuthenticated, async (req: any, res) => {
    try {
      const { tenancyId } = req.params;
      const multer = await import("multer");
      const upload = multer.default({ storage: multer.memoryStorage() });
      
      upload.single("file")(req, res, async (err: any) => {
        if (err) {
          console.error("Error uploading file:", err);
          return res.status(400).json({ error: "File upload failed" });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }
        
        try {
          // Validate file type
          const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
          if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: "Only PDF, DOC, and DOCX files are allowed" });
          }

          // Validate file size
          astContractStorage.validateFileSize(req.file.size);
          
          // Upload file to Google Cloud Storage
          console.log("[CONTRACT-UPLOAD] Uploading to Google Cloud Storage...");
          const storageKey = await astContractStorage.uploadContract(
            req.file.buffer,
            req.file.originalname,
            tenancyId,
            req.file.mimetype
          );
          
          // Save contract to database
          const contract = await storage.createAstContract({
            tenancyId,
            fileName: req.file.originalname,
            fileUrl: storageKey,
            fileSize: req.file.size,
            uploadedBy: req.user.claims.sub,
            documentType: "tenancy_agreement",
            extractionStatus: "not_extracted",
          });
          
          console.log("[CONTRACT-UPLOAD] Contract uploaded successfully");
          res.json(contract);
        } catch (uploadError) {
          console.error("[CONTRACT-UPLOAD] Error uploading contract:", uploadError);
          const errorMessage = uploadError instanceof Error ? uploadError.message : "Unknown error";
          return res.status(500).json({ error: `Failed to upload contract: ${errorMessage}` });
        }
      });
    } catch (error) {
      console.error("Error in contract upload endpoint:", error);
      res.status(500).json({ error: "Failed to process contract upload" });
    }
  });

  // AST Lettings - Rent Payments
  app.get("/api/ast/rent-payments", isAuthenticated, async (req, res) => {
    try {
      const { tenancyId, status } = req.query;
      
      const filters: any = {};
      if (tenancyId) filters.tenancyId = tenancyId;
      if (status) filters.status = status;
      
      const payments = await storage.getAstRentPayments(filters);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching rent payments:", error);
      res.status(500).json({ error: "Failed to fetch rent payments" });
    }
  });

  app.get("/api/ast/rent-payments/upcoming", isAuthenticated, async (req, res) => {
    try {
      const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string) : 30;
      const payments = await storage.getUpcomingRentPayments(daysAhead);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching upcoming rent payments:", error);
      res.status(500).json({ error: "Failed to fetch upcoming rent payments" });
    }
  });

  app.post("/api/ast/rent-payments", isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertAstRentPaymentSchema.parse(req.body);
      const payment = await storage.createAstRentPayment(validated);
      res.json(payment);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid payment data", details: error.errors });
      }
      console.error("Error creating rent payment:", error);
      res.status(500).json({ error: "Failed to create rent payment" });
    }
  });

  app.get("/api/ast/rent-payments/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const payment = await storage.getAstRentPayment(id);
      
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      res.json(payment);
    } catch (error) {
      console.error("Error fetching rent payment:", error);
      res.status(500).json({ error: "Failed to fetch rent payment" });
    }
  });

  app.patch("/api/ast/rent-payments/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const payment = await storage.updateAstRentPayment(id, updates);
      res.json(payment);
    } catch (error) {
      console.error("Error updating rent payment:", error);
      res.status(500).json({ error: "Failed to update rent payment" });
    }
  });

  app.delete("/api/ast/rent-payments/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAstRentPayment(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting rent payment:", error);
      res.status(500).json({ error: "Failed to delete rent payment" });
    }
  });

  // Send payment receipt email to tenant
  app.post("/api/ast/rent-payments/:id/send-receipt", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get payment details
      const payment = await storage.getAstRentPayment(id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // Get tenancy details
      const tenancy = await storage.getAstTenancy(payment.tenancyId);
      if (!tenancy) {
        return res.status(404).json({ error: "Tenancy not found" });
      }
      
      // Get property details
      const property = await storage.getAstProperty(tenancy.astPropertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      // Check if tenant has email
      if (!tenancy.tenantEmail) {
        return res.status(400).json({ error: "Tenant email not found" });
      }
      
      // Check if payment is actually paid
      if (payment.status !== 'paid') {
        return res.status(400).json({ error: "Payment must be marked as paid before sending receipt" });
      }
      
      if (!payment.paidDate) {
        return res.status(400).json({ error: "Payment must have a paid date" });
      }
      
      // Format dates for email
      const dueDate = format(new Date(payment.dueDate), "dd MMM yyyy");
      const paidDate = format(new Date(payment.paidDate), "dd MMM yyyy");
      
      // Send receipt email
      const result = await sendRentPaymentReceipt(
        tenancy.tenantEmail,
        tenancy.tenantName,
        property.name,
        payment.amount,
        dueDate,
        paidDate,
        payment.paymentMethod || "Bank Transfer",
        payment.reference || "N/A"
      );
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send receipt" });
      }
      
      res.json({ 
        success: true,
        message: `Payment receipt sent to ${tenancy.tenantEmail}`
      });
    } catch (error) {
      console.error("Error sending payment receipt:", error);
      res.status(500).json({ error: "Failed to send payment receipt" });
    }
  });

  // Send payment reminder to tenant via email and SMS
  app.post("/api/ast/rent-payments/:id/send-reminder", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get payment details
      const payment = await storage.getAstRentPayment(id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      
      // Get tenancy details
      const tenancy = await storage.getAstTenancy(payment.tenancyId);
      if (!tenancy) {
        return res.status(404).json({ error: "Tenancy not found" });
      }
      
      // Get property details
      const property = await storage.getAstProperty(tenancy.astPropertyId);
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      // Calculate days overdue
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(payment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Server-side guard: refuse to send reminders if payment is not actually overdue
      if (daysOverdue <= 0) {
        return res.status(400).json({ 
          error: "Payment is not overdue yet",
          details: `Due date is ${payment.dueDate}, which is ${daysOverdue === 0 ? 'today' : 'in the future'}`
        });
      }
      
      // Format due date for display
      const dueDateFormatted = format(dueDate, "dd MMM yyyy");
      
      // Create polite email subject and body
      const emailSubject = `Rent Payment Reminder - ${property.name}`;
      const emailBody = `Dear ${tenancy.tenantName},

We hope this message finds you well.

This is a friendly reminder that your rent payment for ${property.name} (${property.address}) is currently overdue.

Payment Details:
• Amount Due: £${payment.amount.toFixed(2)}
• Original Due Date: ${dueDateFormatted}
• Days Overdue: ${daysOverdue}

Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this message and accept our apologies for any inconvenience.

Payment Instructions:
Please make the payment via bank transfer to the account details provided in your tenancy agreement. If you need our bank details or have any questions about this payment, please don't hesitate to contact us.

If you are experiencing any difficulties with payment, please contact us as soon as possible so we can discuss the situation.

Thank you for your cooperation.

Best regards,
Northstay Team`;

      // Create SMS message (keep under 160 characters)
      const smsBody = `Hi ${tenancy.tenantName}, your rent payment of £${payment.amount.toFixed(2)} for ${property.name} was due ${dueDateFormatted} (${daysOverdue} days ago). Please make payment at your earliest convenience. - Northstay`;
      
      const emailResult = { success: true, error: null };
      const smsResult = { success: true, error: null };
      
      // Send email if tenant has email
      if (tenancy.tenantEmail) {
        const result = await sendGenericEmail(tenancy.tenantEmail, emailSubject, emailBody);
        emailResult.success = result.success;
        emailResult.error = result.error || null;
      }
      
      // Send SMS if tenant has phone
      if (tenancy.tenantPhone) {
        const result = await sendGenericSMS(tenancy.tenantPhone, smsBody);
        smsResult.success = result.success;
        smsResult.error = result.error || null;
      }
      
      // Check if at least one notification method succeeded
      if (!emailResult.success && !smsResult.success) {
        return res.status(500).json({ 
          error: "Failed to send reminder",
          details: {
            email: emailResult.error,
            sms: smsResult.error
          }
        });
      }
      
      res.json({ 
        success: true,
        message: "Payment reminder sent successfully",
        details: {
          emailSent: emailResult.success,
          smsSent: smsResult.success
        }
      });
    } catch (error) {
      console.error("Error sending payment reminder:", error);
      res.status(500).json({ error: "Failed to send payment reminder" });
    }
  });

  // Manual check for overdue rent payments with detailed breakdown
  app.get("/api/ast/rent/check-overdue", isAuthenticated, async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all overdue payments (pending payments where due date is before today)
      const overduePayments = await storage.getOverdueRentPayments();
      
      // Build detailed breakdown with tenant and property information
      const breakdown = await Promise.all(
        overduePayments.map(async (payment) => {
          const tenancy = await storage.getAstTenancy(payment.tenancyId);
          if (!tenancy) return null;
          
          const property = await storage.getAstProperty(tenancy.astPropertyId);
          if (!property) return null;
          
          const daysOverdue = Math.floor(
            (today.getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          return {
            paymentId: payment.id,
            tenantName: tenancy.tenantName,
            tenantEmail: tenancy.tenantEmail || null,
            tenantPhone: tenancy.tenantPhone || null,
            propertyName: property.name,
            propertyAddress: property.address,
            amount: payment.amount,
            dueDate: payment.dueDate,
            daysOverdue,
            status: payment.status
          };
        })
      );
      
      // Filter out any null values
      const validBreakdown = breakdown.filter(item => item !== null);
      
      res.json({
        total: validBreakdown.length,
        totalAmount: validBreakdown.reduce((sum, item) => sum + parseFloat(item!.amount), 0),
        overduePayments: validBreakdown
      });
    } catch (error) {
      console.error("Error checking overdue payments:", error);
      res.status(500).json({ error: "Failed to check overdue payments" });
    }
  });

  // ===== LANDLORD MANAGEMENT ROUTES =====

  // SECURITY: Utility function to mask sensitive bank details
  function maskBankDetails(landlord: any) {
    return {
      ...landlord,
      bankAccountNumber: landlord.bankAccountNumber 
        ? '****' + landlord.bankAccountNumber.slice(-4)
        : null,
      bankSortCode: landlord.bankSortCode
        ? '**-**-' + landlord.bankSortCode.slice(-2)
        : null,
    };
  }

  // GET /api/landlords - List all landlords (bank details masked)
  app.get('/api/landlords', isAuthenticated, async (req, res) => {
    try {
      const landlords = await storage.getLandlords();
      const maskedLandlords = landlords.map(maskBankDetails);
      res.json(maskedLandlords);
    } catch (error) {
      console.error("Error fetching landlords:", error);
      res.status(500).json({ error: "Failed to fetch landlords" });
    }
  });

  // GET /api/landlords/:id - Get landlord details (bank details masked)
  app.get('/api/landlords/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const landlord = await storage.getLandlordById(id);
      
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }
      
      res.json(maskBankDetails(landlord));
    } catch (error) {
      console.error("Error fetching landlord:", error);
      res.status(500).json({ error: "Failed to fetch landlord" });
    }
  });

  // POST /api/landlords/check-duplicate - Check for duplicate email
  app.post('/api/landlords/check-duplicate', isAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const landlords = await storage.getLandlords();
      const existingLandlord = landlords.find(l => l.email.toLowerCase() === email.toLowerCase());
      
      if (existingLandlord) {
        return res.json({ 
          isDuplicate: true, 
          message: "A client with this email address already exists",
          existingLandlord: maskBankDetails(existingLandlord)
        });
      }
      
      res.json({ isDuplicate: false });
    } catch (error) {
      console.error("Error checking duplicate landlord:", error);
      res.status(500).json({ error: "Failed to check for duplicates" });
    }
  });

  // POST /api/landlords - Create landlord (returns masked bank details)
  app.post('/api/landlords', isAuthenticated, async (req, res) => {
    try {
      const validated = insertLandlordSchema.parse(req.body);
      
      // Check for duplicate email
      const landlords = await storage.getLandlords();
      const existingLandlord = landlords.find(l => l.email.toLowerCase() === validated.email.toLowerCase());
      
      if (existingLandlord) {
        return res.status(400).json({ 
          error: "Duplicate email", 
          message: "A client with this email address already exists" 
        });
      }
      
      const landlord = await storage.createLandlord(validated);
      res.json(maskBankDetails(landlord));
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid landlord data", details: error.errors });
      }
      console.error("Error creating landlord:", error);
      res.status(500).json({ error: "Failed to create landlord" });
    }
  });

  // PATCH /api/landlords/:id - Update landlord (with validation, returns masked bank details)
  app.patch('/api/landlords/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // SECURITY: Validate all input data using Zod schema
      const validatedData = insertLandlordSchema.partial().parse(req.body);
      
      const landlord = await storage.updateLandlord(id, validatedData);
      res.json(maskBankDetails(landlord));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error("Error updating landlord:", error);
      res.status(500).json({ error: "Failed to update landlord" });
    }
  });

  // DELETE /api/landlords/:id - Delete landlord
  app.delete('/api/landlords/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteLandlord(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting landlord:", error);
      res.status(500).json({ error: "Failed to delete landlord" });
    }
  });

  // POST /api/landlords/:id/send-invite - Send invitation email to landlord
  app.post('/api/landlords/:id/send-invite', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Verify landlord exists
      const landlord = await storage.getLandlordById(id);
      
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }
      
      // Generate secure reset token
      const token = generateResetToken();
      
      // Set token expiry to 48 hours from now
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 48);
      
      // Store token and expiry in database
      await storage.updateLandlordResetToken(id, token, expiryDate);
      
      // Send invitation email
      const emailResult = await sendLandlordInviteEmail(landlord.email, landlord.name, token);
      
      if (!emailResult.success) {
        return res.status(500).json({ error: emailResult.error || "Failed to send invitation email" });
      }
      
      res.json({ success: true, message: "Invitation sent successfully" });
    } catch (error) {
      console.error("Error sending landlord invite:", error);
      res.status(500).json({ error: "Failed to send invitation" });
    }
  });

  // Send SMS to landlord
  app.post("/api/landlords/:id/send-sms", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { message } = req.body;
      
      if (!message || message.trim() === "") {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Get landlord
      const landlord = await storage.getLandlordById(id);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }
      
      if (!landlord.phone) {
        return res.status(400).json({ error: "Landlord has no phone number" });
      }
      
      // Send SMS via Twilio
      const result = await sendGenericSMS(landlord.phone, message);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send SMS" });
      }
      
      res.json({ 
        success: true, 
        message: "SMS sent successfully",
        messageId: result.messageId 
      });
    } catch (error: any) {
      console.error("Send landlord SMS error:", error);
      res.status(500).json({ error: "Failed to send SMS" });
    }
  });

  // Initiate call to landlord via JustCall
  app.post("/api/landlords/:id/initiate-call", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get landlord
      const landlord = await storage.getLandlordById(id);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }
      
      if (!landlord.phone) {
        return res.status(400).json({ error: "Landlord has no phone number" });
      }
      
      // Initiate call via JustCall
      const result = await initiateCall(landlord.phone, landlord.name);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to initiate call" });
      }
      
      res.json({ 
        success: true, 
        message: "Call initiated successfully",
        callId: result.callId 
      });
    } catch (error: any) {
      console.error("Initiate landlord call error:", error);
      res.status(500).json({ error: "Failed to initiate call" });
    }
  });

  // POST /api/landlords/import-excel - Import landlords/clients from Excel file
  app.post('/api/landlords/import-excel', isAuthenticated, landlordImportUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const XLSX = require('xlsx');
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      console.log(`[Client Import] Processing ${data.length} rows from Excel file`);

      // Track statistics
      let stats = {
        totalRows: data.length,
        landlordsCreated: 0,
        landlordsUpdated: 0,
        landlordsSkipped: 0,
        propertiesCreated: 0,
        propertiesLinked: 0,
        errors: [] as string[]
      };

      // Extract unique landlords by email (skip test rows)
      const landlordMap = new Map<string, any>();
      
      for (const row of data) {
        const firstName = row['Please enter the clients first name'];
        const email = row['Please enter clients email address'];
        const address = row['Please enter the clients full address (no need to include post code)'];
        
        // Skip test/invalid rows (single character entries or missing data)
        if (!email || !firstName || email.length <= 2 || firstName.length <= 2) {
          stats.landlordsSkipped++;
          continue;
        }

        const normalizedEmail = String(email).toLowerCase().trim();
        
        // Store landlord data (deduplicated by email)
        if (!landlordMap.has(normalizedEmail)) {
          landlordMap.set(normalizedEmail, {
            name: String(firstName).trim(),
            email: normalizedEmail,
            properties: new Set<string>()
          });
        }
        
        // Add property address to this landlord
        if (address && String(address).length > 2) {
          landlordMap.get(normalizedEmail)!.properties.add(String(address).trim());
        }
      }

      console.log(`[Client Import] Found ${landlordMap.size} unique landlords`);

      // Get existing landlords
      const existingLandlords = await storage.getLandlords();
      const existingByEmail = new Map(existingLandlords.map(l => [l.email.toLowerCase(), l]));

      // Create or update landlords
      for (const [email, landlordData] of landlordMap) {
        try {
          let landlord;
          
          if (existingByEmail.has(email)) {
            // Landlord exists - update if needed
            const existing = existingByEmail.get(email)!;
            landlord = existing;
            stats.landlordsUpdated++;
          } else {
            // Create new landlord
            landlord = await storage.createLandlord({
              name: landlordData.name,
              email: landlordData.email,
              phone: null,
              bankAccountName: null,
              bankAccountNumber: null,
              bankSortCode: null,
              address: null,
              notes: `Imported from client statements on ${new Date().toISOString().split('T')[0]}`,
              statementDay: 7
            });
            stats.landlordsCreated++;
            console.log(`[Client Import] Created landlord: ${landlord.name} (${landlord.email})`);
          }

          // Create/link properties
          const existingProperties = await storage.getPropertiesByLandlord(landlord.id);
          const existingAddresses = new Set(existingProperties.map(p => p.address.toLowerCase().trim()));

          for (const propertyAddress of landlordData.properties) {
            const normalizedAddress = propertyAddress.toLowerCase().trim();
            
            if (!existingAddresses.has(normalizedAddress)) {
              // Create new property and link to landlord
              const property = await storage.createAstProperty({
                landlordId: landlord.id,
                name: propertyAddress.split(',')[0].trim(), // Use first part of address as name
                address: propertyAddress,
                bedrooms: null,
                bathrooms: null,
                propertyType: null,
                notes: 'Imported from client statements',
                active: true
              });
              stats.propertiesCreated++;
              console.log(`[Client Import] Created property: ${property.address} for ${landlord.name}`);
            } else {
              stats.propertiesLinked++;
            }
          }
        } catch (error: any) {
          console.error(`[Client Import] Error processing landlord ${email}:`, error);
          stats.errors.push(`${email}: ${error.message}`);
        }
      }

      // Clean up uploaded file
      await fs.unlink(req.file.path);

      console.log(`[Client Import] Complete:`, stats);
      res.json(stats);
    } catch (error: any) {
      console.error("Error importing landlords from Excel:", error);
      res.status(500).json({ error: "Failed to import landlords", details: error.message });
    }
  });

  // GET /api/landlords/:id/properties - Get properties for landlord
  app.get('/api/landlords/:id/properties', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const properties = await storage.getPropertiesByLandlord(id);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching landlord properties:", error);
      res.status(500).json({ error: "Failed to fetch landlord properties" });
    }
  });

  // PATCH /api/ast/properties/:id/landlord - Assign property to landlord
  app.patch('/api/ast/properties/:id/landlord', isAuthenticated, async (req, res) => {
    try {
      const propertyId = req.params.id;
      const { landlordId } = req.body;
      
      if (!landlordId && landlordId !== null) {
        return res.status(400).json({ error: "Landlord ID is required" });
      }
      
      await storage.assignPropertyToLandlord(propertyId, landlordId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error assigning property to landlord:", error);
      res.status(500).json({ error: "Failed to assign property to landlord" });
    }
  });

  // ===== MONTHLY STATEMENTS ROUTES =====

  // GET /api/statements - List all statements (with optional landlordId filter)
  app.get('/api/statements', isAuthenticated, async (req, res) => {
    try {
      const landlordId = req.query.landlordId ? parseInt(req.query.landlordId as string) : undefined;
      const statements = await storage.getStatements(landlordId);
      res.json(statements);
    } catch (error) {
      console.error("Error fetching statements:", error);
      res.status(500).json({ error: "Failed to fetch statements" });
    }
  });

  // GET /api/statements/:id - Get statement details
  app.get('/api/statements/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const statement = await storage.getStatementById(id);
      
      if (!statement) {
        return res.status(404).json({ error: "Statement not found" });
      }
      
      res.json(statement);
    } catch (error) {
      console.error("Error fetching statement:", error);
      res.status(500).json({ error: "Failed to fetch statement" });
    }
  });

  // Configure multer for statement file uploads
  const statementsDir = path.join(process.cwd(), 'attached_assets', 'statements');
  
  // Ensure directory exists
  const ensureStatementsDir = async () => {
    try {
      await fs.access(statementsDir);
    } catch {
      await fs.mkdir(statementsDir, { recursive: true });
    }
  };

  const statementUpload = multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        await ensureStatementsDir();
        cb(null, statementsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowed = ['.pdf', '.xlsx', '.xls', '.csv'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, Excel, and CSV files are allowed.'));
      }
    }
  });

  // POST /api/statements/upload - AI-powered statement upload with extraction and email generation
  app.post('/api/statements/upload', isAuthenticated, statementUpload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { landlordId, month, year } = req.body;

      if (!landlordId || !month || !year) {
        return res.status(400).json({ error: "Landlord ID, month, and year are required" });
      }

      const landlordIdNum = parseInt(landlordId);
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);

      // Get landlord details
      const landlord = await storage.getLandlordById(landlordIdNum);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }

      // Only process PDFs with AI
      const isPDF = req.file.originalname.toLowerCase().endsWith('.pdf');
      let extractedData = null;
      let generatedEmail = null;
      let emailSubject = null;
      let aiProcessingError = null;

      if (isPDF) {
        try {
          // Read the PDF file
          const pdfBuffer = await fs.readFile(req.file.path);

          // Extract data from PDF using OpenAI
          const { extractStatementDataFromPDF } = await import('./services/statement-ai-extraction');
          extractedData = await extractStatementDataFromPDF(pdfBuffer);

          // Fetch context for email generation
          const { fetchContextForStatement, generateComprehensiveLandlordEmail } = await import('./services/statement-email-generation');
          const context = await fetchContextForStatement(
            storage,
            landlordIdNum,
            extractedData.propertyAddress || "",
            monthNum,
            yearNum
          );

          // Generate comprehensive email
          const emailResult = await generateComprehensiveLandlordEmail({
            landlordName: landlord.name,
            propertyAddress: extractedData.propertyAddress || "Unknown Property",
            month: monthNum,
            year: yearNum,
            extractedData,
            maintenanceRequests: context.maintenanceRequests,
            reviews: context.reviews,
            inspections: context.inspections,
          });

          generatedEmail = emailResult.body;
          emailSubject = emailResult.subject;
        } catch (aiError: any) {
          // Log AI processing error but continue to create statement
          console.error("AI processing failed:", aiError);
          aiProcessingError = aiError.message;
          // Keep whatever extractedData we have (may be partial or null)
        }
      }

      // Create statement with AI-extracted data (even if AI processing failed)
      const statement = await storage.createStatement({
        landlordId: landlordIdNum,
        month: monthNum,
        year: yearNum,
        fileName: req.file.originalname,
        filePath: `attached_assets/statements/${req.file.filename}`,
        extractedData: extractedData || undefined,
        generatedEmail: generatedEmail || undefined,
        emailSubject: emailSubject || undefined,
        totalIncome: extractedData?.totalRevenue?.toString() || null,
        totalExpenses: extractedData?.managementFees?.toString() || null,
        netAmount: extractedData?.ownerPayout?.toString() || null,
        status: 'pending',
        emailApproved: false,
      });

      // Include AI processing error in response if it occurred
      res.json({
        ...statement,
        aiProcessingError: aiProcessingError || undefined,
      });
    } catch (error: any) {
      console.error("Error uploading statement:", error);
      // Clean up uploaded file if processing fails
      if (req.file) {
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkError) {
          console.error("Error cleaning up file:", unlinkError);
        }
      }
      res.status(500).json({ error: error.message || "Failed to upload statement" });
    }
  });

  // POST /api/statements - Create statement (without file upload for now)
  app.post('/api/statements', isAuthenticated, async (req, res) => {
    try {
      const validated = insertMonthlyStatementSchema.parse(req.body);
      const statement = await storage.createStatement(validated);
      res.json(statement);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid statement data", details: error.errors });
      }
      console.error("Error creating statement:", error);
      res.status(500).json({ error: "Failed to create statement" });
    }
  });

  // PATCH /api/statements/:id - Update statement
  app.patch('/api/statements/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const statement = await storage.updateStatement(id, updates);
      res.json(statement);
    } catch (error) {
      console.error("Error updating statement:", error);
      res.status(500).json({ error: "Failed to update statement" });
    }
  });

  // DELETE /api/statements/:id - Delete statement
  app.delete('/api/statements/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStatement(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting statement:", error);
      res.status(500).json({ error: "Failed to delete statement" });
    }
  });

  // POST /api/statements/:id/send - Send statement via email
  app.post('/api/statements/:id/send', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get statement
      const statement = await storage.getStatementById(id);
      if (!statement) {
        return res.status(404).json({ error: "Statement not found" });
      }

      // Get landlord
      const landlord = await storage.getLandlordById(statement.landlordId);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }

      // Import the statement email service
      const { sendStatementEmail } = await import('./services/statement-email');

      // Send email
      const result = await sendStatementEmail({
        landlord,
        statement,
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to send statement email" });
      }

      // Update statement status to "sent" and set sentDate
      await storage.updateStatement(id, {
        status: "sent",
        sentDate: new Date(),
      });

      res.json({ success: true, message: "Statement sent successfully" });
    } catch (error) {
      console.error("Error sending statement:", error);
      res.status(500).json({ error: "Failed to send statement" });
    }
  });

  // POST /api/statements/:id/update-email - Update generated email
  app.post('/api/statements/:id/update-email', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { emailSubject, generatedEmail } = req.body;

      if (!emailSubject || !generatedEmail) {
        return res.status(400).json({ error: "Email subject and body are required" });
      }

      const statement = await storage.updateStatement(id, {
        emailSubject,
        generatedEmail,
      });

      res.json(statement);
    } catch (error) {
      console.error("Error updating email:", error);
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  // POST /api/statements/:id/approve - Approve statement and schedule for sending
  app.post('/api/statements/:id/approve', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user as any;

      // Get statement
      const statement = await storage.getStatementById(id);
      if (!statement) {
        return res.status(404).json({ error: "Statement not found" });
      }

      // Set scheduled send date to 7th of next month
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 7);

      const updated = await storage.updateStatement(id, {
        emailApproved: true,
        emailApprovedAt: new Date(),
        emailApprovedBy: user.id,
        scheduledSendDate: nextMonth,
        status: 'approved',
      });

      res.json(updated);
    } catch (error) {
      console.error("Error approving statement:", error);
      res.status(500).json({ error: "Failed to approve statement" });
    }
  });

  // GET /api/statements/approved - Get approved statements scheduled to send
  app.get('/api/statements/approved', isAuthenticated, async (req, res) => {
    try {
      const allStatements = await storage.getStatements();
      const approved = allStatements.filter(s => s.emailApproved === true && s.status === 'approved');
      
      res.json(approved);
    } catch (error) {
      console.error("Error fetching approved statements:", error);
      res.status(500).json({ error: "Failed to fetch approved statements" });
    }
  });

  // GET /api/statements/checklist - Get all active management properties and their statement status
  app.get('/api/statements/checklist', isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ error: "Month and year are required" });
      }

      // Get all active management contracts
      const activeContracts = await storage.getActiveManagementContracts();
      
      // Get all statements for this month/year
      const statements = await storage.getStatementsByMonth(
        parseInt(year as string),
        parseInt(month as string)
      );

      // Get all landlords to enrich the data
      const landlords = await storage.getLandlords();
      const landlordMap = new Map(landlords.map(l => [l.id, l]));

      // Create checklist: all active management properties and their statement status
      const checklist = await Promise.all(activeContracts.map(async (contract) => {
        // Get landlord info if available
        const landlord = contract.landlordId ? landlordMap.get(contract.landlordId) : null;
        
        // Find statement for this landlord for this period
        const statementForPeriod = landlord ? statements.find(s => s.landlordId === landlord.id) : null;
        
        return {
          contractId: contract.id,
          propertyId: contract.propertyId,
          propertyName: contract.propertyName,
          landlord: landlord || null,
          statement: statementForPeriod || null,
          needsStatement: !statementForPeriod,
          contractStatus: contract.status,
          contractEndDate: contract.endDate,
        };
      }));

      res.json(checklist);
    } catch (error) {
      console.error("Error fetching statement checklist:", error);
      res.status(500).json({ error: "Failed to fetch statement checklist" });
    }
  });

  // GET /api/statements/pending - Get statements pending to send on 7th
  app.get('/api/statements/pending', isAuthenticated, async (req, res) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-indexed
      
      const statements = await storage.getStatementsByMonth(year, month);
      const pending = statements.filter(s => s.status === 'pending');
      
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending statements:", error);
      res.status(500).json({ error: "Failed to fetch pending statements" });
    }
  });

  // GET /api/landlords/:id/maintenance - Get maintenance for landlord in date range
  app.get('/api/landlords/:id/maintenance', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }
      
      const maintenance = await storage.getMaintenanceForLandlord(
        id,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      
      res.json(maintenance);
    } catch (error) {
      console.error("Error fetching landlord maintenance:", error);
      res.status(500).json({ error: "Failed to fetch landlord maintenance" });
    }
  });

  // GET /api/landlords/:id/portal-preview - Staff preview of landlord portal
  app.get('/api/landlords/:id/portal-preview', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get landlord details
      const landlord = await storage.getLandlord(id);
      if (!landlord) {
        return res.status(404).json({ error: "Landlord not found" });
      }
      
      // Get all portal data for this landlord
      const [properties, maintenance, statements, contracts] = await Promise.all([
        storage.getPropertiesByLandlord(id),
        storage.getMaintenanceRequestsByLandlord(id),
        storage.getLandlordStatements(id),
        storage.getManagementContractsByLandlord(id)
      ]);
      
      res.json({
        landlord: {
          id: landlord.id,
          name: landlord.name,
          email: landlord.email,
          phone: landlord.phone,
          address: landlord.address,
          statementDay: landlord.statementDay
        },
        properties,
        maintenance,
        statements,
        contracts
      });
    } catch (error) {
      console.error("Error fetching landlord portal preview:", error);
      res.status(500).json({ error: "Failed to fetch portal preview" });
    }
  });

  // ===== DAILY TASK MANAGEMENT ROUTES =====

  // Task Templates
  // GET /api/tasks/templates - list all templates
  app.get('/api/tasks/templates', isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getTaskTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching task templates:", error);
      res.status(500).json({ error: "Failed to fetch task templates" });
    }
  });

  // POST /api/tasks/templates - create template
  app.post('/api/tasks/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // ISSUE 3 FIX: Add Zod validation
      const validatedData = insertTaskTemplateSchema.parse({ ...req.body, createdBy: userId });
      const template = await storage.createTaskTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error("Error creating task template:", error);
      res.status(500).json({ error: "Failed to create task template" });
    }
  });

  // PATCH /api/tasks/templates/:id - update template
  app.patch('/api/tasks/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      // ISSUE 3 FIX: Add Zod validation with partial schema for updates
      const validatedData = insertTaskTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTaskTemplate(id, validatedData);
      res.json(template);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error("Error updating task template:", error);
      res.status(500).json({ error: "Failed to update task template" });
    }
  });

  // DELETE /api/tasks/templates/:id - delete template
  app.delete('/api/tasks/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTaskTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting task template:", error);
      res.status(500).json({ error: "Failed to delete task template" });
    }
  });

  // Daily Task Instances
  // GET /api/tasks/daily?date=YYYY-MM-DD&staffId=xxx - get tasks for specific date
  app.get('/api/tasks/daily', isAuthenticated, async (req: any, res) => {
    try {
      const { date, staffId } = req.query;
      if (!date) {
        return res.status(400).json({ error: "Date parameter is required" });
      }
      const tasks = await storage.getDailyTaskInstances(date as string, staffId as string | undefined);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching daily tasks:", error);
      res.status(500).json({ error: "Failed to fetch daily tasks" });
    }
  });

  // POST /api/tasks/daily/generate?date=YYYY-MM-DD - manually trigger task generation
  app.post('/api/tasks/daily/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ error: "Date parameter is required" });
      }
      
      // Import and use task generator service
      const { generateDailyTasks } = await import('./services/task-generator');
      const count = await generateDailyTasks(date as string);
      
      res.json({ success: true, tasksCreated: count });
    } catch (error) {
      console.error("Error generating daily tasks:", error);
      res.status(500).json({ error: "Failed to generate daily tasks" });
    }
  });

  // PATCH /api/tasks/daily/:id - update task (complete, skip, add notes)
  app.patch('/api/tasks/daily/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // If marking as completed, set completedBy and completedAt
      const updateData = { ...req.body };
      if (updateData.status === 'completed' && !updateData.completedBy) {
        updateData.completedBy = userId;
        updateData.completedAt = new Date();
      }
      
      // ISSUE 3 FIX: Add Zod validation with partial schema for updates
      const validatedData = insertDailyTaskInstanceSchema.partial().parse(updateData);
      const task = await storage.updateDailyTaskInstance(id, validatedData);
      res.json(task);
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error("Error updating daily task:", error);
      res.status(500).json({ error: "Failed to update daily task" });
    }
  });

  // GET /api/tasks/history?startDate=xxx&endDate=xxx&staffId=xxx - get task history
  app.get('/api/tasks/history', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate, staffId } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "Start date and end date are required" });
      }
      const history = await storage.getTaskHistory(
        startDate as string,
        endDate as string,
        staffId as string | undefined
      );
      res.json(history);
    } catch (error) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ error: "Failed to fetch task history" });
    }
  });

  // Task Confirmation - Public endpoints for staff to confirm task completion via SMS/Email links
  // GET /api/tasks/confirm/:token - Get task details for confirmation page
  app.get('/api/tasks/confirm/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      const [task] = await db
        .select()
        .from(schema.dailyTaskInstances)
        .where(eq(schema.dailyTaskInstances.confirmationToken, token))
        .limit(1);

      if (!task) {
        return res.status(404).json({ error: "Task not found or invalid confirmation link" });
      }

      // Get staff info
      const [staff] = await db
        .select()
        .from(schema.staff)
        .where(eq(schema.staff.id, task.assignedTo))
        .limit(1);

      res.json({
        task: {
          id: task.id,
          name: task.name,
          description: task.description,
          scheduledDate: task.scheduledDate,
          timeOfDay: task.timeOfDay,
          status: task.status,
          completedAt: task.completedAt,
          notCompletedReason: task.notCompletedReason,
          notCompletedDetails: task.notCompletedDetails,
        },
        staff: staff ? {
          id: staff.id,
          name: staff.name,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching task for confirmation:", error);
      res.status(500).json({ error: "Failed to fetch task details" });
    }
  });

  // POST /api/tasks/confirm/:token - Confirm task completion or non-completion
  app.post('/api/tasks/confirm/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const { completed, notCompletedReason, notCompletedDetails } = req.body;

      // Validate the token exists and get task
      const [task] = await db
        .select()
        .from(schema.dailyTaskInstances)
        .where(eq(schema.dailyTaskInstances.confirmationToken, token))
        .limit(1);

      if (!task) {
        return res.status(404).json({ error: "Task not found or invalid confirmation link" });
      }

      // Prevent duplicate confirmations
      if (task.status === 'completed' || task.status === 'not_completed') {
        return res.status(400).json({ 
          error: "Task has already been confirmed",
          currentStatus: task.status 
        });
      }

      // Update task based on completion status
      if (completed) {
        await db
          .update(schema.dailyTaskInstances)
          .set({
            status: 'completed',
            completedAt: new Date(),
            completedBy: task.assignedTo,
          })
          .where(eq(schema.dailyTaskInstances.id, task.id));
      } else {
        // Task not completed - record reason
        if (!notCompletedReason) {
          return res.status(400).json({ error: "Please provide a reason for not completing the task" });
        }

        await db
          .update(schema.dailyTaskInstances)
          .set({
            status: 'not_completed',
            notCompletedReason,
            notCompletedDetails: notCompletedDetails || null,
          })
          .where(eq(schema.dailyTaskInstances.id, task.id));
      }

      res.json({ 
        success: true, 
        status: completed ? 'completed' : 'not_completed' 
      });
    } catch (error) {
      console.error("Error confirming task:", error);
      res.status(500).json({ error: "Failed to confirm task" });
    }
  });

  // ===== SPECIALIZED SERVICES ROUTES =====

  // WASTE CLEARANCE ROUTES
  // POST /api/waste-clearance - Create waste clearance request with AI summary
  app.post('/api/waste-clearance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, createdBy: userId, type: 'waste_clearance' };

      // Generate AI summary using OpenAI
      let aiSummary = null;
      if (data.wasteDescription) {
        try {
          const { OpenAI } = await import('openai');
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{
              role: "system",
              content: "You are a waste management assistant. Summarize waste descriptions into clear, professional summaries focusing on type, quantity, and disposal requirements."
            }, {
              role: "user",
              content: `Summarize this waste clearance request: ${data.wasteDescription}`
            }],
            max_tokens: 150
          });
          
          aiSummary = completion.choices[0]?.message?.content || null;
        } catch (error) {
          console.error("OpenAI error:", error);
        }
      }

      data.aiSummary = aiSummary;

      // Send SMS notifications to Nathan and StaffC
      const notificationLog: any = {};
      try {
        const { sendSMS } = await import('./twilio');
        const message = `🗑️ New Waste Clearance Request\nProperty: ${data.propertyAddress || 'N/A'}\nClient: ${data.clientName || 'N/A'}\nSummary: ${aiSummary || data.wasteDescription?.substring(0, 100) || 'N/A'}`;
        
        const nathanResult = await sendSMS('+447729245736', message);
        const kellyResult = await sendSMS('+447786154319', message);
        
        notificationLog.sms = {
          nathan: nathanResult,
          kelly: kellyResult,
          sentAt: new Date().toISOString()
        };
      } catch (error) {
        console.error("SMS notification error:", error);
        notificationLog.sms = { error: String(error) };
      }

      // Send email notification
      try {
        const { sendGenericEmail } = await import('./email');
        const emailBody = `New Waste Clearance Request

Property: ${data.propertyAddress || 'N/A'}
Client: ${data.clientName || 'N/A'}
Contact: ${data.clientContact || 'N/A'}

Description:
${data.wasteDescription || 'N/A'}

AI Summary:
${aiSummary || 'Not available'}

Availability: ${data.availabilityDate ? new Date(data.availabilityDate).toLocaleString() : 'N/A'}
Lockbox Code: ${data.lockboxCode || 'N/A'}`;

        const emailResult = await sendGenericEmail(
          'operations@example.com',
          '🗑️ New Waste Clearance Request',
          emailBody
        );
        
        notificationLog.email = emailResult;
      } catch (error) {
        console.error("Email notification error:", error);
        notificationLog.email = { error: String(error) };
      }

      data.notificationLog = notificationLog;

      const request = await storage.createWasteClearanceRequest(data);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating waste clearance request:", error);
      res.status(500).json({ error: "Failed to create waste clearance request" });
    }
  });

  // GET /api/waste-clearance - List all waste clearance requests
  app.get('/api/waste-clearance', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.listWasteClearanceRequests(status ? { status: status as string } : undefined);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching waste clearance requests:", error);
      res.status(500).json({ error: "Failed to fetch waste clearance requests" });
    }
  });

  // PATCH /api/waste-clearance/:id - Update waste clearance request
  app.patch('/api/waste-clearance/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.updateWasteClearanceRequest(id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error updating waste clearance request:", error);
      res.status(500).json({ error: "Failed to update waste clearance request" });
    }
  });

  // SPECIALIZED SERVICES ROUTES (NEW /api/specialized-services/* endpoints)
  // These routes use the same specializedServiceRequests table but filter by type
  
  // Helper function to generate AI summary for specialized services
  async function generateServiceSummary(serviceType: string, serviceDescription: string): Promise<string | null> {
    if (!serviceDescription) return null;
    
    try {
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const systemPrompts: Record<string, string> = {
        waste_clearance: "You are a waste management assistant. Summarize waste descriptions into clear, professional summaries focusing on type, quantity, and disposal requirements.",
        carpet_cleaning: "You are a carpet cleaning specialist. Summarize carpet cleaning requests into clear, professional summaries focusing on area size, carpet type, stains, and special requirements.",
        oven_cleaning: "You are an oven cleaning specialist. Summarize oven cleaning requests into clear, professional summaries focusing on oven type, size, condition, and cleaning requirements."
      };
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: systemPrompts[serviceType] || "Summarize this service request professionally."
        }, {
          role: "user",
          content: `Summarize this ${serviceType.replace('_', ' ')} request: ${serviceDescription}`
        }],
        max_tokens: 150
      });
      
      return completion.choices[0]?.message?.content || null;
    } catch (error) {
      console.error("OpenAI error:", error);
      return null;
    }
  }

  // POST /api/specialized-services/carpet-cleaning
  app.post('/api/specialized-services/carpet-cleaning', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, createdBy: userId, type: 'carpet_cleaning' };

      // Generate AI summary
      const aiSummary = await generateServiceSummary('carpet_cleaning', data.serviceDescription);
      data.aiSummary = aiSummary;

      // Send notifications
      const notificationLog: any = {};
      try {
        const { sendSMS } = await import('./twilio');
        const message = `🧹 New Carpet Cleaning Request\nProperty: ${data.propertyAddress || 'N/A'}\nClient: ${data.clientName || 'N/A'}\nSummary: ${aiSummary || data.serviceDescription?.substring(0, 100) || 'N/A'}`;
        
        const nathanResult = await sendSMS('+447729245736', message);
        const kellyResult = await sendSMS('+447786154319', message);
        
        notificationLog.sms = {
          nathan: nathanResult,
          kelly: kellyResult,
          sentAt: new Date().toISOString()
        };
      } catch (error) {
        console.error("SMS notification error:", error);
        notificationLog.sms = { error: String(error) };
      }

      try {
        const { sendGenericEmail } = await import('./email');
        const emailBody = `New Carpet Cleaning Request

Property: ${data.propertyAddress || 'N/A'}
Client: ${data.clientName || 'N/A'}
Contact: ${data.clientContact || 'N/A'}

Description:
${data.serviceDescription || 'N/A'}

AI Summary:
${aiSummary || 'Not available'}

Availability: ${data.availabilityDate ? new Date(data.availabilityDate).toLocaleString() : 'N/A'}
Lockbox Code: ${data.lockboxCode || 'N/A'}`;

        const emailResult = await sendGenericEmail(
          'operations@example.com',
          '🧹 New Carpet Cleaning Request',
          emailBody
        );
        
        notificationLog.email = emailResult;
      } catch (error) {
        console.error("Email notification error:", error);
        notificationLog.email = { error: String(error) };
      }

      data.notificationLog = notificationLog;
      const request = await storage.createSpecializedServiceRequest(data);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating carpet cleaning request:", error);
      res.status(500).json({ error: "Failed to create carpet cleaning request" });
    }
  });

  // GET /api/specialized-services/carpet-cleaning
  app.get('/api/specialized-services/carpet-cleaning', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.listSpecializedServiceRequests('carpet_cleaning', status ? { status: status as string } : undefined);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching carpet cleaning requests:", error);
      res.status(500).json({ error: "Failed to fetch carpet cleaning requests" });
    }
  });

  // PATCH /api/specialized-services/carpet-cleaning/:id
  app.patch('/api/specialized-services/carpet-cleaning/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.updateSpecializedServiceRequest(id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error updating carpet cleaning request:", error);
      res.status(500).json({ error: "Failed to update carpet cleaning request" });
    }
  });

  // POST /api/specialized-services/oven-cleaning
  app.post('/api/specialized-services/oven-cleaning', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, createdBy: userId, type: 'oven_cleaning' };

      // Generate AI summary
      const aiSummary = await generateServiceSummary('oven_cleaning', data.serviceDescription);
      data.aiSummary = aiSummary;

      // Send notifications
      const notificationLog: any = {};
      try {
        const { sendSMS } = await import('./twilio');
        const message = `🔥 New Oven Cleaning Request\nProperty: ${data.propertyAddress || 'N/A'}\nClient: ${data.clientName || 'N/A'}\nSummary: ${aiSummary || data.serviceDescription?.substring(0, 100) || 'N/A'}`;
        
        const nathanResult = await sendSMS('+447729245736', message);
        const kellyResult = await sendSMS('+447786154319', message);
        
        notificationLog.sms = {
          nathan: nathanResult,
          kelly: kellyResult,
          sentAt: new Date().toISOString()
        };
      } catch (error) {
        console.error("SMS notification error:", error);
        notificationLog.sms = { error: String(error) };
      }

      try {
        const { sendGenericEmail } = await import('./email');
        const emailBody = `New Oven Cleaning Request

Property: ${data.propertyAddress || 'N/A'}
Client: ${data.clientName || 'N/A'}
Contact: ${data.clientContact || 'N/A'}

Description:
${data.serviceDescription || 'N/A'}

AI Summary:
${aiSummary || 'Not available'}

Availability: ${data.availabilityDate ? new Date(data.availabilityDate).toLocaleString() : 'N/A'}
Lockbox Code: ${data.lockboxCode || 'N/A'}`;

        const emailResult = await sendGenericEmail(
          'operations@example.com',
          '🔥 New Oven Cleaning Request',
          emailBody
        );
        
        notificationLog.email = emailResult;
      } catch (error) {
        console.error("Email notification error:", error);
        notificationLog.email = { error: String(error) };
      }

      data.notificationLog = notificationLog;
      const request = await storage.createSpecializedServiceRequest(data);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating oven cleaning request:", error);
      res.status(500).json({ error: "Failed to create oven cleaning request" });
    }
  });

  // GET /api/specialized-services/oven-cleaning
  app.get('/api/specialized-services/oven-cleaning', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.listSpecializedServiceRequests('oven_cleaning', status ? { status: status as string } : undefined);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching oven cleaning requests:", error);
      res.status(500).json({ error: "Failed to fetch oven cleaning requests" });
    }
  });

  // PATCH /api/specialized-services/oven-cleaning/:id
  app.patch('/api/specialized-services/oven-cleaning/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const request = await storage.updateSpecializedServiceRequest(id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error updating oven cleaning request:", error);
      res.status(500).json({ error: "Failed to update oven cleaning request" });
    }
  });

  // EQUIPMENT TRACKING ROUTES
  // POST /api/equipment-movements - Log equipment sign-out/sign-in
  app.post('/api/equipment-movements', isAuthenticated, async (req: any, res) => {
    try {
      const { equipmentType, equipmentNumber, staffId, action } = req.body;

      // Validation: Check current status
      const currentStatus = await storage.getCurrentEquipmentStatus(equipmentType);
      const equipment = currentStatus.find((e: any) => e.equipmentNumber === equipmentNumber);

      if (action === 'sign_out') {
        // Cannot sign out if already signed out
        if (equipment && !('available' in equipment)) {
          return res.status(400).json({ 
            error: `${equipmentType} #${equipmentNumber} is already signed out to ${equipment.staffName}` 
          });
        }
      } else if (action === 'sign_in') {
        // Cannot sign in if not signed out
        if (!equipment || 'available' in equipment) {
          return res.status(400).json({ 
            error: `${equipmentType} #${equipmentNumber} is not signed out` 
          });
        }
      }

      // Get staff name
      const staff = await storage.getStaff(staffId);
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      const movement = await storage.logEquipmentMovement({
        ...req.body,
        staffName: staff.fullName
      });

      res.status(201).json(movement);
    } catch (error) {
      console.error("Error logging equipment movement:", error);
      res.status(500).json({ error: "Failed to log equipment movement" });
    }
  });

  // GET /api/equipment-movements - List equipment movements
  app.get('/api/equipment-movements', isAuthenticated, async (req: any, res) => {
    try {
      const { equipmentType, staffId, startDate, endDate } = req.query;
      const movements = await storage.listEquipmentMovements({
        equipmentType: equipmentType as string | undefined,
        staffId: staffId as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined
      });
      res.json(movements);
    } catch (error) {
      console.error("Error fetching equipment movements:", error);
      res.status(500).json({ error: "Failed to fetch equipment movements" });
    }
  });

  // GET /api/equipment-movements/status/:type - Get current equipment status
  app.get('/api/equipment-movements/status/:type', isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.params;
      const status = await storage.getCurrentEquipmentStatus(type);
      res.json(status);
    } catch (error) {
      console.error("Error fetching equipment status:", error);
      res.status(500).json({ error: "Failed to fetch equipment status" });
    }
  });

  // POST /api/equipment-movements/:id/photos - Upload equipment photo to GCS
  app.post('/api/equipment-movements/:id/photos', isAuthenticated, async (req: any, res) => {
    try {
      const { uploadConfigs } = await import("./upload-config");
      const upload = uploadConfigs.equipmentPhotos;

      upload.single('photo')(req, res, async (err) => {
        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ error: "File upload failed" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No file provided" });
        }

        try {
          const equipmentId = req.params.id;
          
          // File is already saved to disk
          console.log('[Equipment Photo] File saved locally:', req.file.filename);
          const photoUrl = `/uploads/equipment-photos/${req.file.filename}`;

          // Update equipment movement with photo URL
          const movement = await storage.getEquipmentMovementById(equipmentId);
          if (!movement) {
            return res.status(404).json({ error: "Equipment movement not found" });
          }

          const currentPhotoUrls = movement.photoUrls || [];
          const updatedPhotoUrls = [...currentPhotoUrls, photoUrl];
          
          await storage.updateEquipmentMovementPhotos(equipmentId, updatedPhotoUrls);

          res.json({
            photoUrl,
            message: "Photo uploaded successfully"
          });
        } catch (uploadError: any) {
          console.error("Error uploading equipment photo:", uploadError);
          res.status(500).json({ 
            error: uploadError.message || "Failed to upload photo" 
          });
        }
      });
    } catch (error) {
      console.error("Error in photo upload route:", error);
      res.status(500).json({ error: "Failed to process photo upload" });
    }
  });

  // GET /api/equipment-movements/:id/photos - Get equipment photos URLs
  app.get('/api/equipment-movements/:id/photos', isAuthenticated, async (req: any, res) => {
    try {
      const equipmentId = req.params.id;

      const movement = await storage.getEquipmentMovementById(equipmentId);
      if (!movement) {
        return res.status(404).json({ error: "Equipment movement not found" });
      }

      const photoUrls = movement.photoUrls || [];
      
      // Photos are already accessible via direct URLs
      const photos = photoUrls.map((photoUrl) => {
        return {
          photoUrl,
          signedUrl: photoUrl // Direct URL since Express serves /uploads statically
        };
      });

      res.json({ photos });
    } catch (error) {
      console.error("Error fetching equipment photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  // GET /api/equipment/qr-codes - Generate QR codes for all equipment (authenticated)
  app.get('/api/equipment/qr-codes', isAuthenticated, async (req: any, res) => {
    try {
      const QRCode = await import('qrcode');
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const qrCodes = [];
      
      // Generate QR codes for trolleys 1-5
      for (let i = 1; i <= 5; i++) {
        const url = `${baseUrl}/equipment/scan/trolley/${i}`;
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 400,
          margin: 2,
        });
        
        qrCodes.push({
          type: 'trolley',
          number: i,
          label: `Trolley #${i}`,
          qrCode: qrCodeDataUrl,
          url,
        });
      }
      
      // Generate QR codes for caddies 1-10
      for (let i = 1; i <= 10; i++) {
        const url = `${baseUrl}/equipment/scan/caddy/${i}`;
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          width: 400,
          margin: 2,
        });
        
        qrCodes.push({
          type: 'caddy',
          number: i,
          label: `Caddy #${i}`,
          qrCode: qrCodeDataUrl,
          url,
        });
      }
      
      res.json(qrCodes);
    } catch (error) {
      console.error('Error generating equipment QR codes:', error);
      res.status(500).json({ error: 'Failed to generate QR codes' });
    }
  });

  // POST /equipment/scan/:type/:number - Public equipment scan endpoint (NO AUTH)
  app.post('/equipment/scan/:type/:number', async (req: any, res) => {
    try {
      const { type, number } = req.params;
      const equipmentNumber = parseInt(number);
      
      // Validate equipment type and number
      if (type !== 'trolley' && type !== 'caddy') {
        return res.status(400).json({ error: 'Invalid equipment type. Must be trolley or caddy.' });
      }
      
      const maxNumber = type === 'trolley' ? 5 : 10;
      if (equipmentNumber < 1 || equipmentNumber > maxNumber) {
        return res.status(400).json({ 
          error: `Invalid ${type} number. Must be between 1 and ${maxNumber}.` 
        });
      }
      
      const { equipmentPhotoStorage } = await import("./object-storage");
      const upload = multer({ storage: multer.memoryStorage() });
      
      upload.single('photo')(req, res, async (err) => {
        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ error: "File upload failed" });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: "Photo is required" });
        }
        
        try {
          const { staffName, action } = req.body;
          
          if (!staffName || !staffName.trim()) {
            return res.status(400).json({ error: "Staff name is required" });
          }
          
          if (!action || (action !== 'sign_out' && action !== 'sign_in')) {
            return res.status(400).json({ error: "Action must be sign_out or sign_in" });
          }
          
          // Validate file
          equipmentPhotoStorage.validateFileSize(req.file.size);
          equipmentPhotoStorage.validateMimeType(req.file.mimetype);
          
          // Create equipment movement record first
          const movement = await storage.logEquipmentMovement({
            equipmentType: type,
            equipmentNumber,
            staffId: null,
            staffName: staffName.trim(),
            action,
            conditionPhotoUrl: null,
            photoUrls: [],
            productsLeftBehind: null,
            propertyStatusConfirmed: null,
          });
          
          // Upload photo to GCS
          const storageKey = await equipmentPhotoStorage.uploadEquipmentPhoto(
            req.file.buffer,
            req.file.originalname,
            movement.id
          );
          
          // Update movement with photo URL
          await storage.updateEquipmentMovementPhotos(movement.id, [storageKey]);
          
          res.json({
            success: true,
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} #${equipmentNumber} ${action === 'sign_out' ? 'signed out' : 'signed in'} successfully`,
            movement: {
              id: movement.id,
              equipmentType: type,
              equipmentNumber,
              staffName: staffName.trim(),
              action,
              timestamp: movement.timestamp,
            }
          });
        } catch (uploadError: any) {
          console.error("Error processing equipment scan:", uploadError);
          res.status(500).json({ 
            error: uploadError.message || "Failed to process scan" 
          });
        }
      });
    } catch (error) {
      console.error("Error in equipment scan route:", error);
      res.status(500).json({ error: "Failed to process scan" });
    }
  });

  // HOTEL LINEN ORDERS ROUTES (Building A & Building B)
  // POST /api/dwell-linen - Create linen order with SMS automation to StaffC
  app.post('/api/dwell-linen', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, createdBy: userId };

      const notificationLog: any = {};

      // Send SMS to StaffC (handles linen orders for Building A and Building B)
      try {
        const { sendSMS } = await import('./twilio');
        const buildingName = data.building === 'heritage' ? 'Building B' : 'Building A';
        const message = `🛏️ New ${buildingName} Linen Order
Cages to collect: ${data.cagesToCollect}
Pillowcases: ${data.pillowcases}
Single sheets: ${data.singleSheets}
Single duvets: ${data.singleDuvets}
Superking sheets: ${data.superkingSheets}
Superking duvets: ${data.superkingDuvets}
Bath towels: ${data.bathTowels}
Hand towels: ${data.handTowels}
Bath mats: ${data.bathMats}
Tea towels: ${data.teaTowels}`;
        
        const kellyResult = await sendSMS('+447786154319', message);
        notificationLog.sms = { kelly: kellyResult, sentAt: new Date().toISOString() };
      } catch (error) {
        console.error("SMS notification error:", error);
        notificationLog.sms = { error: String(error) };
      }

      data.notificationLog = notificationLog;

      const order = await storage.createDwellLinenOrder(data);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating hotel linen order:", error);
      res.status(500).json({ error: "Failed to create linen order" });
    }
  });

  // GET /api/dwell-linen - List all linen orders
  app.get('/api/dwell-linen', isAuthenticated, async (req: any, res) => {
    try {
      const orders = await storage.listDwellLinenOrders();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching dwell linen orders:", error);
      res.status(500).json({ error: "Failed to fetch dwell linen orders" });
    }
  });

  // PATCH /api/dwell-linen/:id - Update linen order status
  app.patch('/api/dwell-linen/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.updateDwellLinenOrder(id, req.body);
      res.json(order);
    } catch (error) {
      console.error("Error updating dwell linen order:", error);
      res.status(500).json({ error: "Failed to update dwell linen order" });
    }
  });

  // ========== LINEN ORDER SCHEDULES (Automated Reminders for StaffC) ==========

  // GET /api/linen-order-schedules - List all schedules
  app.get('/api/linen-order-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const schedules = await storage.getLinenOrderSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching linen order schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  // POST /api/linen-order-schedules - Create new schedule
  app.post('/api/linen-order-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertLinenOrderScheduleSchema.parse(req.body);
      const schedule = await storage.createLinenOrderSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating linen order schedule:", error);
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  // PATCH /api/linen-order-schedules/:id - Update schedule
  app.patch('/api/linen-order-schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const partialSchema = insertLinenOrderScheduleSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      const schedule = await storage.updateLinenOrderSchedule(parseInt(id), validatedData);
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating linen order schedule:", error);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  // DELETE /api/linen-order-schedules/:id - Delete schedule
  app.delete('/api/linen-order-schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLinenOrderSchedule(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting linen order schedule:", error);
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  // GET /api/linen-order/:token - Get order by token (NO AUTH - for public submission)
  app.get('/api/linen-order/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const order = await storage.getDwellLinenOrderByToken(token);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found or link expired" });
      }

      // Also get the schedule info if available
      let schedule = null;
      if (order.scheduleId) {
        schedule = await storage.getLinenOrderSchedule(order.scheduleId);
      }

      res.json({ order, schedule });
    } catch (error) {
      console.error("Error fetching linen order by token:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // POST /api/linen-order/:token/submit - Submit order (NO AUTH - for StaffC's public form)
  app.post('/api/linen-order/:token/submit', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      // Validate submission data
      const submissionSchema = z.object({
        building: z.enum(["dwell", "heritage"]),
        cagesToCollect: z.number().int().min(0),
        pillowcases: z.number().int().min(0),
        singleSheets: z.number().int().min(0),
        singleDuvets: z.number().int().min(0),
        superkingSheets: z.number().int().min(0),
        superkingDuvets: z.number().int().min(0),
        bathTowels: z.number().int().min(0),
        handTowels: z.number().int().min(0),
        bathMats: z.number().int().min(0),
        teaTowels: z.number().int().min(0),
        submittedBy: z.string().min(1, "Name is required"),
      });
      
      const validatedData = submissionSchema.parse(req.body);
      const order = await storage.getDwellLinenOrderByToken(token);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found or link expired" });
      }

      if (order.submittedAt) {
        return res.status(400).json({ error: "Order already submitted" });
      }

      // Update the order with submitted data
      const updatedOrder = await storage.updateDwellLinenOrder(order.id, {
        ...validatedData,
        submittedBy: validatedData.submittedBy,
        submittedAt: new Date(),
        status: "awaiting_confirmation",
      });

      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error submitting linen order:", error);
      res.status(500).json({ error: "Failed to submit order" });
    }
  });

  // POST /api/linen-order/:id/confirm - Admin confirms and sends to Imperial
  app.post('/api/linen-order/:id/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const order = await storage.listDwellLinenOrders().then(orders => orders.find(o => o.id === id));
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }

      if (order.status !== "awaiting_confirmation") {
        return res.status(400).json({ error: "Order is not awaiting confirmation" });
      }

      // Send email to Imperial using the existing sendImperialLaundryEmail function
      const { sendGenericEmail } = await import('./emails');
      const orderDate = format(new Date(), 'dd/MM/yyyy');
      const buildingName = order.building === 'heritage' ? 'Building B' : 'Building A';
      
      let emailBody = `Dear Imperial Laundry,\n\nPlease process the following linen order for ${buildingName}:\n\n`;
      emailBody += `Cages to collect: ${order.cagesToCollect}\n`;
      emailBody += `Pillowcases: ${order.pillowcases}\n`;
      emailBody += `Single sheets: ${order.singleSheets}\n`;
      emailBody += `Single duvets: ${order.singleDuvets}\n`;
      emailBody += `Superking sheets: ${order.superkingSheets}\n`;
      emailBody += `Superking duvets: ${order.superkingDuvets}\n`;
      emailBody += `Bath towels: ${order.bathTowels}\n`;
      emailBody += `Hand towels: ${order.handTowels}\n`;
      emailBody += `Bath mats: ${order.bathMats}\n`;
      emailBody += `Tea towels: ${order.teaTowels}\n\n`;
      emailBody += `Submitted by: ${order.submittedBy}\n\n`;
      emailBody += `Thank you,\nNorthstay`;

      await sendGenericEmail({
        to: 'imperiallaundry@example.com', // Replace with actual email
        subject: `${buildingName} Linen Order - ${orderDate}`,
        text: emailBody,
        html: emailBody.replace(/\n/g, '<br>'),
      });

      // Update order status
      const updatedOrder = await storage.updateDwellLinenOrder(id, {
        status: "sent_to_imperial",
        confirmedBy: userId,
        confirmedAt: new Date(),
        sentToImperialAt: new Date(),
      });

      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      console.error("Error confirming linen order:", error);
      res.status(500).json({ error: "Failed to confirm order" });
    }
  });

  // ========== HOTEL LINEN DELIVERY NOTES (PACKING LISTS) ==========
  
  // POST /api/linen-delivery-notes/upload - Upload and extract delivery note PDF
  app.post('/api/linen-delivery-notes/upload', isAuthenticated, async (req: any, res) => {
    try {
      const { uploadConfigs } = await import("./upload-config");
      const upload = uploadConfigs.linenDelivery;
      
      upload.single('pdf')(req, res, async (err) => {
        if (err) {
          return res.status(400).json({ error: "File upload failed", details: err.message });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: "No PDF file uploaded" });
        }

        const userId = req.user.claims.sub;
        const { building, orderId } = req.body;

        if (!building || !['dwell', 'heritage'].includes(building)) {
          return res.status(400).json({ error: "Valid building (dwell or heritage) is required" });
        }

        // File is already saved to disk
        console.log('[Linen Delivery] File saved locally:', req.file.filename);
        const pdfUrl = `/uploads/linen-delivery/${req.file.filename}`;

        // Extract data using OpenAI Vision
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        
        // Read file from disk and convert to base64 for OpenAI
        const fileBuffer = await fs.readFile(req.file.path);
        const base64Pdf = fileBuffer.toString('base64');
        const dataUrl = `data:${req.file.mimetype};base64,${base64Pdf}`;

        console.log('[Linen Delivery] Extracting data with OpenAI Vision...');

        const extractionPrompt = `You are analyzing an Imperial Laundry delivery note / packing list. Extract the following information:

1. Delivery Note Number (e.g., "1129293")
2. Delivery Date (in format YYYY-MM-DD if found)
3. Customer/Building name (e.g., "HERITAGE MEWS", "DWELL")
4. Line items table with these columns:
   - Item Description
   - Qty Ordered
   - Qty Confirmed (what's being delivered now)
   - To Follow (what's marked as "to follow" or "owing")
   - Qty Total (final total they'll deliver)

Return a JSON object with this exact structure:
{
  "deliveryNoteNumber": "string",
  "deliveryDate": "YYYY-MM-DD or null",
  "customerName": "string",
  "lineItems": [
    {
      "itemDescription": "string",
      "qtyOrdered": number,
      "qtyConfirmed": number,
      "qtyToFollow": number,
      "qtyTotal": number
    }
  ]
}

Important:
- If any quantity is not visible, use 0
- "Owings from Del Note" lines should be included with the item they refer to
- Calculate totals accurately from the PDF
- Return ONLY the JSON object, no markdown formatting`;

        const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractionPrompt },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
          max_tokens: 4096,
          temperature: 0,
        });

        const extractedText = response.choices[0].message.content || '';
        console.log('[Linen Delivery] AI Response:', extractedText);

        // Parse the JSON response
        let extractedData;
        try {
          // Remove markdown code blocks if present
          const cleanedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          extractedData = JSON.parse(cleanedText);
        } catch (parseError) {
          console.error('[Linen Delivery] JSON parse error:', parseError);
          return res.status(500).json({ 
            error: "Failed to parse extracted data", 
            rawResponse: extractedText 
          });
        }

        // Calculate totals and analytics
        const totalOrdered = extractedData.lineItems.reduce((sum: number, item: any) => sum + (item.qtyOrdered || 0), 0);
        const totalDelivered = extractedData.lineItems.reduce((sum: number, item: any) => sum + (item.qtyConfirmed || 0), 0);
        const totalToFollow = extractedData.lineItems.reduce((sum: number, item: any) => sum + (item.qtyToFollow || 0), 0);
        const fulfillmentPercentage = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

        // Create delivery note record
        const deliveryNoteData = {
          orderId: orderId || null,
          building,
          deliveryNoteNumber: extractedData.deliveryNoteNumber,
          deliveryDate: extractedData.deliveryDate || null,
          pdfUrl,
          lineItems: extractedData.lineItems,
          totalOrdered,
          totalDelivered,
          totalToFollow,
          fulfillmentPercentage,
          extractionLog: {
            extractedAt: new Date().toISOString(),
            model: "gpt-4o",
            tokensUsed: response.usage?.total_tokens || 0,
            customerName: extractedData.customerName,
          },
          uploadedBy: userId,
        };

        const deliveryNote = await storage.createLinenDeliveryNote(deliveryNoteData);
        
        res.status(201).json({
          success: true,
          deliveryNote,
          analytics: {
            totalOrdered,
            totalDelivered,
            totalToFollow,
            fulfillmentPercentage,
          }
        });
      });

    } catch (error: any) {
      console.error("Error processing delivery note:", error);
      res.status(500).json({ error: "Failed to process delivery note", details: error.message });
    }
  });

  // GET /api/linen-delivery-notes - List all delivery notes
  app.get('/api/linen-delivery-notes', isAuthenticated, async (req: any, res) => {
    try {
      const { building } = req.query;
      const notes = await storage.listLinenDeliveryNotes(building as string | undefined);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching delivery notes:", error);
      res.status(500).json({ error: "Failed to fetch delivery notes" });
    }
  });

  // GET /api/linen-delivery-notes/:id - Get single delivery note
  app.get('/api/linen-delivery-notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const note = await storage.getLinenDeliveryNote(id);
      if (!note) {
        return res.status(404).json({ error: "Delivery note not found" });
      }
      res.json(note);
    } catch (error) {
      console.error("Error fetching delivery note:", error);
      res.status(500).json({ error: "Failed to fetch delivery note" });
    }
  });

  // GET /api/linen-delivery-notes/order/:orderId - Get delivery notes for specific order
  app.get('/api/linen-delivery-notes/order/:orderId', isAuthenticated, async (req: any, res) => {
    try {
      const { orderId } = req.params;
      const notes = await storage.getLinenDeliveryNotesByOrder(orderId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching delivery notes for order:", error);
      res.status(500).json({ error: "Failed to fetch delivery notes" });
    }
  });

  // GET /api/linen-delivery-notes/analytics - Get delivery analytics
  app.get('/api/linen-delivery-notes/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const { building, weeks = '4' } = req.query;
      const weeksToAnalyze = parseInt(weeks as string, 10);
      
      // Get all notes for the building
      const notes = await storage.listLinenDeliveryNotes(building as string | undefined);
      
      // Calculate date ranges for week-over-week comparison
      const now = new Date();
      const weeklyBuckets: { [key: string]: typeof notes } = {};
      
      // Group notes by week
      notes.forEach(note => {
        const noteDate = new Date(note.createdAt);
        const weeksDiff = Math.floor((now.getTime() - noteDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        
        if (weeksDiff < weeksToAnalyze) {
          const weekKey = `week${weeksDiff}`;
          if (!weeklyBuckets[weekKey]) {
            weeklyBuckets[weekKey] = [];
          }
          weeklyBuckets[weekKey].push(note);
        }
      });
      
      // Calculate analytics per week
      const weeklyAnalytics = Object.entries(weeklyBuckets).map(([week, weekNotes]) => {
        const totalOrdered = weekNotes.reduce((sum, n) => sum + (n.totalOrdered || 0), 0);
        const totalDelivered = weekNotes.reduce((sum, n) => sum + (n.totalDelivered || 0), 0);
        const totalToFollow = weekNotes.reduce((sum, n) => sum + (n.totalToFollow || 0), 0);
        const avgFulfillment = weekNotes.length > 0 
          ? Math.round(weekNotes.reduce((sum, n) => sum + (n.fulfillmentPercentage || 0), 0) / weekNotes.length)
          : 0;
        
        return {
          week,
          weekNumber: parseInt(week.replace('week', ''), 10),
          deliveryCount: weekNotes.length,
          totalOrdered,
          totalDelivered,
          totalToFollow,
          avgFulfillment,
        };
      }).sort((a, b) => a.weekNumber - b.weekNumber);
      
      // Find most common "to follow" items
      const itemTracking: { [key: string]: { totalToFollow: number, occurrences: number } } = {};
      
      notes.forEach(note => {
        if (note.lineItems && Array.isArray(note.lineItems)) {
          note.lineItems.forEach((item: any) => {
            if (item.qtyToFollow > 0) {
              const itemName = item.itemDescription;
              if (!itemTracking[itemName]) {
                itemTracking[itemName] = { totalToFollow: 0, occurrences: 0 };
              }
              itemTracking[itemName].totalToFollow += item.qtyToFollow;
              itemTracking[itemName].occurrences += 1;
            }
          });
        }
      });
      
      const topToFollowItems = Object.entries(itemTracking)
        .map(([item, data]) => ({ item, ...data }))
        .sort((a, b) => b.totalToFollow - a.totalToFollow)
        .slice(0, 10);
      
      // Overall statistics
      const allTimeStats = {
        totalDeliveries: notes.length,
        totalOrdered: notes.reduce((sum, n) => sum + (n.totalOrdered || 0), 0),
        totalDelivered: notes.reduce((sum, n) => sum + (n.totalDelivered || 0), 0),
        totalToFollow: notes.reduce((sum, n) => sum + (n.totalToFollow || 0), 0),
        avgFulfillment: notes.length > 0 
          ? Math.round(notes.reduce((sum, n) => sum + (n.fulfillmentPercentage || 0), 0) / notes.length)
          : 0,
      };
      
      res.json({
        weeklyAnalytics,
        topToFollowItems,
        allTimeStats,
        building: building || 'all',
      });
      
    } catch (error) {
      console.error("Error calculating delivery analytics:", error);
      res.status(500).json({ error: "Failed to calculate analytics" });
    }
  });

  // ========== CLEANING SUPPLIES ORDERING SYSTEM ==========

  // GET /api/cleaning-order-schedules - List all schedules
  app.get('/api/cleaning-order-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const schedules = await storage.getCleaningOrderSchedules();
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching cleaning order schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  // POST /api/cleaning-order-schedules - Create new schedule
  app.post('/api/cleaning-order-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCleaningOrderScheduleSchema.parse(req.body);
      const schedule = await storage.createCleaningOrderSchedule(validatedData);
      res.status(201).json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating cleaning order schedule:", error);
      res.status(500).json({ error: "Failed to create schedule" });
    }
  });

  // PATCH /api/cleaning-order-schedules/:id - Update schedule
  app.patch('/api/cleaning-order-schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const partialSchema = insertCleaningOrderScheduleSchema.partial();
      const validatedData = partialSchema.parse(req.body);
      const schedule = await storage.updateCleaningOrderSchedule(parseInt(id), validatedData);
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating cleaning order schedule:", error);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  // DELETE /api/cleaning-order-schedules/:id - Delete schedule
  app.delete('/api/cleaning-order-schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCleaningOrderSchedule(parseInt(id));
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting cleaning order schedule:", error);
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  // POST /api/cleaning-order-schedules/:id/send-now - Manually trigger SMS for schedule
  app.post('/api/cleaning-order-schedules/:id/send-now', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const schedule = await storage.getCleaningOrderSchedule(parseInt(id));
      
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      // Generate cryptographically secure token
      const token = crypto.randomBytes(32).toString('hex');
      
      // Create pending order
      const order = await storage.createCleaningOrder({
        scheduleId: schedule.id,
        propertyName: schedule.propertyName,
        orderDate: new Date().toISOString().split("T")[0],
        items: [],
        status: "pending",
        submittedBy: schedule.recipientName,
        submittedAt: undefined,
        notes: null,
        token,
      });

      // Generate SMS link
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
      const orderLink = `${baseUrl}/cleaning-order/${token}`;
      
      // Send SMS via JustCall
      const message = `Hi ${schedule.recipientName}, This is an automated reminder to complete the Cleaning Item ordering for ${schedule.propertyName}. ${orderLink} This will be delivered on ${schedule.deliveryDay}. Thanks, Northstay`;
      
      const { sendSMS } = await import("./justcall");
      const smsResult = await sendSMS(schedule.recipientPhone, message);

      // Log the reminder
      await storage.createCleaningOrderReminderLog({
        scheduleId: schedule.id,
        recipientPhone: schedule.recipientPhone,
        messageStatus: smsResult.success ? "sent" : "failed",
        orderSubmitted: false,
        submittedAt: undefined,
        twilioMessageSid: smsResult.messageId,
        token,
      });

      res.json({ success: smsResult.success, order, message: smsResult.success ? "SMS sent successfully" : smsResult.error });
    } catch (error) {
      console.error("Error sending cleaning order reminder:", error);
      res.status(500).json({ error: "Failed to send reminder" });
    }
  });

  // GET /api/cleaning-orders - List all orders with filters
  app.get('/api/cleaning-orders', isAuthenticated, async (req: any, res) => {
    try {
      const { propertyName, status, dateFrom, dateTo } = req.query;
      const orders = await storage.getCleaningOrders({
        propertyName: propertyName as string | undefined,
        status: status as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });
      res.json(orders);
    } catch (error) {
      console.error("Error fetching cleaning orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // PATCH /api/cleaning-orders/:id - Update order status
  app.patch('/api/cleaning-orders/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const order = await storage.updateCleaningOrder(parseInt(id), req.body);
      res.json(order);
    } catch (error) {
      console.error("Error updating cleaning order:", error);
      res.status(500).json({ error: "Failed to update order" });
    }
  });

  // GET /api/cleaning-order/:token - Get order by token (NO AUTH - for submission page)
  app.get('/api/cleaning-order/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      const order = await storage.getCleaningOrderByToken(token);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found or link expired" });
      }

      // Also get the schedule info if available
      let schedule = null;
      if (order.scheduleId) {
        schedule = await storage.getCleaningOrderSchedule(order.scheduleId);
      }

      res.json({ order, schedule });
    } catch (error) {
      console.error("Error fetching order by token:", error);
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // POST /api/cleaning-order/:token/submit - Submit order (NO AUTH)
  app.post('/api/cleaning-order/:token/submit', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      // Validate submission data
      const submissionSchema = z.object({
        items: z.array(z.object({
          name: z.string().min(1, "Item name is required"),
          quantity: z.number().int().positive("Quantity must be positive"),
        })).min(1, "At least one item is required"),
        submittedBy: z.string().min(1, "Submitted by is required"),
        notes: z.string().nullable().optional(),
      });
      
      const validatedData = submissionSchema.parse(req.body);
      const { items, notes, submittedBy } = validatedData;
      
      const order = await storage.getCleaningOrderByToken(token);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found or link expired" });
      }

      if (order.submittedAt) {
        return res.status(400).json({ error: "Order already submitted" });
      }

      // Update the order with submitted data
      const updatedOrder = await storage.updateCleaningOrder(order.id, {
        items,
        notes,
        submittedBy,
        submittedAt: new Date(),
        status: "submitted",
      });

      // Update the reminder log
      if (order.scheduleId) {
        const logs = await storage.getCleaningOrderReminderLogs({ scheduleId: order.scheduleId });
        const matchingLog = logs.find(log => log.token === token);
        if (matchingLog) {
          await storage.updateCleaningOrderReminderLog(matchingLog.id, {
            orderSubmitted: true,
            submittedAt: new Date(),
          });
        }
      }

      res.json({ success: true, order: updatedOrder });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error submitting cleaning order:", error);
      res.status(500).json({ error: "Failed to submit order" });
    }
  });

  // GET /api/cleaning-order-logs - Get reminder logs
  app.get('/api/cleaning-order-logs', isAuthenticated, async (req: any, res) => {
    try {
      const { scheduleId } = req.query;
      const logs = await storage.getCleaningOrderReminderLogs(
        scheduleId ? { scheduleId: parseInt(scheduleId as string) } : undefined
      );
      res.json(logs);
    } catch (error) {
      console.error("Error fetching cleaning order logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // POST /api/cleaning-orders/:id/verify - Mark order as verified
  app.post('/api/cleaning-orders/:id/verify', isAuthenticated, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      
      // Get staff ID from user session - use email to find staff record
      const userEmail = req.user.claims.email;
      const allStaff = await storage.getAllStaff();
      const staffMember = allStaff.find(s => s.email === userEmail);
      
      if (!staffMember) {
        return res.status(403).json({ error: "User is not a staff member" });
      }

      const order = await storage.updateCleaningOrder(orderId, {
        status: "verified",
        verifiedBy: staffMember.id,
        verifiedAt: new Date()
      });

      res.json({ success: true, order });
    } catch (error) {
      console.error("Error verifying cleaning order:", error);
      res.status(500).json({ error: "Failed to verify order" });
    }
  });

  // ========== CRITICAL INFORMATION LISTS ==========

  // GET /api/critical-info - Get all critical information with optional search
  app.get('/api/critical-info', isAuthenticated, async (req: any, res) => {
    try {
      const { search } = req.query;
      const criticalInfo = await storage.getAllCriticalInfo(search as string | undefined);
      res.json(criticalInfo);
    } catch (error) {
      console.error("Error fetching critical info:", error);
      res.status(500).json({ error: "Failed to fetch critical information" });
    }
  });

  // POST /api/critical-info - Create new critical information
  app.post('/api/critical-info', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const validated = insertCriticalInfoSchema.parse(req.body);
      
      // Require propertyId for new submissions
      if (!validated.propertyId) {
        return res.status(400).json({ error: "Property selection is required (propertyId)" });
      }
      
      const newInfo = await storage.createCriticalInfo({
        ...validated,
        updatedBy: userEmail,
      });
      res.status(201).json(newInfo);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating critical info:", error);
      res.status(500).json({ error: "Failed to create critical information" });
    }
  });

  // PATCH /api/critical-info/:id - Update critical information
  app.patch('/api/critical-info/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userEmail = req.user.claims.email;
      const validated = insertCriticalInfoSchema.partial().parse(req.body);
      const updated = await storage.updateCriticalInfo(id, {
        ...validated,
        updatedBy: userEmail,
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating critical info:", error);
      res.status(500).json({ error: "Failed to update critical information" });
    }
  });

  // DELETE /api/critical-info/:id - Delete critical information
  app.delete('/api/critical-info/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCriticalInfo(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting critical info:", error);
      res.status(500).json({ error: "Failed to delete critical information" });
    }
  });

  // POST /api/critical-info/bulk-extract - Extract critical info from text using AI
  app.post('/api/critical-info/bulk-extract', isAuthenticated, async (req: any, res) => {
    try {
      const { inputText } = req.body;
      
      if (!inputText || typeof inputText !== 'string' || inputText.trim().length === 0) {
        return res.status(400).json({ error: "Input text is required" });
      }

      const { extractCriticalInfo } = await import('./services/critical-info-extraction');
      const extracted = await extractCriticalInfo(inputText);
      
      res.json(extracted);
    } catch (error) {
      console.error("Error extracting critical info with AI:", error);
      res.status(500).json({ 
        error: "Failed to extract critical information", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // POST /api/critical-info/bulk - Bulk save critical information items
  app.post('/api/critical-info/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { items } = req.body;
      const userEmail = req.user.claims.email;
      
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Items array is required and must not be empty" });
      }

      // Validate and add updatedBy to each item
      const validatedItems = [];
      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const validated = insertCriticalInfoSchema.parse(item);
        
        // Require propertyId for all items
        if (!validated.propertyId) {
          return res.status(400).json({ 
            error: "Validation failed", 
            details: `Item at index ${index} is missing propertyId. All items must have a property selected.`
          });
        }
        
        validatedItems.push({
          ...validated,
          updatedBy: userEmail,
        });
      }

      const saved = await storage.createCriticalInfoBulk(validatedItems);
      res.status(201).json(saved);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error bulk saving critical info:", error);
      res.status(500).json({ 
        error: "Failed to bulk save critical information",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // POST /api/critical-info/import-lockbox-codes - Import lockbox codes from property access document
  app.post('/api/critical-info/import-lockbox-codes', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      
      const { parseLockboxCodes } = await import('./services/lockbox-parser');
      
      console.log('[LOCKBOX-IMPORT] Parsing lockbox codes from property access document...');
      const items = parseLockboxCodes('', userEmail);
      
      console.log(`[LOCKBOX-IMPORT] Parsed ${items.length} lockbox entries`);
      
      // Get existing entries to avoid duplicates
      console.log('[LOCKBOX-IMPORT] Checking for existing entries...');
      const existingItems = await storage.getAllCriticalInfo();
      const existingKeys = new Set(
        existingItems.map(item => 
          `${item.propertyName}-${item.category}-${item.title}`.toLowerCase().trim()
        )
      );
      
      console.log(`[LOCKBOX-IMPORT] Found ${existingKeys.size} existing entries`);
      
      // Filter out duplicates
      const newItems = items.filter(item => {
        const key = `${item.propertyName}-${item.category}-${item.title}`.toLowerCase().trim();
        return !existingKeys.has(key);
      });
      const skippedCount = items.length - newItems.length;
      
      console.log(`[LOCKBOX-IMPORT] ${newItems.length} new entries to import, ${skippedCount} already exist`);
      
      // Save only new items
      let saved: any[] = [];
      if (newItems.length > 0) {
        console.log('[LOCKBOX-IMPORT] Saving new entries to database...');
        saved = await storage.createCriticalInfoBulk(newItems);
      }
      
      res.status(201).json({
        success: true,
        imported: saved.length,
        skipped: skippedCount,
        total: items.length,
        entries: saved,
      });
    } catch (error) {
      console.error("Error importing lockbox codes:", error);
      res.status(500).json({ 
        error: "Failed to import lockbox codes",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // POST /api/critical-info/import-property-links - Import property links from Booked Directly
  app.post('/api/critical-info/import-property-links', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      
      const { fetchPropertyListings, convertToCriticalInfoItems } = await import('./services/property-link-importer');
      
      console.log('[PROPERTY-IMPORT] Fetching property listings from Booked Directly...');
      const properties = await fetchPropertyListings();
      
      console.log(`[PROPERTY-IMPORT] Fetched ${properties.length} properties from website`);
      
      // Get existing Property Link entries to avoid duplicates
      console.log('[PROPERTY-IMPORT] Checking for existing property links...');
      const existingItems = await storage.getAllCriticalInfo();
      const existingLinks = new Set(
        existingItems
          .filter(item => item.category === "Property Link")
          .map(item => item.value.toLowerCase().trim())
      );
      
      console.log(`[PROPERTY-IMPORT] Found ${existingLinks.size} existing property links`);
      
      // Convert to critical info items
      const allItems = convertToCriticalInfoItems(properties, userEmail);
      
      // Filter out duplicates based on link URL
      const newItems = allItems.filter(item => !existingLinks.has(item.value.toLowerCase().trim()));
      const skippedCount = allItems.length - newItems.length;
      
      console.log(`[PROPERTY-IMPORT] ${newItems.length} new properties to import, ${skippedCount} already exist`);
      
      // Save only new items
      let saved: any[] = [];
      if (newItems.length > 0) {
        console.log('[PROPERTY-IMPORT] Saving new properties to database...');
        saved = await storage.createCriticalInfoBulk(newItems);
      }
      
      res.status(201).json({
        success: true,
        imported: saved.length,
        skipped: skippedCount,
        total: allItems.length,
        properties: saved,
      });
    } catch (error) {
      console.error("Error importing property links:", error);
      res.status(500).json({ 
        error: "Failed to import property links",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ======== LINEN PACKING ASSISTANT API ========

  // POST /api/linen-packing/import-csv - Import linen packing data from CSV
  app.post('/api/linen-packing/import-csv', isAuthenticated, async (req: any, res) => {
    try {
      const filePath = 'attached_assets/Linen Packing Data_2025-10-22T21_30_36_1761168937142.csv';
      
      console.log('[LINEN-IMPORT] Starting CSV import...');
      const { importLinenPackingCSV } = await import('./services/linen-packing-csv-importer');
      
      const items = await importLinenPackingCSV(filePath);
      console.log(`[LINEN-IMPORT] Parsed ${items.length} items from CSV`);
      
      // Clear existing data
      console.log('[LINEN-IMPORT] Clearing existing linen packing data...');
      await storage.deleteAllLinenPackingItems();
      
      // Insert new data
      console.log('[LINEN-IMPORT] Inserting new linen packing data...');
      const created = await storage.createLinenPackingItems(items);
      
      console.log(`[LINEN-IMPORT] Successfully imported ${created.length} items`);
      
      // Get unique properties count
      const properties = await storage.getAllLinenPackingProperties();
      
      res.status(201).json({
        success: true,
        imported: created.length,
        properties: properties.length,
        message: `Imported ${created.length} items for ${properties.length} properties`,
      });
    } catch (error) {
      console.error("Error importing linen packing CSV:", error);
      res.status(500).json({ 
        error: "Failed to import linen packing data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // GET /api/linen-packing/properties - Get all properties with linen packing data
  app.get('/api/linen-packing/properties', isAuthenticated, async (req: any, res) => {
    try {
      const properties = await storage.getAllLinenPackingProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching linen properties:", error);
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  // GET /api/linen-packing/:propertyAddress - Get packing list for a property
  app.get('/api/linen-packing/:propertyAddress', isAuthenticated, async (req: any, res) => {
    try {
      const propertyAddress = decodeURIComponent(req.params.propertyAddress);
      const items = await storage.getLinenPackingItems(propertyAddress);
      res.json(items);
    } catch (error) {
      console.error("Error fetching packing list:", error);
      res.status(500).json({ error: "Failed to fetch packing list" });
    }
  });

  // ======== SPECIAL REQUESTS API ========

  // POST /api/special-requests - Create new special request
  app.post('/api/special-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user.claims.email;
      const { insertSpecialRequestSchema } = await import('@shared/schema');
      
      const validated = insertSpecialRequestSchema.parse({
        ...req.body,
        createdBy: userEmail,
      });
      
      // Require propertyId for new submissions
      if (!validated.propertyId) {
        return res.status(400).json({ error: "Property selection is required (propertyId)" });
      }
      
      const request = await storage.createSpecialRequest(validated);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating special request:", error);
      res.status(500).json({ error: "Failed to create special request" });
    }
  });

  // GET /api/special-requests - Get all special requests (optionally filtered by property)
  app.get('/api/special-requests', isAuthenticated, async (req: any, res) => {
    try {
      const { propertyName } = req.query;
      const requests = await storage.getSpecialRequests(propertyName as string | undefined);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching special requests:", error);
      res.status(500).json({ error: "Failed to fetch special requests" });
    }
  });

  // GET /api/special-requests/active/:propertyName - Get active special requests for a property
  app.get('/api/special-requests/active/:propertyName', isAuthenticated, async (req: any, res) => {
    try {
      const propertyName = decodeURIComponent(req.params.propertyName);
      const requests = await storage.getActiveSpecialRequests(propertyName);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching active special requests:", error);
      res.status(500).json({ error: "Failed to fetch active special requests" });
    }
  });

  // PATCH /api/special-requests/:id - Update special request
  app.patch('/api/special-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { insertSpecialRequestSchema } = await import('@shared/schema');
      
      const validated = insertSpecialRequestSchema.partial().parse(req.body);
      const updated = await storage.updateSpecialRequest(id, validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating special request:", error);
      res.status(500).json({ error: "Failed to update special request" });
    }
  });

  // POST /api/special-requests/:id/complete - Mark special request as completed
  app.post('/api/special-requests/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userEmail = req.user.claims.email;
      
      await storage.markSpecialRequestCompleted(id, userEmail);
      res.json({ success: true, message: "Special request marked as completed" });
    } catch (error) {
      console.error("Error completing special request:", error);
      res.status(500).json({ error: "Failed to complete special request" });
    }
  });

  // DELETE /api/special-requests/:id - Delete special request
  app.delete('/api/special-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSpecialRequest(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting special request:", error);
      res.status(500).json({ error: "Failed to delete special request" });
    }
  });

  // ======== CLEANING COSTS API ========

  // POST /api/cleaning-costs/import-csv - Import cleaning cost breakdown from CSV
  app.post('/api/cleaning-costs/import-csv', isAuthenticated, async (req: any, res) => {
    try {
      console.log('[CLEANING-COSTS-IMPORT] Starting CSV import...');
      const { parseCleaningCostCSV } = await import('./services/cleaning-cost-csv-importer');
      
      const costs = await parseCleaningCostCSV();
      console.log(`[CLEANING-COSTS-IMPORT] Parsed ${costs.length} cost records from CSV`);
      
      // Clear existing data and insert new data
      await storage.deleteAllCleaningCosts();
      console.log('[CLEANING-COSTS-IMPORT] Cleared existing cost data');
      
      const inserted = await storage.createCleaningCosts(costs);
      console.log(`[CLEANING-COSTS-IMPORT] Imported ${inserted.length} cost records`);
      
      res.json({
        success: true,
        imported: inserted.length,
        message: `Successfully imported ${inserted.length} cleaning cost records`
      });
    } catch (error) {
      console.error('[CLEANING-COSTS-IMPORT] Error importing CSV:', error);
      res.status(500).json({ 
        error: "Failed to import cleaning cost CSV",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /api/cleaning-costs - Get all cleaning costs
  app.get('/api/cleaning-costs', isAuthenticated, async (req: any, res) => {
    try {
      const costs = await storage.getAllCleaningCosts();
      res.json(costs);
    } catch (error) {
      console.error("Error fetching cleaning costs:", error);
      res.status(500).json({ error: "Failed to fetch cleaning costs" });
    }
  });

  // GET /api/cleaning-costs/:propertyName - Get cleaning cost for a specific property
  app.get('/api/cleaning-costs/:propertyName', isAuthenticated, async (req: any, res) => {
    try {
      const propertyName = decodeURIComponent(req.params.propertyName);
      const cost = await storage.getCleaningCost(propertyName);
      
      if (!cost) {
        return res.status(404).json({ error: "Cleaning cost not found for this property" });
      }
      
      res.json(cost);
    } catch (error) {
      console.error("Error fetching cleaning cost:", error);
      res.status(500).json({ error: "Failed to fetch cleaning cost" });
    }
  });

  // POST /api/linen-packing/send-chatbot-link - Send chatbot link via SMS to cleaner(s)
  app.post('/api/linen-packing/send-chatbot-link', isAuthenticated, async (req: any, res) => {
    try {
      const { staffId } = req.body;
      
      if (!staffId) {
        return res.status(400).json({ error: "Staff ID is required" });
      }

      const staff = await storage.getStaff(staffId);
      
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      if (!staff.phone) {
        return res.status(400).json({ error: "Staff member has no phone number" });
      }

      // Get the base URL for the chatbot link
      const baseUrl = process.env.REPL_SLUG 
        ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
        : 'http://localhost:5000';
      
      const chatbotUrl = `${baseUrl}/linen-packing`;

      // Send SMS using Twilio
      const { sendGenericSMS } = await import('./twilio');
      
      const message = `Hi ${staff.name}! Access the Linen Packing Assistant to see what items to pack for each property: ${chatbotUrl}`;
      
      const result = await sendGenericSMS(staff.phone, message);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send SMS');
      }

      res.json({ 
        success: true, 
        message: `Chatbot link sent to ${staff.name}`,
        recipient: staff.name,
        phone: staff.phone.slice(-4)
      });
    } catch (error) {
      console.error('[SMS-CHATBOT] Error sending chatbot link:', error);
      res.status(500).json({ 
        error: "Failed to send chatbot link via SMS",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST /api/linen-packing/log-session - Log when cleaner views a property packing list
  app.post('/api/linen-packing/log-session', isAuthenticated, async (req: any, res) => {
    try {
      const { propertyAddress, specialRequestsCount } = req.body;
      
      // Validate request body
      if (!propertyAddress || typeof specialRequestsCount !== 'number') {
        return res.status(400).json({ 
          error: "propertyAddress and specialRequestsCount are required" 
        });
      }

      // Get staff from authenticated user email
      const email = req.user.claims.email;
      const staff = await storage.getStaffByEmail(email);
      
      if (!staff) {
        return res.status(404).json({ 
          error: "Staff member not found",
          email: email,
          message: "Your email is not registered in the staff database. Please contact support."
        });
      }

      // Create linen packing session
      const session = await storage.createLinenPackingSession({
        staffId: staff.id,
        staffName: staff.fullName,
        propertyAddress,
        specialRequestsCount,
      });

      console.log(`[LINEN-SESSION] Logged session for ${staff.fullName} at ${propertyAddress}`);
      
      res.json({ 
        success: true, 
        sessionId: session.id,
        message: "Session logged successfully" 
      });
    } catch (error) {
      console.error("Error logging linen packing session:", error);
      res.status(500).json({ 
        error: "Failed to log session",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ======== COMPLIANCE AUTOMATION API ========

  // GET /api/compliance/automation-data - Get auto-populated compliance data for a staff member on a date
  app.get('/api/compliance/automation-data', isAuthenticated, async (req: any, res) => {
    try {
      const { staffId, date, property } = req.query;
      
      // Validate query params
      if (!staffId || !date) {
        return res.status(400).json({ 
          error: "staffId and date query parameters are required" 
        });
      }

      // Parse date
      const parsedDate = new Date(date as string);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      }

      // Get automation data
      const automationData = await storage.getComplianceAutomationSnapshot({
        staffId: staffId as string,
        date: parsedDate,
        property: property as string | undefined,
      });

      console.log(`[COMPLIANCE-AUTOMATION] Fetched data for staffId=${staffId}, date=${date}:`, automationData);
      
      res.json(automationData);
    } catch (error) {
      console.error("Error fetching compliance automation data:", error);
      res.status(500).json({ 
        error: "Failed to fetch automation data",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ======== CLEANING RATES API ========

  // GET /api/cleaning-rates - Get all cleaning rates
  app.get('/api/cleaning-rates', isAuthenticated, async (req: any, res) => {
    try {
      const rates = await storage.getAllCleaningRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching cleaning rates:", error);
      res.status(500).json({ error: "Failed to fetch cleaning rates" });
    }
  });

  // POST /api/cleaning-rates - Create new cleaning rate
  app.post('/api/cleaning-rates', isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertCleaningRateSchema.parse(req.body);
      const newRate = await storage.createCleaningRate(validated);
      res.status(201).json(newRate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating cleaning rate:", error);
      res.status(500).json({ error: "Failed to create cleaning rate" });
    }
  });

  // PATCH /api/cleaning-rates/:id - Update cleaning rate
  app.patch('/api/cleaning-rates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validated = insertCleaningRateSchema.partial().parse(req.body);
      const updated = await storage.updateCleaningRate(id, validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating cleaning rate:", error);
      res.status(500).json({ error: "Failed to update cleaning rate" });
    }
  });

  // DELETE /api/cleaning-rates/:id - Delete cleaning rate
  app.delete('/api/cleaning-rates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id} = req.params;
      await storage.deleteCleaningRate(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting cleaning rate:", error);
      res.status(500).json({ error: "Failed to delete cleaning rate" });
    }
  });

  // ======== BUSINESS ANALYTICS / P&L SYSTEM ========
  
  // Configure multer for financial document uploads
  const financialDocsStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
      const dir = path.join(process.cwd(), 'attached_assets', 'financial_documents');
      await fs.mkdir(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}_${file.originalname}`;
      cb(null, uniqueName);
    }
  });
  
  const financialDocsUpload = multer({ 
    storage: financialDocsStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['.pdf', '.csv', '.xlsx'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, CSV, and XLSX files are allowed'));
      }
    }
  });

  // POST /api/analytics/documents/upload - Upload financial document
  app.post('/api/analytics/documents/upload', isAuthenticated, financialDocsUpload.single('document'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { documentType } = req.body; // 'bank_statement' or 'uplisting_report'
      
      if (!documentType || !['bank_statement', 'uplisting_report', 'other'].includes(documentType)) {
        return res.status(400).json({ error: "Invalid document type. Must be bank_statement, uplisting_report, or other" });
      }

      const doc = await storage.createFinancialDocument({
        documentType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        status: 'pending',
      });

      res.json(doc);
    } catch (error) {
      console.error("Error uploading financial document:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  // POST /api/analytics/documents/:id/extract - Trigger AI extraction
  app.post('/api/analytics/documents/:id/extract', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const doc = await storage.getFinancialDocumentById(id);
      
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Import extraction services
      const { extractBankStatement, extractUplistingDocument } = await import('./services/bank-statement-extraction');
      
      // Read file
      const fileBuffer = await fs.readFile(doc.filePath);
      
      let result;
      if (doc.documentType === 'uplisting_report') {
        result = await extractUplistingDocument(fileBuffer, doc.fileName);
      } else {
        result = await extractBankStatement(fileBuffer, doc.fileName);
      }
      
      // Update document with extraction results
      const updated = await storage.updateFinancialDocument(id, {
        status: 'processed',
        processedAt: new Date(),
        startDate: result.startDate,
        endDate: result.endDate,
        totalTransactions: result.totalTransactions,
        extractedData: result.transactions as any,
      });

      res.json({
        document: updated,
        extraction: result,
      });
    } catch (error) {
      console.error("Error extracting document:", error);
      
      // Update document with error
      try {
        await storage.updateFinancialDocument(req.params.id, {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (updateError) {
        console.error("Failed to update document with error:", updateError);
      }
      
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to extract document" });
    }
  });

  // POST /api/analytics/documents/:id/approve - Save extracted transactions
  app.post('/api/analytics/documents/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { transactions } = req.body; // Array of edited transactions
      
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Transactions must be an array" });
      }

      const doc = await storage.getFinancialDocumentById(id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Create transactions in database
      const transactionData = transactions.map(t => ({
        type: t.type,
        category: t.suggestedCategory || t.category,
        amount: t.amount.toString(),
        currency: 'GBP',
        date: t.date,
        description: t.description,
        reference: t.propertyReference || null,
        source: doc.documentType === 'uplisting_report' ? 'uplisting' : 'bank_statement',
        bankStatementId: id,
        propertyId: null,
        notes: t.confidence ? `AI Confidence: ${(t.confidence * 100).toFixed(0)}%` : null,
      }));

      const created = await storage.createTransactions(transactionData);
      
      res.json({
        success: true,
        transactionsCreated: created.length,
        transactions: created,
      });
    } catch (error) {
      console.error("Error approving transactions:", error);
      res.status(500).json({ error: "Failed to approve transactions" });
    }
  });

  // GET /api/analytics/documents - List all documents
  app.get('/api/analytics/documents', isAuthenticated, async (req: any, res) => {
    try {
      const documents = await storage.getFinancialDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // DELETE /api/analytics/documents/:id - Delete document
  app.delete('/api/analytics/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const doc = await storage.getFinancialDocumentById(id);
      
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete file from filesystem
      try {
        await fs.unlink(doc.filePath);
      } catch (fileError) {
        console.error("Error deleting file:", fileError);
      }

      // Delete from database
      await storage.deleteFinancialDocument(id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  // GET /api/analytics/transactions - List transactions with filters
  app.get('/api/analytics/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate, type, category, source } = req.query;
      
      const transactions = await storage.getTransactions({
        startDate: startDate as string,
        endDate: endDate as string,
        type: type as string,
        category: category as string,
        source: source as string,
      });
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  // POST /api/analytics/transactions - Create manual transaction
  app.post('/api/analytics/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const validated = insertFinancialTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validated);
      res.json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error creating transaction:", error);
      res.status(500).json({ error: "Failed to create transaction" });
    }
  });

  // PATCH /api/analytics/transactions/:id - Update transaction
  app.patch('/api/analytics/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const validated = insertFinancialTransactionSchema.partial().parse(req.body);
      const updated = await storage.updateTransaction(id, validated);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      console.error("Error updating transaction:", error);
      res.status(500).json({ error: "Failed to update transaction" });
    }
  });

  // DELETE /api/analytics/transactions/:id - Delete transaction
  app.delete('/api/analytics/transactions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTransaction(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // GET /api/analytics/pnl - P&L summary for date range
  app.get('/api/analytics/pnl', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const pnl = await storage.getPNLSummary(startDate as string, endDate as string);
      res.json(pnl);
    } catch (error) {
      console.error("Error generating P&L:", error);
      res.status(500).json({ error: "Failed to generate P&L report" });
    }
  });

  // GET /api/analytics/metrics - Key financial metrics
  app.get('/api/analytics/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const metrics = await storage.getFinancialMetrics(startDate as string, endDate as string);
      res.json(metrics);
    } catch (error) {
      console.error("Error generating metrics:", error);
      res.status(500).json({ error: "Failed to generate metrics" });
    }
  });

  // ======== PROPERLY CLEANER ALLOCATION SYSTEM ========
  type BuildingName = 'Building A' | 'Building B' | 'Building C';
  
  // Zod validation schemas for Properly endpoints
  const uploadProperlySchema = z.object({
    fileName: z.string().min(1),
    csvContent: z.string().min(1),
  });
  
  const completeAllocationSchema = z.object({
    wasOnTime: z.boolean().optional(),
    performanceScore: z.number().min(1).max(5).optional(),
    notes: z.string().optional(),
  });
  
  // POST /api/properly/upload - Upload and parse Properly cleaning schedule CSV
  app.post("/api/properly/upload", isAuthenticated, async (req: any, res) => {
    try {
      // Validate request
      const validated = uploadProperlySchema.parse(req.body);
      const { fileName, csvContent } = validated;
      
      // Parse CSV
      const { tasks, detectedColumns, warnings } = parseProperlyCSV(csvContent);
      
      if (tasks.length === 0) {
        return res.status(400).json({ 
          error: "No valid tasks found in CSV", 
          warnings 
        });
      }
      
      // VALIDATE tasks before storing
      const validTasks = [];
      const validationErrors = [];
      
      for (const task of tasks) {
        // Check required fields
        if (!task.building) {
          validationErrors.push(`Task skipped - could not identify building: ${task.propertyName} ${task.roomUnit}`);
          continue;
        }
        
        if (!task.cleaningDate) {
          validationErrors.push(`Task skipped - missing date: ${task.propertyName} ${task.roomUnit}`);
          continue;
        }
        
        // Check if building is recognized
        if (!BUILDING_RULES[task.building]) {
          validationErrors.push(`Task skipped - unrecognized building "${task.building}": ${task.propertyName} ${task.roomUnit}`);
          continue;
        }
        
        validTasks.push(task);
      }
      
      if (validTasks.length === 0) {
        return res.status(400).json({ 
          error: "No valid tasks after validation", 
          warnings: [...warnings, ...validationErrors]
        });
      }
      
      // Find staff ID for current user (or use null)
      let staffId = null;
      try {
        const currentStaff = await storage.getStaffByEmail(req.user.claims.email);
        if (currentStaff) {
          staffId = currentStaff.id;
        }
      } catch (e) {
        // Use null if no staff found
      }
      
      // Create upload record
      const upload = await storage.createProperlyUpload({
        fileName,
        uploadedBy: staffId,
        totalTasks: validTasks.length,
        status: "pending",
        notes: validationErrors.length > 0 ? `${validationErrors.length} tasks skipped during validation` : null,
      });
      
      // Create task records (only valid ones)
      const taskRecords = validTasks.map(t => ({
        uploadId: upload.id,
        cleaningDate: t.cleaningDate,
        building: t.building!,
        roomUnit: t.roomUnit,
        propertyName: t.propertyName,
        estimatedDuration: BUILDING_RULES[t.building!].durationPerRoom,
        rawData: JSON.stringify(t.rawData),
      }));
      
      await storage.createProperlyCleaningTasks(taskRecords);
      
      res.json({
        success: true,
        uploadId: upload.id,
        totalTasks: validTasks.length,
        warnings: [...warnings, ...validationErrors],
        detectedColumns,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error uploading Properly CSV:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/properly/uploads - Get all Properly uploads
  app.get("/api/properly/uploads", isAuthenticated, async (req: any, res) => {
    try {
      const uploads = await storage.getProperlyUploads();
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching uploads:", error);
      res.status(500).json({ error: "Failed to fetch uploads" });
    }
  });

  // GET /api/properly/uploads/:uploadId - Get single upload with tasks
  app.get("/api/properly/uploads/:uploadId", isAuthenticated, async (req: any, res) => {
    try {
      const { uploadId } = req.params;
      const upload = await storage.getProperlyUpload(uploadId);
      
      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }
      
      const tasks = await storage.getProperlyCleaningTasks(uploadId);
      
      res.json({
        ...upload,
        tasks,
      });
    } catch (error) {
      console.error("Error fetching upload:", error);
      res.status(500).json({ error: "Failed to fetch upload" });
    }
  });

  // POST /api/properly/uploads/:uploadId/allocate - Run allocation algorithm
  app.post("/api/properly/uploads/:uploadId/allocate", isAuthenticated, async (req: any, res) => {
    const { uploadId } = req.params;
    
    try {
      const tasks = await storage.getProperlyCleaningTasks(uploadId);
      
      if (tasks.length === 0) {
        return res.status(400).json({ error: "No tasks found for this upload" });
      }
      
      // Group by building and date
      const tasksByBuildingDate = tasks.reduce((acc: any, task: any) => {
        const key = `${task.building}-${task.cleaningDate}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
      }, {});
      
      const allAllocations: any[] = [];
      
      // Track cleaner workloads across all buildings for the same date
      const cleanerWorkloads = new Map<string, Map<string, number>>(); // date -> (cleanerId -> roomCount)
      
      // Allocate for each building/date combination
      for (const [key, buildingTasks] of Object.entries(tasksByBuildingDate)) {
        const [building, date] = key.split('-');
        
        // Get existing workloads for this date (from previous building allocations)
        if (!cleanerWorkloads.has(date)) {
          cleanerWorkloads.set(date, new Map());
        }
        const dateWorkloads = cleanerWorkloads.get(date)!;
        
        // Run allocation with existing workload context
        const allocations = await allocateCleaner(
          buildingTasks as any[],
          building as any,
          date,
          storage,
          dateWorkloads // Pass existing allocations for this date
        );
        
        // Update workloads after allocation
        for (const [taskId, cleanerId] of allocations.entries()) {
          const currentLoad = dateWorkloads.get(cleanerId) || 0;
          dateWorkloads.set(cleanerId, currentLoad + 1);
        }
        
        // Convert to allocation records
        for (const [taskId, cleanerId] of allocations.entries()) {
          const task = (buildingTasks as any[]).find((t: any) => t.id === taskId);
          allAllocations.push({
            taskId,
            cleanerId,
            uploadId,
            cleaningDate: task.cleaningDate,
            building: task.building,
            allocationMethod: "auto_preferred",
            confirmed: false,
            status: "assigned",
          });
        }
      }
      
      await storage.createCleanerAllocations(allAllocations);
      await storage.updateProperlyUploadStatus(uploadId, "allocated");
      
      res.json({
        success: true,
        totalAllocations: allAllocations.length,
      });
    } catch (error: any) {
      console.error("Allocation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/properly/uploads/:uploadId/allocations - Get allocations for upload
  app.get("/api/properly/uploads/:uploadId/allocations", isAuthenticated, async (req: any, res) => {
    try {
      const { uploadId } = req.params;
      const allocations = await storage.getCleanerAllocations(uploadId);
      const tasks = await storage.getProperlyCleaningTasks(uploadId);
      const allStaff = await storage.getAllStaff();
      
      // Enrich allocations with task and cleaner details
      const enrichedAllocations = allocations.map((allocation: any) => {
        const task = tasks.find((t: any) => t.id === allocation.taskId);
        const cleaner = allStaff.find((s: any) => s.id === allocation.cleanerId);
        
        return {
          ...allocation,
          task,
          cleaner,
        };
      });
      
      res.json(enrichedAllocations);
    } catch (error) {
      console.error("Error fetching allocations:", error);
      res.status(500).json({ error: "Failed to fetch allocations" });
    }
  });

  // POST /api/properly/allocations/:allocationId/confirm - Confirm allocation
  app.post("/api/properly/allocations/:allocationId/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const { allocationId } = req.params;
      await storage.updateAllocationConfirmation(allocationId, true);
      res.json({ success: true });
    } catch (error) {
      console.error("Error confirming allocation:", error);
      res.status(500).json({ error: "Failed to confirm allocation" });
    }
  });

  // PATCH /api/properly/allocations/:allocationId - Update allocation (manual adjustment)
  app.patch("/api/properly/allocations/:allocationId", isAuthenticated, async (req: any, res) => {
    try {
      const { allocationId } = req.params;
      const updates = req.body;
      
      // Get current allocation before updating
      const allocation = await storage.getCleanerAllocation(allocationId);
      
      if (!allocation) {
        return res.status(404).json({ error: "Allocation not found" });
      }
      
      const oldCleanerId = allocation.cleanerId;
      
      // Update allocation
      const updatedAllocation = await storage.updateAllocation(allocationId, updates);
      
      // If cleanerId was changed, record override in history
      if (updates.cleanerId && updates.cleanerId !== oldCleanerId) {
        await storage.recordAllocationHistory({
          allocationId: allocation.id,
          cleanerId: oldCleanerId,
          building: allocation.building,
          cleaningDate: allocation.cleaningDate,
          tasksAssigned: 1,
          tasksCompleted: 0,
          wasOnTime: false,
          wasManuallyOverridden: true,
          notes: `Manually reassigned from ${oldCleanerId} to ${updates.cleanerId}`,
        });
        
        // LEARN FROM OVERRIDE - Adjust preferences
        await adjustPreferencesFromHistory(allocation.building as BuildingName, storage);
      }
      
      res.json(updatedAllocation);
    } catch (error) {
      console.error("Error updating allocation:", error);
      res.status(500).json({ error: "Failed to update allocation" });
    }
  });
  
  // POST /api/properly/allocations/:allocationId/complete - Complete allocation
  app.post("/api/properly/allocations/:allocationId/complete", isAuthenticated, async (req: any, res) => {
    try {
      const { allocationId } = req.params;
      
      // Validate request
      const validated = completeAllocationSchema.parse(req.body);
      const { wasOnTime, performanceScore, notes } = validated;
      
      const allocation = await storage.getCleanerAllocation(allocationId);
      
      if (!allocation) {
        return res.status(404).json({ error: "Allocation not found" });
      }
      
      // Record to history
      await storage.recordAllocationHistory({
        allocationId: allocation.id,
        cleanerId: allocation.cleanerId,
        building: allocation.building,
        cleaningDate: allocation.cleaningDate,
        tasksAssigned: 1,
        tasksCompleted: 1,
        wasOnTime: wasOnTime ?? true,
        performanceScore: performanceScore ?? 3,
        wasManuallyOverridden: false,
        notes: notes || "",
      });
      
      // Update allocation status
      await storage.updateAllocationStatus(allocationId, "completed");
      
      // LEARN FROM HISTORY - Adjust preferences
      await adjustPreferencesFromHistory(allocation.building as BuildingName, storage);
      
      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Error completing allocation:", error);
      res.status(500).json({ error: "Failed to complete allocation" });
    }
  });

  // GET /api/properly/history - Get allocation history
  app.get("/api/properly/history", isAuthenticated, async (req: any, res) => {
    try {
      const { cleanerId, building, dateFrom, dateTo } = req.query;
      
      const history = await storage.getAllocationHistory({
        cleanerId: cleanerId as string | undefined,
        building: building as string | undefined,
        dateFrom: dateFrom as string | undefined,
        dateTo: dateTo as string | undefined,
      });
      
      res.json(history);
    } catch (error) {
      console.error("Error fetching allocation history:", error);
      res.status(500).json({ error: "Failed to fetch allocation history" });
    }
  });

  // ===== CLEANER BUILDING PREFERENCES ENDPOINTS =====

  // GET /api/cleaner-preferences - Get all cleaner building preferences
  app.get("/api/cleaner-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const { building } = req.query;
      const preferences = await storage.getCleanerBuildingPreferences(building as string | undefined);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching cleaner preferences:", error);
      res.status(500).json({ error: "Failed to fetch cleaner preferences" });
    }
  });

  // GET /api/cleaner-preferences/:staffId - Get preferences for specific staff member
  app.get("/api/cleaner-preferences/:staffId", isAuthenticated, async (req: any, res) => {
    try {
      const { staffId } = req.params;
      const preferences = await storage.getCleanerPreferencesForStaff(staffId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching staff preferences:", error);
      res.status(500).json({ error: "Failed to fetch staff preferences" });
    }
  });

  // PATCH /api/cleaner-preferences/:staffId/:building - Update preference level
  app.patch("/api/cleaner-preferences/:staffId/:building", isAuthenticated, async (req: any, res) => {
    try {
      const { staffId, building } = req.params;
      const { preferenceLevel } = req.body;

      if (!preferenceLevel || preferenceLevel < 1 || preferenceLevel > 3) {
        return res.status(400).json({ error: "Preference level must be 1, 2, or 3" });
      }

      const updated = await storage.updateCleanerBuildingPreference(staffId, building, preferenceLevel);
      res.json(updated);
    } catch (error) {
      console.error("Error updating cleaner preference:", error);
      res.status(500).json({ error: "Failed to update cleaner preference" });
    }
  });

  // ===== MANUAL CLEANING ADJUSTMENTS ENDPOINTS =====

  // Helper function to check cleaner capacity
  async function checkCleanerCapacity(cleanerId: string, building: string, adjustmentDate: string, excludeAdjustmentId?: string): Promise<{ allowed: boolean; current: number; max: number; message?: string }> {
    // Building capacity limits
    const CAPACITY_LIMITS: Record<string, number> = {
      'Building A': 5,
      'Building B': 4,
      "St Mary's": 4,
      'Building C': 4, // Support both spellings for safety
    };

    const maxCapacity = CAPACITY_LIMITS[building];
    if (!maxCapacity) {
      return { allowed: true, current: 0, max: 0 }; // Unknown building, allow
    }

    // Count current allocations from Properly system
    const properlyAllocations = await db
      .select()
      .from(schema.properlyCleanerAllocations)
      .where(
        and(
          eq(schema.properlyCleanerAllocations.cleanerId, cleanerId),
          eq(schema.properlyCleanerAllocations.cleaningDate, adjustmentDate),
          eq(schema.properlyCleanerAllocations.building, building),
          or(
            eq(schema.properlyCleanerAllocations.status, 'assigned'),
            eq(schema.properlyCleanerAllocations.status, 'confirmed'),
            eq(schema.properlyCleanerAllocations.status, 'completed')
          )
        )
      );

    // Count active manual adjustments (add_task type)
    const manualAdjustmentsQuery = db
      .select()
      .from(schema.manualCleaningAdjustments)
      .where(
        and(
          eq(schema.manualCleaningAdjustments.cleanerId, cleanerId),
          eq(schema.manualCleaningAdjustments.adjustmentDate, adjustmentDate),
          eq(schema.manualCleaningAdjustments.building, building),
          eq(schema.manualCleaningAdjustments.adjustmentType, 'add_task'),
          eq(schema.manualCleaningAdjustments.status, 'active')
        )
      );

    const manualAdjustments = await manualAdjustmentsQuery;

    // Exclude the current adjustment being updated if provided
    const activeManualAdjustments = excludeAdjustmentId 
      ? manualAdjustments.filter(adj => adj.id !== excludeAdjustmentId)
      : manualAdjustments;

    const currentCount = properlyAllocations.length + activeManualAdjustments.length;

    if (currentCount >= maxCapacity) {
      return {
        allowed: false,
        current: currentCount,
        max: maxCapacity,
        message: `Cleaner has reached maximum capacity for ${building} (${currentCount}/${maxCapacity} rooms)`
      };
    }

    return {
      allowed: true,
      current: currentCount,
      max: maxCapacity
    };
  }

  // GET /api/manual-adjustments - Get all manual adjustments
  app.get("/api/manual-adjustments", isAuthenticated, async (req: any, res) => {
    try {
      const { adjustmentDate, status } = req.query;
      const adjustments = await storage.getManualCleaningAdjustments({
        adjustmentDate: adjustmentDate as string | undefined,
        status: status as string | undefined,
      });
      res.json(adjustments);
    } catch (error) {
      console.error("Error fetching manual adjustments:", error);
      res.status(500).json({ error: "Failed to fetch manual adjustments" });
    }
  });

  // POST /api/manual-adjustments - Create manual adjustment
  app.post("/api/manual-adjustments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const adjustmentData = {
        ...req.body,
        createdBy: userId || req.body.createdBy,
      };

      const validated = insertManualCleaningAdjustmentSchema.parse(adjustmentData);

      // Check capacity if this is an add_task adjustment
      if (validated.adjustmentType === 'add_task' && validated.cleanerId && validated.building && validated.adjustmentDate) {
        const capacityCheck = await checkCleanerCapacity(
          validated.cleanerId,
          validated.building,
          validated.adjustmentDate
        );

        if (!capacityCheck.allowed) {
          return res.status(400).json({
            error: "Capacity exceeded",
            message: capacityCheck.message,
            current: capacityCheck.current,
            max: capacityCheck.max
          });
        }
      }

      const adjustment = await storage.createManualCleaningAdjustment(validated);
      res.json(adjustment);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid adjustment data", details: error.errors });
      }
      console.error("Error creating manual adjustment:", error);
      res.status(500).json({ error: "Failed to create manual adjustment" });
    }
  });

  // PATCH /api/manual-adjustments/:id - Update manual adjustment
  app.patch("/api/manual-adjustments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Get existing adjustment to check if cleaner/building/date is changing
      const existing = await db
        .select()
        .from(schema.manualCleaningAdjustments)
        .where(eq(schema.manualCleaningAdjustments.id, id))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Manual adjustment not found" });
      }

      const existingAdjustment = existing[0];

      // Check capacity if updating an add_task adjustment with new cleaner/building/date
      if (existingAdjustment.adjustmentType === 'add_task' || updates.adjustmentType === 'add_task') {
        const newCleanerId = updates.cleanerId || existingAdjustment.cleanerId;
        const newBuilding = updates.building || existingAdjustment.building;
        const newDate = updates.adjustmentDate || existingAdjustment.adjustmentDate;

        // Only check capacity if cleaner, building, or date changed
        const hasChanged = 
          (updates.cleanerId && updates.cleanerId !== existingAdjustment.cleanerId) ||
          (updates.building && updates.building !== existingAdjustment.building) ||
          (updates.adjustmentDate && updates.adjustmentDate !== existingAdjustment.adjustmentDate);

        if (hasChanged && newCleanerId && newBuilding && newDate) {
          const capacityCheck = await checkCleanerCapacity(
            newCleanerId,
            newBuilding,
            newDate,
            id // Exclude current adjustment from count
          );

          if (!capacityCheck.allowed) {
            return res.status(400).json({
              error: "Capacity exceeded",
              message: capacityCheck.message,
              current: capacityCheck.current,
              max: capacityCheck.max
            });
          }
        }
      }

      const updated = await storage.updateManualCleaningAdjustment(id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating manual adjustment:", error);
      res.status(500).json({ error: "Failed to update manual adjustment" });
    }
  });

  // DELETE /api/manual-adjustments/:id - Delete manual adjustment
  app.delete("/api/manual-adjustments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteManualCleaningAdjustment(id);
      res.json({ success: true, message: "Manual adjustment deleted successfully" });
    } catch (error) {
      console.error("Error deleting manual adjustment:", error);
      res.status(500).json({ error: "Failed to delete manual adjustment" });
    }
  });

  // Guest Support Chat Routes - AI-powered internal troubleshooting chatbot
  
  // Helper function to load knowledge base from CSV
  async function loadKnowledgeBase(): Promise<string> {
    try {
      const csvPath = path.join(process.cwd(), 'attached_assets', 'AI Chat for Business _ knowledge source_2025-10-22T21_42_46_1761169492044.csv');
      const csvContent = await fs.readFile(csvPath, 'utf-8');
      const lines = csvContent.split('\n').slice(1); // Skip header
      
      const faqs = lines
        .filter(line => line.trim())
        .map(line => {
          // Parse CSV line - handle quoted fields
          const match = line.match(/^[^,]*,[^,]*,[^,]*,"([^"]*(?:""[^"]*)*)","([^"]*(?:""[^"]*)*)"/);
          if (match) {
            const keyword = match[1].replace(/""/g, '"');
            const answer = match[2].replace(/""/g, '"');
            return `Q: ${keyword}\nA: ${answer}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n\n');
        
      return faqs;
    } catch (error) {
      console.error('Error loading knowledge base:', error);
      return '';
    }
  }
  
  // Helper function to load chatbot instructions
  async function loadChatbotInstructions(): Promise<string> {
    try {
      const instructionsPath = path.join(process.cwd(), 'attached_assets', 'Pasted--Role-You-are-a-colleague-who-is-an-expert-in-troubleshooting-problems-for-our-serviced-accommodati-1761169473392_1761169473392.txt');
      return await fs.readFile(instructionsPath, 'utf-8');
    } catch (error) {
      console.error('Error loading chatbot instructions:', error);
      return '';
    }
  }
  
  // POST /api/guest-support-chat/session - Create new chat session
  app.post("/api/guest-support-chat/session", isAuthenticated, async (req: any, res) => {
    try {
      const { userName } = req.body;
      const userId = req.user?.id || 'anonymous';
      
      const session = await storage.createGuestSupportChatSession({
        userId,
        userName: userName || null,
      });
      
      res.json(session);
    } catch (error) {
      console.error('Error creating chat session:', error);
      res.status(500).json({ error: 'Failed to create chat session' });
    }
  });
  
  // POST /api/guest-support-chat/message - Send message and get AI response
  app.post("/api/guest-support-chat/message", isAuthenticated, guestSupportRateLimiter, validateChatMessage, async (req: any, res) => {
    try {
      const { sessionId, message } = req.body; // Already sanitized by middleware
      
      // Save user message (with sanitized content)
      await storage.createGuestSupportChatMessage({
        sessionId,
        role: 'user',
        content: message,
      });
      
      // Use the new guest support assistant service with portal data access
      const { processGuestSupportMessage } = await import('./services/guest-support-assistant');
      const aiResponse = await processGuestSupportMessage(sessionId, message, storage);
      
      // Sanitize AI response before saving and sending
      const sanitizedResponse = sanitizeAIResponse(aiResponse);
      
      // Save AI response
      const responseMessage = await storage.createGuestSupportChatMessage({
        sessionId,
        role: 'assistant',
        content: sanitizedResponse,
      });
      
      res.json({ message: responseMessage });
    } catch (error) {
      console.error('Error processing chat message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });
  
  // GET /api/guest-support-chat/history/:sessionId - Get chat history
  app.get("/api/guest-support-chat/history/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const messages = await storage.getGuestSupportChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });
  
  // GET /api/guest-support-chat/sessions - Get all chat sessions for current user
  app.get("/api/guest-support-chat/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || 'anonymous';
      const sessions = await storage.getGuestSupportChatSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      res.status(500).json({ error: 'Failed to fetch chat sessions' });
    }
  });

  // ======== STAFF HELPDESK API ROUTES ========
  
  // POST /api/helpdesk/session - Create new helpdesk chat session
  app.post("/api/helpdesk/session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user?.claims?.email;
      
      // Try to get staff name from email
      let staffName = null;
      if (email) {
        const staff = await storage.getStaffByEmail(email);
        if (staff) {
          staffName = staff.fullName;
        }
      }
      
      const session = await storage.createHelpdeskChatSession(userId, staffName);
      
      res.json(session);
    } catch (error) {
      console.error('[Helpdesk] Error creating session:', error);
      res.status(500).json({ error: 'Failed to create helpdesk session' });
    }
  });
  
  // POST /api/helpdesk/message - Send message and get AI response
  app.post("/api/helpdesk/message", isAuthenticated, helpdeskRateLimiter, validateChatMessage, async (req: any, res) => {
    try {
      const { sessionId, message } = req.body; // Already sanitized by middleware
      const userId = req.user.claims.sub;
      
      // SECURITY: Verify session ownership
      const session = await storage.getHelpdeskChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (session.userId !== userId) {
        logSecurityEvent("UNAUTHORIZED_SESSION_ACCESS", {
          endpoint: '/api/helpdesk/message',
          userId,
          sessionId,
          ipAddress: req.ip || 'unknown'
        });
        return res.status(403).json({ error: 'Unauthorized: You do not own this session' });
      }
      
      // Process message with AI
      const response = await processHelpdeskMessage(sessionId, message, storage);
      
      // Sanitize AI response before sending
      const sanitizedResponse = sanitizeAIResponse(response);
      
      res.json({ response: sanitizedResponse });
    } catch (error) {
      console.error('[Helpdesk] Error processing message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });
  
  // GET /api/helpdesk/history - Get chat history
  app.get("/api/helpdesk/history", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.query;
      const userId = req.user.claims.sub;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }
      
      // SECURITY: Verify session ownership
      const session = await storage.getHelpdeskChatSession(sessionId as string);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (session.userId !== userId) {
        console.warn(`[Helpdesk] Unauthorized access attempt: user ${userId} tried to access session ${sessionId} owned by ${session.userId}`);
        return res.status(403).json({ error: 'Unauthorized: You do not own this session' });
      }
      
      const messages = await storage.getHelpdeskChatHistory(sessionId as string);
      res.json(messages);
    } catch (error) {
      console.error('[Helpdesk] Error fetching history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });

  // ======== TENANT COMMUNICATION API ROUTES ========
  
  // POST /api/tenant-communication/session - Create new tenant communication chat session
  app.post("/api/tenant-communication/session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user?.claims?.email;
      
      // Try to get staff name from email
      let staffName = null;
      if (email) {
        const staff = await storage.getStaffByEmail(email);
        if (staff) {
          staffName = staff.fullName;
        }
      }
      
      const session = await storage.createTenantCommunicationChatSession(userId, staffName);
      
      res.json(session);
    } catch (error) {
      console.error('[TenantComm] Error creating session:', error);
      res.status(500).json({ error: 'Failed to create tenant communication session' });
    }
  });
  
  // POST /api/tenant-communication/message - Send message and get AI response
  app.post("/api/tenant-communication/message", isAuthenticated, tenantCommunicationRateLimiter, validateChatMessage, async (req: any, res) => {
    try {
      const { sessionId, message } = req.body; // Already sanitized by middleware
      const userId = req.user.claims.sub;
      
      // SECURITY: Verify session ownership
      const session = await storage.getTenantCommunicationChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (session.userId !== userId) {
        logSecurityEvent("UNAUTHORIZED_SESSION_ACCESS", {
          endpoint: '/api/tenant-communication/message',
          userId,
          sessionId,
          ipAddress: req.ip || 'unknown'
        });
        return res.status(403).json({ error: 'Unauthorized: You do not own this session' });
      }
      
      // Process message with AI
      const { processTenantCommunicationMessage } = await import("./services/tenant-communication-assistant");
      const response = await processTenantCommunicationMessage(sessionId, message, storage);
      
      // Sanitize AI response before sending
      const sanitizedResponse = sanitizeAIResponse(response);
      
      res.json({ response: sanitizedResponse });
    } catch (error) {
      console.error('[TenantComm] Error processing message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });
  
  // GET /api/tenant-communication/history - Get chat history
  app.get("/api/tenant-communication/history", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.query;
      const userId = req.user.claims.sub;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }
      
      // SECURITY: Verify session ownership
      const session = await storage.getTenantCommunicationChatSession(sessionId as string);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (session.userId !== userId) {
        console.warn(`[TenantComm] Unauthorized access attempt: user ${userId} tried to access session ${sessionId} owned by ${session.userId}`);
        return res.status(403).json({ error: 'Unauthorized: You do not own this session' });
      }
      
      const messages = await storage.getTenantCommunicationChatHistory(sessionId as string);
      res.json(messages);
    } catch (error) {
      console.error('[TenantComm] Error fetching history:', error);
      res.status(500).json({ error: 'Failed to fetch chat history' });
    }
  });
  
  // POST /api/tenant-communication/send-email - Send draft email to tenants
  app.post("/api/tenant-communication/send-email", isAuthenticated, async (req: any, res) => {
    try {
      const { messageId, sessionId } = req.body;
      const userId = req.user.claims.sub;
      
      // SECURITY: Verify session ownership
      const session = await storage.getTenantCommunicationChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (session.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized: You do not own this session' });
      }
      
      // Get the message with the draft email
      const messages = await storage.getTenantCommunicationChatHistory(sessionId);
      const message = messages.find(m => m.id === messageId);
      
      if (!message || !message.draftEmail) {
        return res.status(404).json({ error: 'Draft email not found' });
      }
      
      if (message.emailSent) {
        return res.status(400).json({ error: 'Email already sent' });
      }
      
      // Get tenant details
      const { sendGenericEmail } = await import("./email");
      const allTenancies = await storage.getAstTenancies();
      
      const recipientTenancies = allTenancies.filter(t => 
        message.draftEmail!.recipientIds.includes(t.id)
      );
      
      if (recipientTenancies.length === 0) {
        return res.status(400).json({ error: 'No valid recipients found' });
      }
      
      // Send emails to all recipients
      const results = [];
      for (const tenancy of recipientTenancies) {
        const result = await sendGenericEmail(
          tenancy.tenantEmail,
          message.draftEmail.subject,
          message.draftEmail.body
        );
        results.push({
          tenant: tenancy.tenantName,
          email: tenancy.tenantEmail,
          success: result.success,
          error: result.error,
        });
      }
      
      // Mark email as sent
      await storage.markEmailAsSent(messageId);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      res.json({
        success: failureCount === 0,
        successCount,
        failureCount,
        results,
      });
    } catch (error) {
      console.error('[TenantComm] Error sending email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // POST /api/tenant-communication/send-sms - Send draft SMS to tenants via Twilio
  app.post("/api/tenant-communication/send-sms", isAuthenticated, async (req: any, res) => {
    try {
      const { messageId, sessionId } = req.body;
      const userId = req.user.claims.sub;
      
      // SECURITY: Verify session ownership
      const session = await storage.getTenantCommunicationChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (session.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized: You do not own this session' });
      }
      
      // Get the message with the draft SMS
      const messages = await storage.getTenantCommunicationChatHistory(sessionId);
      const message = messages.find(m => m.id === messageId);
      
      if (!message || !message.draftSms) {
        return res.status(404).json({ error: 'Draft SMS not found' });
      }
      
      if (message.smsSent) {
        return res.status(400).json({ error: 'SMS already sent' });
      }
      
      // Get tenant details
      const allTenancies = await storage.getAstTenancies();
      
      const recipientTenancies = allTenancies.filter(t => 
        message.draftSms!.recipientIds.includes(t.id)
      );
      
      if (recipientTenancies.length === 0) {
        return res.status(400).json({ error: 'No valid recipients found' });
      }
      
      // Filter tenancies with phone numbers
      const recipientsWithPhones = recipientTenancies.filter(t => t.tenantPhone);
      
      if (recipientsWithPhones.length === 0) {
        return res.status(400).json({ 
          error: 'No recipients have phone numbers on file',
          details: 'Please update tenant contact information before sending SMS'
        });
      }
      
      // Send SMS to all recipients using Twilio
      const results = [];
      for (let i = 0; i < recipientsWithPhones.length; i++) {
        const tenancy = recipientsWithPhones[i];
        
        try {
          // Use Twilio sendGenericSMS
          const smsResult = await sendGenericSMS(
            tenancy.tenantPhone!,
            message.draftSms.message
          );
          
          if (smsResult.success) {
            results.push({
              tenant: tenancy.tenantName,
              phone: tenancy.tenantPhone,
              success: true,
            });
          } else {
            console.error('[TenantComm] Twilio error:', smsResult.error);
            results.push({
              tenant: tenancy.tenantName,
              phone: tenancy.tenantPhone,
              success: false,
              error: smsResult.error || 'Twilio API error',
            });
          }
        } catch (error: any) {
          console.error('[TenantComm] Error sending SMS to', tenancy.tenantName, ':', error);
          results.push({
            tenant: tenancy.tenantName,
            phone: tenancy.tenantPhone,
            success: false,
            error: error.message || 'Network error',
          });
        }
        
        // Rate limiting: wait 1 second between sends (except after the last one)
        if (i < recipientsWithPhones.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Mark SMS as sent
      await storage.markSmsAsSent(messageId);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      res.json({
        success: failureCount === 0,
        successCount,
        failureCount,
        results,
      });
    } catch (error) {
      console.error('[TenantComm] Error sending SMS:', error);
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  });

  // POST /api/tenant-communication/initiate-call - Get tenant phone number for calling
  app.post("/api/tenant-communication/initiate-call", isAuthenticated, async (req: any, res) => {
    try {
      const { tenantId } = req.body;
      const userId = req.user.claims.sub;
      
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }
      
      // Get tenant details
      const allTenancies = await storage.getAstTenancies();
      const tenancy = allTenancies.find(t => t.id === tenantId);
      
      if (!tenancy) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      if (!tenancy.tenantPhone) {
        return res.status(404).json({ 
          error: 'No phone number on file',
          details: 'This tenant does not have a phone number in the system'
        });
      }
      
      // Return phone number for click-to-call
      // In the future, this could integrate with JustCall's call API
      res.json({
        tenantName: tenancy.tenantName,
        phoneNumber: tenancy.tenantPhone,
        clickToCallUrl: `tel:${tenancy.tenantPhone}`,
      });
    } catch (error) {
      console.error('[TenantComm] Error initiating call:', error);
      res.status(500).json({ error: 'Failed to initiate call' });
    }
  });

  // ======== CLEANING STAFF ASSISTANT API ROUTES ========
  
  // POST /api/cleaning-staff-assistant/message - Send message and get AI response (authenticated)
  app.post('/api/cleaning-staff-assistant/message', isAuthenticated, cleaningStaffRateLimiter, validateChatMessage, async (req: any, res) => {
    try {
      const { sessionId, message } = req.body; // Already sanitized by middleware

      // Initialize conversation history for this session if it doesn't exist
      if (!conversationHistories[sessionId]) {
        conversationHistories[sessionId] = [];
      }

      // Use the new cleaning staff assistant service with portal data access
      const { processCleaningStaffMessage } = await import('./services/cleaning-staff-assistant');
      const assistantMessage = await processCleaningStaffMessage(
        conversationHistories[sessionId],
        message,
        storage
      );

      // Add user message to conversation (with sanitized content)
      conversationHistories[sessionId].push({
        role: 'user',
        content: message
      });

      // Add assistant response to conversation
      conversationHistories[sessionId].push({
        role: 'assistant',
        content: assistantMessage
      });

      // Keep conversation history manageable (last 20 messages)
      if (conversationHistories[sessionId].length > 20) {
        conversationHistories[sessionId] = conversationHistories[sessionId].slice(-20);
      }

      // Sanitize AI response before sending
      const sanitizedResponse = sanitizeAIResponse(assistantMessage);

      res.json({ response: sanitizedResponse });
    } catch (error: any) {
      console.error('Error in cleaning staff assistant:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // POST /api/public/cleaning-assistant/message - Public chatbot endpoint (no auth required)
  app.post('/api/public/cleaning-assistant/message', publicChatRateLimiter, validateChatMessage, async (req, res) => {
    try {
      const { sessionId, message, cleanerName } = req.body; // Already sanitized by middleware

      // Initialize conversation history for this session if it doesn't exist
      if (!conversationHistories[sessionId]) {
        conversationHistories[sessionId] = [];
      }

      // Use the new cleaning staff assistant service with portal data access
      const { processCleaningStaffMessage } = await import('./services/cleaning-staff-assistant');
      const assistantMessage = await processCleaningStaffMessage(
        conversationHistories[sessionId],
        message,
        storage
      );

      // Add user message to conversation (with sanitized content)
      conversationHistories[sessionId].push({
        role: 'user',
        content: message
      });

      // Add assistant response to conversation
      conversationHistories[sessionId].push({
        role: 'assistant',
        content: assistantMessage
      });

      // Keep conversation history manageable (last 20 messages)
      if (conversationHistories[sessionId].length > 20) {
        conversationHistories[sessionId] = conversationHistories[sessionId].slice(-20);
      }

      // Sanitize AI response before sending
      const sanitizedResponse = sanitizeAIResponse(assistantMessage);

      res.json({ response: sanitizedResponse });
    } catch (error: any) {
      console.error('Error in public cleaning assistant:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // GET /api/cleaning-assistant/qr-code - Generate QR code for cleaners chatbot (authenticated)
  app.get('/api/cleaning-assistant/qr-code', isAuthenticated, async (req: any, res) => {
    try {
      const QRCode = await import('qrcode');
      
      // Get the base URL from the request
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const chatbotUrl = `${baseUrl}/cleaning-assistant-public`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(chatbotUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 400,
        margin: 2,
      });

      res.json({ 
        qrCode: qrCodeDataUrl, 
        url: chatbotUrl 
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });

  // ======== LINEN PACKING LISTS API ROUTES ========

  // GET /api/linen-packing-lists - Get all linen packing lists
  app.get('/api/linen-packing-lists', isAuthenticated, async (req: any, res) => {
    try {
      const lists = await storage.getLinenPackingLists();
      res.json(lists);
    } catch (error) {
      console.error('Error fetching linen packing lists:', error);
      res.status(500).json({ error: 'Failed to fetch linen packing lists' });
    }
  });

  // GET /api/linen-packing-lists/:id - Get a single linen packing list
  app.get('/api/linen-packing-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const list = await storage.getLinenPackingList(id);
      if (!list) {
        return res.status(404).json({ error: 'Linen packing list not found' });
      }
      res.json(list);
    } catch (error) {
      console.error('Error fetching linen packing list:', error);
      res.status(500).json({ error: 'Failed to fetch linen packing list' });
    }
  });

  // POST /api/linen-packing-lists - Create a new linen packing list
  app.post('/api/linen-packing-lists', isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertLinenPackingListSchema.parse(req.body);
      const list = await storage.createLinenPackingList(validatedData);
      res.status(201).json(list);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating linen packing list:', error);
      res.status(500).json({ error: 'Failed to create linen packing list' });
    }
  });

  // PATCH /api/linen-packing-lists/:id - Update a linen packing list
  app.patch('/api/linen-packing-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const list = await storage.updateLinenPackingList(id, req.body);
      res.json(list);
    } catch (error) {
      console.error('Error updating linen packing list:', error);
      res.status(500).json({ error: 'Failed to update linen packing list' });
    }
  });

  // DELETE /api/linen-packing-lists/:id - Delete a linen packing list
  app.delete('/api/linen-packing-lists/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteLinenPackingList(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting linen packing list:', error);
      res.status(500).json({ error: 'Failed to delete linen packing list' });
    }
  });

  // ======== WEEKLY ROTA TASKS API ROUTES ========

  // GET /api/weekly-rota/tasks - Get all weekly rota tasks
  app.get('/api/weekly-rota/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const tasks = await storage.getWeeklyRotaTasks();
      
      // Map day numbers to day names for frontend
      const dayMapping: Record<number, string> = {
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
        7: 'Sunday',
      };
      
      // Transform tasks to frontend format
      const responseTasks = tasks.map(task => ({
        ...task,
        day: dayMapping[task.dayOfWeek] || 'Monday',
        time: task.timeSlot,
        task: task.taskName,
        responsible: task.assignedToName,
        checkMethod: task.metadata?.checkMethod || '',
        isActive: task.metadata?.isActive !== false,
      }));
      
      res.json(responseTasks);
    } catch (error) {
      console.error('Error fetching weekly rota tasks:', error);
      res.status(500).json({ error: 'Failed to fetch weekly rota tasks' });
    }
  });

  // POST /api/weekly-rota/import-csv - Import tasks from CSV file
  app.post('/api/weekly-rota/import-csv', isAuthenticated, async (req: any, res) => {
    try {
      console.log('[Weekly Rota Import] Starting CSV import...');
      
      const PapaModule = await import('papaparse');
      const Papa = PapaModule.default || PapaModule;
      console.log('[Weekly Rota Import] Papa module imported, has parse:', typeof Papa.parse);
      
      const fs = await import('fs');
      const path = await import('path');
      console.log('[Weekly Rota Import] FS modules imported');
      
      // Read the CSV file
      const csvPath = path.join(process.cwd(), 'attached_assets', 'Northstay_Stays_Weekly_Rota_v2_1761418849962.csv');
      console.log('[Weekly Rota Import] CSV path:', csvPath);
      
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      console.log('[Weekly Rota Import] CSV content read, length:', csvContent.length);
      
      // Parse CSV
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });
      
      console.log('[Weekly Rota Import] CSV parsed, row count:', parsed.data.length);
      console.log('[Weekly Rota Import] Parse errors:', parsed.errors);
      console.log('[Weekly Rota Import] Headers:', parsed.meta?.fields);
      console.log('[Weekly Rota Import] First row sample:', JSON.stringify(parsed.data[0]));
      
      // Transform CSV data to match our schema
      const tasks = parsed.data.map((row: any, index: number) => {
        const task = {
          day: row.Day?.trim() || row.day?.trim(),
          time: row.Time?.trim() || row.time?.trim(),
          task: row.Task?.trim() || row.task?.trim(),
          responsible: row.Responsible?.trim() || row.responsible?.trim(),
          checkMethod: row['Check Method']?.trim() || row['check method']?.trim() || row.checkMethod?.trim(),
          isActive: true,
        };
        
        // Debug first few tasks
        if (index < 5) {
          console.log(`[Weekly Rota Import] Task ${index}:`, JSON.stringify(task));
        }
        
        return task;
      });
      
      console.log('[Weekly Rota Import] Tasks transformed, count:', tasks.length);
      console.log('[Weekly Rota Import] Day distribution:', tasks.reduce((acc: Record<string, number>, t: any) => {
        acc[t.day || 'undefined'] = (acc[t.day || 'undefined'] || 0) + 1;
        return acc;
      }, {}));
      
      // Clear existing tasks and insert new ones
      console.log('[Weekly Rota Import] Deleting existing tasks...');
      await storage.deleteAllWeeklyRotaTasks();
      console.log('[Weekly Rota Import] Existing tasks cleared');
      
      console.log('[Weekly Rota Import] Calling bulkCreateWeeklyRotaTasks...');
      const created = await storage.bulkCreateWeeklyRotaTasks(tasks);
      console.log('[Weekly Rota Import] Tasks created successfully, count:', created.length);
      
      res.json({ 
        message: 'CSV imported successfully', 
        count: created.length,
        tasks: created 
      });
    } catch (error) {
      console.error('[Weekly Rota Import] ERROR:', error);
      console.error('[Weekly Rota Import] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        error: 'Failed to import CSV data',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // POST /api/weekly-rota/tasks - Create a new weekly rota task
  app.post('/api/weekly-rota/tasks', isAuthenticated, async (req: any, res) => {
    try {
      // Map frontend form fields to database fields
      const dayMapping: Record<string, number> = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
        Sunday: 7,
      };

      const formData = req.body;
      
      // Calculate start of current week (Monday)
      const getWeekStart = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
      };
      
      // Transform form fields to match database schema
      const dbData = {
        weekStartDate: formData.weekStartDate || getWeekStart(),
        taskType: formData.taskType || 'recurring',
        taskName: formData.task || formData.taskName, // Support both field names
        assignedToName: formData.responsible || formData.assignedToName,
        dayOfWeek: formData.day ? dayMapping[formData.day] : formData.dayOfWeek,
        timeSlot: formData.time || formData.timeSlot,
        duration: formData.duration || 60,
        status: formData.status || 'pending',
        notes: formData.notes,
        metadata: {
          checkMethod: formData.checkMethod,
          isActive: formData.isActive !== undefined ? formData.isActive : true,
          ...(formData.metadata || {}),
        },
      };

      console.log('[Create Task] Transformed data:', JSON.stringify(dbData, null, 2));

      const validated = insertWeeklyRotaTaskSchema.parse(dbData);
      const task = await storage.createWeeklyRotaTask(validated);
      
      // Transform response back to frontend format
      const responseTask = {
        ...task,
        day: Object.keys(dayMapping).find(key => dayMapping[key] === task.dayOfWeek) || 'Monday',
        time: task.timeSlot,
        task: task.taskName,
        responsible: task.assignedToName,
        checkMethod: task.metadata?.checkMethod || '',
        isActive: task.metadata?.isActive !== false,
      };
      
      res.status(201).json(responseTask);
    } catch (error) {
      console.error('Error creating weekly rota task:', error);
      if (error instanceof z.ZodError) {
        console.error('Validation errors:', JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create weekly rota task', details: error instanceof Error ? error.message : String(error) });
    }
  });

  // PATCH /api/weekly-rota/tasks/:id - Update a weekly rota task
  app.patch('/api/weekly-rota/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Map frontend form fields to database fields
      const dayMapping: Record<string, number> = {
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6,
        Sunday: 7,
      };

      const formData = req.body;
      const dbData: any = {};
      
      // Only map fields that are present in the update request
      if (formData.weekStartDate !== undefined) dbData.weekStartDate = formData.weekStartDate;
      if (formData.taskType !== undefined) dbData.taskType = formData.taskType;
      if (formData.task !== undefined) dbData.taskName = formData.task;
      if (formData.taskName !== undefined) dbData.taskName = formData.taskName;
      if (formData.responsible !== undefined) dbData.assignedToName = formData.responsible;
      if (formData.assignedToName !== undefined) dbData.assignedToName = formData.assignedToName;
      if (formData.day !== undefined) dbData.dayOfWeek = dayMapping[formData.day];
      if (formData.dayOfWeek !== undefined) dbData.dayOfWeek = formData.dayOfWeek;
      if (formData.time !== undefined) dbData.timeSlot = formData.time;
      if (formData.timeSlot !== undefined) dbData.timeSlot = formData.timeSlot;
      if (formData.duration !== undefined) dbData.duration = formData.duration;
      if (formData.status !== undefined) dbData.status = formData.status;
      if (formData.notes !== undefined) dbData.notes = formData.notes;
      
      // Handle metadata fields
      if (formData.checkMethod !== undefined || formData.isActive !== undefined) {
        const existingTask = await storage.getWeeklyRotaTasks().then(tasks => tasks.find(t => t.id === id));
        dbData.metadata = {
          ...(existingTask?.metadata || {}),
          ...(formData.metadata || {}),
        };
        if (formData.checkMethod !== undefined) dbData.metadata.checkMethod = formData.checkMethod;
        if (formData.isActive !== undefined) dbData.metadata.isActive = formData.isActive;
      }

      const validated = insertWeeklyRotaTaskSchema.partial().parse(dbData);
      const task = await storage.updateWeeklyRotaTask(id, validated);
      
      // Transform response back to frontend format
      const responseTask = {
        ...task,
        day: Object.keys(dayMapping).find(key => dayMapping[key] === task.dayOfWeek) || 'Monday',
        time: task.timeSlot,
        task: task.taskName,
        responsible: task.assignedToName,
        checkMethod: task.metadata?.checkMethod || '',
        isActive: task.metadata?.isActive !== false,
      };
      
      res.json(responseTask);
    } catch (error) {
      console.error('Error updating weekly rota task:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to update weekly rota task' });
    }
  });

  // DELETE /api/weekly-rota/tasks/:id - Delete a weekly rota task
  app.delete('/api/weekly-rota/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWeeklyRotaTask(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting weekly rota task:', error);
      res.status(500).json({ error: 'Failed to delete weekly rota task' });
    }
  });

  // ======== TRAINING VIDEOS API ROUTES ========

  // GET /api/training/videos - List all active videos
  app.get("/api/training/videos", isAuthenticated, async (req: any, res) => {
    try {
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      
      // Deny access if no staff record found
      if (!staff) {
        console.warn(`Training videos access denied - no staff record for email: ${req.user.claims.email}`);
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'Staff record not found. Please contact an administrator.'
        });
      }
      
      const videos = await storage.getTrainingVideos();
      
      // Filter by visibility if not admin
      if (!staff.isAdmin) {
        const filteredVideos = videos.filter(video => 
          !video.visibleToStaffIds || 
          video.visibleToStaffIds.length === 0 || 
          video.visibleToStaffIds.includes(staff.id)
        );
        return res.json(filteredVideos);
      }
      
      // Admins see all videos
      res.json(videos);
    } catch (error) {
      console.error('Error fetching training videos:', error);
      res.status(500).json({ error: 'Failed to fetch training videos' });
    }
  });

  // GET /api/training/videos/:id - Get single video with completion data
  app.get("/api/training/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const video = await storage.getTrainingVideo(id);
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }

      const completions = await storage.getTrainingCompletions(id);
      res.json({ video, completions });
    } catch (error) {
      console.error('Error fetching training video:', error);
      res.status(500).json({ error: 'Failed to fetch training video' });
    }
  });

  // POST /api/training/videos - Create new video (ADMIN ONLY)
  app.post("/api/training/videos", isAuthenticated, async (req: any, res) => {
    try {
      // Get staff from authenticated user
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      // Check admin status
      if (!staff.isAdmin) {
        return res.status(403).json({ 
          error: "Forbidden",
          message: "Only administrators can manage training videos"
        });
      }

      const validatedData = insertTrainingVideoSchema.parse(req.body);

      const video = await storage.createTrainingVideo({
        ...validatedData,
        uploadedBy: staff.id,
      });

      res.status(201).json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating training video:', error);
      res.status(500).json({ error: 'Failed to create training video' });
    }
  });

  // PATCH /api/training/videos/:id - Update video (ADMIN ONLY)
  app.patch("/api/training/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get staff from authenticated user
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      // Check admin status
      if (!staff.isAdmin) {
        return res.status(403).json({ 
          error: "Forbidden",
          message: "Only administrators can manage training videos"
        });
      }

      const { id } = req.params;
      const validatedData = insertTrainingVideoSchema.partial().parse(req.body);

      const video = await storage.updateTrainingVideo(id, validatedData);
      res.json(video);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating training video:', error);
      res.status(500).json({ error: 'Failed to update training video' });
    }
  });

  // DELETE /api/training/videos/:id - Delete video (ADMIN ONLY)
  app.delete("/api/training/videos/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Get staff from authenticated user
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      // Check admin status
      if (!staff.isAdmin) {
        return res.status(403).json({ 
          error: "Forbidden",
          message: "Only administrators can manage training videos"
        });
      }

      const { id } = req.params;
      await storage.deleteTrainingVideo(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting training video:', error);
      res.status(500).json({ error: 'Failed to delete training video' });
    }
  });

  // POST /api/training/upload-video - Upload video file (ADMIN ONLY)
  app.post("/api/training/upload-video", isAuthenticated, async (req: any, res) => {
    try {
      // Get staff from authenticated user
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      // Check admin status
      if (!staff.isAdmin) {
        return res.status(403).json({ 
          error: "Forbidden",
          message: "Only administrators can upload training videos"
        });
      }

      // Setup multer for file upload
      const upload = multer({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: 500 * 1024 * 1024, // 500MB limit
        },
        fileFilter: (req, file, cb) => {
          const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
          if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error('Invalid file type. Only MP4, WebM, OGG, and MOV files are allowed.'));
          }
        },
      });

      // Process upload
      upload.single('video')(req, res, async (err: any) => {
        if (err) {
          console.error('Multer error:', err);
          return res.status(400).json({ error: err.message || 'Failed to process upload' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No video file provided' });
        }

        try {
          // Upload to Google Cloud Storage
          const filename = `training-videos/${Date.now()}-${req.file.originalname}`;
          const url = await uploadToGCS(req.file.buffer, filename, req.file.mimetype);

          res.json({ 
            url,
            filename: req.file.originalname,
            size: req.file.size
          });
        } catch (uploadError) {
          console.error('GCS upload error:', uploadError);
          res.status(500).json({ error: 'Failed to upload video to storage' });
        }
      });
    } catch (error) {
      console.error('Error handling video upload:', error);
      res.status(500).json({ error: 'Failed to handle video upload' });
    }
  });

  // POST /api/training/videos/:id/complete - Log completion
  app.post("/api/training/videos/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      
      // Find staff by ID or email
      let staff = await storage.getStaff(userId);
      if (!staff) {
        staff = await storage.getStaffByEmail(email);
      }

      if (!staff) {
        return res.status(404).json({ error: 'Staff member not found' });
      }

      const completion = await storage.logTrainingCompletion(id, staff.id, staff.fullName);
      res.status(201).json(completion);
    } catch (error) {
      console.error('Error logging training completion:', error);
      res.status(500).json({ error: 'Failed to log training completion' });
    }
  });

  // GET /api/training/completions/:videoId - Get completions for a video
  app.get("/api/training/completions/:videoId", isAuthenticated, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const completions = await storage.getTrainingCompletions(videoId);
      res.json(completions);
    } catch (error) {
      console.error('Error fetching training completions:', error);
      res.status(500).json({ error: 'Failed to fetch training completions' });
    }
  });

  // GET /api/training/analytics - Get training analytics dashboard data (ADMIN ONLY)
  app.get("/api/training/analytics", isAuthenticated, async (req: any, res) => {
    try {
      // Get staff from authenticated user
      const staff = await storage.getStaffByEmail(req.user.claims.email);
      
      if (!staff) {
        return res.status(404).json({ error: "Staff member not found" });
      }
      
      // Check admin status
      if (!staff.isAdmin) {
        return res.status(403).json({ 
          error: "Forbidden",
          message: "Only administrators can view training analytics"
        });
      }

      const analytics = await storage.getTrainingAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching training analytics:', error);
      res.status(500).json({ error: 'Failed to fetch training analytics' });
    }
  });

  // GET /api/training/my-history - Get current user's training history
  app.get("/api/training/my-history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      
      // Find staff by ID or email
      let staff = await storage.getStaff(userId);
      if (!staff) {
        staff = await storage.getStaffByEmail(email);
      }

      if (!staff) {
        return res.json([]);
      }

      const history = await storage.getStaffTrainingHistory(staff.id);
      res.json(history);
    } catch (error) {
      console.error('Error fetching training history:', error);
      res.status(500).json({ error: 'Failed to fetch training history' });
    }
  });

  // ======== KNOWLEDGE BASE API ROUTES ========

  // GET /api/knowledge-base - Get all knowledge base entries (with optional chatbotType filter)
  app.get("/api/knowledge-base", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotType = req.query.chatbotType as string | undefined;
      const entries = await storage.getAllKnowledgeBaseEntries(chatbotType);
      res.json(entries);
    } catch (error) {
      console.error('Error fetching knowledge base entries:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base entries' });
    }
  });

  // GET /api/knowledge-base/active - Get only active knowledge base entries (with optional chatbotType filter)
  app.get("/api/knowledge-base/active", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotType = req.query.chatbotType as string | undefined;
      const entries = await storage.getActiveKnowledgeBaseEntries(chatbotType);
      res.json(entries);
    } catch (error) {
      console.error('Error fetching active knowledge base entries:', error);
      res.status(500).json({ error: 'Failed to fetch active knowledge base entries' });
    }
  });

  // GET /api/knowledge-base/:id - Get specific knowledge base entry
  app.get("/api/knowledge-base/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.getKnowledgeBaseEntry(id);
      
      if (!entry) {
        return res.status(404).json({ error: 'Knowledge base entry not found' });
      }
      
      res.json(entry);
    } catch (error) {
      console.error('Error fetching knowledge base entry:', error);
      res.status(500).json({ error: 'Failed to fetch knowledge base entry' });
    }
  });

  // POST /api/knowledge-base - Create new knowledge base entry
  app.post("/api/knowledge-base", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      
      // Get staff info for attribution
      let staff = await storage.getStaff(userId);
      if (!staff) {
        staff = await storage.getStaffByEmail(email);
      }

      const validatedData = insertKnowledgeBaseEntrySchema.parse(req.body);

      const entry = await storage.createKnowledgeBaseEntry({
        ...validatedData,
        uploadedBy: staff?.id || userId,
        uploadedByName: staff?.fullName || email,
      });

      res.status(201).json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating knowledge base entry:', error);
      res.status(500).json({ error: 'Failed to create knowledge base entry' });
    }
  });

  // PATCH /api/knowledge-base/:id - Update knowledge base entry
  app.patch("/api/knowledge-base/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const entry = await storage.updateKnowledgeBaseEntry(id, updates);
      res.json(entry);
    } catch (error) {
      console.error('Error updating knowledge base entry:', error);
      res.status(500).json({ error: 'Failed to update knowledge base entry' });
    }
  });

  // DELETE /api/knowledge-base/:id - Delete knowledge base entry
  app.delete("/api/knowledge-base/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteKnowledgeBaseEntry(id);
      res.json({ success: true, message: 'Knowledge base entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting knowledge base entry:', error);
      res.status(500).json({ error: 'Failed to delete knowledge base entry' });
    }
  });

  // POST /api/knowledge-base/generate - Auto-generate knowledge from portal data
  app.post("/api/knowledge-base/generate", isAuthenticated, async (req: any, res) => {
    try {
      const { chatbotType } = req.body;
      if (!chatbotType) {
        return res.status(400).json({ error: 'chatbotType is required' });
      }
      const result = await storage.generateKnowledgeFromPortalData(chatbotType);
      res.json(result);
    } catch (error) {
      console.error('Error generating knowledge from portal data:', error);
      res.status(500).json({ error: 'Failed to generate knowledge from portal data' });
    }
  });

  // ======== BULK KNOWLEDGE UPLOAD ROUTES ========

  // POST /api/knowledge-base/bulk-upload - Upload multiple files with AI extraction
  app.post("/api/knowledge-base/bulk-upload", isAuthenticated, async (req: any, res) => {
    const multerImport = await import("multer");
    const upload = multerImport.default({ storage: multerImport.default.memoryStorage() });
    
    upload.array('files', 10)(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ error: 'File upload failed', details: err.message });
      }

    try {
      const userId = req.user.claims.sub;
      const email = req.user.claims.email;
      const files = req.files as Express.Multer.File[];
      const { chatbotType } = req.body;

      if (!chatbotType) {
        return res.status(400).json({ error: 'chatbotType is required' });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      // Get staff info for attribution
      const staffMember = await storage.getStaffByEmail(email);
      const uploadedByName = staffMember ? staffMember.fullName : email;

      const { knowledgeUploadService } = await import('./services/knowledge-upload');
      const { processFileForKnowledge } = await import('./services/knowledge-extraction');

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          console.log(`[BULK-UPLOAD] Processing file: ${file.originalname}`);

          // Step 1: Upload to GCS
          const uploadedFile = await knowledgeUploadService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            chatbotType
          );

          console.log(`[BULK-UPLOAD] File uploaded to GCS: ${uploadedFile.fileUrl}`);

          // Step 2: Extract and analyze content with AI
          const extractedData = await processFileForKnowledge(
            file.buffer,
            uploadedFile.fileType,
            file.originalname,
            chatbotType
          );

          console.log(`[BULK-UPLOAD] Content extracted and analyzed for ${file.originalname}`);

          // Step 3: Create pending upload
          const pendingUpload = await storage.createPendingKnowledgeUpload({
            chatbotType,
            storageKey: uploadedFile.storageKey,
            fileUrl: uploadedFile.fileUrl,
            originalFileName: uploadedFile.originalFileName,
            fileType: uploadedFile.fileType,
            extractedContent: extractedData.extractedContent,
            suggestedTitle: extractedData.suggestedTitle,
            suggestedCategory: extractedData.suggestedCategory,
            suggestedTags: extractedData.suggestedTags,
            confidenceScore: extractedData.confidenceScore,
            needsClarification: extractedData.needsClarification,
            clarificationQuestion: extractedData.clarificationQuestion,
            status: extractedData.needsClarification ? 'needs_clarification' : 'pending',
            uploadedBy: userId,
            uploadedByName,
          });

          console.log(`[BULK-UPLOAD] Created pending upload: ${pendingUpload.id}`);

          results.push({
            fileName: file.originalname,
            success: true,
            pendingUploadId: pendingUpload.id,
            needsClarification: extractedData.needsClarification,
          });
        } catch (fileError: any) {
          console.error(`[BULK-UPLOAD] Error processing ${file.originalname}:`, fileError);
          errors.push({
            fileName: file.originalname,
            error: fileError.message || 'Unknown error',
          });
        }
      }

      res.json({
        success: results.length > 0,
        processed: results.length,
        failed: errors.length,
        results,
        errors,
      });
    } catch (error: any) {
      console.error('Error in bulk upload:', error);
      res.status(500).json({ error: 'Failed to process bulk upload', details: error.message });
    }
    });
  });

  // GET /api/knowledge-base/pending - Get all pending uploads
  app.get("/api/knowledge-base/pending", isAuthenticated, async (req: any, res) => {
    try {
      const chatbotType = req.query.chatbotType as string | undefined;
      const pending = await storage.getPendingKnowledgeUploads(chatbotType);
      res.json(pending);
    } catch (error) {
      console.error('Error fetching pending uploads:', error);
      res.status(500).json({ error: 'Failed to fetch pending uploads' });
    }
  });

  // GET /api/knowledge-base/pending/:id - Get specific pending upload
  app.get("/api/knowledge-base/pending/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const pending = await storage.getPendingKnowledgeUpload(id);
      
      if (!pending) {
        return res.status(404).json({ error: 'Pending upload not found' });
      }
      
      res.json(pending);
    } catch (error) {
      console.error('Error fetching pending upload:', error);
      res.status(500).json({ error: 'Failed to fetch pending upload' });
    }
  });

  // PATCH /api/knowledge-base/pending/:id - Update pending upload
  app.patch("/api/knowledge-base/pending/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const pending = await storage.updatePendingKnowledgeUpload(id, updates);
      res.json(pending);
    } catch (error) {
      console.error('Error updating pending upload:', error);
      res.status(500).json({ error: 'Failed to update pending upload' });
    }
  });

  // POST /api/knowledge-base/pending/:id/approve - Approve and convert to knowledge entry
  app.post("/api/knowledge-base/pending/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { title, category, tags } = req.body;

      if (!title || !category || !tags) {
        return res.status(400).json({ error: 'title, category, and tags are required' });
      }

      const knowledgeEntry = await storage.approvePendingUpload(id, {
        title,
        category,
        tags,
      });

      res.json({
        success: true,
        knowledgeEntry,
      });
    } catch (error: any) {
      console.error('Error approving pending upload:', error);
      res.status(500).json({ error: 'Failed to approve pending upload', details: error.message });
    }
  });

  // DELETE /api/knowledge-base/pending/:id - Reject/delete pending upload
  app.delete("/api/knowledge-base/pending/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePendingKnowledgeUpload(id);
      res.json({ success: true, message: 'Pending upload rejected and deleted' });
    } catch (error) {
      console.error('Error deleting pending upload:', error);
      res.status(500).json({ error: 'Failed to delete pending upload' });
    }
  });

  // POST /api/knowledge-base/pending/:id/refresh-url - Regenerate signed URL for pending upload
  app.post("/api/knowledge-base/pending/:id/refresh-url", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const pending = await storage.getPendingKnowledgeUpload(id);
      
      if (!pending) {
        return res.status(404).json({ error: 'Pending upload not found' });
      }

      const { knowledgeUploadService } = await import('./services/knowledge-upload');
      const freshUrl = await knowledgeUploadService.getSignedDownloadURL(pending.storageKey);
      
      // Update the pending upload with fresh URL
      await storage.updatePendingKnowledgeUpload(id, { fileUrl: freshUrl });
      
      res.json({ fileUrl: freshUrl });
    } catch (error) {
      console.error('Error refreshing signed URL:', error);
      res.status(500).json({ error: 'Failed to refresh signed URL' });
    }
  });

  // ======== OPENAI VISION API ROUTES ========

  // POST /api/openai/vision - Extract text from image using OpenAI Vision API
  app.post("/api/openai/vision", isAuthenticated, async (req: any, res) => {
    try {
      const { image, prompt } = req.body;

      if (!image || typeof image !== 'string') {
        return res.status(400).json({ error: 'Image data (base64) is required' });
      }

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      // Validate base64 image format
      if (!image.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format. Must be base64 data URL' });
      }

      const { OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 2000,
      });

      const extractedText = completion.choices[0]?.message?.content || '';

      res.json({ text: extractedText });
    } catch (error: any) {
      console.error('Error in OpenAI Vision API:', error);
      res.status(500).json({ error: 'Failed to extract text from image', details: error.message });
    }
  });

  // ======== PROPERTY ONBOARDING API ROUTES ========

  // POST /api/property-onboarding/session - Create new onboarding session
  app.post("/api/property-onboarding/session", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyName, address } = req.body;
      const userId = req.user.claims.sub;
      
      const session = await storage.createPropertyOnboardingSession({
        propertyName,
        address: address || null,
        createdBy: userId,
        status: 'in_progress',
        currentStep: 1,
        totalSteps: 7,
      });
      
      res.status(201).json(session);
    } catch (error) {
      console.error('Error creating onboarding session:', error);
      res.status(500).json({ error: 'Failed to create onboarding session' });
    }
  });

  // GET /api/property-onboarding/sessions - Get all onboarding sessions
  app.get("/api/property-onboarding/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const sessions = await storage.getAllPropertyOnboardingSessions();
      res.json(sessions);
    } catch (error) {
      console.error('Error fetching onboarding sessions:', error);
      res.status(500).json({ error: 'Failed to fetch onboarding sessions' });
    }
  });

  // GET /api/property-onboarding/session/:id - Get specific onboarding session
  app.get("/api/property-onboarding/session/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getPropertyOnboardingSession(id);
      
      if (!session) {
        return res.status(404).json({ error: 'Onboarding session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error('Error fetching onboarding session:', error);
      res.status(500).json({ error: 'Failed to fetch onboarding session' });
    }
  });

  // GET /api/property-onboarding/responses/:sessionId - Get all responses for a session
  app.get("/api/property-onboarding/responses/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      const responses = await storage.getPropertyOnboardingResponses(sessionId);
      res.json(responses);
    } catch (error) {
      console.error('Error fetching onboarding responses:', error);
      res.status(500).json({ error: 'Failed to fetch onboarding responses' });
    }
  });

  // POST /api/property-onboarding/response - Save onboarding response
  app.post("/api/property-onboarding/response", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId, step, questionKey, questionText, answer, answerType } = req.body;
      
      const response = await storage.savePropertyOnboardingResponse({
        sessionId,
        step,
        questionKey,
        questionText,
        answer: answer || null,
        answerType: answerType || 'text',
      });
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error saving onboarding response:', error);
      res.status(500).json({ error: 'Failed to save onboarding response' });
    }
  });

  // PATCH /api/property-onboarding/session/:id - Update onboarding session
  app.patch("/api/property-onboarding/session/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const session = await storage.updatePropertyOnboardingSession(id, updates);
      res.json(session);
    } catch (error) {
      console.error('Error updating onboarding session:', error);
      res.status(500).json({ error: 'Failed to update onboarding session' });
    }
  });

  // POST /api/property-onboarding/complete/:sessionId - Complete onboarding and create property
  app.post("/api/property-onboarding/complete/:sessionId", isAuthenticated, async (req: any, res) => {
    try {
      const { sessionId } = req.params;
      
      // Get all responses to create the property
      const responses = await storage.getPropertyOnboardingResponses(sessionId);
      const session = await storage.getPropertyOnboardingSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: 'Onboarding session not found' });
      }
      
      // Create property with the onboarded data
      const property = await storage.createProperty({
        name: session.propertyName,
        address: session.address || '',
        active: true,
      });
      
      // Mark session as completed
      const completedSession = await storage.completePropertyOnboardingSession(sessionId, property.id);
      
      res.json({ session: completedSession, property });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      res.status(500).json({ error: 'Failed to complete onboarding' });
    }
  });

  // POST /api/property-onboarding/extract - AI extraction from listing text and check-in document
  app.post("/api/property-onboarding/extract", isAuthenticated, async (req: any, res) => {
    try {
      const multerImport = await import("multer");
      const { extractPropertyData, extractTextFromDocument } = await import("./services/property-extraction");
      
      const upload = multerImport.default({ storage: multerImport.default.memoryStorage() });
      
      upload.single('checkInDetailsFile')(req, res, async (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ error: 'File upload failed' });
        }
        
        try {
          const { 
            listingDescription, 
            airbnbLink, 
            bookingComLink, 
            otherPlatformLinks 
          } = req.body;
          
          let checkInDetailsText: string | null = null;
          
          // Extract text from uploaded file if provided
          if (req.file) {
            console.log('[Property Extraction] Processing uploaded file:', req.file.originalname);
            checkInDetailsText = await extractTextFromDocument(
              req.file.buffer,
              req.file.originalname,
              req.file.mimetype
            );
          }
          
          // Run AI extraction
          console.log('[Property Extraction] Running AI extraction...');
          const extractedData = await extractPropertyData(
            listingDescription || null,
            checkInDetailsText,
            {
              airbnbLink,
              bookingComLink,
              otherPlatformLinks,
            }
          );
          
          res.json({
            success: true,
            extractedData,
            hasFile: !!req.file,
            fileName: req.file?.originalname || null,
          });
        } catch (error) {
          console.error('Error in AI extraction:', error);
          res.status(500).json({ 
            error: 'AI extraction failed', 
            message: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });
    } catch (error) {
      console.error('Error setting up extraction:', error);
      res.status(500).json({ error: 'Extraction setup failed' });
    }
  });

  // ======== MANAGEMENT CONTRACTS API ROUTES ========

  // POST /api/contracts/upload - Upload and analyze contract
  app.post("/api/contracts/upload", isAuthenticated, async (req: any, res) => {
    try {
      const multerImport = await import("multer");
      const { Storage } = await import("@google-cloud/storage");
      const { analyzeManagementContract } = await import("./services/contract-analysis");
      
      const upload = multerImport.default({ storage: multerImport.default.memoryStorage() });
      
      upload.single('contract')(req, res, async (err) => {
        if (err) {
          console.error('Upload error:', err);
          return res.status(400).json({ error: 'File upload failed' });
        }
        
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
        
        try {
          const { propertyId, propertyName, ownerName, ownerEmail, ownerPhone } = req.body;
          const userId = req.user.claims.sub;
          
          // Parse PDF to extract text for AI analysis
          console.log('[Contract Upload] Parsing PDF...');
          // Dynamic import for ESM compatibility - pdf-parse exports function directly
          const pdfParse = await import('pdf-parse') as any;
          const data = await pdfParse(req.file.buffer);
          const contractText = data.text;
          
          // Upload to Google Cloud Storage
          console.log('[Contract Upload] Uploading to Google Cloud Storage...');
          const storage = new Storage();
          const bucketName = process.env.GCS_BUCKET_NAME || 'staffflow-contracts';
          const bucket = storage.bucket(bucketName);
          
          const timestamp = Date.now();
          const fileName = `${timestamp}-${req.file.originalname}`;
          const file = bucket.file(`contracts/${fileName}`);
          
          await file.save(req.file.buffer, {
            contentType: req.file.mimetype,
            metadata: {
              originalName: req.file.originalname,
              uploadedBy: userId,
            },
          });
          
          const fileStoragePath = `gs://${bucketName}/contracts/${fileName}`;
          
          // Save contract metadata to database
          const contract = await storage.createManagementContract({
            propertyId: propertyId || null,
            propertyName: propertyName || 'Unknown Property',
            contractName: req.file.originalname,
            fileName: req.file.originalname,
            fileStoragePath,
            fileSize: req.file.size,
            uploadedBy: userId,
            ownerName: ownerName || null,
            ownerEmail: ownerEmail || null,
            ownerPhone: ownerPhone || null,
            analysisCompleted: false,
            status: 'active',
          });
          
          // Start AI analysis in background (don't block response)
          analyzeManagementContract(contractText, req.file.originalname)
            .then(async (analysisResult) => {
              await storage.updateContractAnalysis(contract.id, {
                analysisCompleted: true,
                ...analysisResult,
              });
              console.log(`[Contract Analysis] Analysis complete for contract ${contract.id}`);
            })
            .catch((error) => {
              console.error(`[Contract Analysis] Analysis failed for contract ${contract.id}:`, error);
              storage.updateContractAnalysis(contract.id, {
                analysisCompleted: true,
                isLegallyValid: false,
                legalAnalysisNotes: `Analysis failed: ${error.message}`,
                aiAnalysisSummary: 'Automatic analysis could not be completed. Please review manually.',
              });
            });
          
          res.status(201).json(contract);
        } catch (error) {
          console.error('Contract processing error:', error);
          res.status(500).json({ error: 'Failed to process contract' });
        }
      });
    } catch (error) {
      console.error('Error in contract upload:', error);
      res.status(500).json({ error: 'Failed to upload contract' });
    }
  });

  // GET /api/contracts - Get all contracts
  app.get("/api/contracts", isAuthenticated, async (req: any, res) => {
    try {
      const contracts = await storage.getAllManagementContracts();
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      res.status(500).json({ error: 'Failed to fetch contracts' });
    }
  });

  // GET /api/contracts/:id - Get specific contract
  app.get("/api/contracts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.getManagementContract(id);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      res.json(contract);
    } catch (error) {
      console.error('Error fetching contract:', error);
      res.status(500).json({ error: 'Failed to fetch contract' });
    }
  });

  // GET /api/contracts/property/:propertyId - Get contracts for a property
  app.get("/api/contracts/property/:propertyId", isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId } = req.params;
      const contracts = await storage.getManagementContractsByProperty(propertyId);
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching property contracts:', error);
      res.status(500).json({ error: 'Failed to fetch property contracts' });
    }
  });

  // GET /api/contracts/expiring/:daysAhead - Get contracts expiring within X days
  app.get("/api/contracts/expiring/:daysAhead", isAuthenticated, async (req: any, res) => {
    try {
      const daysAhead = parseInt(req.params.daysAhead) || 90;
      const contracts = await storage.getExpiringContracts(daysAhead);
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching expiring contracts:', error);
      res.status(500).json({ error: 'Failed to fetch expiring contracts' });
    }
  });

  // PATCH /api/contracts/:id - Update contract
  app.patch("/api/contracts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const contract = await storage.updateManagementContract(id, updates);
      res.json(contract);
    } catch (error) {
      console.error('Error updating contract:', error);
      res.status(500).json({ error: 'Failed to update contract' });
    }
  });

  // POST /api/contracts/:id/renewal-notification - Mark renewal notification as sent
  app.post("/api/contracts/:id/renewal-notification", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const contract = await storage.markContractRenewalNotificationSent(id);
      res.json(contract);
    } catch (error) {
      console.error('Error marking renewal notification:', error);
      res.status(500).json({ error: 'Failed to mark renewal notification' });
    }
  });

  // POST /api/contracts/:id/generate-renewal - Generate renewal contract
  app.post("/api/contracts/:id/generate-renewal", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { newStartDate, newEndDate } = req.body;
      
      const contract = await storage.getManagementContract(id);
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      const { generateRenewalContract } = await import("./services/contract-analysis");
      const renewalText = await generateRenewalContract(
        contract,
        new Date(newStartDate),
        new Date(newEndDate)
      );
      
      res.json({ renewalText });
    } catch (error) {
      console.error('Error generating renewal contract:', error);
      res.status(500).json({ error: 'Failed to generate renewal contract' });
    }
  });

  // DELETE /api/contracts/:id - Delete contract
  app.delete("/api/contracts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteManagementContract(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting contract:', error);
      res.status(500).json({ error: 'Failed to delete contract' });
    }
  });

  // ======== RENTCHECK INSPECTION SYSTEM ========

  // POST /api/rentcheck/upload-inspection - Upload and extract PDF inspection report
  app.post('/api/rentcheck/upload-inspection', isAuthenticated, async (req: any, res) => {
    try {
      const multerImport = await import("multer");
      const upload = multerImport.default({ storage: multerImport.default.memoryStorage() });
      
      upload.single('pdf')(req, res, async (err) => {
        if (err) {
          console.error('[RentCheck] Upload error:', err);
          return res.status(400).json({ error: 'File upload failed', details: err.message });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No PDF file provided' });
        }

        try {
          const pdfParse = await import("pdf-parse") as any;
          const { OpenAI } = await import("openai");
          
          // Extract text from PDF - pdf-parse exports function directly
          const pdfData = await pdfParse(req.file.buffer);
          const pdfText = pdfData.text;

          console.log('[RentCheck] PDF text length:', pdfText.length);

          // Use OpenAI to extract structured data from PDF
          const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const extractionPrompt = `You are analyzing a RentCheck PDF inspection report. Extract the following information in JSON format:

{
  "propertyAddress": "Full property address from the report",
  "inspectionDate": "Date in YYYY-MM-DD format",
  "inspectorName": "Inspector name",
  "inspectorEmail": "Inspector email",
  "overallGoodPercentage": "Percentage of Good ratings (number only)",
  "overallFairPercentage": "Percentage of Fair ratings (number only)",
  "overallPoorPercentage": "Percentage of Poor ratings (number only)",
  "totalIssuesCount": "Count of items rated Fair or Poor",
  "rooms": [
    {
      "roomName": "Room name (e.g., Kitchen, First Bedroom)",
      "rating": "Good, Fair, Poor, or N/A",
      "goodPercentage": "Percentage for Good",
      "fairPercentage": "Percentage for Fair",
      "poorPercentage": "Percentage for Poor",
      "imagesCount": "Number of images",
      "flags": "Number of flags",
      "questions": ["Array of questions asked"],
      "answers": ["Array of answers given"],
      "notes": "Any special notes or issues mentioned"
    }
  ]
}

Extract all data accurately from this inspection report text:

${pdfText}`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are an expert at extracting structured data from property inspection reports. Always return valid JSON." },
              { role: "user", content: extractionPrompt }
            ],
            temperature: 0,
            response_format: { type: "json_object" }
          });

          const extractedData = JSON.parse(completion.choices[0].message.content || '{}');
          console.log('[RentCheck] Extracted data:', JSON.stringify(extractedData, null, 2));

          // Find last cleaner for property
          const lastCleaner = await storage.findLastCleanerForProperty(
            extractedData.propertyAddress,
            extractedData.inspectionDate
          );

          console.log('[RentCheck] Last cleaner found:', lastCleaner);

          // Find property ID by address
          const allProperties = await storage.getProperties({});
          const property = allProperties.find(p => 
            p.address?.toLowerCase().includes(extractedData.propertyAddress.toLowerCase()) ||
            extractedData.propertyAddress.toLowerCase().includes(p.address?.toLowerCase() || '') ||
            p.name?.toLowerCase().includes(extractedData.propertyAddress.toLowerCase()) ||
            p.nickname?.toLowerCase().includes(extractedData.propertyAddress.toLowerCase())
          );

          // Create inspection record
          const inspection = await storage.createRentCheckInspection({
            propertyId: property?.id || null,
            propertyAddress: extractedData.propertyAddress,
            inspectionDate: extractedData.inspectionDate,
            inspectorName: extractedData.inspectorName || null,
            inspectorEmail: extractedData.inspectorEmail || null,
            overallGoodPercentage: parseFloat(extractedData.overallGoodPercentage) || 0,
            overallFairPercentage: parseFloat(extractedData.overallFairPercentage) || 0,
            overallPoorPercentage: parseFloat(extractedData.overallPoorPercentage) || 0,
            totalIssuesCount: parseInt(extractedData.totalIssuesCount) || 0,
            lastCleanerStaffId: lastCleaner?.staffId || null,
            lastCleaningDate: lastCleaner?.cleaningDate || null,
            daysSinceLastCleaning: lastCleaner?.daysSince || null,
            pdfMetadata: {
              fileName: req.file.originalname,
              fileSize: req.file.size,
              uploadedAt: new Date().toISOString(),
              extractedText: pdfText.substring(0, 5000), // Store first 5000 chars
            },
          });

          // Create room ratings
          if (extractedData.rooms && Array.isArray(extractedData.rooms)) {
            for (const room of extractedData.rooms) {
              await storage.createRentCheckRoomRating({
                inspectionId: inspection.id,
                roomName: room.roomName,
                goodPercentage: parseFloat(room.goodPercentage) || 0,
                fairPercentage: parseFloat(room.fairPercentage) || 0,
                poorPercentage: parseFloat(room.poorPercentage) || 0,
                rating: room.rating || 'N/A',
                imagesCount: parseInt(room.imagesCount) || 0,
                flags: parseInt(room.flags) || 0,
                questions: room.questions || [],
                answers: room.answers || [],
                notes: room.notes || null,
              });
            }
          }

          res.json({
            success: true,
            inspectionId: inspection.id,
            summary: {
              propertyAddress: inspection.propertyAddress,
              inspectionDate: inspection.inspectionDate,
              overallScore: inspection.overallGoodPercentage,
              totalIssues: inspection.totalIssuesCount,
              roomsInspected: extractedData.rooms?.length || 0,
              lastCleaner: lastCleaner ? {
                staffId: lastCleaner.staffId,
                daysSince: lastCleaner.daysSince
              } : null,
            },
          });

        } catch (error) {
          console.error('[RentCheck] Extraction error:', error);
          res.status(500).json({ 
            error: 'Failed to extract data from PDF', 
            details: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });
    } catch (error) {
      console.error('[RentCheck] Upload error:', error);
      res.status(500).json({ error: 'Failed to process upload' });
    }
  });

  // GET /api/rentcheck/inspections - List all inspections with filters
  app.get('/api/rentcheck/inspections', isAuthenticated, async (req: any, res) => {
    try {
      const { propertyId, startDate, endDate } = req.query;
      const inspections = await storage.getRentCheckInspections({
        propertyId,
        startDate,
        endDate,
      });

      // Get staff names for last cleaners
      const inspectionsWithStaff = await Promise.all(
        inspections.map(async (inspection) => {
          let lastCleanerName = null;
          if (inspection.lastCleanerStaffId) {
            const staff = await storage.getStaff(inspection.lastCleanerStaffId);
            lastCleanerName = staff?.fullName || null;
          }
          return {
            ...inspection,
            lastCleanerName,
          };
        })
      );

      res.json(inspectionsWithStaff);
    } catch (error) {
      console.error('[RentCheck] Error fetching inspections:', error);
      res.status(500).json({ error: 'Failed to fetch inspections' });
    }
  });

  // GET /api/rentcheck/inspections/:id - Get single inspection with room ratings
  app.get('/api/rentcheck/inspections/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const inspection = await storage.getRentCheckInspectionById(id);

      if (!inspection) {
        return res.status(404).json({ error: 'Inspection not found' });
      }

      const rooms = await storage.getRentCheckRoomRatings(id);

      // Get staff info if available
      let lastCleanerInfo = null;
      if (inspection.lastCleanerStaffId) {
        const staff = await storage.getStaff(inspection.lastCleanerStaffId);
        if (staff) {
          lastCleanerInfo = {
            id: staff.id,
            name: staff.fullName,
            email: staff.email,
            phone: staff.phone,
          };
        }
      }

      res.json({
        ...inspection,
        rooms,
        lastCleanerInfo,
      });
    } catch (error) {
      console.error('[RentCheck] Error fetching inspection:', error);
      res.status(500).json({ error: 'Failed to fetch inspection details' });
    }
  });

  // GET /api/rentcheck/analytics - Analytics dashboard data
  app.get('/api/rentcheck/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const inspections = await storage.getRentCheckInspections({});

      // Overall metrics
      const totalInspections = inspections.length;
      const avgGoodPercentage = inspections.reduce((sum, i) => sum + (i.overallGoodPercentage || 0), 0) / totalInspections || 0;
      const totalIssues = inspections.reduce((sum, i) => sum + (i.totalIssuesCount || 0), 0);

      // Score trends over time
      const scoreTrends = inspections
        .sort((a, b) => new Date(a.inspectionDate).getTime() - new Date(b.inspectionDate).getTime())
        .map(i => ({
          date: i.inspectionDate,
          score: i.overallGoodPercentage || 0,
          property: i.propertyAddress,
        }));

      // Property performance
      const propertyPerformance: Record<string, { 
        avgScore: number; 
        inspectionCount: number; 
        totalIssues: number 
      }> = {};

      inspections.forEach(i => {
        const addr = i.propertyAddress;
        if (!propertyPerformance[addr]) {
          propertyPerformance[addr] = { avgScore: 0, inspectionCount: 0, totalIssues: 0 };
        }
        propertyPerformance[addr].avgScore += i.overallGoodPercentage || 0;
        propertyPerformance[addr].inspectionCount += 1;
        propertyPerformance[addr].totalIssues += i.totalIssuesCount || 0;
      });

      Object.keys(propertyPerformance).forEach(addr => {
        propertyPerformance[addr].avgScore /= propertyPerformance[addr].inspectionCount;
      });

      // Cleaner accountability
      const cleanerMetrics: Record<string, {
        name: string;
        inspectionCount: number;
        avgScore: number;
        totalIssues: number;
        avgDaysSinceCleaning: number;
      }> = {};

      for (const inspection of inspections) {
        if (inspection.lastCleanerStaffId) {
          const staffId = inspection.lastCleanerStaffId;
          if (!cleanerMetrics[staffId]) {
            const staff = await storage.getStaff(staffId);
            cleanerMetrics[staffId] = {
              name: staff?.fullName || 'Unknown',
              inspectionCount: 0,
              avgScore: 0,
              totalIssues: 0,
              avgDaysSinceCleaning: 0,
            };
          }
          cleanerMetrics[staffId].inspectionCount += 1;
          cleanerMetrics[staffId].avgScore += inspection.overallGoodPercentage || 0;
          cleanerMetrics[staffId].totalIssues += inspection.totalIssuesCount || 0;
          cleanerMetrics[staffId].avgDaysSinceCleaning += inspection.daysSinceLastCleaning || 0;
        }
      }

      Object.keys(cleanerMetrics).forEach(staffId => {
        const count = cleanerMetrics[staffId].inspectionCount;
        cleanerMetrics[staffId].avgScore /= count;
        cleanerMetrics[staffId].avgDaysSinceCleaning /= count;
      });

      // Room-specific issues
      const allRooms = await Promise.all(
        inspections.map(i => storage.getRentCheckRoomRatings(i.id))
      );
      const flatRooms = allRooms.flat();
      
      const roomIssues: Record<string, { 
        avgScore: number; 
        count: number;
        issueCount: number;
      }> = {};

      flatRooms.forEach(room => {
        if (!roomIssues[room.roomName]) {
          roomIssues[room.roomName] = { avgScore: 0, count: 0, issueCount: 0 };
        }
        roomIssues[room.roomName].avgScore += room.goodPercentage || 0;
        roomIssues[room.roomName].count += 1;
        if (room.rating === 'Fair' || room.rating === 'Poor') {
          roomIssues[room.roomName].issueCount += 1;
        }
      });

      Object.keys(roomIssues).forEach(roomName => {
        roomIssues[roomName].avgScore /= roomIssues[roomName].count;
      });

      res.json({
        overview: {
          totalInspections,
          avgGoodPercentage: Math.round(avgGoodPercentage * 10) / 10,
          totalIssues,
        },
        scoreTrends,
        propertyPerformance: Object.entries(propertyPerformance).map(([address, data]) => ({
          property: address,
          ...data,
        })),
        cleanerAccountability: Object.entries(cleanerMetrics).map(([staffId, data]) => ({
          staffId,
          ...data,
        })),
        roomIssues: Object.entries(roomIssues).map(([roomName, data]) => ({
          roomName,
          ...data,
        })),
      });
    } catch (error) {
      console.error('[RentCheck] Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // ===== SCHEDULE TIMETABLE ROUTES =====
  
  // 1. POST /api/schedule-timetables/generate - Generate timetable from finalized assignments
  app.post('/api/schedule-timetables/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { weekStart, weekEnd, assignmentIds } = req.body;

      if (!weekStart || !weekEnd || !assignmentIds || !Array.isArray(assignmentIds)) {
        return res.status(400).json({ error: 'Missing required fields: weekStart, weekEnd, assignmentIds' });
      }

      // Fetch all cleaning assignments for the date range
      const assignments = await storage.getCleaningAssignments({
        startDate: weekStart,
        endDate: weekEnd
      });

      // Filter by provided assignmentIds
      const selectedAssignments = assignments.filter(a => assignmentIds.includes(a.id));

      if (selectedAssignments.length === 0) {
        return res.status(400).json({ error: 'No valid assignments found' });
      }

      // Fetch all staff for cleaner info
      const allStaff = await storage.getAllStaff();
      
      // Fetch all properties for address info
      const allProperties = await storage.getAllProperties();

      // Group assignments by cleaner
      const cleanerAssignmentsMap = new Map<string, typeof selectedAssignments>();
      for (const assignment of selectedAssignments) {
        if (!assignment.staffId) continue;
        if (!cleanerAssignmentsMap.has(assignment.staffId)) {
          cleanerAssignmentsMap.set(assignment.staffId, []);
        }
        cleanerAssignmentsMap.get(assignment.staffId)!.push(assignment);
      }

      // Fetch availability responses for the date range
      const availabilityResponses = await storage.getAvailabilityResponsesByDateRange(weekStart, weekEnd);

      // Build timetable data structure
      const cleaners: any[] = [];
      const availabilityConflicts: any[] = [];

      for (const [cleanerId, cleanerAssignments] of cleanerAssignmentsMap) {
        const cleaner = allStaff.find(s => s.id === cleanerId);
        if (!cleaner) continue;

        // Generate unique token for this cleaner's schedule
        const scheduleToken = crypto.randomBytes(32).toString('hex');

        // Group assignments by date
        const dayMap = new Map<string, any[]>();
        for (const assignment of cleanerAssignments) {
          const date = assignment.assignedDate;
          if (!dayMap.has(date)) {
            dayMap.set(date, []);
          }

          // Find property
          const property = allProperties.find(p => p.id === assignment.propertyId);

          // Check if cleaner was available on this date
          const availabilityForDate = availabilityResponses.find(
            ar => ar.staffId === cleanerId && ar.date === date && ar.isAvailable
          );
          const isAvailable = !!availabilityForDate;

          // Track conflict if not available
          if (!isAvailable) {
            availabilityConflicts.push({
              cleanerId,
              cleanerName: cleaner.fullName,
              date,
              assignmentId: assignment.id,
              propertyAddress: property?.address || 'Unknown'
            });
          }

          dayMap.get(date)!.push({
            assignmentId: assignment.id,
            propertyName: property?.nickname || property?.address || 'Unknown',
            propertyAddress: property?.address || 'Unknown',
            startTime: assignment.slotStart || '10:00',
            endTime: assignment.slotEnd || '15:00',
            duration: 300, // Default 5 hours
            isAvailable
          });
        }

        // Build days array
        const days: any[] = [];
        const currentDate = parseISO(weekStart);
        const endDate = parseISO(weekEnd);
        
        for (let d = currentDate; d <= endDate; d = addDays(d, 1)) {
          const dateStr = format(d, 'yyyy-MM-dd');
          const dayName = format(d, 'EEEE');
          const assignmentsForDay = dayMap.get(dateStr) || [];

          days.push({
            date: dateStr,
            dayName,
            assignments: assignmentsForDay
          });
        }

        cleaners.push({
          cleanerId,
          cleanerName: cleaner.fullName,
          scheduleToken,
          days
        });
      }

      // Generate WhatsApp copy (weekly format)
      let whatsappCopy = `Week of ${format(parseISO(weekStart), 'dd MMM yyyy')}\n\n`;
      
      const currentDate = parseISO(weekStart);
      const endDate = parseISO(weekEnd);
      
      for (let d = currentDate; d <= endDate; d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayName = format(d, 'EEEE');
        const dayDate = format(d, 'dd MMM');
        
        whatsappCopy += `${dayName} ${dayDate}:\n`;
        
        // Collect all assignments for this day across all cleaners
        const dayAssignments: { cleanerName: string; address: string }[] = [];
        for (const cleaner of cleaners) {
          const day = cleaner.days.find((dy: any) => dy.date === dateStr);
          if (day && day.assignments.length > 0) {
            for (const assignment of day.assignments) {
              dayAssignments.push({
                cleanerName: cleaner.cleanerName,
                address: assignment.propertyAddress
              });
            }
          }
        }

        if (dayAssignments.length === 0) {
          whatsappCopy += '  No assignments\n';
        } else {
          for (const { cleanerName, address } of dayAssignments) {
            whatsappCopy += `  ${cleanerName} - ${address}\n`;
          }
        }
        whatsappCopy += '\n';
      }

      // Create timetable in database
      const timetableData: any = {
        weekStart,
        weekEnd,
        assignmentIds,
        generatedBy: userId,
        timetableData: { cleaners },
        whatsappCopy,
        availabilityConflicts,
        status: 'active'
      };

      const validatedData = insertScheduleTimetableSchema.parse(timetableData);
      const timetable = await storage.createScheduleTimetable(validatedData);

      console.log(`[Schedule Timetable] Generated timetable ${timetable.id} for ${cleaners.length} cleaners`);

      res.status(201).json(timetable);
    } catch (error) {
      console.error('[Schedule Timetable] Error generating timetable:', error);
      res.status(500).json({ error: 'Failed to generate timetable' });
    }
  });

  // 2. GET /api/schedule-timetables - Get all timetables
  app.get('/api/schedule-timetables', isAuthenticated, async (req: any, res) => {
    try {
      const { weekStart } = req.query;
      
      const timetables = await storage.getScheduleTimetables(weekStart as string | undefined);

      // Add acceptance counts for each timetable
      const timetablesWithAcceptances = await Promise.all(
        timetables.map(async (timetable) => {
          const acceptances = await storage.getCleanerScheduleAcceptances(timetable.id);
          const totalCleaners = timetable.timetableData?.cleaners?.length || 0;
          const acceptedCount = acceptances.filter(a => a.acceptedAt).length;

          return {
            ...timetable,
            acceptanceStats: {
              total: totalCleaners,
              accepted: acceptedCount,
              pending: totalCleaners - acceptedCount
            }
          };
        })
      );

      res.json(timetablesWithAcceptances);
    } catch (error) {
      console.error('[Schedule Timetable] Error fetching timetables:', error);
      res.status(500).json({ error: 'Failed to fetch timetables' });
    }
  });

  // 3. GET /api/schedule-timetables/:id - Get single timetable by ID
  app.get('/api/schedule-timetables/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const timetable = await storage.getScheduleTimetable(id);
      
      if (!timetable) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      // Get cleaner acceptance statuses
      const acceptances = await storage.getCleanerScheduleAcceptances(id);

      // Map acceptances by cleanerId
      const acceptanceMap = new Map(
        acceptances.map(a => [a.cleanerId, a])
      );

      // Add acceptance status to each cleaner
      const cleanersWithStatus = timetable.timetableData.cleaners.map(cleaner => ({
        ...cleaner,
        acceptance: acceptanceMap.get(cleaner.cleanerId) || null
      }));

      res.json({
        ...timetable,
        timetableData: {
          ...timetable.timetableData,
          cleaners: cleanersWithStatus
        }
      });
    } catch (error) {
      console.error('[Schedule Timetable] Error fetching timetable:', error);
      res.status(500).json({ error: 'Failed to fetch timetable' });
    }
  });

  // 4. GET /api/schedule-timetables/:id/pdf - Generate PDF
  app.get('/api/schedule-timetables/:id/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const timetable = await storage.getScheduleTimetable(id);
      
      if (!timetable) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      // For now, return a simple HTML table that can be printed/saved as PDF
      // In a production app, you'd use a PDF library like puppeteer or pdfkit
      
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cleaning Schedule - Week of ${format(parseISO(timetable.weekStart), 'dd MMM yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4CAF50; color: white; }
            .cleaner-section { margin-top: 30px; }
            .cleaner-name { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h1>Cleaning Schedule - Week of ${format(parseISO(timetable.weekStart), 'dd MMM yyyy')}</h1>
      `;

      for (const cleaner of timetable.timetableData.cleaners) {
        html += `
          <div class="cleaner-section">
            <div class="cleaner-name">${cleaner.cleanerName}</div>
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Date</th>
                  <th>Property</th>
                  <th>Address</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
        `;

        for (const day of cleaner.days) {
          if (day.assignments.length === 0) {
            html += `
              <tr>
                <td>${day.dayName}</td>
                <td>${format(parseISO(day.date), 'dd MMM')}</td>
                <td colspan="3" style="text-align: center; color: #999;">No assignments</td>
              </tr>
            `;
          } else {
            for (const assignment of day.assignments) {
              html += `
                <tr>
                  <td>${day.dayName}</td>
                  <td>${format(parseISO(day.date), 'dd MMM')}</td>
                  <td>${assignment.propertyName}</td>
                  <td>${assignment.propertyAddress}</td>
                  <td>${assignment.startTime} - ${assignment.endTime}</td>
                </tr>
              `;
            }
          }
        }

        html += `
              </tbody>
            </table>
          </div>
        `;
      }

      html += `
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('[Schedule Timetable] Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF' });
    }
  });

  // 5. GET /api/schedule-timetables/:id/whatsapp-copy - Get WhatsApp formatted message
  app.get('/api/schedule-timetables/:id/whatsapp-copy', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const timetable = await storage.getScheduleTimetable(id);
      
      if (!timetable) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      res.json({
        whatsappCopy: timetable.whatsappCopy || ''
      });
    } catch (error) {
      console.error('[Schedule Timetable] Error fetching WhatsApp copy:', error);
      res.status(500).json({ error: 'Failed to fetch WhatsApp copy' });
    }
  });

  // 6. POST /api/schedule-timetables/:id/send-sms/:cleanerId - Send SMS to cleaner
  app.post('/api/schedule-timetables/:id/send-sms/:cleanerId', isAuthenticated, async (req: any, res) => {
    try {
      const { id, cleanerId } = req.params;
      
      const timetable = await storage.getScheduleTimetable(id);
      
      if (!timetable) {
        return res.status(404).json({ error: 'Timetable not found' });
      }

      // Find cleaner in timetable
      const cleanerData = timetable.timetableData.cleaners.find(c => c.cleanerId === cleanerId);
      
      if (!cleanerData) {
        return res.status(404).json({ error: 'Cleaner not found in timetable' });
      }

      // Get cleaner phone number
      const cleaner = await storage.getStaff(cleanerId);
      
      if (!cleaner || !cleaner.phone) {
        return res.status(400).json({ error: 'Cleaner phone number not found' });
      }

      // Get domain for link
      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000";
      const protocol = process.env.REPLIT_DOMAINS ? 'https' : 'http';
      const link = `${protocol}://${domain}/cleaner-schedule/${cleanerData.scheduleToken}`;

      // Format message
      const weekStartFormatted = format(parseISO(timetable.weekStart), 'dd MMM yyyy');
      const message = `Hi ${cleanerData.cleanerName}! Your cleaning schedule for week of ${weekStartFormatted} is ready. View and accept: ${link}. This link is unique to you.`;

      // Send SMS
      const result = await sendGenericSMS(cleaner.phone, message);

      if (!result.success) {
        console.error(`[Schedule Timetable] Failed to send SMS to ${cleanerId}:`, result.error);
        return res.status(500).json({ error: 'Failed to send SMS', details: result.error });
      }

      console.log(`[Schedule Timetable] SMS sent to ${cleanerData.cleanerName} (${cleaner.phone})`);
      res.json({ success: true, message: 'SMS sent successfully' });
    } catch (error) {
      console.error('[Schedule Timetable] Error sending SMS:', error);
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  });

  // 7. GET /api/public/cleaner-schedule/:token - Public route for cleaners to view their schedule (NO AUTH)
  app.get('/api/public/cleaner-schedule/:token', async (req: any, res) => {
    try {
      const { token } = req.params;
      
      const timetable = await storage.getScheduleTimetableByToken(token);
      
      if (!timetable) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Find cleaner data for this token
      const cleanerData = timetable.timetableData.cleaners.find(c => c.scheduleToken === token);
      
      if (!cleanerData) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Get acceptance status
      const acceptance = await storage.getCleanerScheduleAcceptance(timetable.id, cleanerData.cleanerId);

      res.json({
        timetableId: timetable.id,
        weekStart: timetable.weekStart,
        weekEnd: timetable.weekEnd,
        cleanerName: cleanerData.cleanerName,
        days: cleanerData.days,
        acceptance: acceptance ? {
          acceptedAt: acceptance.acceptedAt,
          notes: acceptance.notes
        } : null
      });
    } catch (error) {
      console.error('[Schedule Timetable] Error fetching public schedule:', error);
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  });

  // 8. POST /api/public/cleaner-schedule/:token/accept - Record cleaner acceptance (NO AUTH)
  app.post('/api/public/cleaner-schedule/:token/accept', async (req: any, res) => {
    try {
      const { token } = req.params;
      const { notes } = req.body;
      
      const timetable = await storage.getScheduleTimetableByToken(token);
      
      if (!timetable) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Find cleaner data for this token
      const cleanerData = timetable.timetableData.cleaners.find(c => c.scheduleToken === token);
      
      if (!cleanerData) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      // Capture IP address and user agent
      const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Check if already accepted
      const existing = await storage.getCleanerScheduleAcceptance(timetable.id, cleanerData.cleanerId);
      
      if (existing && existing.acceptedAt) {
        return res.status(400).json({ error: 'Schedule already accepted' });
      }

      // Create or update acceptance
      const acceptanceData: any = {
        timetableId: timetable.id,
        cleanerId: cleanerData.cleanerId,
        scheduleToken: token,
        acceptedAt: new Date(),
        ipAddress: typeof ipAddress === 'string' ? ipAddress : ipAddress[0],
        userAgent: typeof userAgent === 'string' ? userAgent : userAgent[0],
        notes: notes || null
      };

      const validatedData = insertCleanerScheduleAcceptanceSchema.parse(acceptanceData);
      const acceptance = await storage.createCleanerScheduleAcceptance(validatedData);

      console.log(`[Schedule Timetable] Cleaner ${cleanerData.cleanerName} accepted schedule ${timetable.id}`);

      res.json({
        success: true,
        acceptance: {
          acceptedAt: acceptance.acceptedAt,
          notes: acceptance.notes
        }
      });
    } catch (error) {
      console.error('[Schedule Timetable] Error recording acceptance:', error);
      res.status(500).json({ error: 'Failed to record acceptance' });
    }
  });

  // ======== ACTIVITY LOGS ========
  // GET /api/activity-logs - Fetch activity logs with filters and pagination
  app.get("/api/activity-logs", isAuthenticated, async (req: any, res) => {
    try {
      const { userId, resourceType, action, startDate, endDate, limit, offset } = req.query;
      
      const filters = {
        userId: userId as string | undefined,
        resourceType: resourceType as string | undefined,
        action: action as string | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      };

      const [logs, count] = await Promise.all([
        storage.getActivityLogs(filters),
        storage.getActivityLogCount(filters)
      ]);

      res.json({
        logs,
        total: count,
        limit: filters.limit,
        offset: filters.offset,
      });
    } catch (error) {
      console.error('[Activity Logs] Error fetching logs:', error);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  });

  // ======== POTENTIAL CLIENTS PIPELINE ========
  
  // 1. POTENTIAL CLIENTS ROUTES
  
  // GET /api/potential-clients - Get all clients with their stage info
  app.get("/api/potential-clients", isAuthenticated, async (req: any, res) => {
    try {
      const clients = await storage.getAllPotentialClients();
      res.json(clients);
    } catch (error: any) {
      console.error('[Potential Clients] Error fetching clients:', error);
      res.status(500).json({ message: "Failed to fetch potential clients" });
    }
  });

  // POST /api/potential-clients - Create new client (also create initial pipeline stage record)
  app.post("/api/potential-clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Inject authenticated user ID before validation
      const clientData = insertPotentialClientSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      // TODO: Transaction Safety - Consider wrapping client → stage → history creation in a transaction
      // Current approach is acceptable for MVP since:
      // 1. Unique constraint on potentialClientId in clientPipelineStages prevents duplicates
      // 2. Cascade delete on potentialClientId ensures cleanup if needed
      // 3. Adding proper transaction support would require wrapping the db/storage layer
      
      // Create the client
      const client = await storage.createPotentialClient(clientData);
      
      // Auto-create initial pipeline stage record (stage: "lead")
      const stageData = insertClientPipelineStageSchema.parse({
        potentialClientId: client.id,
        currentStage: "lead",
      });
      await storage.createClientPipelineStage(stageData);
      
      // Log initial stage to history
      const historyData = insertClientStageHistorySchema.parse({
        potentialClientId: client.id,
        fromStage: null,
        toStage: "lead",
        changedBy: userId,
        note: "Client created",
      });
      await storage.createClientStageHistory(historyData);
      
      res.json(client);
    } catch (error: any) {
      console.error('[Potential Clients] Error creating client:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // GET /api/potential-clients/:id - Get single client with full details
  app.get("/api/potential-clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getPotentialClientById(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // TODO: Pagination - Currently fetches ALL related records which won't scale
      // For production, consider adding pagination with reasonable limits:
      // - Contacts: fetch all (typically < 10 per client)
      // - Properties: fetch all (typically < 20 per client)
      // - Meetings: limit to last 50 meetings
      // - Follow-ups: limit to last 100 follow-ups
      // - Communications: limit to last 100 communications
      // Or implement query parameters for offset/limit pagination
      
      // Get related data
      const [stage, contacts, properties, meetings, followUps, communications] = await Promise.all([
        storage.getClientPipelineStage(id),
        storage.getClientContacts(id),
        storage.getClientProperties(id),
        storage.getClientMeetings(id),
        storage.getClientFollowUps(id),
        storage.getClientCommunications(id),
      ]);
      
      res.json({
        ...client,
        stage,
        contacts,
        properties,
        meetings,
        followUps,
        communications,
      });
    } catch (error: any) {
      console.error('[Potential Clients] Error fetching client:', error);
      return res.status(500).json({ error: 'Failed to fetch client details' });
    }
  });

  // PATCH /api/potential-clients/:id - Update client
  app.patch("/api/potential-clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertPotentialClientSchema.partial().parse(req.body);
      
      const client = await storage.updatePotentialClient(id, updates);
      res.json(client);
    } catch (error: any) {
      console.error('[Potential Clients] Error updating client:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // DELETE /api/potential-clients/:id - Delete client (cascade deletes related records)
  app.delete("/api/potential-clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deletePotentialClient(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Potential Clients] Error deleting client:', error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // 2. CLIENT CONTACTS ROUTES
  
  // GET /api/potential-clients/:clientId/contacts - Get all contacts for a client
  app.get("/api/potential-clients/:clientId/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const contacts = await storage.getClientContacts(clientId);
      res.json(contacts);
    } catch (error: any) {
      console.error('[Client Contacts] Error fetching contacts:', error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  // POST /api/potential-clients/:clientId/contacts - Create new contact
  app.post("/api/potential-clients/:clientId/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const contactData = insertClientContactSchema.parse({
        ...req.body,
        potentialClientId: clientId,
      });
      
      const contact = await storage.createClientContact(contactData);
      res.json(contact);
    } catch (error: any) {
      console.error('[Client Contacts] Error creating contact:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // PATCH /api/client-contacts/:id - Update contact
  app.patch("/api/client-contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertClientContactSchema.partial().parse(req.body);
      
      const contact = await storage.updateClientContact(id, updates);
      res.json(contact);
    } catch (error: any) {
      console.error('[Client Contacts] Error updating contact:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // DELETE /api/client-contacts/:id - Delete contact
  app.delete("/api/client-contacts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClientContact(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Client Contacts] Error deleting contact:', error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // 3. CLIENT PROPERTIES ROUTES
  
  // GET /api/potential-clients/:clientId/properties - Get all properties for a client
  app.get("/api/potential-clients/:clientId/properties", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const properties = await storage.getClientProperties(clientId);
      res.json(properties);
    } catch (error: any) {
      console.error('[Client Properties] Error fetching properties:', error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // POST /api/potential-clients/:clientId/properties - Create new property
  app.post("/api/potential-clients/:clientId/properties", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const propertyData = insertClientPropertySchema.parse({
        ...req.body,
        potentialClientId: clientId,
      });
      
      const property = await storage.createClientProperty(propertyData);
      res.json(property);
    } catch (error: any) {
      console.error('[Client Properties] Error creating property:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // PATCH /api/client-properties/:id - Update property
  app.patch("/api/client-properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertClientPropertySchema.partial().parse(req.body);
      
      const property = await storage.updateClientProperty(id, updates);
      res.json(property);
    } catch (error: any) {
      console.error('[Client Properties] Error updating property:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // DELETE /api/client-properties/:id - Delete property
  app.delete("/api/client-properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClientProperty(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Client Properties] Error deleting property:', error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  // 4. CLIENT PIPELINE STAGE ROUTES
  
  // GET /api/potential-clients/:clientId/stage - Get current stage
  app.get("/api/potential-clients/:clientId/stage", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const stage = await storage.getClientPipelineStage(clientId);
      
      if (!stage) {
        return res.status(404).json({ message: "Pipeline stage not found" });
      }
      
      res.json(stage);
    } catch (error: any) {
      console.error('[Client Pipeline Stage] Error fetching stage:', error);
      res.status(500).json({ message: "Failed to fetch pipeline stage" });
    }
  });

  // POST /api/potential-clients/:clientId/stage - Create initial stage
  app.post("/api/potential-clients/:clientId/stage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.params;
      const stageData = insertClientPipelineStageSchema.parse({
        ...req.body,
        potentialClientId: clientId,
      });
      
      const stage = await storage.createClientPipelineStage(stageData);
      
      // Log to history
      const historyData = insertClientStageHistorySchema.parse({
        potentialClientId: clientId,
        fromStage: null,
        toStage: stageData.currentStage,
        changedBy: userId,
        note: "Initial stage created",
      });
      await storage.createClientStageHistory(historyData);
      
      res.json(stage);
    } catch (error: any) {
      console.error('[Client Pipeline Stage] Error creating stage:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // PATCH /api/potential-clients/:clientId/stage - Update stage (also log to stage history)
  app.patch("/api/potential-clients/:clientId/stage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.params;
      const updates = insertClientPipelineStageSchema.partial().parse(req.body);
      
      // Get current stage before update
      const currentStage = await storage.getClientPipelineStage(clientId);
      
      if (!currentStage) {
        return res.status(404).json({ message: "Pipeline stage not found" });
      }
      
      // Update the stage
      const updatedStage = await storage.updateClientPipelineStage(currentStage.id, updates);
      
      // If currentStage changed, log to history
      if (updates.currentStage && updates.currentStage !== currentStage.currentStage) {
        const historyData = insertClientStageHistorySchema.parse({
          potentialClientId: clientId,
          fromStage: currentStage.currentStage,
          toStage: updates.currentStage,
          changedBy: userId,
          note: req.body.note || null,
        });
        await storage.createClientStageHistory(historyData);
      }
      
      res.json(updatedStage);
    } catch (error: any) {
      console.error('[Client Pipeline Stage] Error updating stage:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // 5. CLIENT STAGE HISTORY ROUTES
  
  // GET /api/potential-clients/:clientId/stage-history - Get full stage history
  app.get("/api/potential-clients/:clientId/stage-history", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const history = await storage.getClientStageHistory(clientId);
      res.json(history);
    } catch (error: any) {
      console.error('[Client Stage History] Error fetching history:', error);
      res.status(500).json({ message: "Failed to fetch stage history" });
    }
  });

  // 6. CLIENT MEETINGS ROUTES
  
  // GET /api/potential-clients/:clientId/meetings - Get all meetings
  app.get("/api/potential-clients/:clientId/meetings", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const meetings = await storage.getClientMeetings(clientId);
      res.json(meetings);
    } catch (error: any) {
      console.error('[Client Meetings] Error fetching meetings:', error);
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  // POST /api/potential-clients/:clientId/meetings - Create meeting
  app.post("/api/potential-clients/:clientId/meetings", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const userId = req.user.claims.sub;
      
      const validated = insertClientMeetingSchema.parse({
        ...req.body,
        potentialClientId: clientId,
      });
      
      // Pass ISO string directly to storage - conversion happens there
      const meeting = await storage.createClientMeeting({
        ...validated,
        createdBy: userId,
      });
      res.json(meeting);
    } catch (error: any) {
      console.error('[Client Meetings] Error creating meeting:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // PATCH /api/client-meetings/:id - Update meeting
  app.patch("/api/client-meetings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertClientMeetingSchema.partial().parse(req.body);
      
      const meeting = await storage.updateClientMeeting(id, updates);
      res.json(meeting);
    } catch (error: any) {
      console.error('[Client Meetings] Error updating meeting:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // DELETE /api/client-meetings/:id - Delete meeting
  app.delete("/api/client-meetings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClientMeeting(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Client Meetings] Error deleting meeting:', error);
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });

  // PATCH /api/meetings/:id/outcome - Log meeting outcome
  app.patch("/api/meetings/:id/outcome", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const outcomeData = updateClientMeetingOutcomeSchema.parse(req.body);
      
      const meeting = await storage.updateMeetingOutcome(id, outcomeData);
      res.json(meeting);
    } catch (error: any) {
      console.error('[Client Meetings] Error logging meeting outcome:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // GET /api/potential-clients/:id/meetings/upcoming - Get upcoming meetings
  app.get("/api/potential-clients/:id/meetings/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const upcomingMeetings = await storage.listUpcomingMeetings(id);
      res.json(upcomingMeetings);
    } catch (error: any) {
      console.error('[Client Meetings] Error fetching upcoming meetings:', error);
      res.status(500).json({ message: "Failed to fetch upcoming meetings" });
    }
  });

  // 7. CLIENT FOLLOW-UPS ROUTES
  
  // GET /api/potential-clients/:clientId/follow-ups - Get all follow-ups
  app.get("/api/potential-clients/:clientId/follow-ups", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const followUps = await storage.getClientFollowUps(clientId);
      res.json(followUps);
    } catch (error: any) {
      console.error('[Client Follow-ups] Error fetching follow-ups:', error);
      res.status(500).json({ message: "Failed to fetch follow-ups" });
    }
  });

  // GET /api/client-follow-ups/overdue - Get all overdue follow-ups across all clients
  app.get("/api/client-follow-ups/overdue", isAuthenticated, async (req: any, res) => {
    try {
      const overdueFollowUps = await storage.getOverdueFollowUps();
      res.json(overdueFollowUps);
    } catch (error: any) {
      console.error('[Client Follow-ups] Error fetching overdue follow-ups:', error);
      res.status(500).json({ message: "Failed to fetch overdue follow-ups" });
    }
  });

  // POST /api/potential-clients/:clientId/follow-ups - Create follow-up
  app.post("/api/potential-clients/:clientId/follow-ups", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.params;
      const followUpData = insertClientFollowUpSchema.parse({
        ...req.body,
        potentialClientId: clientId,
        assignedTo: req.body.assignedTo || userId,
      });
      
      const followUp = await storage.createClientFollowUp(followUpData);
      res.json(followUp);
    } catch (error: any) {
      console.error('[Client Follow-ups] Error creating follow-up:', error);
      res.status(400).json({ message: error.message });
    }
  });

  // PATCH /api/client-follow-ups/:id - Update follow-up
  app.patch("/api/client-follow-ups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = insertClientFollowUpSchema.partial().parse(req.body);
      
      const followUp = await storage.updateClientFollowUp(id, updates);
      res.json(followUp);
    } catch (error: any) {
      console.error('[Client Follow-ups] Error updating follow-up:', error);
      return res.status(400).json({ message: error.message || 'Failed to update follow-up' });
    }
  });

  // DELETE /api/client-follow-ups/:id - Delete follow-up
  app.delete("/api/client-follow-ups/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClientFollowUp(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('[Client Follow-ups] Error deleting follow-up:', error);
      res.status(500).json({ message: "Failed to delete follow-up" });
    }
  });

  // 8. CLIENT COMMUNICATIONS ROUTES
  
  // GET /api/potential-clients/:clientId/communications - Get all communications
  app.get("/api/potential-clients/:clientId/communications", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const communications = await storage.getClientCommunications(clientId);
      res.json(communications);
    } catch (error: any) {
      console.error('[Client Communications] Error fetching communications:', error);
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  // POST /api/potential-clients/:clientId/communications - Log new communication
  app.post("/api/potential-clients/:clientId/communications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { clientId } = req.params;
      
      // Inject authenticated user ID before validation
      const communicationData = insertClientCommunicationSchema.parse({
        ...req.body,
        potentialClientId: clientId,
        sentBy: userId,
      });
      
      const communication = await storage.createClientCommunication(communicationData);
      res.json(communication);
    } catch (error: any) {
      console.error('[Client Communications] Error creating communication:', error);
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}