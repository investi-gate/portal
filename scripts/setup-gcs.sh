#!/bin/bash

# Google Cloud Storage Setup Script for InvestiGate
# This script helps set up GCS for media uploads

set -e

echo "🚀 InvestiGate GCS Setup Script"
echo "================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)

if [ -z "$CURRENT_PROJECT" ]; then
    echo "❌ No GCP project set. Please run 'gcloud init' first."
    exit 1
fi

echo "📋 Current GCP Project: $CURRENT_PROJECT"
read -p "Is this the correct project? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set the correct project with: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Enable APIs
echo "🔧 Enabling required APIs..."
gcloud services enable storage-component.googleapis.com
gcloud services enable storage-api.googleapis.com

# Create bucket
BUCKET_NAME="investi_gate_test"
echo "🪣 Creating bucket: gs://$BUCKET_NAME"

if gsutil ls -b gs://$BUCKET_NAME &>/dev/null; then
    echo "✅ Bucket already exists"
else
    gsutil mb -l us-central1 gs://$BUCKET_NAME
    echo "✅ Bucket created"
fi

# Set public access
echo "🌐 Making bucket publicly readable..."
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Set CORS
echo "🔄 Setting CORS policy..."
cat > /tmp/cors.json << EOF
[{
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["*"],
    "maxAgeSeconds": 3600
}]
EOF
gsutil cors set /tmp/cors.json gs://$BUCKET_NAME
rm /tmp/cors.json

# Create service account
SERVICE_ACCOUNT_NAME="investi-gate-media"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$CURRENT_PROJECT.iam.gserviceaccount.com"

echo "👤 Creating service account: $SERVICE_ACCOUNT_NAME"

if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
    echo "✅ Service account already exists"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="InvestiGate Media Service" \
        --description="Service account for media uploads"
    echo "✅ Service account created"
fi

# Grant permissions
echo "🔐 Granting Storage Admin role..."
gcloud projects add-iam-policy-binding $CURRENT_PROJECT \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.admin" \
    --quiet

# Create key
KEY_FILE="$HOME/investi-gate-media-key.json"
echo "🔑 Creating service account key..."

if [ -f "$KEY_FILE" ]; then
    read -p "Key file already exists. Overwrite? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing key file: $KEY_FILE"
    else
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SERVICE_ACCOUNT_EMAIL
        chmod 600 $KEY_FILE
        echo "✅ New key created: $KEY_FILE"
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SERVICE_ACCOUNT_EMAIL
    chmod 600 $KEY_FILE
    echo "✅ Key created: $KEY_FILE"
fi

# Update .env file
ENV_FILE="../.env"
echo ""
echo "📝 Updating .env file..."

if [ -f "$ENV_FILE" ]; then
    # Backup existing .env
    cp $ENV_FILE "${ENV_FILE}.backup"
    echo "✅ Backed up existing .env to .env.backup"
    
    # Update or add GCP settings
    if grep -q "GCP_PROJECT_ID=" $ENV_FILE; then
        sed -i '' "s/GCP_PROJECT_ID=.*/GCP_PROJECT_ID=$CURRENT_PROJECT/" $ENV_FILE
    else
        echo "GCP_PROJECT_ID=$CURRENT_PROJECT" >> $ENV_FILE
    fi
    
    if grep -q "GOOGLE_APPLICATION_CREDENTIALS=" $ENV_FILE; then
        sed -i '' "s|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE|" $ENV_FILE
    else
        echo "GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE" >> $ENV_FILE
    fi
    
    echo "✅ Updated .env file"
else
    echo "❌ .env file not found. Please create it from .env.example"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Summary:"
echo "   - Bucket: gs://$BUCKET_NAME"
echo "   - Project: $CURRENT_PROJECT"
echo "   - Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "   - Key File: $KEY_FILE"
echo ""
echo "🎉 You can now upload images to GCS!"
echo ""
echo "⚠️  Important reminders:"
echo "   1. Never commit the key file to git"
echo "   2. Add *.json to your .gitignore"
echo "   3. Keep the key file secure"