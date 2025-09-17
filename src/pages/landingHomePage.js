// landingHomePage.js
import React from "react";
import "../styles/landingHomePage.css";
// import NavBar from "../components/navBar"; // Use correct casing

import { Link } from 'react-router-dom';




function LandingHomePage() {
  return (
    <div className="landing-container">

      <div className="hero">
        <h1>
          <span className="highlight">A Fast Blockchain.</span> <br />
          <span className="scalable">Scalable AI.</span>
        </h1>
        <p>
          Our technology performing fast blockchain (120K TPS) and it has
          guaranteed AI-based data security. Proof of Stake, its consensus
          algorithm enables unlimited speeds.
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
