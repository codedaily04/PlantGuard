/**
 * Degradation Risk Engine
 * Transparent risk scoring based on health, anomalies, and degradation trends
 * 
 * Risk Formula: 40% health + 30% anomaly severity + 30% degradation trends
 */

const { generateMachineHealthIntelligence } = require('./healthIntelligenceService');
const { detectEquipmentAnomalies } = require('./anomalyDetectionService');

/**
 * Calculate risk contribution from health score
 * Lower health = higher risk
 */
function calculateHealthRiskComponent(healthScore) {
  // Invert health score: 100 health = 0 risk, 0 health = 100 risk
  const healthRisk = 100 - healthScore;
  
  return {
    contribution: healthRisk * 0.4, // 40% weight
    evidence: healthScore < 70 
      ? `Health score ${healthScore}/100 indicates declining equipment condition`
      : healthScore < 85
      ? `Health score ${healthScore}/100 shows some degradation`
      : `Health score ${healthScore}/100 is acceptable`,
    factor: 'health_status'
  };
}

/**
 * Calculate risk contribution from anomalies
 */
function calculateAnomalyRiskComponent(anomalies) {
  if (!anomalies || anomalies.length === 0) {
    return {
      contribution: 0,
      evidence: 'No anomalies detected',
      factor: 'anomaly_severity',
      anomalies: []
    };
  }
  
  // Severity weights
  const severityWeights = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5
  };
  
  // Calculate total anomaly risk (capped at 100)
  let totalAnomalyRisk = 0;
  const anomalyDetails = [];
  
  anomalies.forEach(a => {
    const weight = severityWeights[a.severity] || 5;
    totalAnomalyRisk += weight;
    
    anomalyDetails.push({
      metric: a.metric,
      severity: a.severity,
      type: a.detectionType,
      contribution: weight
    });
  });
  
  // Cap at 100 and apply 30% weight
  totalAnomalyRisk = Math.min(totalAnomalyRisk, 100);
  const weightedContribution = totalAnomalyRisk * 0.3;
  
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount = anomalies.filter(a => a.severity === 'high').length;
  const mediumCount = anomalies.filter(a => a.severity === 'medium').length;
  
  let evidence = `Detected ${anomalies.length} anomaly(ies): `;
  const parts = [];
  if (criticalCount > 0) parts.push(`${criticalCount} critical`);
  if (highCount > 0) parts.push(`${highCount} high`);
  if (mediumCount > 0) parts.push(`${mediumCount} medium`);
  evidence += parts.join(', ');
  
  return {
    contribution: weightedContribution,
    evidence,
    factor: 'anomaly_severity',
    anomalies: anomalyDetails,
    count: anomalies.length
  };
}

/**
 * Calculate risk contribution from degradation trends
 * Uses existing trend anomalies detected by anomalyDetectionService
 */
function calculateDegradationRiskComponent(anomalies) {
  if (!anomalies || anomalies.length === 0) {
    return {
      contribution: 0,
      evidence: 'Insufficient historical data for trend analysis',
      factor: 'degradation_trends',
      trends: []
    };
  }
  
  // Filter for trend-based anomalies
  const trendAnomalies = anomalies.filter(a => a.detectionType === 'trend');
  
  if (trendAnomalies.length === 0) {
    return {
      contribution: 0,
      evidence: 'No sustained degradation trends detected',
      factor: 'degradation_trends',
      trends: []
    };
  }
  
  // Calculate degradation risk based on trend severity and magnitude
  let degradationRisk = 0;
  const trendDetails = [];
  
  trendAnomalies.forEach(t => {
    let trendRisk = 0;
    
    // Base risk from severity
    if (t.severity === 'critical') trendRisk = 40;
    else if (t.severity === 'high') trendRisk = 30;
    else if (t.severity === 'medium') trendRisk = 20;
    
    // Adjust based on trend magnitude
    if (t.trendPercent) {
      const absTrend = Math.abs(t.trendPercent);
      if (absTrend > 50) trendRisk *= 1.5;
      else if (absTrend > 30) trendRisk *= 1.3;
      else if (absTrend > 20) trendRisk *= 1.1;
    }
    
    degradationRisk += trendRisk;
    
    trendDetails.push({
      metric: t.metric,
      trendPercent: t.trendPercent || 0,
      severity: t.severity,
      contribution: trendRisk
    });
  });
  
  // Cap at 100 and apply 30% weight
  degradationRisk = Math.min(degradationRisk, 100);
  const weightedContribution = degradationRisk * 0.3;
  
  const evidence = `Sustained degradation detected in ${trendAnomalies.length} metric(s): ${
    trendAnomalies.map(t => `${t.metric} (${t.trendPercent > 0 ? '+' : ''}${t.trendPercent?.toFixed(1)}%)`).join(', ')
  }`;
  
  return {
    contribution: weightedContribution,
    evidence,
    factor: 'degradation_trends',
    trends: trendDetails,
    count: trendAnomalies.length
  };
}

