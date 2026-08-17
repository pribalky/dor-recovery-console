// Pure URL-parsing for the persona-routed portal (dor-gatekeeper/portal.html) to
// deep-link into this app with a pre-loaded sample, a pre-selected tab, and
// optionally an auto-rendered Health Card preview — no DOM access here, app.js
// applies the result.
export function parseDeepLinkParams(search, hash) {
  const params = new URLSearchParams(search);
  const hashParams = new URLSearchParams((hash || "").replace(/^#/, ""));

  return {
    sample: params.get("sample") || null,
    healthCard: params.get("health-card") === "1",
    tab: hashParams.get("tab") || null,
  };
}
