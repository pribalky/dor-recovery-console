import { assertEqual } from "./assert.js";
import { escapeHtml } from "../js/ui/escapeHtml.js";

assertEqual(escapeHtml(`& < > " '`), "&amp; &lt; &gt; &quot; &#39;", "all 5 special characters are escaped");

assertEqual(escapeHtml("Login Flow Redesign"), "Login Flow Redesign", "a string with no special characters passes through unchanged");

assertEqual(
  escapeHtml(`<img src=x onerror="alert(document.cookie)">`),
  "&lt;img src=x onerror=&quot;alert(document.cookie)&quot;&gt;",
  "a realistic malicious feature_name/description is fully neutralised"
);
