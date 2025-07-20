#!/bin/bash

# Fix bucket access for investi_gate_test

BUCKET_NAME="investi_gate_test"

echo "🔧 Fixing bucket access for gs://$BUCKET_NAME"

# First, check if uniform bucket-level access is enabled
echo "📋 Checking bucket IAM configuration..."
gsutil uniformbucketlevelaccess get gs://$BUCKET_NAME

# Make bucket publicly readable
echo "🌐 Setting public read access..."
gsutil iam ch allUsers:objectViewer gs://$BUCKET_NAME

# Verify the change
echo "✅ Verifying access..."
gsutil iam get gs://$BUCKET_NAME | grep -A2 "allUsers"

echo ""
echo "🎉 Done! Files in the bucket should now be publicly accessible."
echo ""
echo "Test with:"
echo "curl -I https://storage.googleapis.com/$BUCKET_NAME/[filename]"