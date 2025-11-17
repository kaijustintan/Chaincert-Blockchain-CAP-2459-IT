import React, { useState } from 'react';
import "../styles/navBar.css";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/authenticationService'; // ✅ Import logout function


function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Get user info from localStorage
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!token;
  const userRole = user.role || '';
  const userName = user.username || user.name || user.fullName || user.orgName || 'User';
  // ✅ IMPROVED LOGOUT HANDLER - Now calls the centralized logout function
  const handleLogout = () => {
    console.log('🔄 Starting logout process...');
    
    logout(); // ✅ This clears ALL localStorage/sessionStorage
    
    setDropdownOpen(false);
    console.log('✅ Logout complete - redirecting to login');
    
    navigate('/login'); // Redirect to login page
  };

  return (
    <nav className="navbar">
      {/* Logo */}
      <h2 className="logo">
        <Link to="/" className="logo-link">ChainCert</Link>
      </h2>

      <ul className="nav-links">
        {/* PUBLIC LINKS - Always Visible */}
        <li className={location.pathname === '/' || location.pathname === '/home' ? 'active' : ''}>
          {isLoggedIn ? (
            <Link to="/home">Home</Link>
          ) : (
            <Link to="/">Home</Link>
          )}
        </li>
        <li className={location.pathname === '/about' ? 'active' : ''}>
          <Link to="/about">About</Link>
        </li>
        <li className={location.pathname === '/help' ? 'active' : ''}>
          <Link to="/help">Help</Link>
        </li>

        {/* LOGIN & CREATE ACCOUNT - Only if NOT logged in */}
        {!isLoggedIn && (
          <>
            <li className={location.pathname === '/login' ? 'active' : ''}>
              <Link to="/login" className="login-link">Login</Link>
            </li>
            <li className={location.pathname === '/register' ? 'active' : ''}>
              <Link to="/register" className="create-account-link">Create Account</Link>
            </li>
          </>
        )}

        {/* ROLE-SPECIFIC DASHBOARDS - Only if logged in */}
        {isLoggedIn && userRole === 'student' && (
          <li className={location.pathname === '/student/dashboard' ? 'active' : ''}>
            <Link to="/student/dashboard">My Dashboard</Link>
          </li>
        )}

        {isLoggedIn && userRole === 'admin' && (
          <li className={location.pathname === '/admin/dashboard' ? 'active' : ''}>
            <Link to="/admin/dashboard">Admin Dashboard</Link>
          </li>
        )}

        {isLoggedIn && userRole === 'issuer' && (
          <li className={location.pathname === '/issuer/dashboard' ? 'active' : ''}>
            <Link to="/issuer/dashboard">Issuer Dashboard</Link>
          </li>
        )}

        {/* PROFILE DROPDOWN - Only if logged in */}
        {isLoggedIn && (
          <div className="profile-dropdown-container">
            <button
              className="profile-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title={`${userName} (${userRole})`}
            >
              <img
                src="https://png.pngtree.com/png-clipart/20200224/original/pngtree-avatar-icon-profile-icon-member-login-vector-isolated-png-image_5247852.jpg"
                alt="Profile"
                className="profile-icon"
              />
            </button>
            {dropdownOpen && (
              <div className="profile-dropdown">
                <ul>
                  {/* User Info Header */}
                  <li className="user-info">
                    <strong>{userName}</strong>
                    <small>{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</small>
                  </li>
                  <li className="divider"></li>

                  {/* Dashboard Link */}
                  <li>
                    <Link to={`/${userRole}/dashboard`}>Dashboard</Link>
                  </li>

                  {/* Profile & Settings */}
                  <li className={location.pathname === '/profile' ? 'active' : ''}>
                    <Link to="/profile">Profile</Link>
                  </li>
                  <li className={location.pathname === '/settings' ? 'active' : ''}>
                    <Link to="/settings">Settings</Link>
                  </li>

                  {/* Student-only options */}
                  {userRole === 'student' && (
                    <li className={location.pathname === '/transcript' ? 'active' : ''}>
                      <Link to="/transcript">Send Transcript</Link>
                    </li>
                  )}

                  <li className="divider"></li>

                  {/* Sign Out */}
                  <li>
                    <button onClick={handleLogout} className="signout-btn">
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </ul>
    </nav>
  );
}

export default NavBar;