import React, { useState, useEffect, useRef } from "react";
import apiService from "../services/apiService";
import "../styles/profilePage.css";

export default function ProfilePage() {
  // Get user data from localStorage (set during login)
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userEmail = user.email || localStorage.getItem("email") || "";
  const userName = user.username || user.name || user.fullName || "User";
  const userRole = user.role || localStorage.getItem("role") || "student";
  const userId = user._id || user.id || "";

  const [summary, setSummary] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [avatar, setAvatar] = useState("👤"); // ✅ <-- ADD THIS LINE

  // Ref for the hidden file input
  const fileInputRef = useRef(null);

  // Generate profile URL based on username
  const profileUrl = `https://www.chaincert.com/users/${userName
    .toLowerCase()
    .replace(/\s+/g, "-")}`;

  // Load user profile data on component mount
  useEffect(() => {
    loadUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await apiService.getUserInfo(userId);
      if (response.success && response.user) {
        setSummary(response.user.summary || '');
        setIsPublic(response.user.isPublic !== undefined ? response.user.isPublic : true);
        if (response.user.profilePicture) { // ✅ <-- ADD THIS
          setAvatar(response.user.profilePicture); // ✅ <-- ADD THIS
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await apiService.updateProfile({
        userId: userId,
        summary: summary,
        isPublic: isPublic,
      });

      if (response.success) {
        setSaveMessage("✅ Profile saved successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("❌ Failed to save profile");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage("❌ Failed to save profile");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar: open file picker
  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Avatar: handle file selection
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("File selected:", file.name);
    alert(
      `File selected: ${file.name}\n\nIn the next step, we'll hook this up to the backend.`
    );
// This is the new logic
    try {
      const formData = new FormData();
      formData.append('profilePicture', file); // 'profilePicture' must match the backend
      formData.append('userId', userId);      // Send the userId too
      
      const response = await apiService.uploadProfilePicture(formData);
      
      if (response.success) {
        alert('Profile picture updated successfully!');
        setAvatar(response.imageUrl); // ✅ <-- ADD THIS (replaces the TODO)
        // TODO: We will add code here to make the new image
        // appear immediately without a refresh.
      } else {
        alert(`Error: ${response.message}`);
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      alert('An error occurred while uploading the image.');
    }
  };

  // Static badge data (demo)
  const badges = [
    {
      id: 1,
      title: "CCNA: Enterprise Networking, Security, and Automation",
      issuer: "Cisco",
      description:
        "Cisco verifies the earner of this badge successfully completed the CCNA: Enterprise Networking, Security, and Automation course.",
      date: "Aug 1, 2024",
      expires: "This credential does not expire",
      credentialId: "b6b4f34c-5053-431c-8cd9-8d2dc22bcc22",
      image: "🎓",
    },
    {
      id: 2,
      title: "CCNA: Switching, Routing, and Wireless Essentials",
      issuer: "Cisco",
      description:
        "Cisco certifies the skills in routing and switching fundamentals and wireless network implementation.",
      date: "Apr 16, 2024",
      expires: "This credential does not expire",
      credentialId: "a7e1f34c-2223-431c-8cd9-9d2dc22bcc11",
      image: "🌐",
    },
    {
      id: 3,
      title: "Network Defense",
      issuer: "Cisco",
      description:
        "Cisco certifies knowledge in Network Defense strategies and cybersecurity best practices.",
      date: "Nov 26, 2024",
      expires: "This credential does not expire",
      credentialId: "c8f4d44a-3333-555c-9cd9-1a2bc22bcc55",
      image: "🛡️",
    },
  ];

  // Static skills data (demo)
  const skills = [
    {
      id: 1,
      name: "Access Control",
      evidence: "2 sources of skill evidence",
      level: "Advanced",
    },
    {
      id: 2,
      name: "Application Security",
      evidence: "1 source of skill evidence",
      level: "Intermediate",
    },
    {
      id: 3,
      name: "Network Security",
      evidence: "3 sources of skill evidence",
      level: "Advanced",
    },
    {
      id: 4,
      name: "Threat Detection",
      evidence: "2 sources of skill evidence",
      level: "Intermediate",
    },
  ];

  const handleCopyUrl = () => {
    navigator.clipboard
      .writeText(profileUrl)
      .then(() => {
        alert("Profile URL copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy URL:", err);
      });
  };

  if (loading) {
    return <div className="profile-page">Loading profile...</div>;
  }

  return (
  <div className="profile-page">
    {/* Profile Header */}
    <div className="profile-header">

      {/* 4. MODIFIED THE AVATAR JSX */}
      <div className="avatar-wrapper">
        {/* THIS IS THE CHANGE */}
        <div className="avatar">
          {avatar.startsWith('data:') ? (
            <img src={avatar} alt="Profile" />
          ) : (
            avatar
          )}
        </div>

        <button
          className="avatar-edit-btn"
          onClick={handleAvatarClick}
          title="Change profile picture"
        >
            ✏️
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/gif"
          />
        </div>

        <div className="profile-info">
          <h2>{userName}</h2>
          <p className="profile-link">{profileUrl}</p>
          <div className="profile-actions">
            <button className="link-btn">Edit URL</button>
            <span> | </span>
            <button className="link-btn" onClick={handleCopyUrl}>
              Copy URL
            </button>
            <span> | </span>
            <button
              className="link-btn"
              onClick={() => window.open("/profile-preview", "_blank")}
            >
              Preview Public Profile
            </button>
          </div>

          {summary && (
            <div className="profile-summary-display">
              <p>{summary}</p>
            </div>
          )}
        </div>

        <div className="edit-btn">
          <button>Edit Profile</button>
        </div>
      </div>

      {/* Account Information */}
      <section className="profile-section">
        <h3>Account Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Full Name</label>
            <span>{userName}</span>
          </div>
          <div className="info-item">
            <label>Email Address</label>
            <span>{userEmail}</span>
          </div>
          <div className="info-item">
            <label>Account Role</label>
            <span className="role-badge">{userRole}</span>
          </div>
          <div className="info-item">
            <label>User ID</label>
            <span className="user-id">{userId || "N/A"}</span>
          </div>
        </div>
      </section>

      {/* Profile Summary */}
      <section className="profile-section">
        <h3>Personal Summary</h3>
        <div className="summary-box">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Share your professional story, achievements, and career goals. This will appear on your public profile and help others understand your expertise."
            maxLength={600}
            className="summary-textarea"
          />
          <div className="summary-footer">
            <span className="char-count">{summary.length} / 600 characters</span>
            <div className="visibility-toggle">
              <label>Public Profile</label>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={() => setIsPublic(!isPublic)}
              />
            </div>
          </div>
          <button
            className="save-btn"
            onClick={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          {saveMessage && (
            <div
              className={`save-message ${
                saveMessage.includes("✅") ? "success" : "error"
              }`}
            >
              {saveMessage}
            </div>
          )}
        </div>
      </section>

      {/* Badge Wallet */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Badge Wallet</h3>
          <button className="secondary-btn">+ Upload Badge</button>
        </div>

        <div className="badges-grid">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="badge-card"
              onClick={() => setSelectedBadge(badge)}
            >
              <div className="badge-image">{badge.image}</div>
              <h4>{badge.title}</h4>
              <p className="badge-date">{badge.date}</p>
              <p className="badge-issuer">Issued by {badge.issuer}</p>
            </div>
          ))}

          {/* Add New Badge Card */}
          <div className="badge-card-enhanced add-new">
            <div className="add-new-content">
              <span className="add-icon">➕</span>
              <h3>Add New Badge</h3>
              <p>Upload external credentials</p>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Wallet */}
      <section className="profile-section">
        <div className="section-header">
          <h3>Skills Wallet</h3>
          <button className="secondary-btn">+ Add Skill</button>
        </div>

        <div className="skills-grid">
          {skills.map((skill) => (
            <div key={skill.id} className="skill-card">
              <div className="skill-info">
                <h4>{skill.name}</h4>
                <p>{skill.evidence}</p>
              </div>
              <button className="small-btn">Edit</button>
            </div>
          ))}
        </div>
      </section>

      {/* Enhanced Modal */}
      {selectedBadge && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Badge Details</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedBadge(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-badge-image">{selectedBadge.image}</div>
              <h4>{selectedBadge.title}</h4>
              <div className="modal-details">
                <p>
                  <strong>Issuing Organization:</strong>{" "}
                  {selectedBadge.issuer}
                </p>
                <p>
                  <strong>Description:</strong> {selectedBadge.description}
                </p>
                <p>
                  <strong>Issuing Date:</strong> {selectedBadge.date}
                </p>
                <p>
                  <strong>Expiration Date:</strong> {selectedBadge.expires}
                </p>
                <p>
                  <strong>Credential ID:</strong>{" "}
                  {selectedBadge.credentialId}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="share-btn"
                onClick={() =>
                  window.open(`/share-credential/${selectedBadge.id}`, "_blank")
                }
              >
                Share Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}