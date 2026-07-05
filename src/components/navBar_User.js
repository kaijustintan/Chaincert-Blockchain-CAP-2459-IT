import React, { useEffect, useMemo, useRef, useState } from 'react';
import "../styles/navBar.css";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/authenticationService'; // ✅ Import logout function
import apiService from '../services/apiService';
import { USER_SYNC_EVENT, buildAvatarUrl, getDisplayName, getRoleLabel, syncStoredUser } from '../utils/userDisplay';

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [storedUser, setStoredUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const profileFetchedRef = useRef(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const syncUser = () => setStoredUser(JSON.parse(localStorage.getItem('user') || '{}'));
    window.addEventListener('storage', syncUser);
    window.addEventListener(USER_SYNC_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener(USER_SYNC_EVENT, syncUser);
    };
  }, []);

  // Close the profile dropdown when clicking outside it, or when the route changes.
  useEffect(() => {
    if (!dropdownOpen) return undefined;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen]);

  // Collapse the dropdown automatically whenever the user navigates to a new page.
  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const uid = storedUser._id || storedUser.id;
    if (token && uid && !storedUser.profilePicture && !profileFetchedRef.current) {
      profileFetchedRef.current = true;
      apiService.getUserInfo(uid).then(resp => {
        if (resp?.success && resp.user) {
          syncStoredUser({ ...resp.user, role: storedUser.role || localStorage.getItem('role') || '' });
        }
      }).catch(() => {});
    }
    if (!token) profileFetchedRef.current = false;
  }, [storedUser]);

  const token = localStorage.getItem('token');
  const user = storedUser;
  const isLoggedIn = !!token;
  // Group 8: the verifier dashboard is a public, anonymous context. Hide the logged-in account
  // UI (profile menu + role dashboard link) there so opening it reads as a fresh no-login page,
  // even if a holder/issuer is logged in. The verifier flow itself never uses the account token.
  const onVerifierRoute = location.pathname === '/verifier/dashboard';
  const showAccountUI = isLoggedIn && !onVerifierRoute;
  const userRole = user.role || localStorage.getItem('role') || '';
  const userName = useMemo(() => getDisplayName({ ...user, role: userRole }), [user, userRole]);
  const profileImage = buildAvatarUrl(user.profilePicture || user.avatar || '', user.profilePictureUpdatedAt || user.updatedAt || '');
  const profileInitial = (userName || userRole || 'U').trim().charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <h2 className="logo">
        <Link to="/" className="logo-link">ChainCert</Link>
      </h2>

      <ul className="nav-links">
        <li className={location.pathname === '/' ? 'active' : ''}>
          <Link to="/">Home</Link>
        </li>
        <li className={location.pathname === '/about' ? 'active' : ''}>
          <Link to="/about">About</Link>
        </li>
        <li className={location.pathname === '/help' ? 'active' : ''}>
          <Link to="/help">Help</Link>
        </li>
        <li className={location.pathname === '/directory' ? 'active' : ''}>
          <Link to="/directory">Issuers</Link>
        </li>
        <li className={location.pathname === '/verifier/dashboard' ? 'active' : ''}>
          <Link to="/verifier/dashboard">Verifier Dashboard</Link>
        </li>

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

        {showAccountUI && (userRole === 'student' || userRole === 'user') && (
          <li className={location.pathname === '/student/dashboard' ? 'active' : ''}>
            <Link to="/student/dashboard">My Dashboard</Link>
          </li>
        )}

        {showAccountUI && userRole === 'admin' && (
          <li className={location.pathname === '/admin/dashboard' ? 'active' : ''}>
            <Link to="/admin/dashboard">Admin Dashboard</Link>
          </li>
        )}

        {showAccountUI && userRole === 'issuer' && (
          <li className={location.pathname === '/issuer/dashboard' ? 'active' : ''}>
            <Link to="/issuer/dashboard">Issuer Dashboard</Link>
          </li>
        )}

        {showAccountUI && (
          <div className="profile-dropdown-container" ref={dropdownRef}>
            <button
              className="profile-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title={`${userName} (${userRole})`}
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={userName}
                  className="profile-icon"
                />
              ) : (
                <span className="profile-icon profile-icon-fallback" aria-hidden="true">
                  {profileInitial}
                </span>
              )}
            </button>
            {dropdownOpen && (
              <div className="profile-dropdown">
                <ul>
                  <li className="user-info">
                    <strong>{userName}</strong>
                    <small>{getRoleLabel(userRole)}</small>
                  </li>
                  <li className="divider"></li>
                  <li className={location.pathname === '/profile' ? 'active' : ''}>
                    <Link to="/profile">Profile</Link>
                  </li>
                  <li className={location.pathname === '/settings' ? 'active' : ''}>
                    <Link to="/settings">Settings</Link>
                  </li>
                  <li className="divider"></li>
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
