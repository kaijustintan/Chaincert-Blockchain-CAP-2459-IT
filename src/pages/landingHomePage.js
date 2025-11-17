// landingHomePage.js - ROLE-BASED VERSION WITH CORRECT NAME DISPLAY
import React, { useState, useEffect } from "react";
import "../styles/landingHomePage.css";
import { Link, useNavigate } from 'react-router-dom';

function LandingHomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user from localStorage (adjust based on how you store user data)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // If not logged in, show public landing page
  if (!user) {
    return <PublicLandingPage />;
  }

  // Route based on role
  switch(user.role?.toLowerCase()) {
    case 'student':
    case 'user':
    case 'holder':
      return <StudentLandingPage user={user} navigate={navigate} />;
    
    case 'issuer':
      return <IssuerLandingPage user={user} navigate={navigate} />;
    
    case 'admin':
      return <AdminLandingPage user={user} navigate={navigate} />;
    
    default:
      return <PublicLandingPage />;
  }
}

// ========================================
// PUBLIC LANDING PAGE (Not Logged In)
// ========================================
function PublicLandingPage() {
  return (
    <div className="landing-container">
      <div className="hero">
        <h1>
          <span className="highlight">The New Standard for Verifiable Trust</span>
        </h1>
        <p>
          ChainCert solves these problems by anchoring every credential to a tamper-proof, 
          permissioned Hyperledger Fabric blockchain. Every degree, certificate, or micro-credential 
          becomes a secure, verifiable digital asset that employers and institutions can trust instantly.
        </p>
        <div className="buttons">
          <Link to="/login">
            <button className="btn primary">Get Started</button>
          </Link>
          <button className="btn secondary">Ecosystems</button>
        </div>
      </div>
      <div className="background-lines"></div>
    </div>
  );
}

