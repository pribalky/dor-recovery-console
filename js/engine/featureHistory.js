const MAX_HISTORY = 20;

// Pure, capped append — same discipline as thresholdSignals.js's recordSignal.
// Unlike that signal (only written for Medium/High rework tiers), every load writes
// here regardless of tier: most of a feature's real history sits at Low, and gating
// this write the same way would starve deriveEscalationTrend of the data it needs.
export function recordFeatureHistory(existingHistory, entry) {
  return [...existingHistory, entry].slice(-MAX_HISTORY);
}
