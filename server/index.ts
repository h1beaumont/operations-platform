import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startAvailabilityScheduler } from "./availability-scheduler";
import { startMeetingReminderScheduler } from "./automation";
import { startRentPaymentChecker } from "./jobs/rent-checker";
import { startCleaningOrderScheduler } from "./cleaning-order-scheduler";
import { startLinenOrderScheduler } from "./linen-order-scheduler";
import { startStatementEmailScheduler } from "./services/statement-scheduler";
import { startTaskNotificationScheduler } from "./task-notification-scheduler";
import { storage } from "./storage";
import cron from "node-cron";
import { generateTasksForTomorrow } from "./services/task-generator";

const app = express();
// JSON body parser with better error handling
app.use(express.json({ 
  limit: '150mb',
  strict: false
}));
app.use(express.urlencoded({ extended: false, limit: '150mb' }));
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Handle JSON parsing errors specifically
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('[Global Error Handler] JSON Parse Error:', {
        path: req.path,
        method: req.method,
        contentType: req.headers['content-type'],
        error: err.message
      });
      return res.status(400).json({ 
        error: 'Invalid JSON',
        message: 'Request body contains invalid JSON syntax'
      });
    }
    
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Don't log full stack traces in production for client errors
    if (status >= 500) {
      console.error('[Global Error Handler]', {
        path: req.path,
        method: req.method,
        status,
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }

    res.status(status).json({ 
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start automated SMS scheduler for Wed/Sun 4:30pm
    startAvailabilityScheduler();
    
    // Start meeting reminder scheduler (15 minutes before meetings)
    startMeetingReminderScheduler();
    
    // Start daily task generation scheduler (runs at midnight to generate tomorrow's tasks)
    cron.schedule('0 0 * * *', async () => {
      console.log('[Task Generator Scheduler] Running daily task generation at midnight');
      try {
        const count = await generateTasksForTomorrow();
        console.log(`[Task Generator Scheduler] Generated ${count} tasks for tomorrow`);
      } catch (error) {
        console.error('[Task Generator Scheduler] Error generating tasks:', error);
      }
    });
    console.log('[Task Generator Scheduler] Daily task generation scheduled for midnight');
    
    // Rent payment checker disabled - manual check via button instead
    // startRentPaymentChecker();
    
    // Start cleaning supplies ordering reminder scheduler (checks every minute)
    startCleaningOrderScheduler();
    
    // Start linen order reminder scheduler (checks every minute)
    startLinenOrderScheduler();
    
    // Start landlord statement email scheduler (runs daily at 9 AM to send approved statements)
    startStatementEmailScheduler(storage);
    
    // Start task notification scheduler (runs daily at 7 AM to send task reminders)
    startTaskNotificationScheduler();
  });
})();
