import { storage } from "./storage";
import type { InsertActivityLog } from "@shared/schema";

/**
 * Centralized activity logging utility
 * Logs all user actions across the system for audit trail
 */
export class ActivityLogger {
  /**
   * Log a user activity
   * @param params Activity log parameters
   */
  static async log(params: {
    userId?: string;
    userEmail?: string;
    userName?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, any>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      console.log('[ActivityLogger] Logging activity:', {
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.userName,
        action: params.action,
        resourceType: params.resourceType,
      });
      
      const logData: InsertActivityLog = {
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.userName,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        resourceName: params.resourceName,
        details: params.details || {},
        ipAddress: params.ipAddress,
      };

      await storage.createActivityLog(logData);
      console.log('[ActivityLogger] Successfully logged activity');
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('[ActivityLogger] Failed to log activity:', error);
    }
  }

  /**
   * Helper to extract user info from request
   * Handles both Replit Auth (req.user.claims) and direct user objects
   */
  static getUserFromRequest(req: any): { userId?: string; userEmail?: string; userName?: string } {
    const user = req.user;
    if (!user) {
      return {};
    }

    // Replit Auth populates req.user.claims.*
    const claims = user.claims || {};
    const userId = claims.sub || user.id;
    const userEmail = claims.email || user.email;
    const firstName = claims.given_name || claims.first_name || user.firstName;
    const lastName = claims.family_name || claims.last_name || user.lastName;

    return {
      userId,
      userEmail,
      userName: firstName && lastName ? `${firstName} ${lastName}` : userEmail,
    };
  }

  /**
   * Helper to extract IP address from request
   */
  static getIpFromRequest(req: any): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0];
    }
    return req.connection.remoteAddress || req.socket.remoteAddress;
  }

  /**
   * Convenience method to log from request
   */
  static async logFromRequest(req: any, params: {
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const userInfo = this.getUserFromRequest(req);
    const ipAddress = this.getIpFromRequest(req);

    await this.log({
      ...userInfo,
      ...params,
      ipAddress,
    });
  }
}
