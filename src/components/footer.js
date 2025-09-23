// Footer.js
import React from "react";
import "../styles/footer.css"; // Create this CSS file
import "@fortawesome/fontawesome-free/css/all.min.css"; // Import FontAwesome CSS


const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>ChainCert</h3>
          <p>Fast Blockchain • AI-powered Security • Scalable Solutions</p>
        </div>

        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#hero">Home</a></li>
            <li><a href="#services">Services</a></li>
            <li><a href="#roadmap">Roadmap</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Contact</h4>
          <p>Email: info@chaincert.com</p>
          <p>Phone: +63 912 345 6789</p>
        </div>

        <div className="footer-section">
          <h4>Follow Us</h4>
          <div className="social-icons">
            <a href="#"><i className="fab fa-facebook-f"></i></a>
            <a href="#"><i className="fab fa-twitter"></i></a>
            <a href="#"><i className="fab fa-linkedin-in"></i></a>
            <a href="#"><i className="fab fa-github"></i></a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2025 ChainCert. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
