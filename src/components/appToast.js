import React from "react";
import "../styles/appToast.css";

export default function AppToast({ show, message, type = "success", className = "" }) {
  if (!show || !message) return null;

  const icon = type === "success" ? "✓" : type === "danger" ? "✕" : type === "warning" ? "!" : "i";

  return (
    <div className={`app-toast app-toast--${type} ${className}`.trim()} role="status" aria-live="polite">
      <div className="app-toast-icon">{icon}</div>
      <div className="app-toast-message">{message}</div>
    </div>
  );
}
