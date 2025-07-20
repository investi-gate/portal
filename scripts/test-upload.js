#!/usr/bin/env node

/**
 * Test script to verify GCS upload configuration
 */

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testGCSConnection() {
  console.log('🧪 Testing Google Cloud Storage Configuration\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME || '❌ Not set'}`);
  console.log(`   GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID || '❌ Not set'}`);
  console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || '❌ Not set'}`);
  console.log('');

  if (!process.env.GCS_BUCKET_NAME || !process.env.GCP_PROJECT_ID) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Check if credentials file exists
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
      console.log('✅ Credentials file exists');
    } else {
      console.error('❌ Credentials file not found:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
      process.exit(1);
    }
  }

  try {
    // Initialize storage client
    let storage;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      storage = new Storage({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GCP_PROJECT_ID,
      });
    } else if (process.env.GCP_PRIVATE_KEY && process.env.GCP_CLIENT_EMAIL) {
      storage = new Storage({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: {
          client_email: process.env.GCP_CLIENT_EMAIL,
          private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      });
    } else {
      console.error('❌ No credentials configured');
      process.exit(1);
    }

    console.log('✅ Storage client initialized');

    // Test bucket access
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    const [exists] = await bucket.exists();
    
    if (exists) {
      console.log('✅ Bucket exists and is accessible');
    } else {
      console.error('❌ Bucket does not exist or is not accessible');
      process.exit(1);
    }

    // Test file upload
    console.log('\n📤 Testing file upload...');
    
    const testFileName = `test-${Date.now()}.txt`;
    const testContent = 'InvestiGate GCS test file';
    
    const file = bucket.file(testFileName);
    await file.save(testContent, {
      metadata: {
        contentType: 'text/plain',
      },
    });
    
    console.log('✅ Test file uploaded successfully');
    
    // Get public URL (bucket should have public access configured)
    const publicUrl = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${testFileName}`;
    console.log('🌐 Public URL:', publicUrl);
    console.log('   (Note: Bucket uses uniform access - files inherit bucket permissions)');
    
    // Clean up test file
    await file.delete();
    console.log('🧹 Test file cleaned up');
    
    console.log('\n✅ All tests passed! GCS is properly configured.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('Could not load the default credentials')) {
      console.log('\n💡 Make sure you have set up authentication correctly:');
      console.log('   - Check GOOGLE_APPLICATION_CREDENTIALS points to a valid key file');
      console.log('   - Or set GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY in .env');
    }
    
    process.exit(1);
  }
}

// Run the test
testGCSConnection().catch(console.error);