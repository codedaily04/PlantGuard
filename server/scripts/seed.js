/**
 * PlantGuard AI - Demo Data Seed Script
 * 
 * Creates realistic demo data for development and testing:
 * - 1 Factory
 * - 1 Plant
 * - 3 Machines (CNC, COMPRESSOR, PUMP)
 * - 30-50 telemetry readings per machine
 * 
 * Data includes:
 * - Mostly normal readings
 * - Deliberate anomalies for dashboard demonstration
 * - Vibration trend for degradation detection
 * 
 * Safe to rerun - cleans only its own demo data first.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Factory = require('../src/models/Factory');
const Plant = require('../src/models/Plant');
const Machine = require('../src/models/Machine');
const User = require('../src/models/User');
const SensorReading = require('../src/models/SensorReading');

// Demo data identifiers
const DEMO_EMAIL = 'demo@plantguard.ai';
const DEMO_FACTORY_NAME = 'DEMO_FACTORY';
const DEMO_PLANT_NAME = 'DEMO_PLANT';

// Equipment profiles based on healthCalculations.js
const EQUIPMENT_PROFILES = {
  CNC: {
    temperature: { optimalMin: 20, optimalMax: 70, high: 85, critical: 100 },
    vibration: { normal: 2.0, elevated: 4.0, high: 6.0, critical: 8.0 },
    pressure: null,
    power: { normal: 800, high: 1200, critical: 1500 }
  },
  COMPRESSOR: {
    temperature: { optimalMin: 15, optimalMax: 90, high: 110, critical: 130 },
    vibration: { normal: 3.0, elevated: 6.0, high: 9.0, critical: 12.0 },
    pressure: { optimalMin: 120, optimalMax: 150, high: 170, critical: 200 },
    power: { normal: 500, high: 750, critical: 900 }
  },
  PUMP: {
    temperature: { optimalMin: 10, optimalMax: 80, high: 95, critical: 110 },
    vibration: { normal: 2.5, elevated: 5.0, high: 7.5, critical: 10.0 },
    pressure: { optimalMin: 60, optimalMax: 100, high: 120, critical: 150 },
    power: { normal: 600, high: 900, critical: 1100 }
  }
};

/**
 * Seeded random number generator for reproducibility
 */
class SeededRandom {
  constructor(seed = 12345) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  range(min, max) {
    return min + this.next() * (max - min);
  }
}

/**
 * Generate realistic telemetry readings for a machine
 */
function generateTelemetryReadings(machineType, count = 40) {
  const profile = EQUIPMENT_PROFILES[machineType];
  const random = new SeededRandom(machineType.charCodeAt(0) * 1000);
  const readings = [];
  
  // Base time: 7 days ago
  const baseTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const intervalMs = (7 * 24 * 60 * 60 * 1000) / count; // Spread over 7 days
  
  for (let i = 0; i < count; i++) {
    const age = i / count; // 0.0 to 1.0
    
    // Normal values in optimal range
    let temperature = random.range(
      profile.temperature.optimalMin + 5,
      profile.temperature.optimalMax - 5
    );
    
    let vibration = random.range(
      profile.vibration.normal * 0.3,
      profile.vibration.normal * 0.8
    );
    
    let pressure = null;
    if (profile.pressure) {
      pressure = random.range(
        profile.pressure.optimalMin + 5,
        profile.pressure.optimalMax - 5
      );
    }
    
    let powerConsumption = random.range(
      profile.power.normal * 0.8,
      profile.power.normal * 1.1
    );
    
    // Add vibration trend for COMPRESSOR (for degradation detection)
    if (machineType === 'COMPRESSOR' && age > 0.4) {
      // Gradual increase over last 60% of readings
      const trendFactor = 1 + ((age - 0.4) / 0.6) * 0.5; // Up to 50% increase
      vibration *= trendFactor;
    }
    
    // Add deliberate anomalies
    // CNC: High temperature spike at 70% mark
    if (machineType === 'CNC' && i === Math.floor(count * 0.7)) {
      temperature = profile.temperature.high + 5; // Above threshold
    }
    
    // CNC: High vibration at 80% mark
    if (machineType === 'CNC' && i === Math.floor(count * 0.8)) {
      vibration = profile.vibration.high + 0.5; // Above threshold
    }
    
    // CNC: Recent high temperature (last 3 readings)
    if (machineType === 'CNC' && i >= count - 3) {
      temperature = profile.temperature.optimalMax + 8; // Near threshold
    }
    
    // COMPRESSOR: Pressure drop at 60% mark
    if (machineType === 'COMPRESSOR' && i === Math.floor(count * 0.6)) {
      pressure = profile.pressure.optimalMin - 15; // Below optimal
    }
    
    // COMPRESSOR: Recent elevated vibration (demonstrates the trend)
    if (machineType === 'COMPRESSOR' && i >= count - 5) {
      vibration *= 1.2; // Further increase at the end
    }
    
    // PUMP: Power spike at 75% mark
    if (machineType === 'PUMP' && i === Math.floor(count * 0.75)) {
      powerConsumption = profile.power.high + 50; // Above threshold
    }
    
    // PUMP: Recent high power consumption
    if (machineType === 'PUMP' && i >= count - 2) {
      powerConsumption = profile.power.high + 25; // Above threshold
    }
    
    // Operating hours increase over time
    const operatingHours = 1000 + Math.floor(i * 5);
    
    readings.push({
      temperature: Math.round(temperature * 10) / 10,
      vibration: Math.round(vibration * 100) / 100,
      pressure: pressure ? Math.round(pressure * 10) / 10 : undefined,
      powerConsumption: Math.round(powerConsumption * 10) / 10,
      operatingHours,
      recordedAt: new Date(baseTime + i * intervalMs)
    });
  }
  
  return readings;
}

