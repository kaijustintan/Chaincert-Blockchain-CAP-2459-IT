import React, { useState } from "react";
import apiService from "../services/apiService";
import "../styles/settingsPage.css";
import { AppShell, Sidebar } from "../components/ui";
import { User, Bell, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmail = user.email || localStorage.getItem('email') || '';
  const userName = user.username || user.name || user.fullName || 'User';
  const userRole = user.role || localStorage.getItem('role') || 'student';
  const userId = user._id || user.id || '';

  const [activeTab, setActiveTab] = useState("account");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    // Password-strength policy is enforced server-side (single source of truth).
    // No hardcoded client-side length check here so the displayed rules never
    // drift from the real policy.
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setIsChangingPassword(true);

    try {
      if (userRole === 'admin') {
        await apiService.Admin_ChangePassword({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        });
      } else {
        await apiService.changePassword({
          email: userEmail,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        });
      }

      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess('');
      }, 2000);

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to change password. Please check your current password.';
      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const navItems = [
    { key: "account", label: "Account", icon: User },
    ...(userRole !== "admin" && userRole !== "verifier"
      ? [{ key: "notifications", label: "Notifications", icon: Bell }]
      : []),
    { key: "security", label: "Security", icon: ShieldCheck },
  ];

  return (
    <>
      <AppShell sidebar={<Sidebar items={navItems} activeKey={activeTab} onSelect={setActiveTab} title="Settings" />}>
        <div className="settings-content">

          {activeTab === "account" && (
            <section>
              <h2>Account Settings</h2>

              <div className="settings-section">
                <h4>Email Address</h4>
                <p className="current-value">{userEmail} <span className="badge">Primary</span></p>
              </div>

              <div className="settings-section">
                <h4>Account Information</h4>
                <div className="info-row">
                  <span className="label">Full Name:</span>
                  <span className="value">{userName}</span>
                </div>
                {userRole === "issuer" && (
                  <div className="info-row">
                    <span className="label">Organization:</span>
                    <span className="value">{user.orgName || user.org || 'N/A'}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="label">User ID:</span>
                  <span className="value">{userId || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Account Type:</span>
                  <span className="value role-badge">{userRole}</span>
                </div>
              </div>
            </section>
          )}

          {activeTab === "notifications" && (
            <section>
              <h2>Notification Preferences</h2>
              <p className="section-desc">Control how and when you receive notifications.</p>
              {/* SET1: these toggles are not wired to a backend yet — label honestly. */}
              <p className="section-desc" style={{ color: "var(--warn)", marginTop: -6 }}>
                ⓘ Preference saving is coming soon — these toggles aren't active yet.
              </p>

              <div className="settings-section">
                <h4>Email Notifications</h4>
                <div className="toggle-row">
                  <span>Receive email notifications for credential updates</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={() => setEmailNotifications(!emailNotifications)}
                      disabled
                      title="Coming soon"
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <h4>Push Notifications</h4>
                <div className="toggle-row">
                  <span>Receive push notifications for new credentials</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={() => setPushNotifications(!pushNotifications)}
                      disabled
                      title="Coming soon"
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </section>
          )}

          {activeTab === "security" && (
            <section>
              <h2>Security</h2>
              <p className="section-desc">Manage your account password and security settings.</p>

              <div className="settings-section">
                <h4>Password</h4>
                <p>Change your account password. You will need your current password to proceed.</p>
                <button className="secondary-btn" onClick={() => setIsPasswordModalOpen(true)}>
                  Change Password
                </button>
              </div>

              {userRole !== "admin" && (
                <div className="settings-section">
                  <h4>Two-Factor Authentication</h4>
                  <p className="status-badge disabled">Not enabled</p>
                  <button className="secondary-btn" disabled title="Coming soon">Enable 2FA</button>
                </div>
              )}
            </section>
          )}

        </div>
      </AppShell>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal-content password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="close-btn" aria-label="Close" onClick={() => setIsPasswordModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitPasswordChange}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    required
                  />
                </div>
                {passwordError && <div className="error-message">{passwordError}</div>}
                {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}