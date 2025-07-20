import { Storage } from '@google-cloud/storage';

// Initialize Google Cloud Storage client
let storage: Storage | null = null;

export function getStorageClient(): Storage {
  if (!storage) {
    // Check if we have credentials configured
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Use service account key file
      storage = new Storage({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GCP_PROJECT_ID,
      });
    } else if (process.env.GCP_PRIVATE_KEY && process.env.GCP_CLIENT_EMAIL) {
      // Use environment variables for credentials
      storage = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      });
    } else {
      // Use default credentials (for GCP environments)
      storage = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
      });
    }
  }
  
  return storage;
}

export const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'investi_gate_test';

// Helper function to generate unique file names
export function generateFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.split('.').slice(0, -1).join('.');
  const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
  
  return `${timestamp}_${randomString}_${sanitizedName}.${extension}`;
}

// Helper function to get public URL for a file
export function getPublicUrl(fileName: string): string {
  return `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
}