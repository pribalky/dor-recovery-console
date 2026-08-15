import { NFR_GATEWAYS, gatewayFor } from "../config/nfrGatewayMap.js";

// Rolls the already-computed exposure (financialTranslator.js output) up by NFR
// Gateway — a derived view, not a new computation. Gaps whose category_tag has no
// gateway mapping (Lineage, Probity) are collected separately rather than dropped.
export function rollupByGateway(exposure) {
  const rollup = {};
  for (const gateway of NFR_GATEWAYS) {
    rollup[gateway] = { gapCount: 0, exposureLow: 0, exposureHigh: 0 };
  }
  let unmappedCount = 0;

  for (const gap of exposure.gaps) {
    const gateway = gatewayFor(gap.category_tag);
    if (!gateway) {
      unmappedCount += 1;
      continue;
    }
    rollup[gateway].gapCount += 1;
    if (!gap.cost.unmodeled) {
      rollup[gateway].exposureLow += gap.cost.low;
      rollup[gateway].exposureHigh += gap.cost.high;
    }
  }

  return { byGateway: rollup, unmappedCount };
}