/**
 * Determine risk category from score
 */
function getRiskCategory(riskScore) {
  if (riskScore >= 76) return 'CRITICAL';
  if (riskScore >= 51) return 'HIGH';
  if (riskScore >= 26) return 'MODERATE';
  return 'LOW';
}

/**
 * Generate time-to-action recommendation
 */
function getTimeToAction(riskScore, riskCategory, anomalies) {
  const hasCriticalAnomaly = anomalies.some(a => a.severity === 'critical');
  
  if (riskCategory === 'CRITICAL' || hasCriticalAnomaly) {
    return 'immediate';
  }
  if (riskCategory === 'HIGH') {
    return '24-72 hours';
  }
  if (riskCategory === 'MODERATE') {
    return 'schedule within 1 week';
  }
  return 'monitor during routine checks';
}

/**
 * Generate operational recommendations
 */
function generateRecommendations(riskCategory, riskComponents, anomalies) {
  const recommendations = [];
  
  // Health-based recommendations
  if (riskComponents.health.contribution > 15) {
    recommendations.push({
      priority: riskCategory === 'CRITICAL' || riskCategory === 'HIGH' ? 'HIGH' : 'MEDIUM',
      action: 'Comprehensive equipment inspection',
      reason: riskComponents.health.evidence,
      estimatedDuration: '2-4 hours'
    });
  }
  
  // Anomaly-based recommendations
  if (riskComponents.anomalies.count > 0) {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    const highAnomalies = anomalies.filter(a => a.severity === 'high');
    
    if (criticalAnomalies.length > 0) {
      const metrics = [...new Set(criticalAnomalies.map(a => a.metric))];
      recommendations.push({
        priority: 'CRITICAL',
        action: `Immediate inspection of ${metrics.join(', ')}`,
        reason: `Critical anomalies detected requiring immediate attention`,
        estimatedDuration: '1-2 hours'
      });
    }
    
    if (highAnomalies.length > 0) {
      const metrics = [...new Set(highAnomalies.map(a => a.metric))];
      recommendations.push({
        priority: 'HIGH',
        action: `Investigate ${metrics.join(', ')} anomalies`,
        reason: riskComponents.anomalies.evidence,
        estimatedDuration: '2-4 hours'
      });
    }
  }
  
  // Degradation trend recommendations
  if (riskComponents.degradation.count > 0) {
    recommendations.push({
      priority: riskCategory === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      action: 'Predictive maintenance assessment',
      reason: riskComponents.degradation.evidence,
      estimatedDuration: '4-6 hours'
    });
  }
  
  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'LOW',
      action: 'Continue routine monitoring',
      reason: 'Equipment operating within normal parameters',
      estimatedDuration: 'N/A'
    });
  }
  
  return recommendations;
}

/**
 * Calculate confidence level based on data quality
 */
