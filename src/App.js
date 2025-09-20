import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';  // Correct import

// Import pages/components
import LandingHomePage from './pages/landingHomePage';
import LoginPage from './pages/loginPage';
import StudentDashboard from './pages/studentDashboard';
import AdminDashboard from './pages/adminDashboard';
import VerifierDashboard from './pages/verifierDashboard';
import CredentialDetails from './pages/credentialDetails';
import AboutPage from './pages/aboutUsPage';
import HelpPage from './pages/helpPage';
import Navbar from './components/navBar';

import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          {/* Ensure all components are used in Routes */}
          <Route path="/" element={<LandingHomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/verifier/dashboard" element={<VerifierDashboard />} />
          <Route path="/credential/details" element={<CredentialDetails />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
