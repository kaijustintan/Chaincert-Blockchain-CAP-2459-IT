import React from "react";
import { Check, X, AlertTriangle, Info } from "lucide-react";
import "../styles/appToast.css";

export default function AppToast({ show, message, type = "success", className = "" }) {
  if (!show || !message) return null;

  // De-emojified (UAT): status glyph is now a lucide SVG, consistent across platforms.
  const Icon = type === "success" ? Check : type === "danger" ? X : type === "warning" ? AlertTriangle : Info;

  return (
    <div className={`app-toast app-toast--${type} ${className}`.trim()} role="status" aria-live="polite">
      <div className="app-toast-icon"><Icon size={16} aria-hidden="true" /></div>
      <div className="app-toast-message">{message}</div>
    </div>
  );
}