function calculateConfidence(dataQuality, readingsCount) {
  let confidence = 0.5; // Base confidence
  
  // Adjust for data quality
  if (dataQuality.quality === 'excellent') confidence += 0.3;
  else if (dataQuality.quality === 'good') confidence += 0.2;
  else if (dataQuality.quality === 'limited') confidence += 0.1;
  
  // Adjust for historical data availability
  if (readingsCount >= 30) confidence += 0.2;
  else if (readingsCount >= 20) confidence += 0.15;
  else if (readingsCount >= 10) confidence += 0.1;
  else confidence -= 0.1;
  
  return Math.max(0.3, Math.min(1.0, confidence));
}

/**
 * Main function: Calculate degradation risk for a machine
 */
async function calculateMachineDegradationRisk(machine, options = {}) {
  const { readingLimit = 50 } = options;
  
  try {
    // Reuse existing health intelligence
    const healthIntelligence = await generateMachineHealthIntelligence(machine, readingLimit);
    
    // Reuse existing anomaly detection (includes trend analysis)
    const anomalyData = await detectEquipmentAnomalies(machine, {
      readingLimit,
      includeThreshold: true,
      includeTrend: true
    });
    
    // Calculate risk components
    const healthComponent = calculateHealthRiskComponent(healthIntelligence.healthScore);
    const anomalyComponent = calculateAnomalyRiskComponent(anomalyData.anomalies);
    const degradationComponent = calculateDegradationRiskComponent(anomalyData.anomalies);
    
    // Total risk score (0-100)
    const riskScore = Math.round(
      healthComponent.contribution +
      anomalyComponent.contribution +
      degradationComponent.contribution
    );
    
    const riskCategory = getRiskCategory(riskScore);
    const timeToAction = getTimeToAction(riskScore, riskCategory, anomalyData.anomalies);
    const recommendations = generateRecommendations(
      riskCategory,
      { health: healthComponent, anomalies: anomalyComponent, degradation: degradationComponent },
      anomalyData.anomalies
    );
    
    const confidence = calculateConfidence(
      healthIntelligence.dataQuality,
      anomalyData.readingsAnalyzed
    );
    
    // Build risk factors array
    const riskFactors = [];
    
    if (healthComponent.contribution > 0) {
      riskFactors.push({
        factor: healthComponent.factor,
        contribution: Math.round(healthComponent.contribution),
        evidence: healthComponent.evidence,
        weight: '40%'
      });
    }
    
    if (anomalyComponent.contribution > 0) {
      riskFactors.push({
        factor: anomalyComponent.factor,
        contribution: Math.round(anomalyComponent.contribution),
        evidence: anomalyComponent.evidence,
        weight: '30%',
        details: anomalyComponent.anomalies
      });
    }
    
    if (degradationComponent.contribution > 0) {
      riskFactors.push({
        factor: degradationComponent.factor,
        contribution: Math.round(degradationComponent.contribution),
        evidence: degradationComponent.evidence,
        weight: '30%',
        details: degradationComponent.trends
      });
    }
    
    return {
      machineId: machine._id,
      machineName: machine.name,
      machineType: machine.type,
      
      // Risk assessment
      riskScore,
      riskCategory,
      riskFactors,
      
      // Operational guidance
      timeToAction,
      recommendations,
      
      // Supporting intelligence
      healthScore: healthIntelligence.healthScore,
      healthStatus: healthIntelligence.status,
      anomalyCount: anomalyData.anomalies.length,
      trendAnomalyCount: anomalyData.anomalies.filter(a => a.detectionType === 'trend').length,
      
      // Metadata
      confidence,
      dataQuality: healthIntelligence.dataQuality.quality,
      readingsAnalyzed: anomalyData.readingsAnalyzed,
      assessmentTimestamp: new Date().toISOString()
    };
    
  } catch (error) {
    throw new Error(`Failed to calculate degradation risk: ${error.message}`);
  }
}

module.exports = {
  calculateMachineDegradationRisk,
  calculateHealthRiskComponent,
  calculateAnomalyRiskComponent,
  calculateDegradationRiskComponent,
  getRiskCategory,
  getTimeToAction
};
