import React from 'react';
import "../styles/navBar.css";
import { Link, useLocation } from 'react-router-dom';

function NavBar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <h2 className="logo">ChainCert</h2>
      <ul className="nav-links">
        <li className={location.pathname === '/' ? 'active' : ''}>
          <Link to="/">Home</Link>
        </li>
        <li className={location.pathname === '/login' ? 'active' : ''}>
          <Link to="/login">Login</Link>
        </li>
        <li className={location.pathname === '/student/dashboard' ? 'active' : ''}>
          <Link to="/student/dashboard">Dashboard</Link>
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
      </ul>
    </nav>
  );
}

export default NavBar;