/**
 * Clean existing demo data
 */
async function cleanDemoData() {
  console.log('🧹 Cleaning existing demo data...');
  
  const demoUser = await User.findOne({ email: DEMO_EMAIL });
  if (demoUser) {
    const demoFactory = await Factory.findOne({ name: DEMO_FACTORY_NAME });
    if (demoFactory) {
      const demoPlant = await Plant.findOne({ name: DEMO_PLANT_NAME });
      if (demoPlant) {
        const demoMachines = await Machine.find({ plantId: demoPlant._id });
        const machineIds = demoMachines.map(m => m._id);
        
        // Delete sensor readings
        const deletedReadings = await SensorReading.deleteMany({ 
          machineId: { $in: machineIds } 
        });
        console.log(`  Deleted ${deletedReadings.deletedCount} sensor readings`);
        
        // Delete machines
        const deletedMachines = await Machine.deleteMany({ 
          plantId: demoPlant._id 
        });
        console.log(`  Deleted ${deletedMachines.deletedCount} machines`);
        
        // Delete plant
        await Plant.deleteOne({ _id: demoPlant._id });
        console.log(`  Deleted plant: ${DEMO_PLANT_NAME}`);
      }
      
      // Delete factory
      await Factory.deleteOne({ _id: demoFactory._id });
      console.log(`  Deleted factory: ${DEMO_FACTORY_NAME}`);
    }
    
    // Delete user
    await User.deleteOne({ _id: demoUser._id });
    console.log(`  Deleted user: ${DEMO_EMAIL}`);
  }
  
  console.log('✓ Demo data cleaned\n');
}

/**
 * Create demo data
 */
