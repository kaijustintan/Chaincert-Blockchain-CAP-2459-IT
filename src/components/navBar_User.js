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

  useEffect(() => {
    const syncUser = () => setStoredUser(JSON.parse(localStorage.getItem('user') || '{}'));
    window.addEventListener('storage', syncUser);
    window.addEventListener(USER_SYNC_EVENT, syncUser);
    return () => {
      window.removeEventListener('storage', syncUser);
      window.removeEventListener(USER_SYNC_EVENT, syncUser);
    };
  }, []);

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
  const userRole = user.role || localStorage.getItem('role') || '';
  const userName = useMemo(() => getDisplayName({ ...user, role: userRole }), [user, userRole]);
  const profileImage = buildAvatarUrl(user.profilePicture || user.avatar || '', user.profilePictureUpdatedAt || user.updatedAt || '');
  const profileInitial = (userName || userRole || 'U').trim().charAt(0).toUpperCase();

  const handleLogout = () => {
    console.log('🔄 Starting logout process...');
    logout();
    setDropdownOpen(false);
    console.log('✅ Logout complete - redirecting to login');
    navigate('/login');
  };

  const getDashboardRoute = (role) => {
    const routes = {
      student: '/student/dashboard',
      user: '/student/dashboard',
      admin: '/admin/dashboard',
      issuer: '/issuer/dashboard',
      verifier: '/verifier/dashboard'
    };
    return routes[role] || '/student/dashboard';
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

        {isLoggedIn && (
          <div className="profile-dropdown-container">
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
                  <li>
                    <Link to={getDashboardRoute(userRole)}>Dashboard</Link>
                  </li>
                  <li className={location.pathname === '/profile' ? 'active' : ''}>
                    <Link to="/profile">Profile</Link>
                  </li>
                  <li className={location.pathname === '/settings' ? 'active' : ''}>
                    <Link to="/settings">Settings</Link>
                  </li>
                  {userRole === 'student' && (
                    <li className={location.pathname === '/transcript' ? 'active' : ''}>
                      <Link to="/transcript">Send Transcript</Link>
                    </li>
                  )}
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
