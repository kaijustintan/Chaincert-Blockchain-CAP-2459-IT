import React, { useState, useEffect } from "react";
import apiService from "../services/apiService";
import "../styles/settingsPage.css";


export default function SettingsPage() {
  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmail = user.email || localStorage.getItem('email') || '';
  const userName = user.username || user.name || user.fullName || 'User';
  const userRole = user.role || localStorage.getItem('role') || 'student';
  const userId = user._id || user.id || '';


  const [activeTab, setActiveTab] = useState("account");
  const [language, setLanguage] = useState("English");
  const [isProfileDeleteModalOpen, setIsProfileDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);


  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);


  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
    console.log('Language changed to:', e.target.value);
  };


  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    setPasswordError('');
    setPasswordSuccess('');
  };


  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');


    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }


    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }


    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }


    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }


    setIsChangingPassword(true);


    // NEWLY ADDED - Change pass
    // 🔍 DEBUG LOGS
    console.log('=== PASSWORD CHANGE DEBUG ===');
    console.log('User Email:', userEmail);
    console.log('Current Password Length:', passwordData.currentPassword.length);
    console.log('New Password Length:', passwordData.newPassword.length);
    console.log('Confirm Password Length:', passwordData.confirmPassword.length);


    try {
      const response = await apiService.changePassword({
        email: userEmail,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });


      console.log('✅ Success response:', response);


      setPasswordSuccess('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });


      // Close modal after 2 seconds
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess('');
      }, 2000);


    } catch (error) {
      console.error('❌ Error response:', error);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || 'Failed to change password. Please check your current password.';
      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };
  // Hanggang dito bagong lagay


  const handleDeleteProfile = () => {
    console.log('Deleting profile for user:', userId);
    alert('Profile deletion functionality will be implemented');
    setIsProfileDeleteModalOpen(false);
  };


  const tabs = [
    { id: "account", label: "Account", icon: "👤" },
    { id: "applications", label: "Applications", icon: "🔌" },
    { id: "organizations", label: "Organizations", icon: "🏢" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "security", label: "Security", icon: "🔒" },
  ];


  return (
    <>
      {/* Main Settings Wrapper */}
      <div className="settings-wrapper">
        {/* Sidebar */}
        <aside className="settings-sidebar">
          <div className="sidebar-header">
            <h3>Settings</h3>
          </div>
          <ul>
            {["account", "applications", "organizations", "notifications", "security"].map((tab) => (
              <li
                key={tab}
                className={activeTab === tab ? "active" : ""}
                onClick={() => setActiveTab(tab)}
              >
                <span className="tab-icon">
                  {tab === "account" && "👤"}
                  {tab === "applications" && "📱"}
                  {tab === "organizations" && "🏢"}
                  {tab === "notifications" && "🔔"}
                  {tab === "security" && "🔒"}
                </span>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </li>
            ))}
          </ul>
        </aside>


        {/* Content */}
        <main className="settings-content">
          {activeTab === "account" && (
            <section>
              <h2>Account Settings</h2>
              
              <div className="settings-section">
                <div className="section-icon">📧</div>
                <h4>Email Address</h4>
                <p className="current-value">{userEmail} <span className="badge">Primary</span></p>
                <button className="link-btn">+ Add another email address</button>
              </div>


              <div className="settings-section">
                <div className="section-icon">👤</div>
                <h4>Account Information</h4>
                <div className="info-row">
                  <span className="label">Full Name:</span>
                  <span className="value">{userName}</span>
                </div>
                <div className="info-row">
                  <span className="label">User ID:</span>
                  <span className="value">{userId || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Account Type:</span>
                  <span className="value role-badge">{userRole}</span>
                </div>
              </div>


              <div className="settings-section">
                <div className="section-icon">🌐</div>
                <h4>Language Preference</h4>
                <select value={language} onChange={handleLanguageChange} className="settings-select">
                  <option>English</option>
                  <option>Filipino</option>
                  <option>Spanish</option>
                  <option>Mandarin</option>
                </select>
              </div>


              <div className="settings-section">
                <div className="section-icon">🔗</div>
                <h4>Merge Accounts</h4>
                <p>Import details and email addresses from another ChainCert account.</p>
                <button className="secondary-btn">Merge an account</button>
              </div>


              <div className="settings-section danger-section">
                <div className="section-icon">⚠️</div>
                <h4>Delete Account</h4>
                <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                <button className="danger-btn" onClick={() => setIsProfileDeleteModalOpen(true)}>
                  Delete my account
                </button>
              </div>
            </section>
          )}

          {activeTab === "applications" && (
            <section>
              <h2>Connected Applications</h2>
              <p className="section-desc">Manage third-party applications that have access to your ChainCert account.</p>
              
              <div className="settings-section app-card">
                <div className="app-header">
                  <div className="app-icon">📊</div>
                  <div className="app-info">
                    <h4>Canvas LMS</h4>
                    <p className="app-meta">Connected 3 months ago • Last used: Yesterday</p>
                  </div>
                  <button className="revoke-btn">Revoke Access</button>
                </div>
                <div className="app-permissions">
                  <p><strong>Permissions:</strong> Read credentials, View profile</p>
                </div>
              </div>


              <div className="settings-section app-card">
                <div className="app-header">
                  <div className="app-icon">☁️</div>
                  <div className="app-info">
                    <h4>AWS Academy</h4>
                    <p className="app-meta">Connected 6 months ago • Last used: Last week</p>
                  </div>
                  <button className="revoke-btn">Revoke Access</button>
                </div>
                <div className="app-permissions">
                  <p><strong>Permissions:</strong> Issue credentials, Read profile</p>
                </div>
              </div>


              <button className="secondary-btn">+ Connect new application</button>
            </section>
          )}


          {activeTab === "organizations" && (
            <section>
              <h2>Organizations</h2>
              <p className="section-desc">Organizations you're a member of or have credentials from.</p>
              
              <div className="settings-section org-card">
                <div className="org-header">
                  <div className="org-icon">🎓</div>
                  <div className="org-info">
                    <h4>De La Salle University</h4>
                    <p className="org-meta">Member since 2023 • 5 credentials</p>
                  </div>
                  <button className="leave-btn">Leave Organization</button>
                </div>
              </div>


              <div className="settings-section org-card">
                <div className="org-header">
                  <div className="org-icon">🏢</div>
                  <div className="org-info">
                    <h4>XYZ Corporation</h4>
                    <p className="org-meta">Member since 2024 • 2 credentials</p>
                  </div>
                  <button className="leave-btn">Leave Organization</button>
                </div>
              </div>
            </section>
          )}


          {activeTab === "notifications" && (
            <section>
              <h2>Notification Preferences</h2>
              <p className="section-desc">Control how and when you receive notifications.</p>
              
              <div className="settings-section">
                <div className="section-icon">📧</div>
                <h4>Email Notifications</h4>
                <div className="toggle-row">
                  <span>Receive email notifications for credential updates</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={() => setEmailNotifications(!emailNotifications)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>


              <div className="settings-section">
                <div className="section-icon">🔔</div>
                <h4>Push Notifications</h4>
                <div className="toggle-row">
                  <span>Receive push notifications for new credentials</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={() => setPushNotifications(!pushNotifications)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>


              <div className="settings-section">
                <div className="section-icon">📬</div>
                <h4>Recent Activity</h4>
                <div className="notification-item">
                  <span className="notif-icon">🎓</span>
                  <div className="notif-content">
                    <p><strong>New credential received:</strong> AWS Cloud Practitioner</p>
                    <span className="notif-time">2 hours ago</span>
                  </div>
                </div>
                <div className="notification-item">
                  <span className="notif-icon">✅</span>
                  <div className="notif-content">
                    <p><strong>Credential approved:</strong> JavaScript Fundamentals</p>
                    <span className="notif-time">Yesterday</span>
                  </div>
                </div>
                <div className="notification-item">
                  <span className="notif-icon">👤</span>
                  <div className="notif-content">
                    <p><strong>New recommendation:</strong> Analyze Data with Python</p>
                    <span className="notif-time">3 days ago</span>
                  </div>
                </div>
              </div>
            </section>
          )}


          {activeTab === "security" && (
            <section>
              <h2>Privacy & Security</h2>
              <p className="section-desc">Manage your password, two-factor authentication, and security settings.</p>
              
              <div className="settings-section">
                <div className="section-icon">🔑</div>
                <h4>Password</h4>
                <p>Last changed 3 months ago</p>
                <button className="secondary-btn" onClick={() => setIsPasswordModalOpen(true)}>
                  Change password
                </button>
              </div>


              <div className="settings-section">
                <div className="section-icon">📱</div>
                <h4>Two-Factor Authentication</h4>
                <p className="status-badge disabled">Not enabled</p>
                <button className="secondary-btn">Enable 2FA</button>
              </div>


              <div className="settings-section">
                <div className="section-icon">🌐</div>
                <h4>Active Sessions</h4>
                <div className="session-item">
                  <div className="session-info">
                    <p><strong>Current Session</strong></p>
                    <p className="session-meta">Windows • Chrome • Carmona, Cavite</p>
                  </div>
                  <span className="session-status active">Active Now</span>
                </div>
                <button className="danger-btn-outline">Sign out all other sessions</button>
              </div>


              <div className="settings-section">
                <div className="section-icon">🔒</div>
                <h4>Data Privacy</h4>
                <p>Download a copy of your account data or request account deletion.</p>
                <button className="secondary-btn">Download my data</button>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Password Change Modal */}
      {isPasswordModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPasswordModalOpen(false)}>
          <div className="modal-content password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔑 Change Password</h3>
              <button className="close-btn" onClick={() => setIsPasswordModalOpen(false)}>
                ✕
              </button>
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
                    placeholder="Enter new password (min 6 characters)"
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
                {passwordError && (
                  <div className="error-message">⚠️ {passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="success-message">✅ {passwordSuccess}</div>
                )}
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

      {/* Delete Confirmation Modal */}
      {isProfileDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileDeleteModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Confirm Account Deletion</h3>
              <button className="close-btn" onClick={() => setIsProfileDeleteModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-box">
                <span className="warning-icon">🚨</span>
                <p>This action is <strong>permanent and cannot be undone</strong>. All your data including:</p>
                <ul>
                  <li>Credentials and badges</li>
                  <li>Profile information</li>
                  <li>Activity history</li>
                  <li>Organization memberships</li>
                </ul>
                <p>Will be permanently deleted.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setIsProfileDeleteModalOpen(false)}>
                Cancel
              </button>
              <button className="danger-btn" onClick={handleDeleteProfile}>
                Yes, Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