async function createDemoData() {
  console.log('🌱 Creating demo data...\n');
  
  const bcrypt = require('bcryptjs');
  
  // Create demo user
  console.log('Creating demo user...');
  const hashedPassword = await bcrypt.hash('demo123', 10);
  const user = await User.create({
    name: 'Demo User',
    email: DEMO_EMAIL,
    password: hashedPassword,
    role: 'ADMIN'
  });
  console.log(`✓ User created: ${user.email}`);
  
  // Create demo factory
  console.log('\nCreating demo factory...');
  const factory = await Factory.create({
    name: DEMO_FACTORY_NAME,
    location: 'Silicon Valley, CA',
    industry: 'Advanced Manufacturing',
    userId: user._id
  });
  console.log(`✓ Factory created: ${factory.name}`);
  
  // Create demo plant
  console.log('\nCreating demo plant...');
  const plant = await Plant.create({
    name: DEMO_PLANT_NAME,
    plantType: 'MANUFACTURING',
    location: 'Building A - Production Floor',
    factoryId: factory._id,
    owner: user._id,
    capacity: 1000,
    status: 'OPERATIONAL',
    commissioningDate: new Date('2023-01-15')
  });
  console.log(`✓ Plant created: ${plant.name}`);
  
  // Create machines and telemetry
  console.log('\nCreating machines and telemetry...');
  
  const machineConfigs = [
    {
      name: 'CNC Milling Center',
      machineId: 'CNC-001',
      type: 'CNC',
      description: 'High-precision CNC milling machine for metal parts',
      readingCount: 45
    },
    {
      name: 'Air Compressor Unit',
      machineId: 'COMP-001',
      type: 'COMPRESSOR',
      description: 'Industrial air compressor for pneumatic systems',
      readingCount: 50
    },
    {
      name: 'Hydraulic Pump',
      machineId: 'PUMP-001',
      type: 'PUMP',
      description: 'High-flow hydraulic pump for press systems',
      readingCount: 40
    }
  ];
  
  const createdMachines = [];
  
  for (const config of machineConfigs) {
    console.log(`\n  Creating ${config.type} machine...`);
    
    const machine = await Machine.create({
      name: config.name,
      machineId: config.machineId,
      type: config.type,
      plantId: plant._id,
      factoryId: factory._id,
      status: 'HEALTHY',
      installDate: new Date('2023-02-01'),
      manufacturer: 'PlantGuard Demo',
      model: `${config.type}-2023`,
      serialNumber: `SN-${config.machineId}`
    });
    
    console.log(`  ✓ Machine created: ${machine.name}`);
    
    // Generate telemetry readings
    console.log(`    Generating ${config.readingCount} telemetry readings...`);
    const readings = generateTelemetryReadings(config.type, config.readingCount);
    
    // Add machineId to each reading
    const readingsWithMachine = readings.map(r => ({
      ...r,
      machineId: machine._id
    }));
    
    // Insert readings
    await SensorReading.insertMany(readingsWithMachine);
    console.log(`    ✓ Created ${readings.length} sensor readings`);
    
    createdMachines.push({
      name: machine.name,
      type: machine.type,
      id: machine._id,
      readingCount: readings.length
    });
  }
  
  return {
    user,
    factory,
    plant,
    machines: createdMachines
  };
}

/**
 * Verify created data
 */
async function verifyData(demoData) {
  console.log('\n\n📊 Verifying created data...\n');
  
  const factory = await Factory.findById(demoData.factory._id);
  console.log(`✓ Factory: ${factory.name}`);
  
  const plant = await Plant.findById(demoData.plant._id);
  console.log(`✓ Plant: ${plant.name} (${plant.plantType})`);
  
  console.log(`✓ Machines: ${demoData.machines.length}`);
  
  for (const machineInfo of demoData.machines) {
    const machine = await Machine.findById(machineInfo.id);
    const readingCount = await SensorReading.countDocuments({ 
      machineId: machine._id 
    });
    
    console.log(`  - ${machine.name} (${machine.type}): ${readingCount} readings`);
    
    // Show sample reading
    const latestReading = await SensorReading.findOne({ 
      machineId: machine._id 
    }).sort({ recordedAt: -1 });
    
    if (latestReading) {
      console.log(`    Latest: T=${latestReading.temperature}°C, ` +
                  `V=${latestReading.vibration}mm/s, ` +
                  `${latestReading.pressure ? `P=${latestReading.pressure}PSI, ` : ''}` +
                  `Pwr=${latestReading.powerConsumption}kW`);
    }
  }
}

/**
 * Main execution
 */
async function seed() {
  try {
    console.log('═══════════════════════════════════════');
    console.log('   PlantGuard AI - Demo Data Seeder');
    console.log('═══════════════════════════════════════\n');
    
    // Connect to MongoDB
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');
    
    // Clean existing demo data
    await cleanDemoData();
    
    // Create new demo data
    const demoData = await createDemoData();
    
    // Verify
    await verifyData(demoData);
    
    console.log('\n═══════════════════════════════════════');
    console.log('✓ DEMO DATA SEEDED SUCCESSFULLY');
    console.log('═══════════════════════════════════════\n');
    
    console.log('Demo credentials:');
    console.log(`  Email: ${DEMO_EMAIL}`);
    console.log(`  Password: demo123\n`);
    
    console.log('You can now:');
    console.log('  1. Login with demo credentials');
    console.log('  2. View machines and their telemetry');
    console.log('  3. Test health analysis and anomaly detection');
    console.log('  4. Try What-If simulations');
    console.log('  5. Test AI operations advisor\n');
    
    await mongoose.connection.close();
    console.log('✓ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seed();
}

module.exports = { seed };
