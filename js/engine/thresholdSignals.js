const MAX_SIGNALS = 20;

// Picks one gap to represent this assessment's contribution to the cross-app signal —
// not every gap, so a pillar that recurs across *assessments* builds signal, and a
// single assessment with many gaps in one pillar doesn't drown out that pattern.
// Highest severity first, since that's what actually drove the Medium/High tier.
export function selectRepresentativeGap(gaps) {
  if (gaps.length === 0) return null;
  return gaps.find((g) => g.severity_gov === "High") ?? gaps.find((g) => g.severity_gov === "Med") ?? gaps[0];
}

// Pure, capped append — oldest signal drops once the cap is reached, so this stays a
// "recent assessments" window, not an unbounded log.
export function recordSignal(existingSignals, signal) {
  return [...existingSignals, signal].slice(-MAX_SIGNALS);
}
