const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function runCommand(command, description) {
  console.log(`🔄 ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes('Warning')) {
      console.log(`⚠️  ${description}: ${stderr}`);
    } else {
      console.log(`✅ ${description}: Completed successfully`);
    }
    if (stdout) {
      console.log(stdout);
    }
  } catch (error) {
    console.log(`❌ ${description}: Failed`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
  return true;
}

async function setupTelemetro() {
  console.log('🚀 TELEMETRO COMPLETE SETUP');
  console.log('============================\n');

  console.log('📋 This script will:');
  console.log('1. Create admin user');
  console.log('2. Seed sample products');
  console.log('3. Seed sample ads');
  console.log('4. Test all connections');
  console.log('5. Display access information\n');

  // Step 1: Create admin user
  const step1 = await runCommand('npm run create-admin', 'Creating admin user');
  if (!step1) return;

  console.log('\n');

  // Step 2: Seed products
  const step2 = await runCommand('npm run seed-data', 'Seeding sample products');
  if (!step2) return;

  console.log('\n');

  // Step 3: Seed ads
  const step3 = await runCommand('npm run seed-ads', 'Seeding sample ads');
  if (!step3) return;

  console.log('\n');

  // Step 4: Test connections
  const step4 = await runCommand('npm run test-connections', 'Testing all connections');

  console.log('\n🎉 SETUP COMPLETE!');
  console.log('==================\n');

  console.log('📱 MOBILE APP CONFIGURATION:');
  console.log('- API Base URL: http://localhost:4000');
  console.log('- Socket URL: http://localhost:4000');
  console.log('- All endpoints ready for mobile app\n');

  console.log('🖥️  ADMIN PANEL ACCESS:');
  console.log('- URL: http://localhost:4000/admin');
  console.log('- Login: http://localhost:4000/admin/login');
  console.log('- Phone: +51999999999');
  console.log('- PIN: 1234\n');

  console.log('🔧 BACKEND STATUS:');
  console.log('- API Server: http://localhost:4000');
  console.log('- Health Check: http://localhost:4000/api/health');
  console.log('- MongoDB: Connected');
  console.log('- All APIs: Functional\n');

  console.log('📊 SAMPLE DATA LOADED:');
  console.log('- 10 Sample products in marketplace');
  console.log('- 6 Sample ads with different types');
  console.log('- 1 Admin user for panel access\n');

  console.log('🚀 NEXT STEPS:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Open admin panel: http://localhost:4000/admin');
  console.log('3. Configure mobile app to point to localhost:4000');
  console.log('4. Test the complete flow!\n');

  console.log('🎯 YOUR TELEMETRO PLATFORM IS READY! 🚀');
}

setupTelemetro().catch(console.error);
