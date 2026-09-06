/**
 * INTEGRATION TEST FOR DAY 04 STEP 2
 * 
 * Tests the integrated deterministic health intelligence + AI analysis
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Plant = require('./src/models/Plant');
const PlantSensorReading = require('./src/models/PlantSensorReading');
const { generateHealthIntelligence } = require('./src/services/healthIntelligenceService');
const { analyzePlantHealth } = require('./src/services/aiService');

async function testIntegration() {
  console.log('\n🧪 Testing DAY 04 STEP 2 Integration...');
  
  try {
    // Connect to database
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find an existing plant
    console.log('\n🌱 Finding existing plant...');
    let plant = await Plant.findOne();
    
    if (!plant) {
      console.log('❌ No plants found. Creating test plant...');
      plant = await Plant.create({
        name: 'Test Integration Plant',
        species: 'Lactuca sativa',
        cropType: 'Lettuce',
        growthStage: 'VEGETATIVE',
        plantingDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        location: 'Test Greenhouse',
        owner: new mongoose.Types.ObjectId()
      });
      console.log(`✅ Created test plant: ${plant.name}`);
    } else {
      console.log(`✅ Found existing plant: ${plant.name}`);
    }
    
    // Check for sensor readings
    let readingCount = await PlantSensorReading.countDocuments({ plantId: plant._id });
    console.log(`📊 Found ${readingCount} sensor readings for plant`);
    
    if (readingCount === 0) {
      console.log('📝 Creating test sensor readings...');
      const readings = [];
      for (let i = 0; i < 10; i++) {
        readings.push({
          plantId: plant._id,
          temperature: 22 + Math.random() * 4,
          humidity: 55 + Math.random() * 10,
          soilMoisture: 45 + Math.random() * 10,
          soilPH: 6.3 + Math.random() * 0.4,
          lightIntensity: 15000 + Math.random() * 5000,
          timestamp: new Date(Date.now() - i * 3600000)
        });
      }
      await PlantSensorReading.insertMany(readings);
      readingCount = readings.length;
      console.log(`✅ Created ${readingCount} test sensor readings`);
    }
    
    // Test 1: Deterministic Health Intelligence
    console.log('\n🔬 Testing Deterministic Health Intelligence...');
    const healthIntelligence = await generateHealthIntelligence(plant);
    console.log(`✅ Health Score: ${healthIntelligence.healthScore}/100`);
    console.log(`✅ Status: ${healthIntelligence.status}`);
    console.log(`✅ Detected Risks: ${healthIntelligence.riskCount}`);
    console.log(`✅ Data Quality: ${healthIntelligence.dataQuality.quality}`);
    
    // Test 2: Integrated AI Analysis
    console.log('\n🤖 Testing Integrated AI Analysis...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️  GEMINI_API_KEY not configured - testing fallback mode');
    }
    
    const analysis = await analyzePlantHealth(plant);
    
    console.log(`✅ Combined Analysis completed:`);
    console.log(`   Health Score: ${analysis.healthScore}/100 (from deterministic)`);
    console.log(`   Health Status: ${analysis.healthStatus} (from deterministic)`);
    console.log(`   AI Summary: ${analysis.summary?.substring(0, 100)}...`);
    console.log(`   Recommendations: ${analysis.recommendations?.length || 0}`);
    console.log(`   Confidence: ${analysis.confidence || 'N/A'}`);
    
    // Test 3: Verify deterministic data integrity
    console.log('\n🔍 Verifying data integrity...');
    
    const checks = [];
    checks.push({ name: 'Health score is from deterministic engine', pass: analysis.healthScore === healthIntelligence.healthScore });
    checks.push({ name: 'Detected risks are from deterministic engine', pass: JSON.stringify(analysis.detectedRisks) === JSON.stringify(healthIntelligence.detectedRisks) });
    checks.push({ name: 'Analysis has AI summary', pass: typeof analysis.summary === 'string' && analysis.summary.length > 0 });
    checks.push({ name: 'Analysis has recommendations', pass: Array.isArray(analysis.recommendations) });
    checks.push({ name: 'Analysis has confidence score', pass: typeof analysis.confidence === 'number' });
    
    let passedChecks = 0;
    checks.forEach(check => {
      if (check.pass) {
        console.log(`✅ ${check.name}`);
        passedChecks++;
      } else {
        console.log(`❌ ${check.name}`);
      }
    });
    
    console.log(`\n📈 Integration Test Results:`);
    console.log(`   Passed: ${passedChecks}/${checks.length} checks`);
    console.log(`   Success Rate: ${(passedChecks/checks.length*100).toFixed(1)}%`);
    
    if (passedChecks === checks.length) {
      console.log(`\n🎉 ALL INTEGRATION TESTS PASSED! 🎉`);
    } else {
      console.log(`\n⚠️  Some integration tests failed`);
    }
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the test
testIntegration().catch(console.error);