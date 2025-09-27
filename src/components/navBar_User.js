import React, { useState } from 'react';
import "../styles/navBar.css";
import { Link, useLocation } from 'react-router-dom';

function NavBar() {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false); // State for controlling dropdown visibility

  return (
    <nav className="navbar">
      <h2 className="logo">ChainCert</h2>
      <ul className="nav-links">
        <li className={location.pathname === '/' ? 'active' : ''}>
          <Link to="/">DASHBOARD NOT LOGIN</Link>
        </li>
        <li className={location.pathname === '/login' ? 'active' : ''}>
          <Link to="/login">Login</Link>
        </li>
        <li className={location.pathname === '/student/dashboard' ? 'active' : ''}>
          <Link to="/student/dashboard">Dashboard UPON LOGIN</Link>
        </li>
        <li className={location.pathname === '/admin/dashboard' ? 'active' : ''}>
          <Link to="/admin/dashboard">Admin Dashboard</Link>
        </li>
        <li className={location.pathname === '/verifier/dashboard' ? 'active' : ''}>
          <Link to="/verifier/dashboard">Verifier Dashboard</Link>
        </li>
        <li className={location.pathname === '/about' ? 'active' : ''}>
          <Link to="/about">About</Link>
        </li>
        <li className={location.pathname === '/help' ? 'active' : ''}>
          <Link to="/help">Help</Link>
        </li>
        
        {/* Profile Dropdown */}
        <div className="profile-dropdown-container">
          <button 
            className="profile-btn" 
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <img src="https://png.pngtree.com/png-clipart/20200224/original/pngtree-avatar-icon-profile-icon-member-login-vector-isolated-png-image_5247852.jpg" alt="Profile" className="profile-icon" />
          </button>
          {dropdownOpen && (
            <div className="profile-dropdown">
              <ul>
                 <li className={location.pathname === '/student/dashboard' ? 'active' : ''}>
                  <Link to="/student/dashboard">Dashboard</Link>
                </li>
                <li className={location.pathname === '/profile' ? 'active' : ''}>
                  <Link to="/profile">Profile</Link>
                </li>
                <li className={location.pathname === '/transcript' ? 'active' : ''}>
                  <Link to="/transcript">Send Transcript</Link>
                </li>
                <li className={location.pathname === '/settings' ? 'active' : ''}>
                  <Link to="/settings">Settings</Link>
                </li>
                <li className={location.pathname === '/' ? 'active' : ''}>
                  <Link to="/">Sign Out</Link>
                </li>
              </ul>
            </div>
          )}
        </div>
      </ul>
    </nav>
  );
}

export default NavBar;
