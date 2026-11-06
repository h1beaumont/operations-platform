
import { MaintenancePhotoStorageService } from "./services/maintenance-photo-storage";

/** Convert stored storage keys (gs://bucket/path or /bucket/path) → signed URLs. */
export async function signMaintenancePhotos(keys: string[]): Promise<string[]> {
  const svc = new MaintenancePhotoStorageService();
  const out: string[] = [];
  for (const k of keys || []) {
    try { 
      out.push(await svc.getSignedDownloadURL(k, 3600)); 
    } catch { 
      /* keep going; omit broken photo */ 
    }
  }
  return out;
}
