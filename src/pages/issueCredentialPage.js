import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiService from "../services/apiService";
import "../styles/issueCredentialPage.css";

export default function IssueCredentialPage() {
  const { credentialId } = useParams();
  const navigate = useNavigate();

  const [credential, setCredential] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [selectedHolder, setSelectedHolder] = useState("");
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [issueSuccess, setIssueSuccess] = useState(false);

  // Fetch credential details and users on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch the credential template
        const credData = await apiService.getCredentialById(credentialId);
        setCredential(credData);

        // Fetch all users (holders)
        const users = await apiService.getAllUsers();
        setUsersList(Array.isArray(users) ? users : []);
      } catch (err) {
        setError(
          err?.message || "Failed to load credential or users"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [credentialId]);

  const handleIssue = async (e) => {
    e.preventDefault();
    setIssueError("");
    setIssueSuccess(false);

    if (!selectedHolder) {
      setIssueError("Please select a holder to issue this credential to");
      return;
    }

    setIssueLoading(true);

    try {
      // Call API to issue the credential to the selected holder
      await apiService.issueCredential({
        credentialId,
        holderID: selectedHolder,
      });

      setIssueSuccess(true);
      setSelectedHolder("");

      // Redirect back to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/issuer/dashboard");
      }, 2000);
    } catch (err) {
      setIssueError(err?.message || "Failed to issue credential");
    } finally {
      setIssueLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="issue-credential-page">
        <h2>📤 Issue Credential</h2>
        <p>Loading credential details...</p>
      </div>
    );
  }

  if (!credential) {
    return (
      <div className="issue-credential-page">
        <h2>📤 Issue Credential</h2>
        <div className="error-box">
          ❌ Credential not found!
        </div>
        <button onClick={() => navigate("/issuer/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="issue-credential-page">
      <h2>📤 Issue Credential</h2>

      {error && (
        <div className="error-box">
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {issueSuccess && (
        <div className="success-box">
          ✅ Credential issued successfully! Redirecting to dashboard...
        </div>
      )}

      {/* Credential Details */}
      <div className="credential-details">
        <h3>Credential Template</h3>
        <table className="details-table">
          <tbody>
            <tr>
              <td>
                <strong>ID:</strong>
              </td>
              <td>{credential.id}</td>
            </tr>
            <tr>
              <td>
                <strong>Type:</strong>
              </td>
              <td>{credential.credentialType}</td>
            </tr>
            <tr>
              <td>
                <strong>Name:</strong>
              </td>
              <td>{credential.credentialName}</td>
            </tr>
            <tr>
              <td>
                <strong>Description:</strong>
              </td>
              <td>{credential.description || "N/A"}</td>
            </tr>
            <tr>
              <td>
                <strong>Status:</strong>
              </td>
              <td>
                <span className={`status-badge status-${credential.status}`}>
                  {credential.status}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Issue Form */}
      <div className="issue-form-container">
        <h3>Select Holder / Recipient</h3>
        <form onSubmit={handleIssue}>
          <div className="form-group">
            <label htmlFor="holder">
              Choose a Holder:
              <span className="required">*</span>
            </label>
            <select
              id="holder"
              value={selectedHolder}
              onChange={(e) => setSelectedHolder(e.target.value)}
              required
              disabled={issueLoading}
            >
              <option value="">-- Select a user --</option>
              {usersList.map((user) => (
                <option key={user.id || user.email} value={user.id || user.email}>
                  {user.name || user.email} ({user.id || user.email})
                </option>
              ))}
            </select>
          </div>

          {issueError && (
            <div className="error-message">{issueError}</div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              disabled={issueLoading || !selectedHolder}
              className="btn-primary"
            >
              {issueLoading ? "Issuing..." : "✅ Issue Credential"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/issuer/dashboard")}
              className="btn-secondary"
              disabled={issueLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="info-box">
        <h4>ℹ️ How This Works</h4>
        <ul>
          <li>✅ Select a holder from the list</li>
          <li>✅ Click "Issue Credential" to send it to them</li>
          <li>✅ The credential will be added to their wallet</li>
          <li>✅ They'll receive a notification</li>
          <li>✅ They can then view/download the credential</li>
        </ul>
      </div>
    </div>
  );
}