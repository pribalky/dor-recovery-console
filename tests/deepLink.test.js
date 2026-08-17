import { assertEqual } from "./assert.js";
import { parseDeepLinkParams } from "../js/engine/deepLink.js";

assertEqual(
  parseDeepLinkParams("", ""),
  { sample: null, healthCard: false, tab: null },
  "no query string or hash produces all-null/false defaults"
);

assertEqual(
  parseDeepLinkParams("?sample=very_bad", "#tab=recovery"),
  { sample: "very_bad", healthCard: false, tab: "recovery" },
  "sample and tab are parsed from the query string and hash respectively"
);

assertEqual(
  parseDeepLinkParams("?sample=very_bad&health-card=1", "#tab=recovery"),
  { sample: "very_bad", healthCard: true, tab: "recovery" },
  "health-card=1 parses to healthCard: true"
);

assertEqual(
  parseDeepLinkParams("?sample=very_bad&health-card=0", "#tab=recovery"),
  { sample: "very_bad", healthCard: false, tab: "recovery" },
  "health-card=0 parses to healthCard: false (only '1' is truthy)"
);

assertEqual(
  parseDeepLinkParams("?health-card=1", ""),
  { sample: null, healthCard: true, tab: null },
  "healthCard can be true even without a sample (app.js still gates on sample being present)"
);
