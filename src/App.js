import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProtectedRoutes from './components/protectedRoutes';
import AdminProtectedRoute from './components/adminProtectedRoutes';

// Import pages/components
import LandingHomePage from './pages/landingHomePage';
import LoginPage from './pages/loginPage';
import StudentDashboard from './pages/studentDashboard';
import AdminDashboard from './pages/adminDashboard';
import VerifierDashboard from './pages/verifierDashboard';
import IssuerDashboard from './pages/issuerDashboardPage';
import AboutPage from './pages/aboutUsPage';
import HelpPage from './pages/helpPage';
import ForgotPassword from './pages/forgotPassword';
import CreateAccount from './pages/createAccount';
import Navbar from './components/navBar_User';
import Footer from './components/footer';
import SettingsPage from './pages/settingsPage';
import ProfilePage from './pages/profilePage';
import ProfilePreview from './pages/profilePreview';
import IssuerDirectory from './pages/issuerDirectory';
import BadgeDetailsProfilePreviewPage from './pages/BadgeDetailsProfilePreviewPage';
import CredentialHistoryPage from './pages/credentialHistoryPage';
import WelcomeModal from './components/welcomeModal';

import './styles/App.css';

// ✅ Define component BEFORE App function
const UnauthorizedPage = () => (
  <div style={{ textAlign: 'center', padding: '50px' }}>
    <h1>Access Denied</h1>
    <p>You don't have permission to access this page.</p>
    <a href="/">Go back to Home</a>
  </div>
);

// Routed content with a subtle cross-page fade. Opacity-only (no transform) so it
// never creates a containing block/stacking context that would dislodge fixed modals.
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <motion.div
      className="app-content"
      key={location.pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      <Routes>
        {/* ========== PUBLIC ROUTES ========== */}
        <Route path="/" element={<LandingHomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<CreateAccount />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verifier/dashboard" element={<VerifierDashboard />} />
        <Route path="/directory" element={<IssuerDirectory />} />
        <Route path="/profile-preview" element={<ProfilePreview />} />
        <Route path="/profile/:token" element={<ProfilePreview />} /> {/* - polo: public share link route */}

        {/* ========== PROTECTED ROUTES (User/Issuer/Student) ========== */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/issuer/dashboard" element={<IssuerDashboard />} />
          <Route path="/issuer/history" element={<CredentialHistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile-preview/badge-details/:id" element={<BadgeDetailsProfilePreviewPage />} />
          {/* REMOVED: /share-credential/:id -> ShareCredentialPage.
              It was a reachable authenticated route rendering a hardcoded mockup — three Cisco CCNA
              badges keyed 1/2/3, dead `href="#"` links, and seven share buttons with no handlers.
              Any real credential id rendered "Badge not found", so it could only ever show another
              company's branding. Real sharing lives in the profile share-link flow. */}
        </Route>

        {/* ========== ADMIN-ONLY ROUTES ========== */}
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

        {/* ========== ERROR ROUTES ========== */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* ========== CATCH-ALL (undefined routes) ========== */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </motion.div>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <AnimatedRoutes />
        <Footer />
        <WelcomeModal />
      </div>
    </Router>
  );
}

export default App;
