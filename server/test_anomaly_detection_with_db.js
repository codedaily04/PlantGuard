/**
 * Anomaly Detection Engine Test with Database
 * Tests end-to-end anomaly detection with real MongoDB data
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Machine = require("./src/models/Machine");
const SensorReading = require("./src/models/SensorReading");
const Factory = require("./src/models/Factory");
const Plant = require("./src/models/Plant");
const User = require("./src/models/User");

const { detectEquipmentAnomalies } = require("./src/services/anomalyDetectionService");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

async function setupTestData() {
  console.log("Setting up test data for anomaly detection...\n");
  
  let user = await User.findOne({ email: "test@plantguard.com" });
  if (!user) {
    user = await User.create({
      name: "Test User",
      email: "test@plantguard.com",
      password: "hashedpassword123"
    });
  }
  
  let factory = await Factory.findOne({ name: "Test Factory" });
  if (!factory) {
    factory = await Factory.create({
      name: "Test Factory",
      location: "Detroit, MI",
      industry: "Manufacturing",
      owner: user._id
    });
  }
  
  let plant = await Plant.findOne({ name: "Test Plant" });
  if (!plant) {
    plant = await Plant.create({
      name: "Test Plant",
      plantType: "Manufacturing",
      factoryId: factory._id,
      location: "Building 1",
      status: "OPERATIONAL",
      owner: user._id
    });
  }
  
  // Create test machine
  let machine = await Machine.findOne({ machineId: "TEST-CNC-001" });
  if (!machine) {
    machine = await Machine.create({
      name: "Test CNC Mill",
      machineId: "TEST-CNC-001",
      plantId: plant._id,
      factoryId: factory._id,
      type: "CNC",
      status: "HEALTHY"
    });
    console.log(`✅ Created machine: ${machine.name}`);
  }
  
  // Clear existing readings for this test machine
  await SensorReading.deleteMany({ machineId: machine._id });
  
  // Create 30 readings: older baseline, recent sustained increase, LATEST spike
  const readings = [];
  const now = Date.now();
  
  for (let i = 0; i < 30; i++) {
    const hoursAgo = 30 - i;  // i=0 is 30 hours ago, i=29 is 1 hour ago
    let reading;
    
    if (i >= 29) {
      // MOST RECENT (i=29): SPIKE - temperature and vibration anomaly
      reading = {
        machineId: machine._id,
        temperature: 92,  // HIGH for CNC (optimal: 20-70)
        vibration: 6.2,   // HIGH for CNC (normal: <2.0)
        powerConsumption: 1300,  // HIGH (normal: 800)
        operatingHours: 15430,
        recordedAt: new Date(now - hoursAgo * 3600000)
      };
    } else if (i >= 20) {
      // Recent 9 readings (i=20-28): Sustained elevated vibration (for trend)
      reading = {
        machineId: machine._id,
        temperature: 52 + (Math.random() - 0.5) * 5,
        vibration: 2.8 + (Math.random() - 0.5) * 0.4,  // Elevated
        powerConsumption: 880 + (Math.random() - 0.5) * 60,
        operatingHours: 15400 + (30 - i),
        recordedAt: new Date(now - hoursAgo * 3600000)
      };
    } else {
      // Older 20 readings (i=0-19): Baseline normal
      reading = {
        machineId: machine._id,
        temperature: 45 + (Math.random() - 0.5) * 8,
        vibration: 1.7 + (Math.random() - 0.5) * 0.4,  // Normal
        powerConsumption: 820 + (Math.random() - 0.5) * 60,
        operatingHours: 15400 + (30 - i),
        recordedAt: new Date(now - hoursAgo * 3600000)
      };
    }
    
    readings.push(reading);
  }
  
  await SensorReading.insertMany(readings);
  console.log(`✅ Created ${readings.length} sensor readings with anomalies\n`);
  
  return { machine };
}

async function cleanupTestData() {
  console.log("\nCleaning up test data...");
  
  const machine = await Machine.findOne({ machineId: "TEST-CNC-001" });
  if (machine) {
    await SensorReading.deleteMany({ machineId: machine._id });
    await Machine.deleteOne({ _id: machine._id });
  }
  
  console.log("✅ Test data cleaned up");
}

async function runTests() {
  try {
    await connectDB();
    
    console.log("=== ANOMALY DETECTION ENGINE - DATABASE INTEGRATION TEST ===\n");
    
    const { machine } = await setupTestData();
    
    // Test 1: Detect anomalies with full service
    console.log("1. Full Anomaly Detection");
    
    // Debug: Check latest reading
    const latestReading = await SensorReading.findOne({ machineId: machine._id }).sort({ recordedAt: -1 });
    console.log(`Debug - Latest reading: temp=${latestReading.temperature.toFixed(1)}°C, vib=${latestReading.vibration.toFixed(2)} mm/s, power=${latestReading.powerConsumption.toFixed(0)} kW`);
    
    const result = await detectEquipmentAnomalies(machine, {
      readingLimit: 30,
      includeThreshold: true,
      includeTrend: true
    });
    
    console.log(`Machine: ${result.machineName} (${result.machineType})`);
    console.log(`Readings analyzed: ${result.readingsAnalyzed}`);
    console.log(`\nSummary:`);
    console.log(`  Total anomalies: ${result.summary.total}`);
    console.log(`  Critical: ${result.summary.critical}`);
    console.log(`  High: ${result.summary.high}`);
    console.log(`  Medium: ${result.summary.medium}`);
    console.log(`  By type: Threshold=${result.summary.byType.threshold}, Trend=${result.summary.byType.trend}`);
    
    console.log(`\nDetected Anomalies:`);
    result.anomalies.forEach((a, idx) => {
      console.log(`\n  ${idx + 1}. [${a.severity}] ${a.metric} (${a.detectionType})`);
      console.log(`     Current: ${a.currentValue}, Baseline: ${a.baselineValue}`);
      console.log(`     Deviation: ${a.deviationPercent}`);
      console.log(`     ${a.explanation}`);
    });
    
    console.log('');
    
    // Test 2: Threshold-only detection
    console.log("2. Threshold-Only Detection");
    const thresholdOnly = await detectEquipmentAnomalies(machine, {
      includeThreshold: true,
      includeTrend: false
    });
    
    console.log(`Threshold anomalies: ${thresholdOnly.summary.byType.threshold}`);
    console.log(`Trend anomalies: ${thresholdOnly.summary.byType.trend}`);
    console.log('');
    
    // Test 3: Trend-only detection
    console.log("3. Trend-Only Detection");
    const trendOnly = await detectEquipmentAnomalies(machine, {
      includeThreshold: false,
      includeTrend: true
    });
    
    console.log(`Threshold anomalies: ${trendOnly.summary.byType.threshold}`);
    console.log(`Trend anomalies: ${trendOnly.summary.byType.trend}`);
    console.log('');
    
    // Test 4: Machine with no readings
    console.log("4. Machine with No Readings");
    const emptyMachine = await Machine.create({
      name: "Empty Machine",
      machineId: "TEST-EMPTY-001",
      plantId: machine.plantId,
      factoryId: machine.factoryId,
      type: "PUMP",
      status: "OFFLINE"
    });
    
    const emptyResult = await detectEquipmentAnomalies(emptyMachine);
    console.log(`Machine: ${emptyResult.machineName}`);
    console.log(`Anomalies: ${emptyResult.anomalies.length}`);
    console.log(`Message: ${emptyResult.message}`);
    
    await Machine.deleteOne({ _id: emptyMachine._id });
    console.log('');
    
    console.log("=== ALL TESTS COMPLETE ===\n");
    
    await cleanupTestData();
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("✅ Database connection closed");
  }
}

if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runTests };
