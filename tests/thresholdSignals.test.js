import { assertEqual, assertTrue } from "./assert.js";
import { selectRepresentativeGap, recordSignal } from "../js/engine/thresholdSignals.js";

const highGap = { pillar_name: "Governance & Compliance", category_tag: "PII", severity_gov: "High" };
const medGap = { pillar_name: "Process & Workflow", category_tag: "Fallback", severity_gov: "Med" };
const lowGap = { pillar_name: "People & Capability", category_tag: "NFR", severity_gov: "Low" };

assertEqual(selectRepresentativeGap([]), null, "no gaps selects nothing");
assertEqual(selectRepresentativeGap([lowGap]), lowGap, "a single Low gap is selected when it's the only one");
assertEqual(selectRepresentativeGap([lowGap, medGap]), medGap, "Med is preferred over Low when both are present");
assertEqual(selectRepresentativeGap([lowGap, medGap, highGap]), highGap, "High is always preferred when present");
assertEqual(selectRepresentativeGap([medGap, highGap]), highGap, "High wins regardless of array order");

// recordSignal is a pure, capped append.
const s1 = { pillar_name: "A", tier: "High", timestamp: "t1" };
const s2 = { pillar_name: "B", tier: "Medium", timestamp: "t2" };
assertEqual(recordSignal([], s1), [s1], "recording into an empty list appends the one signal");
assertEqual(recordSignal([s1], s2), [s1, s2], "recording appends to the end, preserving order");

// Capped at 20 — oldest drops first.
let signals = [];
for (let i = 0; i < 25; i++) {
  signals = recordSignal(signals, { pillar_name: `P${i}`, tier: "High", timestamp: `t${i}` });
}
assertEqual(signals.length, 20, "the signal list is capped at 20 entries");
assertEqual(signals[0].pillar_name, "P5", "the oldest 5 signals were dropped once the cap was exceeded");
assertEqual(signals[19].pillar_name, "P24", "the most recent signal is always the last entry");
