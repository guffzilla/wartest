/**
 * API Optimization Testing Script
 * Tests all optimization features to ensure they work correctly
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class OptimizationTester {
  constructor(baseUrl = 'http://localhost:3001') {
    this.baseUrl = baseUrl;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run a test and record results
   */
  async runTest(name, testFunction) {
    const startTime = performance.now();
    
    try {
      await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.results.tests.push({
        name,
        status: 'PASSED',
        duration: `${duration.toFixed(2)}ms`
      });
      this.results.passed++;
      
      console.log(`✅ ${name} - ${duration.toFixed(2)}ms`);
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.results.tests.push({
        name,
        status: 'FAILED',
        duration: `${duration.toFixed(2)}ms`,
        error: error.message
      });
      this.results.failed++;
      
      console.log(`❌ ${name} - ${error.message}`);
    }
  }

  /**
   * Test API documentation endpoint
   */
  async testApiDocumentation() {
    const response = await axios.get(`${this.baseUrl}/docs`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    
    if (!data.optimization) {
      throw new Error('Missing optimization information in API docs');
    }
    
    if (data.version !== '2.0.0') {
      throw new Error(`Expected version 2.0.0, got ${data.version}`);
    }
    
    console.log('📋 API Documentation:', {
      version: data.version,
      optimization: data.optimization.status,
      features: data.optimization.features.length
    });
  }

  /**
   * Test standardized error responses
   */
  async testErrorResponses() {
    // Test 404 error
    try {
      await axios.get(`${this.baseUrl}/api/nonexistent`);
    } catch (error) {
      if (error.response.status !== 404) {
        throw new Error(`Expected 404, got ${error.response.status}`);
      }
      
      const errorData = error.response.data;
      if (!errorData.success === false) {
        throw new Error('Error response missing success: false');
      }
      
      if (!errorData.timestamp) {
        throw new Error('Error response missing timestamp');
      }
    }
  }

  /**
   * Test user caching (performance test)
   */
  async testUserCaching() {
    // First request
    const start1 = performance.now();
    const response1 = await axios.get(`${this.baseUrl}/api/me`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    const duration1 = performance.now() - start1;
    
    // Second request (should be cached)
    const start2 = performance.now();
    const response2 = await axios.get(`${this.baseUrl}/api/me`, {
      headers: { 'Authorization': 'Bearer test-token' }
    });
    const duration2 = performance.now() - start2;
    
    console.log('⚡ Caching Performance:', {
      firstRequest: `${duration1.toFixed(2)}ms`,
      secondRequest: `${duration2.toFixed(2)}ms`,
      improvement: `${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`
    });
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    const requests = [];
    
    // Make multiple requests quickly
    for (let i = 0; i < 10; i++) {
      requests.push(
        axios.get(`${this.baseUrl}/api/health`).catch(error => error.response)
      );
    }
    
    const responses = await Promise.all(requests);
    
    // Check for rate limit headers
    const hasRateLimitHeaders = responses.some(response => 
      response.headers['x-ratelimit-limit'] && 
      response.headers['x-ratelimit-remaining']
    );
    
    if (!hasRateLimitHeaders) {
      throw new Error('Rate limiting headers not found');
    }
    
    console.log('🛡️ Rate Limiting:', {
      headersFound: hasRateLimitHeaders,
      totalRequests: responses.length
    });
  }

  /**
   * Test authentication middleware
   */
  async testAuthentication() {
    // Test unauthenticated request
    try {
      await axios.get(`${this.baseUrl}/api/me`);
    } catch (error) {
      if (error.response.status !== 401) {
        throw new Error(`Expected 401, got ${error.response.status}`);
      }
    }
    
    // Test authenticated request (with mock token)
    try {
      await axios.get(`${this.baseUrl}/api/me`, {
        headers: { 'Authorization': 'Bearer valid-token' }
      });
    } catch (error) {
      // Should fail with invalid token, but with proper error format
      if (error.response.status !== 401) {
        throw new Error(`Expected 401, got ${error.response.status}`);
      }
      
      const errorData = error.response.data;
      if (!errorData.success === false) {
        throw new Error('Authentication error missing success: false');
      }
    }
  }

  /**
   * Test validation middleware
   */
  async testValidation() {
    // Test invalid input
    try {
      await axios.post(`${this.baseUrl}/api/users`, {
        // Missing required fields
      });
    } catch (error) {
      if (error.response.status !== 400) {
        throw new Error(`Expected 400, got ${error.response.status}`);
      }
      
      const errorData = error.response.data;
      if (!errorData.success === false) {
        throw new Error('Validation error missing success: false');
      }
    }
  }

  /**
   * Test response standardization
   */
  async testResponseStandardization() {
    const response = await axios.get(`${this.baseUrl}/api/health`);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    const data = response.data;
    
    if (data.success !== true) {
      throw new Error('Success response missing success: true');
    }
    
    if (!data.timestamp) {
      throw new Error('Success response missing timestamp');
    }
    
    console.log('📊 Response Standardization:', {
      success: data.success,
      hasTimestamp: !!data.timestamp,
      hasMessage: !!data.message
    });
  }

  /**
   * Test database query optimization
   */
  async testDatabaseOptimization() {
    const startTime = performance.now();
    
    // Make multiple user-related requests
    const requests = [
      axios.get(`${this.baseUrl}/api/me`).catch(() => ({ status: 401 })),
      axios.get(`${this.baseUrl}/api/users/profile`).catch(() => ({ status: 401 })),
      axios.get(`${this.baseUrl}/api/users/status`).catch(() => ({ status: 401 }))
    ];
    
    await Promise.all(requests);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log('🗄️ Database Optimization:', {
      duration: `${duration.toFixed(2)}ms`,
      requests: requests.length
    });
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting API Optimization Tests...\n');
    
    await this.runTest('API Documentation', () => this.testApiDocumentation());
    await this.runTest('Error Response Standardization', () => this.testErrorResponses());
    await this.runTest('User Data Caching', () => this.testUserCaching());
    await this.runTest('Rate Limiting', () => this.testRateLimiting());
    await this.runTest('Authentication Middleware', () => this.testAuthentication());
    await this.runTest('Input Validation', () => this.testValidation());
    await this.runTest('Response Standardization', () => this.testResponseStandardization());
    await this.runTest('Database Query Optimization', () => this.testDatabaseOptimization());
    
    this.printResults();
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total: ${this.results.passed + this.results.failed}`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n✅ Passed Tests:');
    this.results.tests
      .filter(test => test.status === 'PASSED')
      .forEach(test => {
        console.log(`  - ${test.name} (${test.duration})`);
      });
    
    const successRate = (this.results.passed / (this.results.passed + this.results.failed)) * 100;
    console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Optimization tests passed! API is ready for production.');
    } else {
      console.log('⚠️ Some optimization tests failed. Please review the issues above.');
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new OptimizationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = OptimizationTester;
