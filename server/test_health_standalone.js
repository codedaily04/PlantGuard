/**
 * Standalone Industrial Health Test
 * Tests without database connection
 */

const {
  extractLatestSensorSnapshot,
  calculateMachineHealth,
  detectAnomalies,
  getEquipmentProfile,
} = require('./src/services/healthCalculations');

console.log('=== STANDALONE INDUSTRIAL HEALTH TEST ===\n');

// Test 1: Equipment Profile Selection
console.log('1. Equipment Profile Selection');
const cncProfile = getEquipmentProfile('CNC');
const compressorProfile = getEquipmentProfile('COMPRESSOR');
const pumpProfile = getEquipmentProfile('PUMP');
const unknownProfile = getEquipmentProfile('UNKNOWN_TYPE');

console.log('CNC temp range:', cncProfile.temperature.optimalMin, '-', cncProfile.temperature.optimalMax, '°C');
console.log('COMPRESSOR pressure range:', compressorProfile.pressure.optimalMin, '-', compressorProfile.pressure.optimalMax, 'PSI');
console.log('PUMP vibration normal:', pumpProfile.vibration.normal, 'mm/s');
console.log('Unknown falls back to default:', unknownProfile === getEquipmentProfile(''));
console.log('');

// Test 2: CNC Normal vs Critical
console.log('2. CNC Machine - Normal vs Critical Comparison');
const cncMachine = { type: 'CNC', name: 'CNC-001' };

const normalReadings = [{
  temperature: 50,
  vibration: 1.8,
  powerConsumption: 820,
  operatingHours: 1000,
  recordedAt: new Date()
}];

const criticalReadings = [{
  temperature: 105,
  vibration: 8.5,
  powerConsumption: 1600,
  operatingHours: 1010,
  recordedAt: new Date()
}];

const normalSnapshot = extractLatestSensorSnapshot(normalReadings);
const criticalSnapshot = extractLatestSensorSnapshot(criticalReadings);

const normalHealth = calculateMachineHealth(normalSnapshot, cncMachine);
const criticalHealth = calculateMachineHealth(criticalSnapshot, cncMachine);

console.log('Normal Operation:', normalHealth.healthScore, '-', normalHealth.status);
console.log('Critical State:', criticalHealth.healthScore, '-', criticalHealth.status);
console.log('');

// Test 3: Compressor with Missing Sensors
console.log('3. Compressor - Partial Sensor Data');
const compressor = { type: 'COMPRESSOR', name: 'COMP-202' };

const partialReadings = [{
  temperature: 85,
  vibration: null,  // Missing
  pressure: 140,
  powerConsumption: null,  // Missing
  operatingHours: 5000,
  recordedAt: new Date()
}];

const partialSnapshot = extractLatestSensorSnapshot(partialReadings);
const partialHealth = calculateMachineHealth(partialSnapshot, compressor);

console.log('Snapshot availability:', partialSnapshot.availability);
console.log('Health with partial data:', partialHealth.healthScore, '-', partialHealth.status);
console.log('Score breakdown:', partialHealth.scoreBreakdown);
console.log('');

// Test 4: Anomaly Detection Thresholds
console.log('4. Anomaly Detection - Equipment-Specific Thresholds');

const testCases = [
  {
    machine: { type: 'CNC', name: 'CNC-001' },
    readings: [{ temperature: 95, vibration: 7.0, powerConsumption: 1300, recordedAt: new Date() }],
    expected: 'High temperature + High vibration for CNC'
  },
  {
    machine: { type: 'COMPRESSOR', name: 'COMP-202' },
    readings: [{ temperature: 95, vibration: 7.0, pressure: 110, powerConsumption: 600, recordedAt: new Date() }],
    expected: 'Normal for Compressor (higher thresholds)'
  },
  {
    machine: { type: 'PUMP', name: 'PUMP-305' },
    readings: [{ temperature: 95, vibration: 7.0, pressure: 45, powerConsumption: 650, recordedAt: new Date() }],
    expected: 'High temp + High vibration + Low pressure for Pump'
  }
];

testCases.forEach(tc => {
  const snapshot = extractLatestSensorSnapshot(tc.readings);
  const anomalies = detectAnomalies(snapshot, tc.machine, tc.readings);
  console.log(`${tc.machine.type}:`, anomalies.length, 'anomalies -', tc.expected);
  anomalies.forEach(a => console.log(`  - ${a.type} (${a.severity})`));
});
console.log('');

// Test 5: Score Breakdown Reasoning
console.log('5. Score Breakdown Reasoning');
const testMachine = { type: 'CNC', name: 'Test Machine' };
const testReadings = [{
  temperature: 85,  // High for CNC
  vibration: 1.5,   // Normal
  powerConsumption: 800,  // Normal
  recordedAt: new Date()
}];

const testSnapshot = extractLatestSensorSnapshot(testReadings);
const testHealth = calculateMachineHealth(testSnapshot, testMachine);

console.log('Health Score:', testHealth.healthScore);
console.log('Breakdown:');
Object.entries(testHealth.scoreReasons).forEach(([sensor, reason]) => {
  console.log(`  ${sensor}: ${testHealth.scoreBreakdown[sensor]}/25 - ${reason}`);
});
console.log('');

console.log('=== STANDALONE TEST COMPLETE ===');
