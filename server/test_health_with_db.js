/**
 * Industrial Health Intelligence Test with Database
 * Tests machine-level health intelligence with real MongoDB data
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Plant = require("./src/models/Plant");
const Machine = require("./src/models/Machine");
const SensorReading = require("./src/models/SensorReading");
const Factory = require("./src/models/Factory");
const User = require("./src/models/User");

const { generateMachineHealthIntelligence, generatePlantHealthSummary } = require("./src/services/healthIntelligenceService");

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
  console.log("Setting up industrial test data...\n");
  
  // Create test user
  let user = await User.findOne({ email: "test@plantguard.com" });
  if (!user) {
    user = await User.create({
      name: "Test User",
      email: "test@plantguard.com",
      password: "hashedpassword123"
    });
  }
  
  // Create test factory
  let factory = await Factory.findOne({ name: "Manufacturing Facility Alpha" });
  if (!factory) {
    factory = await Factory.create({
      name: "Manufacturing Facility Alpha",
      location: "Detroit, MI",
      industry: "Automotive",
      owner: user._id
    });
  }
  
  // Create test plant (industrial facility)
  let plant = await Plant.findOne({ name: "Assembly Plant A" });
  if (!plant) {
    plant = await Plant.create({
      name: "Assembly Plant A",
      plantType: "Manufacturing",
      factoryId: factory._id,
      location: "Building 3, Floor 2",
      status: "OPERATIONAL",
      capacity: 10000,
      commissioningDate: new Date('2020-01-15'),
      owner: user._id
    });
    console.log(`✅ Created plant: ${plant.name}`);
  }
  
  // Create test machines
  const machineData = [
    {
      name: "CNC Mill 001",
      machineId: "CNC-001",
      plantId: plant._id,
      factoryId: factory._id,
      type: "CNC",
      status: "HEALTHY",
      installationDate: new Date('2020-02-01'),
      lastMaintenance: new Date('2024-11-15')
    },
    {
      name: "Air Compressor 202",
      machineId: "COMP-202",
      plantId: plant._id,
      factoryId: factory._id,
      type: "COMPRESSOR",
      status: "HEALTHY",
      installationDate: new Date('2020-03-10'),
      lastMaintenance: new Date('2024-10-20')
    },
    {
      name: "Hydraulic Pump 305",
      machineId: "PUMP-305",
      plantId: plant._id,
      factoryId: factory._id,
      type: "PUMP",
      status: "WARNING",
      installationDate: new Date('2020-04-05'),
      lastMaintenance: new Date('2024-09-10')
    }
  ];
  
  const machines = [];
  for (const data of machineData) {
    let machine = await Machine.findOne({ machineId: data.machineId });
    if (!machine) {
      machine = await Machine.create(data);
      console.log(`✅ Created machine: ${machine.name}`);
    }
    machines.push(machine);
  }
  
  // Create sensor readings for each machine
  for (const machine of machines) {
    const readingCount = await SensorReading.countDocuments({ machineId: machine._id });
    
    if (readingCount === 0) {
      const readings = [];
      const now = Date.now();
      
      // Generate 25 readings for trend detection
      for (let i = 0; i < 25; i++) {
        const hoursAgo = 25 - i;
        let reading;
        
        if (machine.type === 'CNC') {
          // CNC readings: normal operation with slight variation
          reading = {
            machineId: machine._id,
            temperature: 45 + (Math.random() - 0.5) * 10,
            vibration: 2.0 + (Math.random() - 0.5) * 0.5,
            pressure: null,
            powerConsumption: 850 + (Math.random() - 0.5) * 100,
            operatingHours: 15400 + (25 - i),
            recordedAt: new Date(now - hoursAgo * 3600000)
          };
        } else if (machine.type === 'COMPRESSOR') {
          // Compressor: showing pressure drop over time
          const pressureDrop = i < 15 ? 0 : (i - 15) * 2;
          reading = {
            machineId: machine._id,
            temperature: 78 + (Math.random() - 0.5) * 5,
            vibration: 5.0 + (Math.random() - 0.5) * 1.0,
            pressure: 140 - pressureDrop + (Math.random() - 0.5) * 5,
            powerConsumption: 520 + (Math.random() - 0.5) * 50,
            operatingHours: 8200 + (25 - i),
            recordedAt: new Date(now - hoursAgo * 3600000)
          };
        } else if (machine.type === 'PUMP') {
          // Pump: showing vibration degradation trend
          const baseVibration = i < 12 ? 2.8 : 3.5;
          reading = {
            machineId: machine._id,
            temperature: 65 + (Math.random() - 0.5) * 5,
            vibration: baseVibration + (Math.random() - 0.5) * 0.3,
            pressure: 88 + (Math.random() - 0.5) * 5,
            powerConsumption: 640 + (Math.random() - 0.5) * 40,
            operatingHours: 12100 + (25 - i),
            recordedAt: new Date(now - hoursAgo * 3600000)
          };
        }
        
        readings.push(reading);
      }
      
      await SensorReading.insertMany(readings);
      console.log(`✅ Created ${readings.length} sensor readings for ${machine.name}`);
    }
  }
  
  console.log("");
  return { plant, machines };
}

async function cleanupTestData() {
  console.log("\nCleaning up test data...");
  
  const plant = await Plant.findOne({ name: "Assembly Plant A" });
  if (plant) {
    const machines = await Machine.find({ plantId: plant._id });
    
    for (const machine of machines) {
      await SensorReading.deleteMany({ machineId: machine._id });
    }
    
    await Machine.deleteMany({ plantId: plant._id });
    await Plant.deleteOne({ _id: plant._id });
  }
  
  console.log("✅ Test data cleaned up");
}

async function runTests() {
  try {
    await connectDB();
    
    console.log("=== INDUSTRIAL HEALTH INTELLIGENCE TEST WITH DATABASE ===\n");
    
    const { plant, machines } = await setupTestData();
    
    // Test 1: Machine-Level Health Intelligence
    console.log("1. Machine-Level Health Intelligence\n");
    
    for (const machine of machines) {
      console.log(`--- ${machine.name} (${machine.type}) ---`);
      
      const intelligence = await generateMachineHealthIntelligence(machine);
      
      console.log(`Health Score: ${intelligence.healthScore}/100`);
      console.log(`Status: ${intelligence.status.toUpperCase()}`);
      console.log(`Telemetry:`, {
        temp: intelligence.telemetry.temperature,
        vib: intelligence.telemetry.vibration,
        press: intelligence.telemetry.pressure,
        power: intelligence.telemetry.powerConsumption
      });
      console.log(`Anomalies: ${intelligence.anomalies.length}`);
      intelligence.anomalies.forEach(a => {
        console.log(`  [${a.severity}] ${a.type}: ${a.message}`);
      });
      console.log(`Data Quality: ${intelligence.dataQuality.quality} (${intelligence.readingsAnalyzed} readings)`);
      console.log("");
    }
    
    // Test 2: Plant Health Summary (Aggregation)
    console.log("2. Plant Health Summary (Aggregated from Machines)\n");
    
    const plantSummary = await generatePlantHealthSummary(plant);
    
    console.log(`Plant: ${plantSummary.plantName} (${plantSummary.plantType})`);
    console.log(`Overall Health Score: ${plantSummary.overallHealthScore}/100`);
    console.log(`Status: ${plantSummary.status.toUpperCase()}`);
    console.log(`Machine Count: ${plantSummary.machineCount}`);
    console.log(`Machines by Status:`, plantSummary.machinesByStatus);
    console.log("");
    
    plantSummary.machines.forEach(m => {
      console.log(`  ${m.machineName} (${m.machineType}): ${m.healthScore}/100 - ${m.status}`);
    });
    console.log("");
    
    // Test 3: Degradation Detection
    console.log("3. Degradation Detection Test\n");
    
    const pumpMachine = machines.find(m => m.type === 'PUMP');
    if (pumpMachine) {
      const pumpIntelligence = await generateMachineHealthIntelligence(pumpMachine);
      
      const degradationAnomaly = pumpIntelligence.anomalies.find(a => a.type === 'degradation_detected');
      
      if (degradationAnomaly) {
        console.log("✅ Degradation detected (trend-based analysis):");
        console.log(`   ${degradationAnomaly.message}`);
        console.log(`   Evidence:`, degradationAnomaly.evidence);
      } else {
        console.log("ℹ️  No degradation detected (may need more data or larger trend)");
      }
    }
    console.log("");
    
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

// Run if called directly
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runTests };
