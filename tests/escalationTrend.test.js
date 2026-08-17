import { assertEqual } from "./assert.js";
import { deriveEscalationTrend } from "../js/engine/escalationTrend.js";

const noHistory = [];
assertEqual(
  deriveEscalationTrend(noHistory, "login flow", "current-id", 20, "Medium"),
  { escalating: false, insufficientHistory: true },
  "no prior entry for this feature reports insufficient history"
);

const lowerPrior = [{ feature_name_key: "login flow", assessment_id: "a1", timestamp: "t1", reworkScore: 30, reworkTier: "Medium" }];
assertEqual(
  deriveEscalationTrend(lowerPrior, "login flow", "current-id", 20, "Low"),
  { escalating: false },
  "a lower current score than the prior entry is not escalating"
);

const equalPrior = [{ feature_name_key: "login flow", assessment_id: "a1", timestamp: "t1", reworkScore: 20, reworkTier: "Medium" }];
assertEqual(
  deriveEscalationTrend(equalPrior, "login flow", "current-id", 20, "Medium"),
  { escalating: false },
  "an equal score is not escalating — no false claim on a flat trend"
);

const higherPrior = [{ feature_name_key: "login flow", assessment_id: "a1", timestamp: "t1", reworkScore: 16, reworkTier: "Medium" }];
assertEqual(
  deriveEscalationTrend(higherPrior, "login flow", "current-id", 34, "Medium"),
  { escalating: true, priorScore: 16, priorTier: "Medium", priorTimestamp: "t1" },
  "a higher current score than the prior entry is escalating, even within the same tier"
);

// The current assessment's own entry (already written to history by the time
// recompute() runs a second time within the same load) must be excluded.
const includesCurrent = [
  { feature_name_key: "login flow", assessment_id: "a1", timestamp: "t1", reworkScore: 16, reworkTier: "Medium" },
  { feature_name_key: "login flow", assessment_id: "current-id", timestamp: "t2", reworkScore: 34, reworkTier: "Medium" },
];
assertEqual(
  deriveEscalationTrend(includesCurrent, "login flow", "current-id", 34, "Medium"),
  { escalating: true, priorScore: 16, priorTier: "Medium", priorTimestamp: "t1" },
  "the current assessment_id is excluded from the prior-entry search, so it never compares against itself"
);
