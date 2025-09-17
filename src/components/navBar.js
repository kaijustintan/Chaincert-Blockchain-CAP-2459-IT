// Navbar.js (Example)
import React from 'react';
import "../styles/navBar.css"; // Correct import for navBar styles

import { Link } from 'react-router-dom';

// NOT ALL HERE WILL BE INCLUDED IN THE FINAL FILE, NILAGAY KO LANG DYAN PARA MATEST KO YUNG ROUTING/NAVIGATION NG PAGES 

function NavBar() {
  return (
     <nav className="navbar">
            <h2 className="logo">ChainCert</h2>
            <ul className="nav-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/student/dashboard">Dashboard</Link></li>
              <li><Link to="/admin/dashboard">Admin Dashboard</Link></li>
              <li><Link to="/verifier/dashboard">Verifier Dashboard</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/help">Help</Link></li>
            </ul>
      </nav>
  );
}

export default NavBar;
