// landingHomePage.js
import "../styles/landingHomePage.css";


function LandingHomePage() {
  return (
    <div className="landing-container">
      <div className="hero">
        <h1>
          <span className="highlight">The New Standard for Verifiable Trust</span> <br />
        </h1>
        <p>
          ChainCert solves these problems by anchoring every credential to a tamper-proof, 
          permissioned Hyperledger Fabric blockchain. Every degree, certificate, or micro-credential 
          becomes a secure, verifiable digital asset that employers and institutions can trust instantly.
        </p>
        <div className="buttons">
          <button className="btn primary">Get Started</button>
          <button className="btn secondary">Ecosystems</button>
        </div>
      </div>

      <div className="background-lines"></div>
    </div>
  );
}

export default LandingHomePage;
