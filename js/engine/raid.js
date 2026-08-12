export const RAID_TYPES = ["R", "A", "I", "D"];
export const RAID_STATUSES = ["Open", "Mitigating", "Closed"];
export const ESCALATION_LEVELS = ["Team", "Programme", "Steering Committee", "Client Exec"];

// One Risk entry per gap, auto-seeded from App 1's inherited data. severity_gov flows
// in as the initial priority but is never mutated (DECISIONS.md #3).
export function seedRaidFromGaps(gaps, dateRaised) {
  return gaps.map((gap) => ({
    raid_id: `RAID-${gap.gap_id}`,
    type: "R",
    description: gap.description,
    owner: "Unassigned",
    status: "Open",
    priority: gap.severity_gov,
    date_raised: dateRaised,
    target_resolution_date: "",
    escalation_level: "Team",
    source_gap_id: gap.gap_id,
  }));
}

export function createManualEntry(
  { type, description, owner, status, dateRaised, targetResolutionDate, escalationLevel },
  id
) {
  return {
    raid_id: id,
    type,
    description,
    owner: owner || "Unassigned",
    status: status || "Open",
    priority: null,
    date_raised: dateRaised,
    target_resolution_date: targetResolutionDate || "",
    escalation_level: escalationLevel || "Team",
    source_gap_id: null,
  };
}

export function rollupByTypeAndStatus(entries) {
  const rollup = {};
  for (const type of RAID_TYPES) {
    rollup[type] = Object.fromEntries(RAID_STATUSES.map((s) => [s, 0]));
  }
  for (const entry of entries) {
    if (rollup[entry.type] && entry.status in rollup[entry.type]) {
      rollup[entry.type][entry.status] += 1;
    }
  }
  return rollup;
}

export function rollupByEscalationAndStatus(entries) {
  const rollup = {};
  for (const level of ESCALATION_LEVELS) {
    rollup[level] = Object.fromEntries(RAID_STATUSES.map((s) => [s, 0]));
  }
  for (const entry of entries) {
    if (rollup[entry.escalation_level] && entry.status in rollup[entry.escalation_level]) {
      rollup[entry.escalation_level][entry.status] += 1;
    }
  }
  return rollup;
}
