// PRD §3.2/3.3 define the rework-risk tier boundaries but not the underlying score
// formula, so this is an authored, documented mapping — same "illustrative, not
// invented from nowhere" discipline as costModel.js's cost bands (see DECISIONS.md).
export const SEVERITY_POINTS = { High: 10, Med: 5, Low: 2 };

export const TIER_THRESHOLDS = { medium: 15, high: 35 };

// Reference table only — not auto-selected. The PRD ties each option to the *reason*
// for drift, which this app doesn't capture; shown to inform a human decision, not
// to make one automatically.
export const REMEDIATION_PATHWAYS = [
  {
    option: "Option A — Hard Reversion",
    trigger: "Localized drift, single team/component, no downstream contract change.",
    mechanism: "Fix within the current sprint, standard code review, no architecture sign-off required.",
    impact: "Low time/cost impact — typically absorbed within existing sprint capacity.",
  },
  {
    option: "Option B — Emergency Gate Review",
    trigger: "Drift crosses a team boundary or touches a shared component, but no external contract change.",
    mechanism: "Notify the affected team(s)/architect, remediate with a documented follow-up, track via RAID.",
    impact: "Moderate time/cost impact — typically 1-2 sprints, may require a dedicated remediation story.",
  },
  {
    option: "Option C — Tech Debt Isolation",
    trigger: "Drift changes an external contract/schema, or touches a High-severity governance gap.",
    mechanism: "Block merge/release, escalate to architecture/governance board for a formal decision before proceeding.",
    impact: "High time/cost impact — programme-level delay possible until the escalation resolves.",
  },
];
