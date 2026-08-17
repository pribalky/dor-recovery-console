// In-flight escalation signal: compares this load's Rework Risk score against the
// most recent *prior* load of the same feature (by normalized feature_name), reading
// from the same-browser dor:featureHistory. Raw score comparison, not tier-only —
// two loads can land in the same tier while meaningfully worsening (e.g. 16 -> 34,
// both "Medium"), and this codebase's honesty discipline (DECISIONS.md #17, #27)
// argues against a comparison that would silently miss that.
export function deriveEscalationTrend(history, featureNameKey, currentAssessmentId, currentReworkScore, currentReworkTier) {
  const priorEntries = history
    .filter((e) => e.feature_name_key === featureNameKey && e.assessment_id !== currentAssessmentId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (priorEntries.length === 0) return { escalating: false, insufficientHistory: true };

  const prior = priorEntries[0];
  if (currentReworkScore <= prior.reworkScore) return { escalating: false };

  return {
    escalating: true,
    priorScore: prior.reworkScore,
    priorTier: prior.reworkTier,
    priorTimestamp: prior.timestamp,
  };
}
