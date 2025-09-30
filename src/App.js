import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';  // Correct import

// Import pages/components
import LandingHomePage from './pages/landingHomePage';
import LoginPage from './pages/loginPage';
import StudentDashboard from './pages/studentDashboard';
import AdminDashboard from './pages/adminDashboard';
import VerifierDashboard from './pages/verifierDashboard';
import IssuerDashboard from './pages/issuerDashboardPage';
import CredentialDetails from './pages/credentialDetails';
import AboutPage from './pages/aboutUsPage';
import HelpPage from './pages/helpPage';
import ForgotPassword from './pages/forgotPassword';
import CreateAccount from './pages/createAccount'
import Navbar from './components/navBar_User';
import Footer from './components/footer';
import SettingsPage from './pages/settingsPage';
import ProfilePage from './pages/profilePage';
import ProfilePreview from './pages/profilePreview';
import BadgeDetails from './pages/badgeDetailsPage';
import BadgeDetails_ProfilePreviewPage from './pages/badgeDetails_profilePreviewPage';
import ShareCredentialPage from './pages/shareCredentialPage';







import './styles/App.css';
import Transcript from './pages/transcript';

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
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<CreateAccount />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/transcript" element={<Transcript />} />
          <Route path="/profile-preview" element={<ProfilePreview />} />
+         <Route path="/badge-details/:id" element={<BadgeDetails />} />
          <Route path="/profile-preview/badge-details/:id" element={<BadgeDetails_ProfilePreviewPage />} />
          <Route path="/share-credential/:id" element={<ShareCredentialPage />} />
          <Route path="/issuer/dashboard" element={<IssuerDashboard />} />
          

        </Routes>
        
        <Footer />

      </div>
    </Router>
  );
}

export default App;
