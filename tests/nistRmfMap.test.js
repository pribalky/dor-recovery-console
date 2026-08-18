import { assertEqual } from "./assert.js";
import { NIST_RMF_MAP, NIST_RMF_FUNCTIONS, nistFunctionsFor } from "../js/config/nistRmfMap.js";

assertEqual(NIST_RMF_FUNCTIONS, ["Govern", "Map", "Measure", "Manage"], "all 4 NIST AI RMF 1.0 functions are listed");

assertEqual(nistFunctionsFor("HITL"), ["Govern", "Manage"], "HITL maps to Govern + Manage");
assertEqual(nistFunctionsFor("PII"), ["Map", "Manage"], "PII maps to Map + Manage");
assertEqual(nistFunctionsFor("Consent"), ["Govern"], "Consent maps to Govern");
assertEqual(nistFunctionsFor("Fallback"), ["Manage"], "Fallback maps to Manage");
assertEqual(nistFunctionsFor("RateLimit"), ["Manage"], "RateLimit maps to Manage");
assertEqual(nistFunctionsFor("NFR"), ["Measure"], "NFR maps to Measure");
assertEqual(nistFunctionsFor("Lineage"), ["Map"], "Lineage maps to Map");

// Intentionally unmapped — real project-governance concerns, but not NIST AI RMF
// risk-management functions. Left unmapped rather than forced, same discipline as
// nfrGatewayMap.js leaving Lineage/Probity unmapped for the 4-gateway view.
assertEqual(nistFunctionsFor("Other"), [], "Other is intentionally unmapped");
assertEqual(nistFunctionsFor("Probity"), [], "Probity is intentionally unmapped");
assertEqual(nistFunctionsFor("Safety"), [], "Safety is intentionally unmapped");
assertEqual(nistFunctionsFor("AssetLifecycle"), [], "AssetLifecycle is intentionally unmapped");
assertEqual(nistFunctionsFor("SupplyChain"), [], "SupplyChain is intentionally unmapped");
assertEqual(nistFunctionsFor("not-a-real-tag"), [], "an unrecognised category_tag returns [], never throws");

// Every mapped function is a real NIST AI RMF function — catches a typo before it ships.
for (const [tag, functions] of Object.entries(NIST_RMF_MAP)) {
  for (const fn of functions) {
    assertEqual(NIST_RMF_FUNCTIONS.includes(fn), true, `"${tag}"'s mapped function "${fn}" is a real NIST AI RMF 1.0 function`);
  }
}
