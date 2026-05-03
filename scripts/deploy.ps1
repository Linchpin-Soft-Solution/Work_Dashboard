# Deployment Script for Linchpin Dashboard
# This script handles database setup with NeonDB and deployment to Vercel.

param (
    [string]$DatabaseUrl,
    [string]$VercelToken
)

Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Cyan

# 1. Check for Vercel CLI
if (!(Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Vercel CLI not found. Please install it with 'npm i -g vercel'" -ForegroundColor Red
    exit
}

# 2. Set Environment Variables
if ($DatabaseUrl) {
    $env:DATABASE_URL = $DatabaseUrl
    Write-Host "✅ Database URL set." -ForegroundColor Green
} else {
    Write-Host "⚠️ No DATABASE_URL provided. Using existing .env or Vercel environment." -ForegroundColor Yellow
}

# 3. Prisma Generate
Write-Host "📦 Generating Prisma Client..." -ForegroundColor Cyan
npm run prisma:generate

# 4. Push Schema to NeonDB
Write-Host "🗄️ Pushing schema to NeonDB..." -ForegroundColor Cyan
npm run prisma:push

# 5. Seed the Database
Write-Host "🌱 Seeding database (including Sachin's account)..." -ForegroundColor Cyan
npm run seed

# 6. Deploy to Vercel
Write-Host "🌐 Deploying to Vercel..." -ForegroundColor Cyan
if ($VercelToken) {
    vercel deploy --prod --token $VercelToken --yes
} else {
    vercel deploy --prod
}

Write-Host "✨ Deployment Finished!" -ForegroundColor Green
