/**
 * Machine Detail Page
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import StatusBadge from '../components/StatusBadge';
import { machineAPI, sensorAPI, aiAPI, simulationAPI } from '../utils/api';

const MachineDetail = () => {
  const { machineId } = useParams();
  const [machine, setMachine] = useState(null);
  const [readings, setReadings] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  
  // What-If Simulation state
  const [simulations, setSimulations] = useState({
    temperature: '',
    vibration: '',
    pressure: '',
    powerConsumption: '',
  });
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState('');
  const [useAI, setUseAI] = useState(true);

  const fetchMachineData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [machineRes, readingsRes] = await Promise.all([
        machineAPI.getById(machineId),
        sensorAPI.getReadings(machineId, 10),
      ]);

      setMachine(machineRes.data.machine || machineRes.data);
      setReadings(readingsRes.data.readings || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load machine data');
    } finally {
      setLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await aiAPI.analyze(machineId, true);
      setAiAnalysis(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSimulationChange = (field, value) => {
    setSimulations(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const runSimulation = async () => {
    setSimulating(true);
    setSimulationError('');
    setSimulationResult(null);

    try {
      // Filter out empty modifications
      const modifications = {};
      Object.entries(simulations).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          // Try to parse as number, otherwise keep as string for relative values
          const trimmed = value.trim();
          if (!trimmed.includes('%') && !trimmed.includes('+') && !trimmed.includes('-')) {
            // Pure number
            const num = parseFloat(trimmed);
            if (!isNaN(num)) {
              modifications[key] = num;
            } else {
              modifications[key] = trimmed;
            }
          } else {
            modifications[key] = trimmed;
          }
        }
      });

      if (Object.keys(modifications).length === 0) {
        setSimulationError('Please enter at least one modification');
        setSimulating(false);
        return;
      }

      // Use AI-enhanced endpoint if enabled
      const response = useAI
        ? await simulationAPI.whatIfAI(machineId, modifications, { includeRisk: true })
        : await simulationAPI.whatIf(machineId, modifications, { includeRisk: true });

      setSimulationResult(response.data);
    } catch (err) {
      setSimulationError(
        err.response?.data?.error || err.response?.data?.message || 'Simulation failed'
      );
    } finally {
      setSimulating(false);
    }
  };

  const clearSimulation = () => {
    setSimulations({
      temperature: '',
      vibration: '',
      pressure: '',
      powerConsumption: '',
    });
    setSimulationResult(null);
    setSimulationError('');
  };

  useEffect(() => {
    fetchMachineData();
  }, [machineId]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <Navbar />
      
      <div style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link to="/machines" style={{ color: '#3498db', textDecoration: 'none' }}>
            ← Back to Machines
          </Link>
        </div>

        {loading && <Loading message="Loading machine details..." />}
        
        {error && <ErrorMessage message={error} onRetry={fetchMachineData} />}

        {machine && !loading && (
          <>
            {/* Machine Info */}
            <Card title={machine.name} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Type:</strong> {machine.type}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Machine ID:</strong> {machine.machineId}
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Status:</strong> <StatusBadge status={machine.status} />
                  </div>
                </div>
                <div>
                  {machine.healthScore != null && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Health Score:</strong> {machine.healthScore}/100
                    </div>
                  )}
                  {machine.installationDate && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Installed:</strong>{' '}
                      {new Date(machine.installationDate).toLocaleDateString()}
                    </div>
                  )}
                  {machine.lastMaintenance && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Last Maintenance:</strong>{' '}
                      {new Date(machine.lastMaintenance).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Recent Telemetry */}
            <Card title="Recent Telemetry" style={{ marginBottom: '1.5rem' }}>
              {readings.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Time</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Temp (°C)</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Vibration</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Pressure</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Power (kW)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readings.map((reading, idx) => (
                        <tr key={reading._id || idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td style={{ padding: '0.75rem' }}>
                            {new Date(reading.recordedAt).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {reading.temperature != null ? reading.temperature.toFixed(1) : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {reading.vibration != null ? reading.vibration.toFixed(2) : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {reading.pressure != null ? reading.pressure.toFixed(0) : 'N/A'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            {reading.powerConsumption != null ? reading.powerConsumption.toFixed(1) : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>No Telemetry Data</h4>
                  <p style={{ margin: '0 0 1rem 0', color: '#7f8c8d' }}>
                    This machine doesn't have any sensor readings yet. Sensor data is required for:
                  </p>
                  <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.5rem', color: '#7f8c8d' }}>
                    <li>Health Score Calculation</li>
                    <li>Anomaly Detection</li>
                    <li>Degradation Risk Assessment</li>
                    <li>AI Operations Analysis</li>
                    <li>What-If Simulation</li>
                  </ul>
                  <p style={{ margin: 0, color: '#7f8c8d', fontSize: '0.875rem' }}>
                    Connect sensors or import historical data to start monitoring this machine's performance.
                  </p>
                </div>
              )}
            </Card>

            {/* AI Analysis */}
            <Card title="AI Operations Advisor" actions={
              <button
                onClick={runAIAnalysis}
                disabled={analyzing || readings.length === 0}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: analyzing || readings.length === 0 ? '#95a5a6' : '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: analyzing || readings.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            } style={{ marginBottom: '1.5rem' }}>
              {analyzing && <Loading message="Running AI analysis..." />}
              
              {aiAnalysis && !analyzing && (
                <div>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>Health Score:</strong> {aiAnalysis.health?.score || 'N/A'}/100
                    {' '}
                    <StatusBadge status={aiAnalysis.health?.status} />
                  </div>

                  {aiAnalysis.degradationRisk && (
                    <div style={{ marginBottom: '1rem' }}>
                      <strong>Degradation Risk:</strong> {aiAnalysis.degradationRisk.riskScore}/100
                      {' '}
                      <StatusBadge status={aiAnalysis.degradationRisk.riskCategory} />
                    </div>
                  )}

                  {aiAnalysis.aiInterpretation && (
                    <>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Executive Summary:</strong>
                        <p style={{ marginTop: '0.5rem', color: '#2c3e50' }}>
                          {aiAnalysis.aiInterpretation.executiveSummary}
                        </p>
                      </div>

                      {aiAnalysis.aiInterpretation.recommendedActions?.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Recommended Actions:</strong>
                          <ul style={{ marginTop: '0.5rem' }}>
                            {aiAnalysis.aiInterpretation.recommendedActions.map((action, idx) => (
                              <li key={idx} style={{ marginBottom: '0.5rem' }}>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiAnalysis.aiInterpretation.safetyConsiderations && (
                        <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                          <strong>Safety:</strong> {aiAnalysis.aiInterpretation.safetyConsiderations}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {!aiAnalysis && !analyzing && readings.length === 0 && (
                <p style={{ color: '#7f8c8d' }}>No telemetry data available for analysis</p>
              )}

              {!aiAnalysis && !analyzing && readings.length > 0 && (
                <p style={{ color: '#7f8c8d' }}>Click "Run AI Analysis" to get insights</p>
              )}
            </Card>

            {/* What-If Simulation */}
            <Card title="What-If Simulation" style={{ marginBottom: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', color: '#7f8c8d' }}>
                Simulate parameter changes to see their impact on equipment health and risk.
                Supports: absolute values (50), deltas (+20, -15), percentages (+30%, -20%)
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Temperature (°C)
                  </label>
                  <input
                    type="text"
                    value={simulations.temperature}
                    onChange={(e) => handleSimulationChange('temperature', e.target.value)}
                    placeholder="e.g., +20, -15, or +30%"
                    disabled={simulating}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Vibration (mm/s)
                  </label>
                  <input
                    type="text"
                    value={simulations.vibration}
                    onChange={(e) => handleSimulationChange('vibration', e.target.value)}
                    placeholder="e.g., +50%, +1.5, or -20%"
                    disabled={simulating}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Pressure (PSI)
                  </label>
                  <input
                    type="text"
                    value={simulations.pressure}
                    onChange={(e) => handleSimulationChange('pressure', e.target.value)}
                    placeholder="e.g., -20%, +10, or 100"
                    disabled={simulating}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Power Consumption (kW)
                  </label>
                  <input
                    type="text"
                    value={simulations.powerConsumption}
                    onChange={(e) => handleSimulationChange('powerConsumption', e.target.value)}
                    placeholder="e.g., +15%, +5, or 12"
                    disabled={simulating}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={useAI}
                    onChange={(e) => setUseAI(e.target.checked)}
                    disabled={simulating}
                  />
                  <span>Include AI interpretation</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button
                  onClick={runSimulation}
                  disabled={simulating || readings.length === 0}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: simulating || readings.length === 0 ? '#95a5a6' : '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: simulating || readings.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                  }}
                >
                  {simulating ? 'Simulating...' : 'Run Simulation'}
                </button>

                <button
                  onClick={clearSimulation}
                  disabled={simulating}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'white',
                    color: '#7f8c8d',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: simulating ? 'not-allowed' : 'pointer',
                  }}
                >
                  Clear
                </button>
              </div>

              {simulationError && <ErrorMessage message={simulationError} />}

              {simulating && <Loading message="Running simulation..." />}

              {simulationResult && !simulating && (
                <div style={{ marginTop: '1.5rem', border: '2px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                  {/* Comparison Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', backgroundColor: '#f8f9fa' }}>
                    <div style={{ padding: '1rem', borderRight: '1px solid #e0e0e0', textAlign: 'center' }}>
                      <h4 style={{ margin: 0, color: '#2c3e50' }}>BASELINE</h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#7f8c8d' }}>Current State</p>
                    </div>
                    <div style={{ padding: '1rem', textAlign: 'center' }}>
                      <h4 style={{ margin: 0, color: '#2c3e50' }}>SIMULATED</h4>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#7f8c8d' }}>What-If Scenario</p>
                    </div>
                  </div>

                  {/* Health Score Comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #e0e0e0' }}>
                    <div style={{ padding: '1rem', borderRight: '1px solid #e0e0e0' }}>
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>Health Score</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2c3e50' }}>
                        {simulationResult.simulation?.baseline?.healthScore || 'N/A'}
                        <span style={{ fontSize: '1rem', color: '#7f8c8d' }}>/100</span>
                      </div>
                      <StatusBadge status={simulationResult.simulation?.baseline?.healthStatus} />
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>Health Score</div>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: simulationResult.simulation?.comparison?.healthDelta < 0 ? '#e74c3c' : '#27ae60' }}>
                        {simulationResult.simulation?.simulated?.healthScore || 'N/A'}
                        <span style={{ fontSize: '1rem', color: '#7f8c8d' }}>/100</span>
                      </div>
                      <StatusBadge status={simulationResult.simulation?.simulated?.healthStatus} />
                      {simulationResult.simulation?.comparison?.healthDelta != null && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: simulationResult.simulation.comparison.healthDelta < 0 ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
                          {simulationResult.simulation.comparison.healthDelta > 0 ? '+' : ''}{simulationResult.simulation.comparison.healthDelta} ({simulationResult.simulation.comparison.healthDeltaPercent})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Anomalies */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #e0e0e0' }}>
                    <div style={{ padding: '1rem', borderRight: '1px solid #e0e0e0' }}>
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>Anomalies</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                        {simulationResult.simulation?.baseline?.anomalyCount || 0}
                      </div>
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>Anomalies</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: simulationResult.simulation?.comparison?.anomalyDelta > 0 ? '#e74c3c' : '#27ae60' }}>
                        {simulationResult.simulation?.simulated?.anomalyCount || 0}
                      </div>
                      {simulationResult.simulation?.comparison?.anomalyDelta != null && simulationResult.simulation.comparison.anomalyDelta !== 0 && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: simulationResult.simulation.comparison.anomalyDelta > 0 ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
                          {simulationResult.simulation.comparison.anomalyDelta > 0 ? '+' : ''}{simulationResult.simulation.comparison.anomalyDelta}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Risk Comparison */}
                  {simulationResult.simulation?.baseline?.risk && simulationResult.simulation?.simulated?.risk && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #e0e0e0' }}>
                      <div style={{ padding: '1rem', borderRight: '1px solid #e0e0e0' }}>
                        <div style={{ fontSize: '0.875rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>Degradation Risk</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50' }}>
                          {simulationResult.simulation.baseline.risk.score}/100
                        </div>
                        <StatusBadge status={simulationResult.simulation.baseline.risk.category} />
                      </div>
                      <div style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>Degradation Risk</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: simulationResult.simulation?.comparison?.risk?.riskDelta > 0 ? '#e74c3c' : '#27ae60' }}>
                          {simulationResult.simulation.simulated.risk.score}/100
                        </div>
                        <StatusBadge status={simulationResult.simulation.simulated.risk.category} />
                        {simulationResult.simulation?.comparison?.risk?.riskDelta != null && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: simulationResult.simulation.comparison.risk.riskDelta > 0 ? '#e74c3c' : '#27ae60', fontWeight: 'bold' }}>
                            {simulationResult.simulation.comparison.risk.riskDelta > 0 ? '+' : ''}{simulationResult.simulation.comparison.risk.riskDelta}
                            {simulationResult.simulation.comparison.risk.categoryChanged && ' (Category Changed)'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* New Anomalies */}
                  {simulationResult.simulation?.comparison?.newAnomalies?.length > 0 && (
                    <div style={{ padding: '1rem', borderTop: '1px solid #e0e0e0', backgroundColor: '#fff3cd' }}>
                      <strong style={{ color: '#856404' }}>New Anomalies Triggered:</strong>
                      <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                        {simulationResult.simulation.comparison.newAnomalies.map((anomaly, idx) => (
                          <li key={idx} style={{ color: '#856404' }}>
                            {anomaly.metric}: {anomaly.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* AI Interpretation */}
                  {simulationResult.aiInterpretation && (
                    <div style={{ padding: '1.5rem', borderTop: '2px solid #3498db', backgroundColor: '#f8f9fa' }}>
                      <h4 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>AI Interpretation</h4>
                      
                      {simulationResult.aiInterpretation.executiveSummary && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Executive Summary:</strong>
                          <p style={{ marginTop: '0.5rem', color: '#2c3e50' }}>
                            {simulationResult.aiInterpretation.executiveSummary}
                          </p>
                        </div>
                      )}

                      {simulationResult.aiInterpretation.likelyCauses?.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Likely Causes:</strong>
                          <ul style={{ marginTop: '0.5rem' }}>
                            {simulationResult.aiInterpretation.likelyCauses.map((cause, idx) => (
                              <li key={idx}>{cause}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {simulationResult.aiInterpretation.operationalRisks?.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Operational Risks:</strong>
                          <ul style={{ marginTop: '0.5rem' }}>
                            {simulationResult.aiInterpretation.operationalRisks.map((risk, idx) => (
                              <li key={idx} style={{ color: '#e74c3c' }}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {simulationResult.aiInterpretation.recommendedActions?.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <strong>Recommended Actions:</strong>
                          <ul style={{ marginTop: '0.5rem' }}>
                            {simulationResult.aiInterpretation.recommendedActions.map((action, idx) => (
                              <li key={idx} style={{ color: '#27ae60' }}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {simulationResult.aiInterpretation.safetyConsiderations && (
                        <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                          <strong>Safety Considerations:</strong> {simulationResult.aiInterpretation.safetyConsiderations}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recommendations */}
                  {simulationResult.simulation?.recommendations?.length > 0 && (
                    <div style={{ padding: '1rem', borderTop: '1px solid #e0e0e0' }}>
                      <strong>Recommendations:</strong>
                      <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                        {simulationResult.simulation.recommendations.map((rec, idx) => (
                          <li key={idx} style={{ marginBottom: '0.5rem' }}>
                            <span style={{ 
                              backgroundColor: rec.type === 'critical' ? '#fee' : rec.type === 'warning' ? '#fff3cd' : rec.type === 'positive' ? '#d4edda' : '#e7f3ff',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              marginRight: '0.5rem',
                            }}>
                              {rec.type.toUpperCase()}
                            </span>
                            {rec.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!simulationResult && !simulating && readings.length === 0 && (
                <p style={{ color: '#7f8c8d', marginTop: '1rem' }}>
                  No telemetry data available for simulation
                </p>
              )}

              {!simulationResult && !simulating && readings.length > 0 && !simulationError && (
                <p style={{ color: '#7f8c8d', marginTop: '1rem' }}>
                  Enter modifications and click "Run Simulation" to see the impact
                </p>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default MachineDetail;
