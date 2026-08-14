// Classifies an auto-seeded RAID entry's type from the gap that produced it, instead
// of hardcoding every seeded entry as a Risk. High severity_gov always escalates to
// Risk — a high-severity failure is a risk to the objective regardless of category.
// Below that, category_tag decides: SupplyChain implies waiting on a third party
// (Dependency); everything else defaults to Issue (a live problem needing resolution).
// "A" (Assumption) is deliberately never auto-generated — an assumption is asserted
// by a person, not mechanically implied by a failed check.
const TYPE_BY_CATEGORY = {
  SupplyChain: "D",
};

export const DEFAULT_RAID_TYPE = "I";

export function classifyRaidType(gap) {
  if (gap.severity_gov === "High") return "R";
  return TYPE_BY_CATEGORY[gap.category_tag] ?? DEFAULT_RAID_TYPE;
}
