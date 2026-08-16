// State Sync Bridge, receiving side — an on-demand comparison between a
// dor-gatekeeper "baseline" export and a later "current" export, both already
// flattened via flattenGaps(). Matched by gap_id (stable, derived from the
// checklist item id — see dor-gatekeeper's engine/gaps.js). Not a live/real-time
// sync: this runs once, when the user supplies both files (DECISIONS.md).
export function compareGapSets(baselineGaps, currentGaps) {
  const baselineById = new Map(baselineGaps.map((g) => [g.gap_id, g]));
  const currentById = new Map(currentGaps.map((g) => [g.gap_id, g]));

  const newGaps = currentGaps.filter((g) => !baselineById.has(g.gap_id));
  const resolvedGaps = baselineGaps.filter((g) => !currentById.has(g.gap_id));

  const severityChanged = [];
  for (const [gapId, baselineGap] of baselineById) {
    const currentGap = currentById.get(gapId);
    if (currentGap && currentGap.severity_gov !== baselineGap.severity_gov) {
      severityChanged.push({
        gap_id: gapId,
        description: currentGap.description,
        from: baselineGap.severity_gov,
        to: currentGap.severity_gov,
      });
    }
  }

  return { newGaps, resolvedGaps, severityChanged };
}
