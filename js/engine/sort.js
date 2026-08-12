// Three lenses over the same gap list — no data duplication (PRD §3.4).
const SEVERITY_ORDER = { High: 0, Med: 1, Low: 2 };
const STATUS_ORDER = { Open: 0, Mitigating: 1, Closed: 2 };

export function daysOpen(entry, today = new Date()) {
  if (!entry || !entry.date_raised) return 0;
  const raised = new Date(entry.date_raised);
  return Math.max(0, Math.round((today - raised) / (1000 * 60 * 60 * 24)));
}

// Default lens — inherited severity_gov, always visible, never overwritten.
export function sortGapsBySeverity(gaps) {
  return [...gaps].sort((a, b) => (SEVERITY_ORDER[a.severity_gov] ?? 99) - (SEVERITY_ORDER[b.severity_gov] ?? 99));
}

// Toggle A — $ exposure, high-end estimate descending. Unmodeled Other gaps sort last.
export function sortGapsByExposure(costedGaps) {
  return [...costedGaps].sort((a, b) => {
    if (a.cost.unmodeled && !b.cost.unmodeled) return 1;
    if (!a.cost.unmodeled && b.cost.unmodeled) return -1;
    if (a.cost.unmodeled && b.cost.unmodeled) return 0;
    return b.cost.high - a.cost.high;
  });
}

// Toggle B — RAID priority, via each gap's seeded RAID entry (status, then days-open).
export function sortGapsByRaidPriority(costedGaps, raidEntries, today = new Date()) {
  const raidByGapId = new Map(raidEntries.filter((e) => e.source_gap_id).map((e) => [e.source_gap_id, e]));
  return [...costedGaps].sort((a, b) => {
    const raidA = raidByGapId.get(a.gap_id);
    const raidB = raidByGapId.get(b.gap_id);
    const statusDiff = (STATUS_ORDER[raidA?.status] ?? 99) - (STATUS_ORDER[raidB?.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return daysOpen(raidB, today) - daysOpen(raidA, today);
  });
}

// Ordering for the RAID table itself (includes manual A/I/D entries, not just seeded ones).
export function sortEntriesByPriority(entries, today = new Date()) {
  return [...entries].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return daysOpen(b, today) - daysOpen(a, today);
  });
}
