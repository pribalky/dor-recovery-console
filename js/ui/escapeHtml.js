// Escapes text destined for interpolation into an innerHTML template string or an
// HTML attribute value. Independent copy of App 1's escapeHtml.js — the two repos
// are deliberately decoupled (DECISIONS.md #1-2). Anything sourced outside this
// app's own config data — a pasted/uploaded assessment export, a RAID owner typed
// into a text input — is untrusted and must go through this before it reaches
// innerHTML (see DECISIONS.md).
const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}
