# Media Upload Configuration

## Overview
The portal supports uploading images to Google Cloud Storage (GCS) bucket named `investi_gate_test`. Images are stored in GCS and referenced in the database via the `media` table.

## Configuration

### Environment Variables
Add these to your `.env` file:

```bash
# Google Cloud Storage
GCS_BUCKET_NAME=investi_gate_test
GCP_PROJECT_ID=your-project-id

# Option 1: Service Account Key File
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Option 2: Environment Variables (alternative to key file)
GCP_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Google Cloud Setup

1. **Create a GCS bucket** named `investi_gate_test`:
   ```bash
   gsutil mb gs://investi_gate_test
   ```

2. **Make bucket publicly readable** (for serving images):
   ```bash
   gsutil iam ch allUsers:objectViewer gs://investi_gate_test
   ```

3. **Create a service account** with Storage Admin permissions:
   ```bash
   gcloud iam service-accounts create investi-gate-uploader \
     --display-name="InvestiGate Media Uploader"
   
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:investi-gate-uploader@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   ```

4. **Download service account key**:
   ```bash
   gcloud iam service-accounts keys create service-account-key.json \
     --iam-account=investi-gate-uploader@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

## Usage

### Uploading Images via UI

1. Create a new entity and select "Image" type
2. Either:
   - Click "Upload an image" and select a file
   - Or enter an existing Media ID

3. Add optional caption and alt text
4. Click "Create Entity"

### Uploading Images via API

```bash
# Upload an image
curl -X POST http://localhost:3000/api/media \
  -F "file=@/path/to/image.jpg"

# Response:
{
  "media": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "file_name": "image.jpg",
    "file_path": "1234567890_abc123_image.jpg",
    "url": "https://storage.googleapis.com/investi_gate_test/1234567890_abc123_image.jpg",
    ...
  }
}
```

### Creating Image Entity

```bash
# Create image entity with uploaded media
curl -X POST http://localhost:3000/api/entity-types/image \
  -H "Content-Type: application/json" \
  -d '{
    "media_id": "123e4567-e89b-12d3-a456-426614174000",
    "caption": "Sample image",
    "alt_text": "Description of image"
  }'
```

## File Storage

- **Supported formats**: JPEG, PNG, WebP, GIF
- **File naming**: `{timestamp}_{random}_{sanitized_original_name}.{ext}`
- **Public URLs**: `https://storage.googleapis.com/investi_gate_test/{filename}`
- **Metadata stored**: width, height, format, original name, upload timestamp

## Database Schema

The `media` table stores:
- `id`: UUID primary key
- `file_name`: Original filename
- `file_path`: GCS object name
- `file_size`: Size in bytes
- `mime_type`: MIME type (e.g., image/jpeg)
- `storage_type`: 'gcs' for Google Cloud Storage
- `url`: Public URL to access the image
- `metadata`: JSON with image dimensions and other data