/**
 * Gemini AI Operations Advisor Tests
 * Tests AI interpretation layer with deterministic health/anomaly/risk data
 * Verifies AI does NOT override calculated values
 */

require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const Machine = require('./src/models/Machine');
const Plant = require('./src/models/Plant');
const Factory = require('./src/models/Factory');
const User = require('./src/models/User');
const SensorReading = require('./src/models/SensorReading');
const { analyzeMachineHealth } = require('./src/services/aiService');

let testFactory, testPlant, testUser;

async function setup() {
  await connectDB();
  
  // Clean test data
  await Factory.deleteMany({ name: /^TEST_AI_/ });
  await User.deleteMany({ email: /^test_ai_/ });
  
  // Create test user
  testUser = await User.create({
    name: 'Test AI User',
    email: 'test_ai_user@example.com',
    password: 'hashedpassword123'
  });
  
  // Create test factory
  testFactory = await Factory.create({
    name: 'TEST_AI_FACTORY',
    location: 'Test Location',
    industry: 'Manufacturing',
    createdBy: testUser._id
  });
  
  // Create test plant
  testPlant = await Plant.create({
    name: 'TEST_AI_PLANT',
    plantType: 'ASSEMBLY',
    location: 'Test Plant Location',
    factoryId: testFactory._id,
    owner: testUser._id
  });
  
  console.log('✓ Test setup complete\n');
}

async function cleanup() {
  try {
    await SensorReading.deleteMany({ machineId: { $exists: true } });
    await Machine.deleteMany({ name: /^TEST_AI_/ });
    if (testPlant) await Plant.findByIdAndDelete(testPlant._id);
    if (testFactory) await Factory.findByIdAndDelete(testFactory._id);
    if (testUser) await User.findByIdAndDelete(testUser._id);
    await mongoose.connection.close();
    console.log('\n✓ Cleanup complete');
  } catch (error) {
    console.error('Cleanup error:', error.message);
    await mongoose.connection.close();
  }
}

async function createMachineWithTelemetry(name, type, telemetryData) {
  const machine = await Machine.create({
    name,
    machineId: `AI_${type}_${Date.now()}`,
    type,
    plantId: testPlant._id,
    factoryId: testFactory._id,
    status: 'HEALTHY'
  });
  
  const baseTime = Date.now();
  const readings = [];
  
  for (let i = 0; i < telemetryData.length; i++) {
    readings.push({
      machineId: machine._id,
      ...telemetryData[i],
      recordedAt: new Date(baseTime - (telemetryData.length - i - 1) * 60000)
    });
  }
  
  await SensorReading.insertMany(readings);
  
  return machine;
}

// Test 1: Healthy machine
async function testHealthyMachine() {
  console.log('Test 1: Healthy machine AI analysis');
  
  const machine = await createMachineWithTelemetry('TEST_AI_HEALTHY_CNC', 'CNC', [
    { temperature: 45, vibration: 0.3, pressure: null, powerConsumption: 8.5, operatingHours: 1000 },
    { temperature: 46, vibration: 0.32, pressure: null, powerConsumption: 8.6, operatingHours: 1001 },
    { temperature: 45, vibration: 0.31, pressure: null, powerConsumption: 8.5, operatingHours: 1002 },
    { temperature: 46, vibration: 0.33, pressure: null, powerConsumption: 8.7, operatingHours: 1003 },
    { temperature: 45, vibration: 0.30, pressure: null, powerConsumption: 8.4, operatingHours: 1004 }
  ]);
  
  const analysis = await analyzeMachineHealth(machine, testPlant, { includeRisk: true });
  
  console.log('Health Score:', analysis.healthScore);
  console.log('Status:', analysis.healthStatus);
  console.log('Anomalies:', analysis.detectedAnomalies.length);
  console.log('Executive Summary:', analysis.aiInterpretation?.executiveSummary || analysis.summary);
  console.log('Recommended Actions:', analysis.aiInterpretation?.recommendedActions?.length || analysis.recommendations?.length);
  console.log('Safety:', analysis.aiInterpretation?.safetyConsiderations || 'N/A');
  console.log('Confidence:', analysis.confidence);
  
  // Verify deterministic values NOT overridden
  if (analysis.healthScore < 70 || analysis.healthScore > 100) {
    throw new Error('Health score should be high for healthy machine');
  }
  
  if (analysis.detectedAnomalies.length > 1) {
    throw new Error('Healthy machine should have minimal anomalies');
  }
  
  if (!analysis.aiInterpretation && !analysis.summary) {
    throw new Error('AI analysis missing');
  }
  
  await Machine.findByIdAndDelete(machine._id);
  await SensorReading.deleteMany({ machineId: machine._id });
  
  console.log('✓ Test 1 passed\n');
}

