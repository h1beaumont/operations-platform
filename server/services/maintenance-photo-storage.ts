
import { Storage } from "@google-cloud/storage";
import { db } from "../storage";
import { maintenanceRequests } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import path from "path";

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: process.env.GOOGLE_CLOUD_CREDENTIALS
    ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
    : undefined,
});

const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET || "staffflow-uploads";
const bucket = storage.bucket(BUCKET_NAME);

interface UploadedPhoto {
  fileName: string;
  gcsPath: string;
  signedUrl: string;
}

export class MaintenancePhotoStorageService {
  /**
   * Upload a maintenance photo to Google Cloud Storage
   */
  static async uploadPhoto(
    maintenanceRequestId: number,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<UploadedPhoto> {
    try {
      // Generate unique filename
      const fileExtension = path.extname(originalFilename);
      const uniqueId = crypto.randomBytes(16).toString("hex");
      const fileName = `maintenance-${maintenanceRequestId}-${uniqueId}${fileExtension}`;
      const gcsPath = `maintenance-photos/${maintenanceRequestId}/${fileName}`;

      // Upload to GCS
      const file = bucket.file(gcsPath);
      await file.save(fileBuffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            maintenanceRequestId: maintenanceRequestId.toString(),
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Generate signed URL (valid for 7 days)
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      return {
        fileName,
        gcsPath,
        signedUrl,
      };
    } catch (error: any) {
      console.error("Failed to upload maintenance photo:", error);
      throw new Error(`Photo upload failed: ${error.message}`);
    }
  }

  /**
   * Upload multiple photos for a maintenance request
   */
  static async uploadMultiplePhotos(
    maintenanceRequestId: number,
    files: Array<{ buffer: Buffer; filename: string; mimeType: string }>
  ): Promise<UploadedPhoto[]> {
    const uploadPromises = files.map((file) =>
      this.uploadPhoto(
        maintenanceRequestId,
        file.buffer,
        file.filename,
        file.mimeType
      )
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Get signed URLs for existing photos
   */
  static async getPhotoSignedUrls(
    gcsPaths: string[],
    expirationHours: number = 24
  ): Promise<Map<string, string>> {
    const urlMap = new Map<string, string>();

    for (const gcsPath of gcsPaths) {
      try {
        const file = bucket.file(gcsPath);
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + expirationHours * 60 * 60 * 1000,
        });
        urlMap.set(gcsPath, signedUrl);
      } catch (error) {
        console.error(`Failed to get signed URL for ${gcsPath}:`, error);
        urlMap.set(gcsPath, "");
      }
    }

    return urlMap;
  }

  /**
   * Delete a photo from GCS
   */
  static async deletePhoto(gcsPath: string): Promise<void> {
    try {
      const file = bucket.file(gcsPath);
      await file.delete();
    } catch (error) {
      console.error(`Failed to delete photo ${gcsPath}:`, error);
      throw error;
    }
  }

  /**
   * Delete all photos for a maintenance request
   */
  static async deleteAllPhotos(maintenanceRequestId: number): Promise<void> {
    try {
      const [files] = await bucket.getFiles({
        prefix: `maintenance-photos/${maintenanceRequestId}/`,
      });

      const deletePromises = files.map((file) => file.delete());
      await Promise.all(deletePromises);
    } catch (error) {
      console.error(
        `Failed to delete photos for maintenance request ${maintenanceRequestId}:`,
        error
      );
      throw error;
    }
  }
}
