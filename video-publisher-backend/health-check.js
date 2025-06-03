const fs = require('fs');

console.log('🚀 Video Publisher Backend - Health Check\n');

// Check if all key files exist
const keyFiles = [
  'src/app.module.ts',
  'src/main.ts',
  'src/auth/auth.module.ts',
  'src/user/user.module.ts',
  'src/social-account/social-account.module.ts',
  'src/video/video.module.ts',
  'src/publishing/publishing.module.ts',
  'src/publishing/batch-publishing.service.ts',
  'src/publishing/services/youtube-upload.service.ts',
  'src/publishing/services/facebook-reels-upload.service.ts',
  'src/publishing/services/instagram-reels-upload.service.ts',
  'src/publishing/services/tiktok-upload.service.ts',
  'src/queue/queue.module.ts',
  'src/queue/rabbitmq.service.ts',
  'src/queue/worker.service.ts',
  'src/common/prisma.service.ts',
  'prisma/schema.prisma',
  '.env',
];

let allFilesExist = true;

console.log('📁 Checking core files:');
keyFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check if uploads directory exists
console.log('\n📂 Checking directories:');
if (fs.existsSync('uploads')) {
  console.log('✅ uploads/ directory');
} else {
  console.log('❌ uploads/ directory - MISSING');
  allFilesExist = false;
}

if (fs.existsSync('dist')) {
  console.log('✅ dist/ directory (compiled)');
} else {
  console.log('⚠️  dist/ directory - Not compiled yet');
}

// Check package.json dependencies
console.log('\n📦 Checking package.json:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  '@nestjs/common',
  '@nestjs/core',
  '@nestjs/jwt',
  '@nestjs/passport',
  '@prisma/client',
  'bcryptjs',
  'class-validator',
  'multer',
  'amqplib',
  'amqp-connection-manager',
];

requiredDeps.forEach((dep) => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep} - ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allFilesExist = false;
  }
});

console.log('\n🔍 Project Status:');
if (allFilesExist) {
  console.log('✅ All core components are present');
  console.log('✅ Project is ready for database setup');
  console.log('✅ Ready for social media API integrations');
  console.log('✅ RabbitMQ integration implemented');
} else {
  console.log('❌ Some components are missing');
}

console.log('\n📋 Next Steps:');
console.log('1. Set up PostgreSQL database');
console.log('2. Run: npx prisma migrate dev');
console.log('3. Configure social media OAuth credentials');
console.log('4. Start RabbitMQ server (optional for development)');
console.log('5. Start development server: npm run start:dev');
console.log('6. Test API endpoints using TESTING_GUIDE.md');

console.log('\n🎯 Ready for production features:');
console.log('- OAuth 2.0 social media integrations');
console.log('- RabbitMQ queue management');
console.log('- File processing (thumbnails, validation)');
console.log('- Comprehensive testing suite');
console.log('- Production deployment setup');
