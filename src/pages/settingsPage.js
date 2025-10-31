import React, { useState } from "react";
import "../styles/settingsPage.css"; // Import the styles

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account");
  const [language, setLanguage] = useState("English");
  const [isProfileDeleteModalOpen, setIsProfileDeleteModalOpen] = useState(false);

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div className="settings-wrapper">
      {/* Sidebar */}
      <aside className="settings-sidebar">
        <ul>
          {["account", "applications", "organizations", "notifications", "security", "profile"].map((tab) => (
            <li
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </li>
          ))}
        </ul>
      </aside>

      {/* Content */}
      <main className="settings-content">
        {activeTab === "account" && (
          <section>
            <h2>Account</h2>
            <div className="settings-section">
              <h4>Email Address</h4>
              <p>kyle_justin_tan@dlsu.edu.ph (default)</p>
              <a href="#">Add an email address</a>
            </div>

            <div className="settings-section">
              <h4>Merge Accounts</h4>
              <p>You can import details and email addresses from another account you have created.</p>
              <a href="#">Merge an account</a>
            </div>

            <div className="settings-section">
              <h4>Delete Profile</h4>
              <p>This will delete your account permanently.</p>
              <a href="#" className="danger" onClick={() => setIsProfileDeleteModalOpen(true)}>
                Delete my profile
              </a>
            </div>

            <div className="settings-section">
              <h4>Language Preference</h4>
              <select value={language} onChange={handleLanguageChange}>
                <option>English</option>
                <option>Filipino</option>
              </select>
            </div>
          </section>
        )}

        {activeTab === "applications" && (
          <section>
            <h2>Applications</h2>
            <p>Manage the applications connected to your account.</p>
            <div className="settings-section">
              <h4>Connected Applications</h4>
              <ul>
                <li>Canvas - <a href="#">Revoke Access</a></li>
                <li>AWS - <a href="#">Revoke Access</a></li>
              </ul>
            </div>
          </section>
        )}

        {activeTab === "organizations" && (
          <section>
            <h2>Organizations</h2>
            <p>View and manage the organizations associated with your account.</p>
            <div className="settings-section">
              <h4>Connected Organizations</h4>
              <ul>
                <li>DLSU (De La Salle University) - <a href="#">Leave Organization</a></li>
                <li>XYZ Corp - <a href="#">Leave Organization</a></li>
              </ul>
            </div>
          </section>
        )}

        {activeTab === "notifications" && (
          <section>
            <h2>Notifications</h2>
            <p>Manage how you receive notifications and alerts.</p>
            <div className="settings-section">
              <h4>Recent Notifications</h4>
              <ul>
                <li>You have received a new credential: <strong>AWS Cloud Practitioner</strong> from AWS Academy</li>
                <li>Your approval request for the credential <strong>JavaScript Fundamentals</strong> has been submitted.</li>
                <li>New recommendation from <strong>Jane Smith</strong>: <em>Analyze Data with Python</em></li>
              </ul>
            </div>
          </section>
        )}

        {activeTab === "security" && (
          <section>
            <h2>Privacy & Security</h2>
            <p>Manage your password, 2FA, and other security settings.</p>
          </section>
        )}

        {activeTab === "profile" && (
          <section>
            <h2>Profile</h2>
            <p>Update your personal details and preferences here.</p>
          </section>
        )}
      </main>

      {/* Profile Delete Confirmation Modal */}
      {isProfileDeleteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProfileDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Profile Deletion</h3>
              <button className="close-btn" onClick={() => setIsProfileDeleteModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete your profile? This action is permanent.</p>
            </div>
            <div className="modal-footer">
              <button className="danger-btn">Delete Profile</button>
              <button className="cancel-btn" onClick={() => setIsProfileDeleteModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}