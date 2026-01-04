const mongoose = require('mongoose');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:4000';

// Test MongoDB Connection
async function testMongoDB() {
  console.log('🔍 Testing MongoDB Connection...');
  try {
    await mongoose.connect('mongodb://localhost:27017/telemetro');
    console.log('✅ MongoDB: Connected successfully');
    
    // Test collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Collections found: ${collections.map(c => c.name).join(', ')}`);
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('❌ MongoDB: Connection failed');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

// Test Backend APIs
async function testBackendAPIs() {
  console.log('\n🔍 Testing Backend APIs...');
  
  const tests = [
    {
      name: 'Health Check',
      method: 'GET',
      endpoint: '/api/health'
    },
    {
      name: 'Root Endpoint',
      method: 'GET',
      endpoint: '/'
    },
    {
      name: 'Admin Panel',
      method: 'GET',
      endpoint: '/admin'
    },
    {
      name: 'Admin Login Page',
      method: 'GET',
      endpoint: '/admin/login'
    }
  ];

  let passedTests = 0;

  for (const test of tests) {
    try {
      const response = await fetch(`${BASE_URL}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log(`✅ ${test.name}: ${response.status} OK`);
        passedTests++;
      } else {
        console.log(`⚠️  ${test.name}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Connection failed`);
      console.log(`   Error: ${error.message}`);
    }
  }

  return passedTests === tests.length;
}

// Test Authentication Flow
async function testAuthFlow() {
  console.log('\n🔍 Testing Authentication Flow...');
  
  try {
    // Test OTP request
    const otpResponse = await fetch(`${BASE_URL}/api/auth/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '+51999999999'
      })
    });

    if (otpResponse.ok) {
      console.log('✅ OTP Request: API endpoint working');
    } else {
      console.log('⚠️  OTP Request: API endpoint has issues');
    }

    // Test admin login
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '+51999999999',
        pin: '1234'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      if (loginData.success && loginData.data.user.role === 'admin') {
        console.log('✅ Admin Login: Working correctly');
        return loginData.data.token;
      } else {
        console.log('⚠️  Admin Login: User not admin or login failed');
      }
    } else {
      console.log('⚠️  Admin Login: API endpoint has issues');
    }

  } catch (error) {
    console.log('❌ Authentication: Connection failed');
    console.log(`   Error: ${error.message}`);
  }
  
  return null;
}

// Test Admin APIs
async function testAdminAPIs(token) {
  console.log('\n🔍 Testing Admin APIs...');
  
  if (!token) {
    console.log('❌ No admin token available, skipping admin API tests');
    return false;
  }

  const adminTests = [
    {
      name: 'Dashboard Stats',
      method: 'GET',
      endpoint: '/api/admin/stats'
    },
    {
      name: 'Products List',
      method: 'GET',
      endpoint: '/api/admin/products'
    },
    {
      name: 'Users List',
      method: 'GET',
      endpoint: '/api/admin/users'
    },
    {
      name: 'Redemptions List',
      method: 'GET',
      endpoint: '/api/admin/redemptions'
    },
    {
      name: 'Ads List',
      method: 'GET',
      endpoint: '/api/ads'
    }
  ];

  let passedTests = 0;

  for (const test of adminTests) {
    try {
      const response = await fetch(`${BASE_URL}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ ${test.name}: Working correctly`);
          passedTests++;
        } else {
          console.log(`⚠️  ${test.name}: API returned error: ${data.error?.message}`);
        }
      } else {
        console.log(`⚠️  ${test.name}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Connection failed`);
      console.log(`   Error: ${error.message}`);
    }
  }

  return passedTests === adminTests.length;
}

// Test Public APIs (for mobile app)
async function testPublicAPIs() {
  console.log('\n🔍 Testing Public APIs (Mobile App)...');
  
  const publicTests = [
    {
      name: 'Marketplace Products',
      method: 'GET',
      endpoint: '/api/marketplace/products'
    },
    {
      name: 'Active Ads',
      method: 'GET',
      endpoint: '/api/ads/active'
    }
  ];

  let passedTests = 0;

  for (const test of publicTests) {
    try {
      const response = await fetch(`${BASE_URL}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log(`✅ ${test.name}: Working correctly`);
          passedTests++;
        } else {
          console.log(`⚠️  ${test.name}: API returned error: ${data.error?.message}`);
        }
      } else {
        console.log(`⚠️  ${test.name}: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: Connection failed`);
      console.log(`   Error: ${error.message}`);
    }
  }

  return passedTests === publicTests.length;
}

// Main test function
async function runConnectionTests() {
  console.log('🚀 TELEMETRO CONNECTION TEST SUITE');
  console.log('=====================================\n');

  const results = {
    mongodb: false,
    backend: false,
    auth: false,
    admin: false,
    public: false
  };

  // Test MongoDB
  results.mongodb = await testMongoDB();

  // Test Backend
  results.backend = await testBackendAPIs();

  // Test Authentication
  const adminToken = await testAuthFlow();
  results.auth = adminToken !== null;

  // Test Admin APIs
  results.admin = await testAdminAPIs(adminToken);

  // Test Public APIs
  results.public = await testPublicAPIs();

  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`MongoDB Connection: ${results.mongodb ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Backend APIs: ${results.backend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Authentication: ${results.auth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Admin Panel APIs: ${results.admin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Public APIs: ${results.public ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n🎯 OVERALL RESULT');
  console.log('==================');
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Your Telemetro platform is fully connected.');
    console.log('\n📱 Mobile App: Ready to connect');
    console.log('🖥️  Backend API: Fully functional');
    console.log('👑 Admin Panel: Ready for management');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Please check the issues above.');
    console.log('\n🔧 TROUBLESHOOTING:');
    if (!results.mongodb) console.log('- Start MongoDB: mongod --dbpath /path/to/db');
    if (!results.backend) console.log('- Start Backend: npm run dev');
    if (!results.auth) console.log('- Create Admin: npm run create-admin');
    if (!results.admin) console.log('- Check admin permissions');
    if (!results.public) console.log('- Check public API endpoints');
  }

  console.log('\n🌐 ACCESS URLS:');
  console.log(`- Backend API: ${BASE_URL}`);
  console.log(`- Admin Panel: ${BASE_URL}/admin`);
  console.log(`- Admin Login: ${BASE_URL}/admin/login`);
}

// Run tests
runConnectionTests().catch(console.error);
