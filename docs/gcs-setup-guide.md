# Google Cloud Storage Setup Guide

This guide will help you set up Google Cloud Storage for media uploads in the InvestiGate portal.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. `gcloud` CLI installed ([install guide](https://cloud.google.com/sdk/docs/install))
3. A GCP project created

## Step 1: Set up gcloud CLI

```bash
# Initialize gcloud (if not already done)
gcloud init

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

## Step 2: Enable Required APIs

```bash
# Enable Cloud Storage API
gcloud services enable storage-component.googleapis.com
gcloud services enable storage-api.googleapis.com
```

## Step 3: Create the Storage Bucket

```bash
# Create the bucket
gsutil mb -l us-central1 gs://investi_gate_test

# Make bucket publicly readable (so uploaded images can be viewed)
gsutil iam ch allUsers:objectViewer gs://investi_gate_test

# Set CORS policy (optional, for browser uploads)
echo '[{"origin": ["*"],"method": ["GET", "POST", "PUT", "DELETE"],"responseHeader": ["*"],"maxAgeSeconds": 3600}]' > cors.json
gsutil cors set cors.json gs://investi_gate_test
rm cors.json
```

## Step 4: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create investi-gate-media \
  --display-name="InvestiGate Media Service" \
  --description="Service account for media uploads"

# Grant Storage Admin role to the service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:investi-gate-media@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create ~/investi-gate-media-key.json \
  --iam-account=investi-gate-media@YOUR_PROJECT_ID.iam.gserviceaccount.com

echo "Service account key saved to: ~/investi-gate-media-key.json"
```

## Step 5: Configure Environment Variables

### Option 1: Using Service Account Key File (Recommended for local development)

Edit your `.env` file:

```bash
# Database (keep existing)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/investi_gate?sslmode=disable

# Google Cloud Storage
GCS_BUCKET_NAME=investi_gate_test
GCP_PROJECT_ID=YOUR_PROJECT_ID_HERE

# Path to service account key file
GOOGLE_APPLICATION_CREDENTIALS=/Users/YOUR_USERNAME/investi-gate-media-key.json
```

### Option 2: Using Environment Variables (Good for CI/CD)

If you prefer not to use a key file, you can extract the credentials:

```bash
# View the key file
cat ~/investi-gate-media-key.json
```

Then add to `.env`:

```bash
# Database (keep existing)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/investi_gate?sslmode=disable

# Google Cloud Storage
GCS_BUCKET_NAME=investi_gate_test
GCP_PROJECT_ID=YOUR_PROJECT_ID_HERE

# Service account credentials
GCP_CLIENT_EMAIL=investi-gate-media@YOUR_PROJECT_ID.iam.gserviceaccount.com
GCP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

**Important**: When copying the private key, make sure to:
- Keep the quotes around the entire key
- Replace actual newlines with `\n`
- Include the BEGIN and END markers

## Step 6: Test the Setup

1. Start your development server:
   ```bash
   cd /Users/mgorunuch/projects/investi-gate
   task portal
   ```

2. Test file upload via curl:
   ```bash
   # Create a test image
   curl -o test.jpg https://via.placeholder.com/300

   # Upload it
   curl -X POST http://localhost:30001/api/media \
     -F "file=@test.jpg"
   ```

3. If successful, you'll get a response with the media URL

## Step 7: Verify in GCS Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/storage)
2. Navigate to your bucket `investi_gate_test`
3. You should see uploaded files there

## Troubleshooting

### Common Issues:

1. **"Permission denied" errors**
   - Ensure the service account has Storage Admin role
   - Check that the bucket name matches exactly

2. **"Invalid key file" errors**
   - Verify the path to the key file is absolute, not relative
   - Check file permissions: `chmod 600 ~/investi-gate-media-key.json`

3. **"Bucket not found" errors**
   - Ensure bucket exists: `gsutil ls gs://investi_gate_test`
   - Check the bucket name in `.env` matches exactly

4. **CORS issues (if uploading from browser)**
   - Re-apply CORS configuration from Step 3

### Check your configuration:

```bash
# Verify environment variables are loaded
cd /Users/mgorunuch/projects/investi-gate/portal
node -e "console.log({
  bucket: process.env.GCS_BUCKET_NAME,
  project: process.env.GCP_PROJECT_ID,
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
})"
```

## Security Best Practices

1. **Never commit the `.env` file or key files to git**
   - Add to `.gitignore`: `.env` and `*.json` key files

2. **Restrict service account permissions**
   - For production, create a custom role with only necessary permissions
   - Limit to specific bucket access

3. **Rotate keys regularly**
   ```bash
   # List existing keys
   gcloud iam service-accounts keys list \
     --iam-account=investi-gate-media@YOUR_PROJECT_ID.iam.gserviceaccount.com
   
   # Delete old keys
   gcloud iam service-accounts keys delete KEY_ID \
     --iam-account=investi-gate-media@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

## Example .env file

Here's a complete example with placeholder values:

```bash
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/investi_gate?sslmode=disable

# Google Cloud Storage
GCS_BUCKET_NAME=investi_gate_test
GCP_PROJECT_ID=my-project-123456

# Service account key file (use full absolute path)
GOOGLE_APPLICATION_CREDENTIALS=/Users/mgorunuch/investi-gate-media-key.json
```

Replace:
- `my-project-123456` with your actual GCP project ID
- `/Users/mgorunuch/` with your actual home directory path