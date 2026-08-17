import { assertEqual } from "./assert.js";
import { recordFeatureHistory } from "../js/engine/featureHistory.js";

const e1 = { feature_name_key: "login flow", assessment_id: "a1", timestamp: "t1", reworkScore: 10, reworkTier: "Low" };
const e2 = { feature_name_key: "login flow", assessment_id: "a2", timestamp: "t2", reworkScore: 20, reworkTier: "Medium" };

assertEqual(recordFeatureHistory([], e1), [e1], "recording into an empty history appends the one entry");
assertEqual(recordFeatureHistory([e1], e2), [e1, e2], "recording appends to the end, preserving order");

let history = [];
for (let i = 0; i < 25; i++) {
  history = recordFeatureHistory(history, { feature_name_key: "f", assessment_id: `a${i}`, timestamp: `t${i}`, reworkScore: i, reworkTier: "Low" });
}
assertEqual(history.length, 20, "history is capped at 20 entries");
assertEqual(history[0].assessment_id, "a5", "the oldest 5 entries were dropped once the cap was exceeded");
assertEqual(history[19].assessment_id, "a24", "the most recent entry is always the last one");
