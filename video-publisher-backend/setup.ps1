# Video Publisher Backend Setup Script for Windows
Write-Host "🚀 Setting up Video Publisher Backend..." -ForegroundColor Green

# 1. Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# 2. Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma client" -ForegroundColor Red
    exit 1
}

# 3. Create uploads directory
Write-Host "📁 Creating uploads directory..." -ForegroundColor Yellow
if (!(Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads"
}

# 4. Build the project
Write-Host "🔨 Building the project..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Set up PostgreSQL database" -ForegroundColor White
Write-Host "2. Update DATABASE_URL in .env file" -ForegroundColor White
Write-Host "3. Run: npx prisma migrate dev --name init" -ForegroundColor White
Write-Host "4. Start the server: npm run start:dev" -ForegroundColor White
Write-Host ""
Write-Host "API will be available at: http://localhost:3001" -ForegroundColor Magenta
Write-Host "API Documentation: See API_EXAMPLES.md" -ForegroundColor Magenta
