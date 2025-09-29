import React, { useState } from "react";
import '../styles/settingsPage.css'; // Import the styles

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("account");

  return (
    <div className="settings-wrapper">
      {/* Sidebar */}
      <aside className="settings-sidebar">
        <ul>
          <li
            className={activeTab === "account" ? "active" : ""}
            onClick={() => setActiveTab("account")}
          >
            Account
          </li>
          <li
            className={activeTab === "applications" ? "active" : ""}
            onClick={() => setActiveTab("applications")}
          >
            Applications
          </li>
          <li
            className={activeTab === "organizations" ? "active" : ""}
            onClick={() => setActiveTab("organizations")}
          >
            Organizations
          </li>
          <li
            className={activeTab === "notifications" ? "active" : ""}
            onClick={() => setActiveTab("notifications")}
          >
            Notifications
          </li>
          <li
            className={activeTab === "security" ? "active" : ""}
            onClick={() => setActiveTab("security")}
          >
            Privacy & Security
          </li>
          <li
            className={activeTab === "profile" ? "active" : ""}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </li>
        </ul>
      </aside>

      {/* Content */}
      <main className="settings-content">
        {activeTab === "account" && (
          <section>
            <h2>Account</h2>
            <div className="settings-section">
              <h4>Email Addresses</h4>
              <p>kyle_justin_tan@dlsu.edu.ph (default)</p>
              <a href="#">Add an email address</a>
            </div>

            <div className="settings-section">
              <h4>Merge Accounts</h4>
              <p>
                You can import details and email addresses from another account you
                have created.
              </p>
              <a href="#">Merge an account</a>
            </div>

            <div className="settings-section">
              <h4>Delete Profile</h4>
              <p>This will delete your account permanently.</p>
              <a href="#" className="danger">
                Delete my profile
              </a>
            </div>

            <div className="settings-section">
              <h4>Language Preference</h4>
              <select>
                <option>English</option>
                <option>Filipino</option>
              </select>
            </div>
          </section>
        )}

        {activeTab === "applications" && (
          <section>
            <h2>Applications</h2>
            <p>Manage authorized applications connected to your account.</p>
          </section>
        )}

        {activeTab === "organizations" && (
          <section>
            <h2>Organizations</h2>
            <p>View and manage your connected organizations.</p>
          </section>
        )}

        {activeTab === "notifications" && (
          <section>
            <h2>Notifications</h2>
            <p>Set up how you receive notifications and alerts.</p>
          </section>
        )}

        {activeTab === "security" && (
          <section>
            <h2>Privacy & Security</h2>
            <p>Manage password, 2FA, and other security settings.</p>
          </section>
        )}

        {activeTab === "profile" && (
          <section>
            <h2>Profile</h2>
            <p>Update your personal details and preferences here.</p>
          </section>
        )}
      </main>
    </div>
  );
}
