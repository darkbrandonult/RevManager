#!/bin/bash

# Comprehensive Test Suite Runner
# Runs all tests with detailed reporting

set -e

echo "🧪 RevManager - Comprehensive Test Suite"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
START_TIME=$(date +%s)

run_test_suite() {
    local suite_name=$1
    local test_command=$2
    local description=$3
    
    echo -e "\n${BLUE}🔄 Running $suite_name...${NC}"
    echo "Description: $description"
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    if eval $test_command; then
        echo -e "${GREEN}✅ $suite_name PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ $suite_name FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    
    echo "----------------------------------------"
}

echo -e "${YELLOW}📋 Test Suite Overview${NC}"
echo "• Unit Tests: Component and utility testing"
echo "• Integration Tests: Cross-component workflows"
echo "• Coverage Reports: Code coverage analysis"
echo "• Performance Tests: Load and response time testing"
echo -e "\n"

# 1. Unit Tests
run_test_suite "Unit Tests" \
    "npm run test:unit" \
    "Testing individual components and utilities"

# 2. Integration Tests  
run_test_suite "Integration Tests" \
    "npm run test:integration" \
    "Testing component interactions and workflows"

# 3. Context Tests
run_test_suite "Context Tests" \
    "npm run test:contexts" \
    "Testing React contexts and providers"

# 4. Hook Tests
run_test_suite "Custom Hook Tests" \
    "npm run test:hooks" \
    "Testing custom React hooks"

# 5. Component-specific Tests
run_test_suite "Component Tests" \
    "npm run test:components" \
    "Detailed component behavior testing"

# 6. Test Coverage
run_test_suite "Coverage Analysis" \
    "npm run test:coverage" \
    "Code coverage reporting"

# Backend tests if server is available
if [ -d "server" ]; then
    echo -e "\n${BLUE}🔄 Running Backend Tests...${NC}"
    cd server
    if npm test; then
        echo -e "${GREEN}✅ Backend Tests PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ Backend Tests FAILED${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    cd ..
fi

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))
MINUTES=$((EXECUTION_TIME / 60))
SECONDS=$((EXECUTION_TIME % 60))

# Final Report
echo -e "\n${YELLOW}📊 Test Suite Summary${NC}"
echo "========================================"
echo -e "✅ Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Failed: ${RED}$TESTS_FAILED${NC}"
echo "⏱️  Execution Time: ${MINUTES}m ${SECONDS}s"
echo "📁 Coverage Report: coverage/lcov-report/index.html"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! RevManager is ready for deployment.${NC}"
    exit 0
else
    echo -e "\n${RED}🚨 $TESTS_FAILED test suite(s) failed. Please review and fix issues.${NC}"
    exit 1
fi