#!/bin/bash

# HSSE Reporting Deployment Script
# This script automates the deployment process for the HSSE reporting application

set -e

echo "🚀 Starting HSSE Reporting Deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create uploads directory if it doesn't exist
if [ ! -d "./uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p ./uploads
    chmod 755 ./uploads
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local file not found!"
    echo "Please create a .env.local file with your configuration."
    echo "You can use the environment variables from DEPLOYMENT.md as a template."
    exit 1
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down || true

# Build and start the application
echo "🏗️  Building and starting the application..."
docker-compose up -d --build

# Wait for the application to start
echo "⏳ Waiting for application to start..."
sleep 10

# Check if containers are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Application started successfully!"
    echo "🌐 Application is running at: http://localhost:3000"
    echo "📊 Using external MongoDB database"
    echo ""
    echo "To view logs: docker-compose logs -f"
    echo "To stop: docker-compose down"
else
    echo "❌ Application failed to start. Check logs with: docker-compose logs"
    exit 1
fi

# Ask if user wants to seed the database
read -p "Do you want to seed the database with initial data? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    docker-compose exec app npm run seed || echo "⚠️  Database seeding failed or already seeded"
fi

echo "🎉 Deployment complete!"
echo "📖 See DEPLOYMENT.md for more management commands and troubleshooting." 