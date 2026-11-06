import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import path from "path";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "text/plain",
];

import { promises as fs } from "fs";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const KNOWLEDGE_BASE_DIR = "uploads/knowledge-base";

export class KnowledgeUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KnowledgeUploadError";
    Object.setPrototypeOf(this, KnowledgeUploadError.prototype);
  }
}

export interface UploadedFileMetadata {
  fileUrl: string;
  originalFileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
}

export class KnowledgeUploadService {
  private async getKnowledgeBaseDir(): Promise<string> {
    // Use local uploads directory instead of Object Storage
    const dir = KNOWLEDGE_BASE_DIR;
    
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`[Knowledge Upload] Directory ensured: ${dir}`);
    } catch (error) {
      console.error(`[Knowledge Upload] Failed to create directory ${dir}:`, error);
      throw new KnowledgeUploadError(`Failed to create upload directory: ${error}`);
    }
    
    return dir;
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    chatbotType: string
  ): Promise<UploadedFileMetadata> {
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
      throw new KnowledgeUploadError(
        `Invalid file type: ${mimeType}. Only PDF, JPG, PNG, and TXT files are allowed.`
      );
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new KnowledgeUploadError(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    const knowledgeDir = this.getKnowledgeBaseDir();
    const fileId = randomUUID();
    const fileExtension = this.getFileExtension(mimeType);
    const storageKey = `${knowledgeDir}/knowledge-${chatbotType}/${fileId}${fileExtension}`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    await file.save(buffer, {
      contentType: mimeType,
      metadata: {
        originalName: fileName,
        chatbotType,
      },
    });

    // Get public URL for the file
    const fileUrl = await this.getSignedDownloadURL(storageKey);

    return {
      fileUrl,
      originalFileName: fileName,
      fileType: this.getFileTypeFromMimeType(mimeType),
      fileSize: buffer.length,
      storageKey,
    };
  }

  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; fileName: string; mimeType: string }>,
    chatbotType: string
  ): Promise<UploadedFileMetadata[]> {
    const uploadPromises = files.map((file) =>
      this.uploadFile(file.buffer, file.fileName, file.mimeType, chatbotType)
    );

    return await Promise.all(uploadPromises);
  }

  async getSignedDownloadURL(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new KnowledgeUploadError(`File not found: ${storageKey}`);
    }

    return await this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  async deleteFile(storageKey: string): Promise<void> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new KnowledgeUploadError(`File not found: ${storageKey}`);
    }

    await file.delete();
  }

  async downloadFile(storageKey: string): Promise<Buffer> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new KnowledgeUploadError(`File not found: ${storageKey}`);
    }

    const [buffer] = await file.download();
    return buffer;
  }

  private getFileTypeFromMimeType(mimeType: string): string {
    const typeMap: Record<string, string> = {
      "application/pdf": "pdf",
      "image/jpeg": "image",
      "image/jpg": "image",
      "image/png": "image",
      "text/plain": "text",
    };
    return typeMap[mimeType] || "unknown";
  }

  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      "application/pdf": ".pdf",
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "text/plain": ".txt",
    };
    return extensions[mimeType] || "";
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new KnowledgeUploadError("Invalid path: must contain at least a bucket name");
    }

    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join("/");

    return {
      bucketName,
      objectName,
    };
  }

  private async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec,
  }: {
    bucketName: string;
    objectName: string;
    method: "GET" | "PUT" | "DELETE";
    ttlSec: number;
  }): Promise<string> {
    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };

    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      throw new KnowledgeUploadError(
        `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit and have Object Storage set up`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  validateFileSize(fileSize: number): void {
    if (fileSize > MAX_FILE_SIZE) {
      throw new KnowledgeUploadError(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  validateMimeType(mimeType: string): void {
    if (!ALLOWED_FILE_TYPES.includes(mimeType)) {
      throw new KnowledgeUploadError(
        `Invalid file type: ${mimeType}. Only PDF, JPG, PNG, and TXT files are allowed.`
      );
    }
  }
}

export const knowledgeUploadService = new KnowledgeUploadService();