// Test 2: Anomalous machine
async function testAnomalousMachine() {
  console.log('Test 2: Anomalous machine AI analysis');
  
  const machine = await createMachineWithTelemetry('TEST_AI_ANOMALY_CNC', 'CNC', [
    { temperature: 45, vibration: 0.3, pressure: null, powerConsumption: 8.5, operatingHours: 1000 },
    { temperature: 85, vibration: 5.0, pressure: null, powerConsumption: 15.0, operatingHours: 1001 },
    { temperature: 87, vibration: 5.2, pressure: null, powerConsumption: 15.5, operatingHours: 1002 },
    { temperature: 86, vibration: 5.1, pressure: null, powerConsumption: 15.2, operatingHours: 1003 },
    { temperature: 85, vibration: 5.0, pressure: null, powerConsumption: 15.0, operatingHours: 1004 }
  ]);
  
  const analysis = await analyzeMachineHealth(machine, testPlant, { includeRisk: true });
  
  console.log('Health Score:', analysis.healthScore);
  console.log('Status:', analysis.healthStatus);
  console.log('Anomalies:', analysis.detectedAnomalies.length);
  console.log('Degradation Risk:', analysis.degradationRisk?.riskCategory);
  console.log('Likely Causes:', analysis.aiInterpretation?.likelyCauses?.length || 0);
  console.log('Operational Risks:', analysis.aiInterpretation?.operationalRisks?.length || 0);
  console.log('Recommended Actions:', analysis.aiInterpretation?.recommendedActions?.length || 0);
  
  // Verify deterministic values NOT overridden
  if (analysis.healthScore > 85) {
    throw new Error('Health score should reflect anomalous conditions');
  }
  
  if (analysis.detectedAnomalies.length === 0) {
    throw new Error('Should detect anomalies');
  }
  
  if (!analysis.aiInterpretation?.likelyCauses && !analysis.detectedIssues) {
    throw new Error('AI should provide likely causes');
  }
  
  if ((analysis.aiInterpretation?.recommendedActions?.length || analysis.recommendations?.length || 0) === 0) {
    throw new Error('AI should provide recommendations');
  }
  
  await Machine.findByIdAndDelete(machine._id);
  await SensorReading.deleteMany({ machineId: machine._id });
  
  console.log('✓ Test 2 passed\n');
}