// ========================================
// STUDENT/USER LANDING PAGE (Credly-style)
// ========================================
function StudentLandingPage({ user, navigate }) {
  // Mock data - replace with actual API calls
  const [stats, setStats] = useState({
    credentials: 0,
    skills: 0,
    shares: 0
  });

  useEffect(() => {
    // TODO: Fetch actual stats from API
    // For now, using mock data
    setStats({
      credentials: 2,
      skills: 16,
      shares: 0
    });
  }, []);

  // Get display name - use fullName for user/student
  const displayName = user.fullName || user.name || user.username;

  return (
    <div className="student-landing">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome, {displayName}</h1>
        <p className="welcome-subtitle">Congratulations on your most recent badge 🎉</p>
      </div>

      {/* Recent Badge Showcase */}
      <div className="recent-badge-section">
        <div className="badge-card">
          <div className="badge-image-placeholder">
            <div className="badge-icon">🎓</div>
          </div>
          <div className="badge-details">
            <h3>Your Latest Credential</h3>
            <p className="badge-org">ChainCert Verified</p>
            <div className="badge-actions">
              <button className="btn-share">Share</button>
              <button className="btn-view">View Details</button>
            </div>
          </div>
        </div>
      </div>

      {/* Journey Section */}
      <div className="journey-section">
        <div className="journey-card">
          <div className="journey-icon">🗺️</div>
          <h2>Unlock recommendations tailored for you!</h2>
          <p>
            Build your skills wallet and gain personalized learning recommendations designed to help 
            you advance your career. By sharing your occupation history with us, we can suggest key 
            occupation skills, identify useful badges and help you showcase your abilities on your profile. 
            Get started now and unlock your full potential!
          </p>
          <button 
            className="btn primary journey-btn"
            onClick={() => navigate('/profile')}
          >
            Start Your Journey
          </button>
        </div>
      </div>

      {/* Activity Snapshot */}
      <div className="activity-section">
        <h2 className="section-title">Activity snapshot</h2>
        <div className="activity-cards">
          <div className="activity-card">
            <div className="activity-number">{stats.credentials}</div>
            <div className="activity-label">ChainCert Credentials</div>
          </div>
          <div className="activity-card">
            <div className="activity-number">0</div>
            <div className="activity-label">Other Badges</div>
          </div>
          <div className="activity-card">
            <div className="activity-number">{stats.skills}</div>
            <div className="activity-label">Skills</div>
          </div>
          <div className="activity-card">
            <div className="activity-number">{stats.shares}</div>
            <div className="activity-label">Shares</div>
          </div>
        </div>
      </div>

      {/* Explore Section */}
      <div className="explore-section">
        <h2 className="section-title">Explore other credentials</h2>
        <div className="explore-cards">
          <div className="credential-card">
            <div className="credential-badge">📜</div>
            <h4>Degree Certificates</h4>
            <p className="credential-org">Universities</p>
            <span className="credential-type">Certification</span>
          </div>
          <div className="credential-card">
            <div className="credential-badge">🎯</div>
            <h4>Professional Licenses</h4>
            <p className="credential-org">Licensing Bodies</p>
            <span className="credential-type">License</span>
          </div>
          <div className="credential-card">
            <div className="credential-badge">⭐</div>
            <h4>Micro-credentials</h4>
            <p className="credential-org">Training Centers</p>
            <span className="credential-type">Achievement</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ISSUER LANDING PAGE (Custom Style)
// ========================================
function IssuerLandingPage({ user, navigate }) {
  const [stats, setStats] = useState({
    totalIssued: 0,
    activeStudents: 0,
    thisMonth: 0,
    verified: 0
  });

  useEffect(() => {
    // TODO: Fetch actual stats from API
    setStats({
      totalIssued: 45,
      activeStudents: 32,
      thisMonth: 8,
      verified: 42
    });
  }, []);

  // Get display name - use contactName for issuer, fallback to orgName
  const displayName = user.contactName || user.orgName || user.name;

  return (
    <div className="issuer-landing">
      {/* Header */}
      <div className="issuer-header">
        <h1>Welcome back, {displayName}</h1>
        <p>Your credential management dashboard</p>
      </div>

      {/* Quick Stats */}
      <div className="issuer-stats">
        <div className="stat-card purple">
          <div className="stat-icon">📜</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalIssued}</div>
            <div className="stat-label">Total Credentials Issued</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <div className="stat-value">{stats.activeStudents}</div>
            <div className="stat-label">Active Recipients</div>
          </div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.thisMonth}</div>
            <div className="stat-label">Issued This Month</div>
          </div>
        </div>
        <div className="stat-card orange">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <div className="stat-value">{stats.verified}</div>
            <div className="stat-label">Verified</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h2>Quick Actions</h2>
        <div className="action-cards">
          <div className="action-card" onClick={() => navigate('/issuer/issue')}>
            <div className="action-icon">➕</div>
            <h3>Issue Credential</h3>
            <p>Create and issue a new credential to a recipient</p>
          </div>
          <div className="action-card" onClick={() => navigate('/issuer/dashboard')}>
            <div className="action-icon">📊</div>
            <h3>View Dashboard</h3>
            <p>See all issued credentials and analytics</p>
          </div>
          <div className="action-card" onClick={() => navigate('/issuer/organization')}>
            <div className="action-icon">🏢</div>
            <h3>Organization Settings</h3>
            <p>Manage your organization profile and team</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-dot"></div>
            <div className="activity-content">
              <p><strong>Credential issued</strong> to John Doe</p>
              <span className="activity-time">2 hours ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-dot"></div>
            <div className="activity-content">
              <p><strong>Credential verified</strong> by Employer ABC</p>
              <span className="activity-time">5 hours ago</span>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-dot"></div>
            <div className="activity-content">
              <p><strong>New team member</strong> added to organization</p>
              <span className="activity-time">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// ADMIN LANDING PAGE (System Overview)
// ========================================
function AdminLandingPage({ user, navigate }) {
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    totalUsers: 0,
    totalOrgs: 0,
    totalCredentials: 0
  });

  useEffect(() => {
    // TODO: Fetch actual stats from API
    setStats({
      pendingApprovals: 3,
      totalUsers: 156,
      totalOrgs: 12,
      totalCredentials: 342
    });
  }, []);

  // Get display name - use fullName for admin
  const displayName = user.fullName || user.name || user.username;

  return (
    <div className="admin-landing">
      {/* Header */}
      <div className="admin-header">
        <h1>System Administration</h1>
        <p>Welcome back, {displayName}</p>
      </div>

      {/* System Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card alert">
          <div className="stat-icon">⚠️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.pendingApprovals}</div>
            <div className="stat-label">Pending Approvals</div>
          </div>
          <button className="stat-action" onClick={() => navigate('/admin/approvals')}>
            Review →
          </button>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalOrgs}</div>
            <div className="stat-label">Organizations</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="stat-icon">📜</div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalCredentials}</div>
            <div className="stat-label">Total Credentials</div>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="admin-actions">
        <h2>System Management</h2>
        <div className="admin-action-grid">
          <div className="admin-action-card" onClick={() => navigate('/admin/approvals')}>
            <div className="action-header">
              <div className="action-icon">✓</div>
              <span className="action-badge">{stats.pendingApprovals}</span>
            </div>
            <h3>Approve Organizations</h3>
            <p>Review and approve pending issuer registrations</p>
          </div>
          <div className="admin-action-card" onClick={() => navigate('/admin/users')}>
            <div className="action-icon">👥</div>
            <h3>User Management</h3>
            <p>View, edit, and manage user accounts</p>
          </div>
          <div className="admin-action-card" onClick={() => navigate('/admin/organizations')}>
            <div className="action-icon">🏢</div>
            <h3>Organizations</h3>
            <p>Manage accredited issuing organizations</p>
          </div>
          <div className="admin-action-card" onClick={() => navigate('/admin/logs')}>
            <div className="action-icon">📋</div>
            <h3>Activity Logs</h3>
            <p>View system activity and audit trail</p>
          </div>
          <div className="admin-action-card" onClick={() => navigate('/admin/analytics')}>
            <div className="action-icon">📊</div>
            <h3>Analytics</h3>
            <p>System statistics and performance metrics</p>
          </div>
          <div className="admin-action-card" onClick={() => navigate('/admin/settings')}>
            <div className="action-icon">⚙️</div>
            <h3>System Settings</h3>
            <p>Configure system parameters and policies</p>
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="system-alerts">
        <h2>System Alerts</h2>
        <div className="alert-list">
          <div className="alert-item warning">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <h4>Pending Approvals</h4>
              <p>{stats.pendingApprovals} organizations waiting for approval</p>
            </div>
            <button className="alert-btn">Review</button>
          </div>
          <div className="alert-item info">
            <div className="alert-icon">ℹ️</div>
            <div className="alert-content">
              <h4>System Healthy</h4>
              <p>All services running normally</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingHomePage;