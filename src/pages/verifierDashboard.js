// verifierDashboard.js
/*
  FILE: verifierDashboard.js
  LAYMAN (Tropang Ex): Ito yung tool ng isang verifier (hal. HR, employer). Magpe-paste sila ng
  credential ID (o galing sa QR/link), kukumpirmahin muna ang sariling email gamit ang 6-digit code
  (OTP), tapos makikita nila ang malinaw na verdict — VALID / REVOKED / EXPIRED / NOT FOUND.

  TECHNICAL: Role-agnostic public-facing React page (single-column). V1 identity: the verifier's EMAIL
  is OTP-proven — a 2h 'verifier_email_proof' JWT (sessionStorage, once per window) is required before a
  verification is LOGGED; the verify-READ stays public. Flow: enter name/email → request OTP
  (POST /api/credentials/verify/request-otp) → confirm (/confirm-otp) → verify a credential id
  (GET .../:id/verify) → on success the event is logged with the email FROM the token (not spoofable).
  Not-found (404) attempts are still logged as status:'not_found' so forgery shows in analytics. Result
  renders as a tinted verdict banner (VERIFY1) with a single-word verdict + one-line explanation.

  OUTLINE:
    IDENTITY + OTP GATE     name/email form → send code → enter code → proven-email token (sessionStorage)
    VERIFY INPUT            credential-id field (hero); also accepts ?credentialId= from a QR/link
    RESULT                  verdict banner (valid/revoked/expired/not_found) + explanation + NotesCard legend
*/
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import "../styles/verifierDashboard.css";
import apiService from "../services/apiService";
import { Card, Button, Field, Input, StatusPill } from "../components/ui";
import Pagination, { usePagination } from "../components/ui/Pagination";
import NotesCard from "../components/ui/NotesCard";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Search, FileText } from "lucide-react";
// C10: pdfjs-dist reads the LINK ANNOTATIONS out of a ChainCert portfolio PDF (each credential
// row embeds its own verify URL). Loaded LAZILY (dynamic import → its own chunk) so the ~100 kB
// library never weighs down the main bundle.
const loadPdfjs = async () => {
  const pdfjsLib = await import("pdfjs-dist");
  // Let webpack COMPILE the worker via `new Worker(new URL(...))` and hand it to pdf.js as a
  // workerPort. Setting workerSrc to the raw `.min.js` URL (the old code) shipped the UMD worker
  // uncompiled → pdf.js fell back to the main-thread "fake worker" which runs bare require()
  // calls → "require is not defined". Classic worker (no {type:'module'}): v3.11.174 ships no ESM worker.
  pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
    new URL("pdfjs-dist/build/pdf.worker.min.js", import.meta.url)
  );
  return pdfjsLib;
};

const VALID_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// C10: bulk-verify verdict meta (mirrors the single-verify verdict wording).
const BULK_OUTCOME_META = {
  valid: { label: "VALID", color: "var(--ok)" },
  revoked: { label: "REVOKED", color: "var(--danger)" },
  expired: { label: "EXPIRED", color: "var(--warn)" },
  not_found: { label: "NOT FOUND", color: "var(--accent-strong)" },
  invalid: { label: "INVALID", color: "var(--danger)" },
  error: { label: "CHECK FAILED", color: "var(--text-muted)" },
};


export default function VerifierDashboard() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);

  // verification logs section removed

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // verifier identity + on-chain log status
  const [verifierName, setVerifierName] = useState("");
  const [verifierEmail, setVerifierEmail] = useState("");

  // log state removed

  // NEW: gate – kailangan muna ma-fill up verifier form
  const [hasVerifierInfo, setHasVerifierInfo] = useState(false);
  const [verifierFormError, setVerifierFormError] = useState("");

  // V1: proven-email token + OTP gate state (verifier must confirm email ownership once
  // per session/window before any verification is LOGGED with their email).
  const [verifierToken, setVerifierToken] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");

  // On mount: restore a still-valid proven-email token from this session (once-per-window).
  // Otherwise just prefill the name/email fields; OTP is always required to enter the dashboard.
  useEffect(() => {
    const t = sessionStorage.getItem("verifierToken");
    const te = sessionStorage.getItem("verifierTokenEmail");
    const tx = Number(sessionStorage.getItem("verifierTokenExp") || 0);
    if (t && te && Date.now() < tx) {
      setVerifierToken(t);
      setVerifierEmail(te);
      setVerifierName(localStorage.getItem("verifierName") || "");
      setHasVerifierInfo(true);
      return;
    }
    const savedName = localStorage.getItem("verifierName") || "";
    const savedEmail = localStorage.getItem("verifierEmail") || "";
    if (savedName) setVerifierName(savedName);
    if (savedEmail) setVerifierEmail(savedEmail);
  }, []);

  useEffect(() => {
    const urlCredentialId = searchParams.get('credentialId');
    if (urlCredentialId && hasVerifierInfo && !query) {
      setQuery(urlCredentialId);
    }
  }, [searchParams, hasVerifierInfo, query]);

  useEffect(() => {
    const urlCredentialId = searchParams.get('credentialId');
    if (urlCredentialId && hasVerifierInfo && query === urlCredentialId && !result && !loading) {
      handleVerify();
    }
  }, [query, hasVerifierInfo]);

  // fetchVerificationLogs and its useEffect removed

  // saveVerificationLogOnChain removed

  // Handle verification via credential ID
  const handleVerify = async () => {
    if (!query.trim()) {
      setError("Please enter a credential ID or code");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Call API to verify credential (CouchDB + optional blockchain)
      const response = await apiService.Verify_Credential(query);

      if (response.verified && response.success) {
        setResult(response);
        try {
          await apiService.logVerificationOnChain(
            response.credentialID || query,
            verifierName,
            verifierEmail,
            JSON.stringify({
              isValid: response.isValid,
              reason: response.reason,
              status: response.status,
              source: response.sources?.primarySource || 'unknown'
            }),
            verifierToken
          );
        } catch (logErr) {
          if (logErr.response?.status === 401) {
            resetVerifierEmail();
            setError("Your email session expired. Please verify your email again to record verifications.");
          }
          console.warn('[VERIFY] On-chain log write failed (non-fatal):', logErr.message);
        }
      } else {
        const msg = response.reason || "Credential not found or invalid.";
        setResult({ error: msg });
      }
    } catch (err) {
      console.error("[VERIFY ERROR]", err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.reason ||
        err.message ||
        "Verification failed";
      // A 404 means the credential does not exist on the ledger. Render the styled NOT FOUND
      // verdict (matching the legend + bulk chips), not the generic "Could not verify" banner,
      // and log the attempt on-chain so forgery attempts still appear in analytics (Report 6).
      if (err.response?.status === 404) {
        try {
          await apiService.logVerificationOnChain(
            query,
            verifierName,
            verifierEmail,
            JSON.stringify({ valid: false, reason: 'Credential not found', status: 'not_found', source: 'not_found' }),
            verifierToken
          );
        } catch (logErr) {
          if (logErr.response?.status === 401) {
            resetVerifierEmail();
            setError("Your email session expired. Please verify your email again to record verifications.");
          }
          console.warn('[VERIFY] Not-found log failed (non-fatal):', logErr.message);
        }
        setResult({ isValid: false, status: 'not_found', credentialID: query });
      } else {
        setResult({ error: errorMsg });
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press sa credential input
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  // V1 step 1: validate name+email, send the OTP to the email.
  const handleSendOtp = async (e) => {
    e.preventDefault();
    const trimmedName = verifierName.trim();
    const trimmedEmail = verifierEmail.trim();
    if (!trimmedName || !trimmedEmail) {
      setVerifierFormError("Please provide both your name and email to continue.");
      return;
    }
    if (!VALID_EMAIL_REGEX.test(trimmedEmail)) {
      setVerifierFormError("Please enter a valid email address (e.g., name@example.com).");
      return;
    }
    setVerifierFormError(""); setOtpError(""); setOtpInfo(""); setOtpLoading(true);
    try {
      await apiService.requestVerifierOtp(trimmedEmail);
      localStorage.setItem("verifierName", trimmedName);
      localStorage.setItem("verifierEmail", trimmedEmail);
      setOtpSent(true);
      setOtpInfo(`Enter the 6-digit code we sent to ${trimmedEmail}.`);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Could not send the code. Please try again.");
    } finally { setOtpLoading(false); }
  };

  // V1 step 2: confirm OTP → receive the proven-email token → enter the dashboard.
  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    const trimmedEmail = verifierEmail.trim();
    if (!otpCode.trim()) { setOtpError("Enter the 6-digit code from your email."); return; }
    setOtpError(""); setOtpLoading(true);
    try {
      const res = await apiService.confirmVerifierOtp(trimmedEmail, otpCode.trim());
      const expMs = Date.now() + 2 * 60 * 60 * 1000; // mirror the 2h token window (UX only; server enforces the real expiry)
      setVerifierToken(res.token);
      sessionStorage.setItem("verifierToken", res.token);
      sessionStorage.setItem("verifierTokenEmail", trimmedEmail);
      sessionStorage.setItem("verifierTokenExp", String(expMs));
      setHasVerifierInfo(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid or expired code. Please try again.");
    } finally { setOtpLoading(false); }
  };

  // V1: clear the proven-email session (the "Change" link, or when the token expires).
  const resetVerifierEmail = () => {
    setHasVerifierInfo(false); setOtpSent(false); setOtpCode("");
    setVerifierToken(""); setOtpError(""); setOtpInfo("");
    sessionStorage.removeItem("verifierToken");
    sessionStorage.removeItem("verifierTokenEmail");
    sessionStorage.removeItem("verifierTokenExp");
  };

  // ── C10: bulk verify from a ChainCert portfolio PDF ────────────────────────
  const [bulkIds, setBulkIds] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  // 1.2: session running-list — each uploaded PDF's results are kept as its OWN batch, so a NEW
  // upload ADDS to the history instead of wiping the previous results. Newest batch first.
  const [bulkBatches, setBulkBatches] = useState([]);
  const bulkPg = usePagination(bulkBatches, 5); // UAT: paginate bulk-verify batches (each batch is large)

  // Extract every embedded verify-link's credentialId from the uploaded PDF's link
  // annotations. Only works on the ORIGINAL digital export — scanning/printing strips links.
  const handleBulkPdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    // 1.3: clear any stale SINGLE-verify verdict so it doesn't linger beneath the bulk results.
    setResult(null); setError(null);
    setBulkError(""); setBulkIds([]);
    setBulkFileName(file.name); setBulkParsing(true);
    try {
      const pdfjsLib = await loadPdfjs();
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const ids = new Set();
      for (let p = 1; p <= pdf.numPages; p++) {
        // eslint-disable-next-line no-await-in-loop
        const page = await pdf.getPage(p);
        // eslint-disable-next-line no-await-in-loop
        const annots = await page.getAnnotations();
        annots.forEach((a) => {
          if (a && a.url) {
            try {
              const cid = new URL(a.url).searchParams.get("credentialId");
              if (cid) ids.add(cid);
            } catch (_) { /* not a parseable link — skip */ }
          }
        });
      }
      const list = [...ids];
      if (list.length === 0) {
        setBulkError("No ChainCert verification links found in this PDF. Bulk verify needs the original digital export — a scanned or printed copy loses the embedded links.");
      }
      setBulkIds(list);
      // Auto-run straight to results — no "Verify all" button needed.
      if (list.length > 0) runBulkVerify(list, file.name);
    } catch (err) {
      console.error("[BULK PDF] parse failed:", err);
      setBulkError("Could not read that PDF. Make sure it's the original ChainCert export.");
    } finally {
      setBulkParsing(false);
    }
  };

  // Sequential verify + on-chain log per extracted credential — same read + same proven-email
  // logging as a single check, so bulk results feed the same analytics.
  const runBulkVerify = async (idsArg, fileName) => {
    const ids = idsArg || bulkIds;
    if (ids.length === 0) return;
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: ids.length });
    // 1.2: start a NEW batch and prepend it to the running-list so prior uploads stay on screen.
    const batchId = `${Date.now()}-${ids.length}`;
    setBulkBatches((prev) => [{ id: batchId, fileName: fileName || bulkFileName || "PDF", rows: [] }, ...prev]);
    const results = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      try {
        // eslint-disable-next-line no-await-in-loop
        const resp = await apiService.Verify_Credential(id);
        const status = String(resp.status || "").toLowerCase();
        results.push({
          id,
          name: resp.credentialName || id,
          holder: resp.holderName || "",
          outcome: resp.isValid ? "valid" : (BULK_OUTCOME_META[status] ? status : "invalid"),
          full: resp, // keep the whole verify response so each result renders as a full card
        });
        try {
          // eslint-disable-next-line no-await-in-loop
          await apiService.logVerificationOnChain(
            resp.credentialID || id, verifierName, verifierEmail,
            JSON.stringify({ isValid: !!resp.isValid, reason: resp.reason, status: resp.status, source: resp.sources?.primarySource || "unknown" }),
            verifierToken
          );
        } catch (logErr) {
          if (logErr.response?.status === 401) resetVerifierEmail();
          console.warn("[BULK VERIFY] log failed (non-fatal):", logErr.message);
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          results.push({ id, name: id, holder: "", outcome: "not_found", full: { credentialID: id, status: "not_found" } });
          try {
            // eslint-disable-next-line no-await-in-loop
            await apiService.logVerificationOnChain(
              id, verifierName, verifierEmail,
              JSON.stringify({ valid: false, reason: "Credential not found", status: "not_found", source: "not_found" }),
              verifierToken
            );
          } catch (logErr) { console.warn("[BULK VERIFY] not-found log failed (non-fatal):", logErr.message); }
        } else {
          results.push({ id, name: id, holder: "", outcome: "error", full: { credentialID: id } });
        }
      }
      // Update THIS batch's rows live as the run progresses.
      const snapshot = [...results];
      setBulkBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, rows: snapshot } : b)));
      setBulkProgress({ done: i + 1, total: ids.length });
    }
    setBulkRunning(false);
  };

  // Gate: verifier must provide name+email AND prove email ownership via OTP (V1) before
  // entering the dashboard. Step 1 = details + send code; step 2 = enter code.
  if (!hasVerifierInfo) {
    return (
      <div className="verifier-page verifier-gate">
        <Card className="verifier-gate-card">
          <div className="verifier-head-icon"><ShieldCheck size={26} aria-hidden="true" /></div>
          <h1 className="verifier-gate-title">Verifier Information</h1>
          {!otpSent && (
            <p className="verifier-gate-sub">
              Enter your details — we'll email you a code to confirm your address before you verify.
            </p>
          )}

          {!otpSent ? (
            <form onSubmit={handleSendOtp}>
              <Field label="Your Name" htmlFor="vName">
                <Input id="vName" type="text" placeholder="e.g. Kai Verifier" value={verifierName} onChange={(e) => setVerifierName(e.target.value)} />
              </Field>
              <Field label="Your Email" htmlFor="vEmail">
                <Input id="vEmail" type="email" placeholder="e.g. verifier@example.com" value={verifierEmail} onChange={(e) => setVerifierEmail(e.target.value)} />
              </Field>

              {verifierFormError && (
                <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{verifierFormError}</span></div>
              )}
              {otpError && (
                <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{otpError}</span></div>
              )}

              <Button as="button" type="submit" variant="primary" loading={otpLoading} disabled={otpLoading} style={{ width: '100%', marginTop: 8 }}>
                {otpLoading ? "Sending code…" : "Send verification code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmOtp}>
              {otpInfo && (
                <div className="verifier-banner"><CheckCircle2 size={16} aria-hidden="true" /><span>{otpInfo}</span></div>
              )}
              <Field label="6-digit code" htmlFor="vOtp">
                <Input id="vOtp" type="text" inputMode="numeric" maxLength={6} placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
              </Field>

              {otpError && (
                <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{otpError}</span></div>
              )}

              <Button as="button" type="submit" variant="primary" loading={otpLoading} disabled={otpLoading} style={{ width: '100%', marginTop: 8 }}>
                {otpLoading ? "Verifying…" : "Verify & continue"}
              </Button>
              <button type="button" className="verifier-change" style={{ marginTop: 10 }} onClick={() => { setOtpSent(false); setOtpCode(""); setOtpError(""); setOtpInfo(""); }}>
                Use a different email
              </button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  // Normal dashboard view once verifier info is set
  return (
    <div className="verifier-page">
      <div className="verifier-head">
        <div className="verifier-head-icon"><ShieldCheck size={26} aria-hidden="true" /></div>
        <h1>Verification Dashboard</h1>
        <p>Enter a credential ID or code to check its authenticity on the blockchain.</p>
      </div>

      {/* Who is verifying */}
      <div className="verifier-summary">
        <span>Verifying as <strong>{verifierName}</strong> · {verifierEmail} <span style={{ color: "var(--ok)", fontSize: 12 }}>email verified · name self-reported</span></span>
        <button className="verifier-change" onClick={resetVerifierEmail}>Change</button>
      </div>

      {/* Hero search */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 360px", minWidth: 0 }}>
      <div className="verifier-searchbar">
        <Search size={18} aria-hidden="true" />
        <input
          type="text"
          placeholder="Enter credential ID or code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <Button onClick={handleVerify} loading={loading} disabled={loading}>Verify</Button>
      </div>
        </div>
        <NotesCard
          legendLabel="What a result means"
          legend={[
            { label: "Valid", color: "var(--ok)", meaning: "authentic and active" },
            { label: "Revoked", color: "var(--danger)", meaning: "cancelled by the issuer" },
            { label: "Expired", color: "var(--warn)", meaning: "past its expiry date" },
            { label: "Not Found", color: "var(--accent-strong)", meaning: "no such credential — it does not exist on the ledger" },
          ]}
        />
      </div>

      {/* C10: bulk verify from a ChainCert portfolio PDF (Employer/Regulator module) */}
      <Card style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <FileText size={18} aria-hidden="true" />
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Bulk verify from a ChainCert PDF</h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 12px", lineHeight: 1.5 }}>
          Upload a holder's ChainCert credential portfolio PDF. Every credential is verified against
          the blockchain in one pass. <span style={{ opacity: 0.85 }}>Works with the <strong>original digital export</strong>; scanned or printed copies lose the embedded links.</span>
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label className="verifier-bulk-file" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 16px", borderRadius: 10, border: "1px solid var(--border-strong)", cursor: bulkRunning ? "not-allowed" : "pointer", fontSize: 14, opacity: bulkRunning ? 0.6 : 1 }}>
            Choose PDF
            <input type="file" accept="application/pdf,.pdf" onChange={handleBulkPdf} disabled={bulkRunning} style={{ display: "none" }} />
          </label>
          {bulkFileName && !bulkParsing && (
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {bulkFileName}{bulkIds.length > 0 ? ` — ${bulkIds.length} credential link(s) found` : ""}
            </span>
          )}
          {bulkParsing && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Reading PDF…</span>}
        </div>

        {bulkError && (
          <div className="verifier-banner is-error" style={{ marginTop: 10 }}>
            <XCircle size={16} aria-hidden="true" /><span>{bulkError}</span>
          </div>
        )}

        {/* Live progress bar for the batch currently being checked. */}
        {bulkRunning && bulkProgress.total > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 8px" }}>
              Verifying {Math.min(bulkProgress.done + 1, bulkProgress.total)} of {bulkProgress.total}… each check reads the live blockchain.
            </p>
            <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden", marginBottom: 4 }}>
              <div style={{ height: "100%", width: `${Math.round((bulkProgress.done / bulkProgress.total) * 100)}%`, background: "var(--accent-strong)", transition: "width .3s ease" }} />
            </div>
          </div>
        )}

        {/* 1.2: session running-list — every uploaded PDF keeps its results as its own batch.
            Each result renders as a full verdict card; the cards flow and the page scrolls. */}
        {bulkBatches.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>
                Results are kept for this session — upload another PDF to add to the list.
              </p>
              {!bulkRunning && (
                <button type="button" className="verifier-change" onClick={() => setBulkBatches([])}>Clear results</button>
              )}
            </div>
            {bulkPg.pageItems.map((batch) => {
              const c = (o) => batch.rows.filter((r) => r.outcome === o).length;
              const parts = [];
              if (c("valid")) parts.push(`${c("valid")} valid`);
              if (c("revoked")) parts.push(`${c("revoked")} revoked`);
              if (c("expired")) parts.push(`${c("expired")} expired`);
              if (c("not_found")) parts.push(`${c("not_found")} not found`);
              if (c("invalid")) parts.push(`${c("invalid")} invalid`);
              if (c("error")) parts.push(`${c("error")} failed`);
              return (
                <div key={batch.id} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13, color: "var(--text-muted)" }}>
                    <FileText size={16} aria-hidden="true" />
                    <strong style={{ color: "var(--text)" }}>{batch.fileName}</strong>
                    <span>— {batch.rows.length} checked{parts.length ? `: ${parts.join(" · ")}` : ""}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {batch.rows.map((r) => {
                      const f = r.full || {};
                      const isValid = r.outcome === "valid";
                      const m = BULK_OUTCOME_META[r.outcome] || BULK_OUTCOME_META.error;
                      const explain =
                        r.outcome === "valid" ? "This credential is authentic and currently valid."
                        : r.outcome === "revoked" ? (f.revocationReason ? `This credential was revoked by the issuer. Reason: ${f.revocationReason}` : "This credential was revoked by the issuer.")
                        : r.outcome === "expired" ? "This credential has passed its expiry date."
                        : r.outcome === "not_found" ? "No matching credential exists on the blockchain."
                        : r.outcome === "error" ? "This credential could not be checked."
                        : "This credential is not valid.";
                      return (
                        <div key={r.id} className={`verifier-verdict ${isValid ? "is-valid" : "is-invalid"}`}>
                          <div className="verifier-verdict-head">
                            {isValid ? <CheckCircle2 size={24} aria-hidden="true" /> : <AlertTriangle size={24} aria-hidden="true" />}
                            <div>
                              <h2 style={{ fontSize: "1.15rem" }}>{m.label}</h2>
                              <p>{explain}</p>
                            </div>
                          </div>
                          {(f.credentialName || r.name) && <h3 className="verifier-cred-name">{f.credentialName || r.name}</h3>}
                          <div className="verifier-result-body">
                            {f.badgeImage && (<div className="verifier-badge"><img src={f.badgeImage} alt="" /></div>)}
                            <div className="verifier-detail-list">
                              <div className="verifier-detail-row"><span className="verifier-detail-label">Issued to</span><span className="verifier-detail-value">{f.holderName || r.holder || "N/A"}</span></div>
                              <div className="verifier-detail-row"><span className="verifier-detail-label">Issued by</span><span className="verifier-detail-value">{f.issuerName || "N/A"}</span></div>
                              {f.credentialType && (<div className="verifier-detail-row"><span className="verifier-detail-label">Type</span><span className="verifier-detail-value">{f.credentialType}</span></div>)}
                              {f.status && (<div className="verifier-detail-row"><span className="verifier-detail-label">Status</span><span className="verifier-detail-value"><StatusPill status={f.status} /></span></div>)}
                              {f.expiryDate && (<div className="verifier-detail-row"><span className="verifier-detail-label">Expires</span><span className="verifier-detail-value">{new Date(f.expiryDate).toLocaleDateString()}</span></div>)}
                              {Array.isArray(f.skills) && f.skills.length > 0 && (
                                <div className="verifier-detail-block"><span className="verifier-detail-label">Skills</span><div className="verifier-skills">{f.skills.map((skill, i) => <span key={i} className="verifier-skill-chip">{skill}</span>)}</div></div>
                              )}
                              <div className="verifier-meta"><p>Credential ID: <span className="verifier-mono">{f.credentialID || r.id}</span></p></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination {...bulkPg} />
      </Card>

      {/* Inline error */}
      {error && !result && (
        <div className="verifier-banner is-error"><XCircle size={16} aria-hidden="true" /><span>{error}</span></div>
      )}

      {/* Could-not-verify verdict */}
      {result && result.error && (
        <div className="verifier-verdict is-invalid">
          <div className="verifier-verdict-head">
            <XCircle size={28} aria-hidden="true" />
            <div>
              <h2>Could not verify</h2>
              <p>{result.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Result verdict */}
      {result && !result.error && (
        <div className={`verifier-verdict ${result.isValid ? "is-valid" : "is-invalid"}`}>
          <div className="verifier-verdict-head">
            {result.isValid ? <CheckCircle2 size={28} aria-hidden="true" /> : <AlertTriangle size={28} aria-hidden="true" />}
            <div>
              <h2>
                {result.isValid
                  ? "VALID"
                  : String(result.status).toLowerCase() === "revoked"
                  ? "REVOKED"
                  : String(result.status).toLowerCase() === "expired"
                  ? "EXPIRED"
                  : String(result.status).toLowerCase() === "not_found"
                  ? "NOT FOUND"
                  : "INVALID"}
              </h2>
              <p>
                {result.isValid
                  ? "This credential is authentic and currently valid."
                  : String(result.status).toLowerCase() === "revoked"
                  ? (result.revocationReason
                      ? `This credential was revoked by the issuer. Reason: ${result.revocationReason}`
                      : "This credential was revoked by the issuer.")
                  : String(result.status).toLowerCase() === "expired"
                  ? "This credential has passed its expiry date."
                  : String(result.status).toLowerCase() === "not_found"
                  ? "No matching credential exists on the blockchain."
                  : "This credential could not be verified."}
              </p>
            </div>
          </div>

          {result.credentialName && <h3 className="verifier-cred-name">{result.credentialName}</h3>}

          <div className="verifier-result-body">
            {result.badgeImage && (
              <div className="verifier-badge">
                <img src={result.badgeImage} alt="" />
              </div>
            )}
            <div className="verifier-detail-list">

              <div className="verifier-detail-row">
                <span className="verifier-detail-label">Issued to</span>
                <span className="verifier-detail-value">{result.holderName || 'N/A'}</span>
              </div>
              <div className="verifier-detail-row">
                <span className="verifier-detail-label">Issued by</span>
                <span className="verifier-detail-value">{result.issuerName || 'N/A'}</span>
              </div>
              {result.credentialType && (
                <div className="verifier-detail-row">
                  <span className="verifier-detail-label">Type</span>
                  <span className="verifier-detail-value">{result.credentialType}</span>
                </div>
              )}
              <div className="verifier-detail-row">
                <span className="verifier-detail-label">Status</span>
                <span className="verifier-detail-value"><StatusPill status={result.status} /></span>
              </div>
              {result.expiryDate && (
                <div className="verifier-detail-row">
                  <span className="verifier-detail-label">Expires</span>
                  <span className="verifier-detail-value">{new Date(result.expiryDate).toLocaleDateString()}</span>
                </div>
              )}
              {result.description && (
                <div className="verifier-detail-block">
                  <span className="verifier-detail-label">Description</span>
                  <p className="verifier-detail-desc">{result.description}</p>
                </div>
              )}
              {Array.isArray(result.skills) && result.skills.length > 0 && (
                <div className="verifier-detail-block">
                  <span className="verifier-detail-label">Skills</span>
                  <div className="verifier-skills">
                    {result.skills.map((skill, i) => <span key={i} className="verifier-skill-chip">{skill}</span>)}
                  </div>
                </div>
              )}

              <div className="verifier-meta">
                <p>Credential ID: <span className="verifier-mono">{result.credentialID || 'N/A'}</span></p>
                <p>Verified via {result.sources?.primarySource || 'unknown'} · {result.verifiedAt ? new Date(result.verifiedAt).toLocaleString() : 'Unknown time'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
