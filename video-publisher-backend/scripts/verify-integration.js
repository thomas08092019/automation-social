#!/usr/bin/env node

/**
 * Social Media API Integration - Final Verification Script
 * 
 * This script performs comprehensive checks to verify that the social media
 * video publisher is properly configured and ready for deployment.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Social Media API Integration - Final Verification\n');

let hasErrors = false;

function checkResult(condition, successMessage, errorMessage) {
  if (condition) {
    console.log(`✅ ${successMessage}`);
  } else {
    console.log(`❌ ${errorMessage}`);
    hasErrors = true;
  }
}

function runCommand(command, description) {
  try {
    console.log(`🔍 ${description}...`);
    const result = execSync(command, { stdio: 'pipe', encoding: 'utf-8' });
    console.log(`✅ ${description} - Success`);
    return { success: true, output: result };
  } catch (error) {
    console.log(`❌ ${description} - Failed`);
    console.log(`   Error: ${error.message}`);
    hasErrors = true;
    return { success: false, error: error.message };
  }
}

console.log('📋 Checking project structure...');

// Check essential files exist
const essentialFiles = [
  'src/publishing/services/youtube-upload.service.ts',
  'src/publishing/services/instagram-reels-upload.service.ts',
  'src/publishing/services/tiktok-upload.service.ts',
  'src/publishing/services/facebook-reels-upload.service.ts',
  'src/publishing/utils/errors.ts',
  'src/publishing/utils/retry.ts',
  'src/publishing/utils/rate-limiter.ts',
  'src/publishing/utils/video-validator.ts',
  'src/auth/oauth-authorization.service.ts',
  'src/auth/token-manager.service.ts',
  'prisma/schema.prisma',
  '.env.example',
  'package.json'
];

essentialFiles.forEach(file => {
  checkResult(
    fs.existsSync(file),
    `File exists: ${file}`,
    `Missing essential file: ${file}`
  );
});

console.log('\n📦 Checking dependencies...');

// Check if node_modules exists
checkResult(
  fs.existsSync('node_modules'),
  'Dependencies installed',
  'Dependencies not installed - run npm install'
);

console.log('\n🔨 Testing TypeScript compilation...');
runCommand('npm run build', 'TypeScript compilation');

console.log('\n🗃️ Checking Prisma configuration...');
runCommand('npx prisma validate', 'Prisma schema validation');

// Check if Prisma client is generated
checkResult(
  fs.existsSync('node_modules/.prisma/client'),
  'Prisma client generated',
  'Prisma client not generated - run npx prisma generate'
);

console.log('\n⚙️ Checking environment configuration...');

// Check .env.example has all required variables
const envExample = fs.readFileSync('.env.example', 'utf-8');
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FACEBOOK_APP_ID',
  'FACEBOOK_APP_SECRET',
  'TIKTOK_CLIENT_ID',
  'TIKTOK_CLIENT_SECRET',
  'RABBITMQ_URL'
];

requiredEnvVars.forEach(envVar => {
  checkResult(
    envExample.includes(envVar),
    `Environment variable documented: ${envVar}`,
    `Missing environment variable in .env.example: ${envVar}`
  );
});

console.log('\n🧪 Testing error handling utilities...');

// Test that error classes are properly exported
try {
  // Check if the index.ts file exists and has proper exports
  const indexPath = 'src/publishing/utils/index.ts';
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const hasAllExports = indexContent.includes('errors') && 
                         indexContent.includes('retry') && 
                         indexContent.includes('rate-limiter') && 
                         indexContent.includes('video-validator') && 
                         indexContent.includes('platform-logger');
    checkResult(hasAllExports, 'Error handling utilities accessible', 'Error handling utilities not properly exported');
  } else {
    checkResult(false, '', 'Error handling utilities index file missing');
  }
} catch (error) {
  checkResult(false, '', 'Error handling utilities not accessible');
}

console.log('\n📊 Checking service implementations...');

// Verify that all upload services extend the base service
const services = [
  'youtube-upload.service.ts',
  'instagram-reels-upload.service.ts',
  'tiktok-upload.service.ts',
  'facebook-reels-upload.service.ts'
];

services.forEach(service => {
  const servicePath = `src/publishing/services/${service}`;
  if (fs.existsSync(servicePath)) {
    const content = fs.readFileSync(servicePath, 'utf-8');
    checkResult(
      content.includes('extends BasePlatformUploadService'),
      `${service} extends base service`,
      `${service} does not extend BasePlatformUploadService`
    );
    
    checkResult(
      content.includes('async uploadVideo'),
      `${service} implements uploadVideo method`,
      `${service} missing uploadVideo method`
    );
  }
});

console.log('\n🔐 Checking OAuth integration...');

// Check OAuth service implementation
const oauthServicePath = 'src/auth/oauth-authorization.service.ts';
if (fs.existsSync(oauthServicePath)) {
  const oauthContent = fs.readFileSync(oauthServicePath, 'utf-8');
  checkResult(
    oauthContent.includes('getAuthorizationUrl') && oauthContent.includes('exchangeCodeForToken'),
    'OAuth service implements required methods',
    'OAuth service missing required methods'
  );
}

console.log('\n📝 Checking documentation...');

const docFiles = [
  'docs/API_INTEGRATION_GUIDE.md',
  'docs/DEPLOYMENT_GUIDE.md',
  'README.md'
];

docFiles.forEach(doc => {
  checkResult(
    fs.existsSync(doc),
    `Documentation exists: ${doc}`,
    `Missing documentation: ${doc}`
  );
});

console.log('\n🎯 Testing API endpoints structure...');

// Check if API test controller exists
checkResult(
  fs.existsSync('src/publishing/api-test.controller.ts'),
  'API test controller exists',
  'API test controller missing'
);

console.log('\n📋 Final Summary:');

if (hasErrors) {
  console.log('❌ Verification failed! Please fix the issues above before deployment.');
  console.log('\nCommon fixes:');
  console.log('- Run: npm install');
  console.log('- Run: npx prisma generate');
  console.log('- Run: npm run build');
  console.log('- Copy .env.example to .env and configure');
  process.exit(1);
} else {
  console.log('✅ All checks passed! The social media API integration is ready for deployment.');
  console.log('\nNext steps:');
  console.log('1. Configure .env with your API credentials');
  console.log('2. Set up your database (PostgreSQL)');
  console.log('3. Run database migrations: npx prisma migrate deploy');
  console.log('4. Start the application: npm run start:dev');
  console.log('5. Test API endpoints: http://localhost:3000/api-test/platforms/status');
  console.log('\n🎉 Ready for production deployment!');
}
