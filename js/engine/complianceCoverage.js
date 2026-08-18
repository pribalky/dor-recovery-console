import { NIST_RMF_FUNCTIONS, nistFunctionsFor } from "../config/nistRmfMap.js";

// Rolls this assessment's flagged gaps up by NIST AI RMF function — a derived view
// over exposure.gaps (financialTranslator.js's output), same "rollup, not a new
// computation" pattern as nfrGateway.js's rollupByGateway. NIST-only, never OWASP:
// the App1->App2 JSON contract (dor-gatekeeper/js/export/jsonExport.js) only ever
// carries gap_id/description/severity_gov/category_tag — the AI Governance Router's
// OWASP hazard flags live entirely on the gatekeeper side and never cross this
// boundary, so this app has no data to back an OWASP claim.
export function deriveComplianceCoverage(gaps) {
  const functionsTouched = new Set();
  let unmappedCount = 0;

  for (const gap of gaps) {
    const functions = nistFunctionsFor(gap.category_tag);
    if (functions.length === 0) {
      unmappedCount += 1;
      continue;
    }
    functions.forEach((fn) => functionsTouched.add(fn));
  }

  return {
    functionsTouched: NIST_RMF_FUNCTIONS.filter((fn) => functionsTouched.has(fn)),
    totalFunctions: NIST_RMF_FUNCTIONS.length,
    unmappedCount,
    totalGaps: gaps.length,
  };
}
