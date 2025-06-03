#!/bin/bash

# Video Publisher Backend Setup Script
echo "🚀 Setting up Video Publisher Backend..."

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# 3. Check if PostgreSQL is running (skip migration for now)
echo "📄 Note: Make sure PostgreSQL is running and DATABASE_URL is configured in .env"
echo "📄 To run migrations: npx prisma migrate dev --name init"

# 4. Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads

# 5. Build the project
echo "🔨 Building the project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up PostgreSQL database"
echo "2. Update DATABASE_URL in .env file"
echo "3. Run: npx prisma migrate dev --name init"
echo "4. Start the server: npm run start:dev"
echo ""
echo "API will be available at: http://localhost:3001"
echo "API Documentation: See API_EXAMPLES.md"
