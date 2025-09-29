#!/bin/bash

# Quick Test Runner - Runs core tests only
# For development and CI pipeline

set -e

echo "🧪 RevManager - Quick Test Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Installing Dependencies...${NC}"
npm install

echo -e "${BLUE}🔄 Running Unit Tests...${NC}"
if npm run test:unit -- --passWithNoTests; then
    echo -e "${GREEN}✅ Unit Tests PASSED${NC}"
else
    echo -e "${RED}❌ Unit Tests FAILED${NC}"
    exit 1
fi

echo -e "${BLUE}🔄 Running Integration Tests...${NC}"
if npm run test:integration -- --passWithNoTests; then
    echo -e "${GREEN}✅ Integration Tests PASSED${NC}"
else
    echo -e "${RED}❌ Integration Tests FAILED${NC}"
    exit 1
fi

echo -e "${BLUE}🔄 Running Backend Tests...${NC}"
cd server && npm install
if npm test; then
    echo -e "${GREEN}✅ Backend Tests PASSED${NC}"
else
    echo -e "${RED}❌ Backend Tests FAILED${NC}"
    exit 1
fi
cd ..

echo -e "\n${GREEN}🎉 Quick test suite completed successfully!${NC}"