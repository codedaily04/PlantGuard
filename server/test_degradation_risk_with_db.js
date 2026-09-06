/**
 * Degradation Risk Engine - Database Integration Test
 * Tests end-to-end risk calculation with real MongoDB data
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Machine = require("./src/models/Machine");
const SensorReading = require("./src/models/SensorReading");
const RiskAssessment = require("./src/models/RiskAssessment");
const Factory = require("./src/models/Factory");
const Plant = require("./src/models/Plant");
const User = require("./src/models/User");

const { calculateMachineDegradationRisk } = require("./src/services/degradationRiskService");

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
  console.log("Setting up test machines with varying risk profiles...\n");
  
  let user = await User.findOne({ email: "test@plantguard.com" });
  if (!user) {
    user = await User.create({
      name: "Test User",
      email: "test@plantguard.com",
      password: "hashedpassword123"
    });
  }
  
  let factory = await Factory.findOne({ name: "Test Factory Risk" });
  if (!factory) {
    factory = await Factory.create({
      name: "Test Factory Risk",
      location: "Detroit, MI",
      industry: "Manufacturing",
      owner: user._id
    });
  }
  
  let plant = await Plant.findOne({ name: "Test Plant Risk" });
  if (!plant) {
    plant = await Plant.create({
      name: "Test Plant Risk",
      plantType: "Manufacturing",
      factoryId: factory._id,
      location: "Building 1",
      status: "OPERATIONAL",
      owner: user._id
    });
  }
  
  // Machine 1: Normal operation (LOW risk)
  let machineNormal = await Machine.findOne({ machineId: "RISK-NORMAL-001" });
  if (!machineNormal) {
    machineNormal = await Machine.create({
      name: "Normal CNC Mill",
      machineId: "RISK-NORMAL-001",
      plantId: plant._id,
      factoryId: factory._id,
      type: "CNC",
      status: "HEALTHY"
    });
    
    await SensorReading.deleteMany({ machineId: machineNormal._id });
    
    // Create 30 normal readings
    const normalReadings = [];
    for (let i = 0; i < 30; i++) {
      normalReadings.push({
        machineId: machineNormal._id,
        temperature: 45 + (Math.random() - 0.5) * 8,
        vibration: 1.8 + (Math.random() - 0.5) * 0.4,
        powerConsumption: 820 + (Math.random() - 0.5) * 60,
        operatingHours: 15400 + (30 - i),
        recordedAt: new Date(Date.now() - i * 3600000)
      });
    }
    await SensorReading.insertMany(normalReadings);
    console.log(`✅ Created ${machineNormal.name} with normal readings`);
  }
  
  // Machine 2: Anomaly detected (MODERATE-HIGH risk)
  let machineAnomaly = await Machine.findOne({ machineId: "RISK-ANOMALY-001" });
  if (!machineAnomaly) {
    machineAnomaly = await Machine.create({
      name: "Anomaly CNC Mill",
      machineId: "RISK-ANOMALY-001",
      plantId: plant._id,
      factoryId: factory._id,
      type: "CNC",
      status: "WARNING"
    });
    
    await SensorReading.deleteMany({ machineId: machineAnomaly._id });
    
    // Create 30 readings with recent anomalies
    const anomalyReadings = [];
    for (let i = 0; i < 30; i++) {
      const isRecent = i < 5;
      anomalyReadings.push({
        machineId: machineAnomaly._id,
        temperature: isRecent ? 88 + (Math.random() - 0.5) * 8 : 48 + (Math.random() - 0.5) * 8,
        vibration: isRecent ? 5.5 + (Math.random() - 0.5) * 1.0 : 2.0 + (Math.random() - 0.5) * 0.4,
        powerConsumption: isRecent ? 1250 + (Math.random() - 0.5) * 100 : 850 + (Math.random() - 0.5) * 60,
        operatingHours: 18200 + (30 - i),
        recordedAt: new Date(Date.now() - i * 3600000)
      });
    }
    await SensorReading.insertMany(anomalyReadings);
    console.log(`✅ Created ${machineAnomaly.name} with anomalies`);
  }
  
  // Machine 3: Sustained degradation trend (HIGH risk)
  let machineDegraded = await Machine.findOne({ machineId: "RISK-DEGRADE-001" });
  if (!machineDegraded) {
    machineDegraded = await Machine.create({
      name: "Degrading Pump",
      machineId: "RISK-DEGRADE-001",
      plantId: plant._id,
      factoryId: factory._id,
      type: "PUMP",
      status: "WARNING"
    });
    
    await SensorReading.deleteMany({ machineId: machineDegraded._id });
    
    // Create 30 readings with sustained degradation
    const degradedReadings = [];
    for (let i = 0; i < 30; i++) {
      const baseVib = i < 10 ? 4.2 : i < 20 ? 3.0 : 2.2;  // Progressive increase
      degradedReadings.push({
        machineId: machineDegraded._id,
        temperature: 68 + (Math.random() - 0.5) * 8,
        vibration: baseVib + (Math.random() - 0.5) * 0.5,
        pressure: 82 + (Math.random() - 0.5) * 8,
        powerConsumption: 680 + (Math.random() - 0.5) * 60,
        operatingHours: 22100 + (30 - i),
        recordedAt: new Date(Date.now() - i * 3600000)
      });
    }
    await SensorReading.insertMany(degradedReadings);
    console.log(`✅ Created ${machineDegraded.name} with degradation trend`);
  }
  
  console.log('');
  return { machineNormal, machineAnomaly, machineDegraded };
}

async function cleanupTestData() {
  console.log("\nCleaning up test data...");
  
  const machines = await Machine.find({ machineId: { $regex: /^RISK-/ } });
  for (const machine of machines) {
    await SensorReading.deleteMany({ machineId: machine._id });
    await RiskAssessment.deleteMany({ machineId: machine._id });
    await Machine.deleteOne({ _id: machine._id });
  }
  
  console.log("✅ Test data cleaned up");
}

async function runTests() {
  try {
    await connectDB();
    
    console.log("=== DEGRADATION RISK ENGINE - DATABASE INTEGRATION TEST ===\n");
    
    const { machineNormal, machineAnomaly, machineDegraded } = await setupTestData();
    
    // Test 1: Normal machine (LOW risk)
    console.log("1. Normal Machine - LOW Risk Expected");
    const riskNormal = await calculateMachineDegradationRisk(machineNormal);
    
    console.log(`Machine: ${riskNormal.machineName} (${riskNormal.machineType})`);
    console.log(`Health Score: ${riskNormal.healthScore}/100 (${riskNormal.healthStatus})`);
    console.log(`Risk Score: ${riskNormal.riskScore}/100 (${riskNormal.riskCategory})`);
    console.log(`Anomalies: ${riskNormal.anomalyCount} (${riskNormal.trendAnomalyCount} trends)`);
    console.log(`Time to Action: ${riskNormal.timeToAction}`);
    console.log(`Confidence: ${riskNormal.confidence.toFixed(2)}`);
    console.log(`Risk Factors: ${riskNormal.riskFactors.length}`);
    riskNormal.riskFactors.forEach(rf => {
      console.log(`  - ${rf.factor}: ${rf.contribution} (${rf.weight})`);
      console.log(`    ${rf.evidence}`);
    });
    console.log(`Recommendations: ${riskNormal.recommendations.length}`);
    riskNormal.recommendations.forEach(rec => {
      console.log(`  [${rec.priority}] ${rec.action}`);
    });
    console.log('');
    
    // Test 2: Machine with anomalies (MODERATE-HIGH risk)
    console.log("2. Machine with Anomalies - MODERATE-HIGH Risk Expected");
    const riskAnomaly = await calculateMachineDegradationRisk(machineAnomaly);
    
    console.log(`Machine: ${riskAnomaly.machineName} (${riskAnomaly.machineType})`);
    console.log(`Health Score: ${riskAnomaly.healthScore}/100 (${riskAnomaly.healthStatus})`);
    console.log(`Risk Score: ${riskAnomaly.riskScore}/100 (${riskAnomaly.riskCategory})`);
    console.log(`Anomalies: ${riskAnomaly.anomalyCount} (${riskAnomaly.trendAnomalyCount} trends)`);
    console.log(`Time to Action: ${riskAnomaly.timeToAction}`);
    console.log(`Confidence: ${riskAnomaly.confidence.toFixed(2)}`);
    console.log(`Risk Factors: ${riskAnomaly.riskFactors.length}`);
    riskAnomaly.riskFactors.forEach(rf => {
      console.log(`  - ${rf.factor}: ${rf.contribution} (${rf.weight})`);
      console.log(`    ${rf.evidence}`);
    });
    console.log(`Recommendations: ${riskAnomaly.recommendations.length}`);
    riskAnomaly.recommendations.forEach(rec => {
      console.log(`  [${rec.priority}] ${rec.action}`);
    });
    console.log('');
    
    // Test 3: Machine with sustained degradation (HIGH risk)
    console.log("3. Machine with Sustained Degradation - HIGH Risk Expected");
    const riskDegraded = await calculateMachineDegradationRisk(machineDegraded);
    
    console.log(`Machine: ${riskDegraded.machineName} (${riskDegraded.machineType})`);
    console.log(`Health Score: ${riskDegraded.healthScore}/100 (${riskDegraded.healthStatus})`);
    console.log(`Risk Score: ${riskDegraded.riskScore}/100 (${riskDegraded.riskCategory})`);
    console.log(`Anomalies: ${riskDegraded.anomalyCount} (${riskDegraded.trendAnomalyCount} trends)`);
    console.log(`Time to Action: ${riskDegraded.timeToAction}`);
    console.log(`Confidence: ${riskDegraded.confidence.toFixed(2)}`);
    console.log(`Risk Factors: ${riskDegraded.riskFactors.length}`);
    riskDegraded.riskFactors.forEach(rf => {
      console.log(`  - ${rf.factor}: ${rf.contribution} (${rf.weight})`);
      console.log(`    ${rf.evidence}`);
      if (rf.details && rf.details.length > 0) {
        rf.details.forEach(detail => {
          console.log(`      • ${detail.metric}: ${detail.trendPercent ? detail.trendPercent + '%' : 'N/A'}`);
        });
      }
    });
    console.log(`Recommendations: ${riskDegraded.recommendations.length}`);
    riskDegraded.recommendations.forEach(rec => {
      console.log(`  [${rec.priority}] ${rec.action}`);
      console.log(`    Reason: ${rec.reason}`);
    });
    console.log('');
    
    // Test 4: Persist risk assessment
    console.log("4. Risk Assessment Persistence");
    const savedRisk = await RiskAssessment.create(riskDegraded);
    console.log(`✅ Saved risk assessment: ${savedRisk._id}`);
    
    // Retrieve and verify
    const retrieved = await RiskAssessment.findOne({ machineId: machineDegraded._id })
      .sort({ assessmentDate: -1 });
    
    console.log(`✅ Retrieved risk assessment:`);
    console.log(`   Risk Score: ${retrieved.riskScore}/100 (${retrieved.riskCategory})`);
    console.log(`   Factors: ${retrieved.riskFactors.length}`);
    console.log(`   Recommendations: ${retrieved.recommendations.length}`);
    console.log('');
    
    // Test 5: Historical risk tracking
    console.log("5. Historical Risk Tracking");
    const riskHistory = await RiskAssessment.find({ machineId: machineDegraded._id })
      .sort({ assessmentDate: -1 })
      .limit(5);
    
    console.log(`Found ${riskHistory.length} historical assessment(s)`);
    riskHistory.forEach((assessment, idx) => {
      console.log(`  ${idx + 1}. ${assessment.assessmentDate.toISOString()}: ${assessment.riskScore}/100 (${assessment.riskCategory})`);
    });
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
