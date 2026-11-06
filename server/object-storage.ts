import { Storage, File } from "@google-cloud/storage";
import { randomUUID } from "crypto";
import path from "path";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const ALLOWED_PHOTO_ID_TYPES = [
  "image/jpeg",
  "image/jpg", 
  "image/png",
  "application/pdf"
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Validate Object Storage environment
if (!process.env.PRIVATE_OBJECT_DIR) {
  console.warn('[OBJECT STORAGE] PRIVATE_OBJECT_DIR not set - file uploads will fail');
  console.warn('[OBJECT STORAGE] Create a bucket in Object Storage tool and set PRIVATE_OBJECT_DIR');
}

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
  retryOptions: {
    autoRetry: true,
    maxRetries: 3,
    retryDelayMultiplier: 2,
  },
});

export class ObjectStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjectStorageError";
    Object.setPrototypeOf(this, ObjectStorageError.prototype);
  }
}

export class PhotoIdStorageService {
  private getPhotoIdDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new ObjectStorageError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (e.g., /bucket-name/photo-ids)."
      );
    }
    return dir;
  }

  async getPhotoIdUploadURL(candidateId: string, fileName: string, mimeType: string): Promise<{ uploadURL: string; storageKey: string }> {
    if (!ALLOWED_PHOTO_ID_TYPES.includes(mimeType)) {
      throw new ObjectStorageError(
        `Invalid file type: ${mimeType}. Only JPEG, PNG, and PDF files are allowed.`
      );
    }

    const photoIdDir = this.getPhotoIdDir();
    const fileId = randomUUID();
    const fileExtension = this.getFileExtension(mimeType);
    const storageKey = `${photoIdDir}/candidate-${candidateId}/${fileId}${fileExtension}`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const uploadURL = await this.signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return {
      uploadURL,
      storageKey,
    };
  }

  async getSignedDownloadURL(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Photo ID not found: ${storageKey}`);
    }

    return await this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  async deletePhotoId(storageKey: string): Promise<void> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Photo ID not found: ${storageKey}`);
    }

    await file.delete();
  }

  async verifyFileExists(storageKey: string): Promise<boolean> {
    try {
      const { bucketName, objectName } = this.parseObjectPath(storageKey);
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async getFileMetadata(storageKey: string): Promise<{ size: number; contentType: string; created: Date }> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectStorageError(`Photo ID not found: ${storageKey}`);
    }

    const [metadata] = await file.getMetadata();
    
    return {
      size: parseInt(metadata.size || "0"),
      contentType: metadata.contentType || "application/octet-stream",
      created: new Date(metadata.timeCreated || Date.now()),
    };
  }

  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "application/pdf": ".pdf",
    };
    return extensions[mimeType] || "";
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new ObjectStorageError("Invalid path: must contain at least a bucket name");
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
      throw new ObjectStorageError(
        `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit and have Object Storage set up`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  validateFileSize(fileSize: number): void {
    if (fileSize > MAX_FILE_SIZE) {
      throw new ObjectStorageError(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  validateMimeType(mimeType: string): void {
    if (!ALLOWED_PHOTO_ID_TYPES.includes(mimeType)) {
      throw new ObjectStorageError(
        `Invalid file type: ${mimeType}. Only JPEG, PNG, and PDF files are allowed.`
      );
    }
  }
}

export const photoIdStorage = new PhotoIdStorageService();

export class InspectionStorageService {
  private getInspectionDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new ObjectStorageError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (e.g., /bucket-name/inspections)."
      );
    }
    return dir;
  }

  async uploadInspectionPdf(buffer: Buffer, fileName: string): Promise<string> {
    const inspectionDir = this.getInspectionDir();
    const fileId = randomUUID();
    const storageKey = `${inspectionDir}/inspections/${fileId}.pdf`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    await file.save(buffer, {
      contentType: "application/pdf",
      metadata: {
        originalName: fileName,
      },
    });

    return storageKey;
  }

  async downloadInspectionPdf(storageKey: string): Promise<Buffer> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectStorageError(`Inspection PDF not found: ${storageKey}`);
    }

    const [buffer] = await file.download();
    return buffer;
  }

  async getSignedDownloadURL(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Inspection PDF not found: ${storageKey}`);
    }

    return await this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new ObjectStorageError("Invalid path: must contain at least a bucket name");
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
      throw new ObjectStorageError(
        `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit and have Object Storage set up`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }
}

export const inspectionStorage = new InspectionStorageService();

export class MaintenancePhotoStorageService {
  private getMaintenancePhotoDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new ObjectStorageError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (e.g., /bucket-name/maintenance-photos)."
      );
    }
    return dir;
  }

  async getPhotoUploadURL(
    maintenanceRequestId: string,
    fileName: string,
    mimeType: string
  ): Promise<{ uploadURL: string; storageKey: string }> {
    if (!ALLOWED_PHOTO_ID_TYPES.includes(mimeType)) {
      throw new ObjectStorageError(
        `Invalid file type: ${mimeType}. Only JPEG, PNG, and PDF files are allowed.`
      );
    }

    const photoDir = this.getMaintenancePhotoDir();
    const fileId = randomUUID();
    const fileExtension = this.getFileExtension(mimeType);
    const storageKey = `${photoDir}/maintenance-${maintenanceRequestId}/${fileId}${fileExtension}`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const uploadURL = await this.signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return {
      uploadURL,
      storageKey,
    };
  }

  async uploadMaintenancePhoto(
    buffer: Buffer,
    filename: string,
    maintenanceRequestId: string
  ): Promise<string> {
    const photoDir = this.getMaintenancePhotoDir();
    const fileId = randomUUID();
    const fileExtension = path.extname(filename) || ".jpg";
    const storageKey = `${photoDir}/maintenance-${maintenanceRequestId}/${fileId}${fileExtension}`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    await file.save(buffer, {
      contentType: this.getMimeTypeFromExtension(fileExtension),
      metadata: {
        originalName: filename,
      },
    });

    return storageKey;
  }

  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".pdf": "application/pdf",
    };
    return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
  }

  async getSignedDownloadURL(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Maintenance photo not found: ${storageKey}`);
    }

    return await this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  async deletePhoto(storageKey: string): Promise<void> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Maintenance photo not found: ${storageKey}`);
    }

    await file.delete();
  }

  async verifyFileExists(storageKey: string): Promise<boolean> {
    try {
      const { bucketName, objectName } = this.parseObjectPath(storageKey);
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async getFileMetadata(storageKey: string): Promise<{ size: number; contentType: string; created: Date }> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectStorageError(`Maintenance photo not found: ${storageKey}`);
    }

    const [metadata] = await file.getMetadata();
    
    return {
      size: parseInt(metadata.size || "0"),
      contentType: metadata.contentType || "application/octet-stream",
      created: new Date(metadata.timeCreated || Date.now()),
    };
  }

  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "application/pdf": ".pdf",
    };
    return extensions[mimeType] || "";
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new ObjectStorageError("Invalid path: must contain at least a bucket name");
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
      throw new ObjectStorageError(
        `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit and have Object Storage set up`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  validateFileSize(fileSize: number): void {
    if (fileSize > MAX_FILE_SIZE) {
      throw new ObjectStorageError(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  validateMimeType(mimeType: string): void {
    if (!ALLOWED_PHOTO_ID_TYPES.includes(mimeType)) {
      throw new ObjectStorageError(
        `Invalid file type: ${mimeType}. Only JPEG, PNG, and PDF files are allowed.`
      );
    }
  }
}

export const maintenancePhotoStorage = new MaintenancePhotoStorageService();

const ALLOWED_CONTRACT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

export class AstContractStorageService {
  private getContractDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new ObjectStorageError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (e.g., /bucket-name/ast-contracts)."
      );
    }
    return dir;
  }

  async uploadContract(
    buffer: Buffer,
    fileName: string,
    tenancyId: string,
    mimeType: string
  ): Promise<string> {
    if (!ALLOWED_CONTRACT_TYPES.includes(mimeType)) {
      throw new ObjectStorageError(
        `Invalid file type: ${mimeType}. Only PDF, DOC, and DOCX files are allowed.`
      );
    }

    const contractDir = this.getContractDir();
    const fileId = randomUUID();
    const fileExtension = this.getFileExtension(mimeType);
    const storageKey = `${contractDir}/tenancy-${tenancyId}/${fileId}${fileExtension}`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    await file.save(buffer, {
      contentType: mimeType,
      metadata: {
        originalName: fileName,
        tenancyId,
      },
    });

    return storageKey;
  }

  async getSignedDownloadURL(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Contract not found: ${storageKey}`);
    }

    return await this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  async deleteContract(storageKey: string): Promise<void> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Contract not found: ${storageKey}`);
    }

    await file.delete();
  }

  async verifyFileExists(storageKey: string): Promise<boolean> {
    try {
      const { bucketName, objectName } = this.parseObjectPath(storageKey);
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async getFileMetadata(storageKey: string): Promise<{ size: number; contentType: string; created: Date }> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectStorageError(`Contract not found: ${storageKey}`);
    }

    const [metadata] = await file.getMetadata();
    
    return {
      size: parseInt(metadata.size || "0"),
      contentType: metadata.contentType || "application/octet-stream",
      created: new Date(metadata.timeCreated || Date.now()),
    };
  }

  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      "application/pdf": ".pdf",
      "application/msword": ".doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    };
    return extensions[mimeType] || "";
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new ObjectStorageError("Invalid path: must contain at least a bucket name");
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
      throw new ObjectStorageError(
        `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit and have Object Storage set up`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  validateFileSize(fileSize: number): void {
    if (fileSize > MAX_FILE_SIZE) {
      throw new ObjectStorageError(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  validateMimeType(mimeType: string): void {
    if (!ALLOWED_CONTRACT_TYPES.includes(mimeType)) {
      throw new ObjectStorageError(
        `Invalid file type: ${mimeType}. Only PDF, DOC, and DOCX files are allowed.`
      );
    }
  }
}

export const astContractStorage = new AstContractStorageService();

export class EquipmentPhotoStorageService {
  private getEquipmentPhotoDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new ObjectStorageError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (e.g., /bucket-name/equipment-photos)."
      );
    }
    return dir;
  }

  async uploadEquipmentPhoto(
    buffer: Buffer,
    filename: string,
    equipmentId: string
  ): Promise<string> {
    const photoDir = this.getEquipmentPhotoDir();
    const fileId = randomUUID();
    const fileExtension = path.extname(filename) || ".jpg";
    const storageKey = `${photoDir}/equipment-${equipmentId}/${fileId}${fileExtension}`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    await file.save(buffer, {
      contentType: this.getMimeTypeFromExtension(fileExtension),
      metadata: {
        originalName: filename,
      },
    });

    return storageKey;
  }

  async getEquipmentPhotoUrl(equipmentId: string): Promise<string[]> {
    const photoDir = this.getEquipmentPhotoDir();
    const prefix = `${photoDir}/equipment-${equipmentId}/`;
    
    const { bucketName, objectName } = this.parseObjectPath(prefix);
    const bucket = objectStorageClient.bucket(bucketName);
    
    const [files] = await bucket.getFiles({ prefix: objectName });
    
    const urls = await Promise.all(
      files.map(async (file) => {
        return await this.signObjectURL({
          bucketName,
          objectName: file.name,
          method: "GET",
          ttlSec: 3600,
        });
      })
    );
    
    return urls;
  }

  async getPhotoUploadURL(
    equipmentId: string,
    fileName: string,
    mimeType: string
  ): Promise<{ uploadURL: string; storageKey: string }> {
    if (!ALLOWED_PHOTO_ID_TYPES.includes(mimeType)) {
      throw new ObjectStorageError(
        `Invalid file type: ${mimeType}. Only JPEG, PNG, and PDF files are allowed.`
      );
    }

    const photoDir = this.getEquipmentPhotoDir();
    const fileId = randomUUID();
    const fileExtension = this.getFileExtension(mimeType);
    const storageKey = `${photoDir}/equipment-${equipmentId}/${fileId}${fileExtension}`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const uploadURL = await this.signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return {
      uploadURL,
      storageKey,
    };
  }

  async getSignedDownloadURL(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Equipment photo not found: ${storageKey}`);
    }

    return await this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  async deletePhoto(storageKey: string): Promise<void> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Equipment photo not found: ${storageKey}`);
    }

    await file.delete();
  }

  async verifyFileExists(storageKey: string): Promise<boolean> {
    try {
      const { bucketName, objectName } = this.parseObjectPath(storageKey);
      const file = objectStorageClient.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }

  async getFileMetadata(storageKey: string): Promise<{ size: number; contentType: string; created: Date }> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectStorageError(`Equipment photo not found: ${storageKey}`);
    }

    const [metadata] = await file.getMetadata();
    
    return {
      size: parseInt(metadata.size || "0"),
      contentType: metadata.contentType || "application/octet-stream",
      created: new Date(metadata.timeCreated || Date.now()),
    };
  }

  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".pdf": "application/pdf",
    };
    return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
  }

  private getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/png": ".png",
      "application/pdf": ".pdf",
    };
    return extensions[mimeType] || "";
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new ObjectStorageError("Invalid path: must contain at least a bucket name");
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
      throw new ObjectStorageError(
        `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit and have Object Storage set up`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }

  validateFileSize(fileSize: number): void {
    if (fileSize > MAX_FILE_SIZE) {
      throw new ObjectStorageError(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  validateMimeType(mimeType: string): void {
    if (!ALLOWED_PHOTO_ID_TYPES.includes(mimeType)) {
      throw new ObjectStorageError(
        `Invalid file type: ${mimeType}. Only JPEG, PNG, and PDF files are allowed.`
      );
    }
  }
}

export const equipmentPhotoStorage = new EquipmentPhotoStorageService();

export class LinenDeliveryNoteStorageService {
  private getLinenDeliveryNoteDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new ObjectStorageError(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var (e.g., /bucket-name/linen-delivery-notes)."
      );
    }
    return dir;
  }

  async uploadLinenDeliveryNotePdf(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const deliveryNoteDir = this.getLinenDeliveryNoteDir();
    const fileId = randomUUID();
    const storageKey = `${deliveryNoteDir}/${fileName}`;

    const { bucketName, objectName } = this.parseObjectPath(storageKey);
    
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    await file.save(buffer, {
      contentType: mimeType,
      metadata: {
        originalName: fileName,
      },
    });

    // Return signed URL
    return await this.getSignedDownloadURL(storageKey);
  }

  async getSignedDownloadURL(storageKey: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = this.parseObjectPath(storageKey);

    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();

    if (!exists) {
      throw new ObjectStorageError(`Linen delivery note PDF not found: ${storageKey}`);
    }

    return await this.signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new ObjectStorageError("Invalid path: must contain at least a bucket name");
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
      throw new ObjectStorageError(
        `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit and have Object Storage set up`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }
}

export const linenDeliveryNoteStorage = new LinenDeliveryNoteStorageService();
