/**
 * Industrial Health Intelligence Test
 * Tests equipment-type aware health calculations
 */

const {
  extractLatestSensorSnapshot,
  assessDataQuality,
  calculateMachineHealth,
  detectAnomalies,
  getEquipmentProfile,
  EQUIPMENT_PROFILES,
} = require('./src/services/healthCalculations');

console.log('=== INDUSTRIAL HEALTH INTELLIGENCE TEST ===\n');

// Test equipment profiles
console.log('1. Equipment Profiles Test');
console.log('CNC Profile:', JSON.stringify(EQUIPMENT_PROFILES.CNC, null, 2));
console.log('COMPRESSOR Profile:', JSON.stringify(EQUIPMENT_PROFILES.COMPRESSOR, null, 2));
console.log('PUMP Profile:', JSON.stringify(EQUIPMENT_PROFILES.PUMP, null, 2));
console.log('');

// Test CNC Machine - Normal Operation
console.log('2. CNC Machine - Normal Operation');
const cncMachine = { _id: 'cnc001', name: 'CNC Mill 001', type: 'CNC' };
const cncNormalReadings = [
  {
    machineId: 'cnc001',
    temperature: 45,
    vibration: 2.1,
    pressure: null,
    powerConsumption: 850,
    operatingHours: 15420,
    recordedAt: new Date()
  }
];

const cncSnapshot = extractLatestSensorSnapshot(cncNormalReadings);
console.log('Telemetry Snapshot:', cncSnapshot);

const cncHealth = calculateMachineHealth(cncSnapshot, cncMachine);
console.log('Health Score:', cncHealth.healthScore, 'Status:', cncHealth.status);
console.log('Score Breakdown:', cncHealth.scoreBreakdown);

const cncAnomalies = detectAnomalies(cncSnapshot, cncMachine, cncNormalReadings);
console.log('Anomalies:', cncAnomalies.length, cncAnomalies);
console.log('');

// Test CNC - Temperature Spike
console.log('3. CNC Machine - Temperature Spike & Vibration');
const cncHotReadings = [
  {
    machineId: 'cnc001',
    temperature: 92,
    vibration: 5.8,
    pressure: null,
    powerConsumption: 890,
    operatingHours: 15430,
    recordedAt: new Date()
  }
];

const cncHotSnapshot = extractLatestSensorSnapshot(cncHotReadings);
const cncHotHealth = calculateMachineHealth(cncHotSnapshot, cncMachine);
console.log('Health Score:', cncHotHealth.healthScore, 'Status:', cncHotHealth.status);

const cncHotAnomalies = detectAnomalies(cncHotSnapshot, cncMachine, cncHotReadings);
console.log('Anomalies:', cncHotAnomalies.length);
cncHotAnomalies.forEach(a => console.log(`  [${a.severity}] ${a.type}: ${a.message}`));
console.log('');

// Test Compressor - Pressure Drop
console.log('4. Compressor - Pressure Drop (Leak)');
const compressor = { _id: 'comp202', name: 'Air Compressor 202', type: 'COMPRESSOR' };
const compLeakReadings = [
  {
    machineId: 'comp202',
    temperature: 78,
    vibration: 5.2,
    pressure: 95,
    powerConsumption: 520,
    operatingHours: 8240,
    recordedAt: new Date()
  }
];

const compSnapshot = extractLatestSensorSnapshot(compLeakReadings);
const compHealth = calculateMachineHealth(compSnapshot, compressor);
console.log('Health Score:', compHealth.healthScore, 'Status:', compHealth.status);

const compAnomalies = detectAnomalies(compSnapshot, compressor, compLeakReadings);
console.log('Anomalies:', compAnomalies.length);
compAnomalies.forEach(a => console.log(`  [${a.severity}] ${a.type}: ${a.message}`));
console.log('');

// Test Compressor - Critical Overheat
console.log('5. Compressor - Critical Overheat');
const compCriticalReadings = [
  {
    machineId: 'comp202',
    temperature: 135,
    vibration: 11.5,
    pressure: 172,
    powerConsumption: 880,
    operatingHours: 8250,
    recordedAt: new Date()
  }
];

const compCritSnapshot = extractLatestSensorSnapshot(compCriticalReadings);
const compCritHealth = calculateMachineHealth(compCritSnapshot, compressor);
console.log('Health Score:', compCritHealth.healthScore, 'Status:', compCritHealth.status);

const compCritAnomalies = detectAnomalies(compCritSnapshot, compressor, compCriticalReadings);
console.log('Anomalies:', compCritAnomalies.length);
compCritAnomalies.forEach(a => console.log(`  [${a.severity}] ${a.type}: ${a.message}`));
console.log('');

// Test Pump - Degradation Trend
console.log('6. Pump - Gradual Degradation (Trend-Based)');
const pump = { _id: 'pump305', name: 'Hydraulic Pump 305', type: 'PUMP' };

// Create 20 readings with increasing vibration trend
const pumpReadings = [];
for (let i = 0; i < 20; i++) {
  const baseVibration = i < 10 ? 2.8 : 3.5; // Recent avg 3.5, older avg 2.8
  const noise = (Math.random() - 0.5) * 0.3;
  pumpReadings.push({
    machineId: 'pump305',
    temperature: 65 + noise,
    vibration: baseVibration + noise,
    pressure: 88 + noise * 5,
    powerConsumption: 640 + noise * 20,
    operatingHours: 12100 + (20 - i) * 10,
    recordedAt: new Date(Date.now() - i * 3600000)
  });
}

const pumpSnapshot = extractLatestSensorSnapshot(pumpReadings);
const pumpHealth = calculateMachineHealth(pumpSnapshot, pump);
console.log('Health Score:', pumpHealth.healthScore, 'Status:', pumpHealth.status);

const pumpAnomalies = detectAnomalies(pumpSnapshot, pump, pumpReadings);
console.log('Anomalies:', pumpAnomalies.length);
pumpAnomalies.forEach(a => {
  console.log(`  [${a.severity}] ${a.type}: ${a.message}`);
  if (a.evidence && a.evidence.trend) {
    console.log(`    Evidence: ${JSON.stringify(a.evidence)}`);
  }
});
console.log('');

// Test Pump - Power Spike
console.log('7. Pump - Power Spike (Electrical Issue)');
const pumpPowerReadings = [
  {
    machineId: 'pump305',
    temperature: 72,
    vibration: 3.1,
    pressure: 92,
    powerConsumption: 1150,
    operatingHours: 12110,
    recordedAt: new Date()
  }
];

const pumpPowerSnapshot = extractLatestSensorSnapshot(pumpPowerReadings);
const pumpPowerHealth = calculateMachineHealth(pumpPowerSnapshot, pump);
console.log('Health Score:', pumpPowerHealth.healthScore, 'Status:', pumpPowerHealth.status);

const pumpPowerAnomalies = detectAnomalies(pumpPowerSnapshot, pump, pumpPowerReadings);
console.log('Anomalies:', pumpPowerAnomalies.length);
pumpPowerAnomalies.forEach(a => console.log(`  [${a.severity}] ${a.type}: ${a.message}`));
console.log('');

// Test Data Quality
console.log('8. Data Quality Assessment');
console.log('20 readings:', assessDataQuality(pumpReadings));
console.log('5 readings:', assessDataQuality(cncNormalReadings));
console.log('0 readings:', assessDataQuality([]));
console.log('');

console.log('=== ALL TESTS COMPLETE ===');