// Test 3: High degradation risk machine
async function testHighRiskMachine() {
  console.log('Test 3: High degradation risk machine AI analysis');
  
  // Create compressor with degrading pressure trend
  const machine = await createMachineWithTelemetry('TEST_AI_RISK_COMPRESSOR', 'COMPRESSOR', [
    { temperature: 70, vibration: 0.6, pressure: 120, powerConsumption: 16, operatingHours: 2000 },
    { temperature: 72, vibration: 0.7, pressure: 115, powerConsumption: 16.5, operatingHours: 2001 },
    { temperature: 75, vibration: 0.8, pressure: 110, powerConsumption: 17, operatingHours: 2002 },
    { temperature: 77, vibration: 0.9, pressure: 105, powerConsumption: 17.5, operatingHours: 2003 },
    { temperature: 80, vibration: 1.0, pressure: 100, powerConsumption: 18, operatingHours: 2004 }
  ]);
  
  const analysis = await analyzeMachineHealth(machine, testPlant, { includeRisk: true });
  
  console.log('Health Score:', analysis.healthScore);
  console.log('Degradation Risk Score:', analysis.degradationRisk?.riskScore);
  console.log('Risk Category:', analysis.degradationRisk?.riskCategory);
  console.log('Degradation Trends:', analysis.degradationRisk?.degradationTrends?.length || 0);
  console.log('Executive Summary:', analysis.aiInterpretation?.executiveSummary?.substring(0, 100));
  console.log('Operational Risks:', analysis.aiInterpretation?.operationalRisks?.length || 0);
  console.log('Safety Considerations:', analysis.aiInterpretation?.safetyConsiderations || 'N/A');
  
  // Verify risk is included
  if (!analysis.degradationRisk) {
    throw new Error('Degradation risk should be calculated');
  }
  
  if (analysis.degradationRisk.riskScore < 20) {
    console.log('Warning: Expected higher risk score for degrading machine');
  }
  
  // Verify AI provides interpretation
  if (!analysis.aiInterpretation?.operationalRisks && !analysis.operationalImpact) {
    throw new Error('AI should explain operational risks');
  }
  
  await Machine.findByIdAndDelete(machine._id);
  await SensorReading.deleteMany({ machineId: machine._id });
  
  console.log('✓ Test 3 passed\n');
}

// Test 4: Missing/insufficient data
async function testInsufficientData() {
  console.log('Test 4: Insufficient data handling');
  
  const machine = await Machine.create({
    name: 'TEST_AI_NO_DATA',
    machineId: `AI_EMPTY_${Date.now()}`,
    type: 'PUMP',
    plantId: testPlant._id,
    factoryId: testFactory._id,
    status: 'HEALTHY'
  });
  
  try {
    const analysis = await analyzeMachineHealth(machine, testPlant, { includeRisk: true });
    
    // Should return offline status with no risk
    if (analysis.healthStatus !== 'Offline') {
      throw new Error('Expected offline status for machine with no data');
    }
    
    if (analysis.healthScore !== 0) {
      throw new Error('Expected 0 health score for machine with no data');
    }
    
    console.log('✓ Correctly handled machine with no data (offline status)');
    console.log('  Health:', analysis.healthScore);
    console.log('  Status:', analysis.healthStatus);
    
  } catch (error) {
    if (error.message.includes('No sensor readings')) {
      console.log('✓ Correctly rejected machine with no data');
    } else {
      throw error;
    }
  }
  
  await Machine.findByIdAndDelete(machine._id);
  
  console.log('✓ Test 4 passed\n');
}

// Test 5: Gemini response parsing
async function testResponseParsing() {
  console.log('Test 5: AI response parsing and validation');
  
  const machine = await createMachineWithTelemetry('TEST_AI_PARSING', 'CNC', [
    { temperature: 50, vibration: 0.4, pressure: null, powerConsumption: 9.0, operatingHours: 1500 },
    { temperature: 51, vibration: 0.41, pressure: null, powerConsumption: 9.1, operatingHours: 1501 },
    { temperature: 50, vibration: 0.40, pressure: null, powerConsumption: 9.0, operatingHours: 1502 }
  ]);
  
  const analysis = await analyzeMachineHealth(machine, testPlant, { includeRisk: true });
  
  // Verify response structure
  if (!analysis.healthScore && analysis.healthScore !== 0) {
    throw new Error('Missing healthScore');
  }
  
  if (!analysis.healthStatus) {
    throw new Error('Missing healthStatus');
  }
  
  if (!Array.isArray(analysis.detectedAnomalies)) {
    throw new Error('detectedAnomalies should be array');
  }
  
  if (!analysis.aiInterpretation && !analysis.summary) {
    throw new Error('Missing AI interpretation');
  }
  
  // Check new format
  if (analysis.aiInterpretation) {
    if (!analysis.aiInterpretation.executiveSummary) {
      throw new Error('Missing executiveSummary');
    }
    
    if (!Array.isArray(analysis.aiInterpretation.likelyCauses)) {
      throw new Error('likelyCauses should be array');
    }
    
    if (!Array.isArray(analysis.aiInterpretation.operationalRisks)) {
      throw new Error('operationalRisks should be array');
    }
    
    if (!Array.isArray(analysis.aiInterpretation.recommendedActions)) {
      throw new Error('recommendedActions should be array');
    }
    
    if (typeof analysis.aiInterpretation.confidence !== 'number') {
      throw new Error('confidence should be number');
    }
    
    if (analysis.aiInterpretation.confidence < 0 || analysis.aiInterpretation.confidence > 1) {
      throw new Error('confidence should be 0-1');
    }
  }
  
  console.log('✓ All response fields validated');
  
  await Machine.findByIdAndDelete(machine._id);
  await SensorReading.deleteMany({ machineId: machine._id });
  
  console.log('✓ Test 5 passed\n');
}

