#!/bin/bash

# Deployment Script for Linchpin Dashboard
# This script handles database setup with NeonDB and deployment to Vercel.

set -e

echo "🚀 Starting Deployment Process..."

# 1. Check for Vercel CLI
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI not found. Please install it with 'npm i -g vercel'"
    exit 1
fi

# 2. Prisma Generate
echo "📦 Generating Prisma Client..."
npm run prisma:generate

# 3. Push Schema to NeonDB
echo "🗄️ Pushing schema to NeonDB..."
npm run prisma:push

# 4. Seed the Database
echo "🌱 Seeding database (including Sachin's account)..."
npm run seed

# 5. Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel deploy --prod --yes

echo "✨ Deployment Finished!"