// Test 6: Verify deterministic values unchanged
async function testDeterministicValuesUnchanged() {
  console.log('Test 6: Verify AI does NOT override deterministic values');
  
  const machine = await createMachineWithTelemetry('TEST_AI_DETERMINISTIC', 'CNC', [
    { temperature: 60, vibration: 1.5, pressure: null, powerConsumption: 10.0, operatingHours: 3000 },
    { temperature: 62, vibration: 1.6, pressure: null, powerConsumption: 10.2, operatingHours: 3001 },
    { temperature: 61, vibration: 1.55, pressure: null, powerConsumption: 10.1, operatingHours: 3002 }
  ]);
  
  // Get intelligence first (without AI)
  const { generateMachineHealthIntelligence } = require('./src/services/healthIntelligenceService');
  const directIntelligence = await generateMachineHealthIntelligence(machine);
  
  // Now get AI analysis
  const aiAnalysis = await analyzeMachineHealth(machine, testPlant, { includeRisk: true });
  
  // Verify health score matches
  if (aiAnalysis.healthScore !== directIntelligence.healthScore) {
    throw new Error(`Health score changed! Direct: ${directIntelligence.healthScore}, AI: ${aiAnalysis.healthScore}`);
  }
  
  // Verify anomaly count matches
  if (aiAnalysis.detectedAnomalies.length !== directIntelligence.anomalies.length) {
    throw new Error(`Anomaly count changed! Direct: ${directIntelligence.anomalies.length}, AI: ${aiAnalysis.detectedAnomalies.length}`);
  }
  
  // Verify status matches
  const statusMap = { 'healthy': 'Healthy', 'warning': 'Warning', 'critical': 'Critical', 'offline': 'Offline' };
  if (aiAnalysis.healthStatus !== statusMap[directIntelligence.status]) {
    throw new Error(`Status changed! Direct: ${directIntelligence.status}, AI: ${aiAnalysis.healthStatus}`);
  }
  
  console.log('✓ Health score unchanged:', aiAnalysis.healthScore);
  console.log('✓ Anomaly count unchanged:', aiAnalysis.detectedAnomalies.length);
  console.log('✓ Status unchanged:', aiAnalysis.healthStatus);
  console.log('✓ Deterministic values preserved by AI layer');
  
  await Machine.findByIdAndDelete(machine._id);
  await SensorReading.deleteMany({ machineId: machine._id });
  
  console.log('✓ Test 6 passed\n');
}

async function runAllTests() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.log('⚠️  GEMINI_API_KEY not configured - using fallback mode');
    }
    
    await setup();
    
    await testHealthyMachine();
    await testAnomalousMachine();
    await testHighRiskMachine();
    await testInsufficientData();
    await testResponseParsing();
    await testDeterministicValuesUnchanged();
    
    console.log('═══════════════════════════════════════');
    console.log('✓ ALL AI OPERATIONS ADVISOR TESTS PASSED');
    console.log('═══════════════════════════════════════');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    await cleanup();
    process.exit(1);
  } finally {
    await cleanup();
    process.exit(0);
  }
}

runAllTests();
