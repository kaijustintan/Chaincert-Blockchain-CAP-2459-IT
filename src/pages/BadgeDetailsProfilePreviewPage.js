import React from "react";
import '../styles/badgeDetailsPage.css';

export default function BadgeDetails_ProfilePreviewPage() {
  // Later you can fetch this from props, params, or API
  const badge = {
    title: "CCNA: Switching, Routing, and Wireless Essentials",
    issuer: "Cisco",
    issuedTo: "Kyle Justin Tan",
    issuedDate: "April 16, 2024",
    description:
      "Cisco verifies the earner of this badge successfully completed the Switching, Routing, and Wireless Essentials course and achieved this student-level credential. The earner has a foundation in switching operations, wired and wireless LAN configuration using security best practices, redundancy protocols, and developed problem-solving skills. Earners participated in up to 45 practice activities and accumulated up to 21 hours of hands-on labs using Cisco hardware and/or the Cisco Packet Tracer tool.",
    image: "/images/badge2.png", // replace with actual path
    skills: [
      "Access Connectivity",
      "Access Security",
      "First-hop Redundancy",
      "High Availability",
      "IP Services",
      "Routing",
      "Switching Protocols",
      "Wireless LAN Controllers",
    ],
  };

  return (
    <div className="badge-details-page">
      {/* Header */}
      <div className="details-header">
        <p>
          This badge was issued to <strong>{badge.issuedTo}</strong> |{" "}
          <span>Date issued: {badge.issuedDate}</span>
        </p>
        <div className="actions">
          <button className="verify-btn">Verify</button>
          <button className="more-btn">⋮</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="details-body">
        <div className="badge-left">
          <img src={badge.image} alt={badge.title} className="big-badge" />
        </div>
        <div className="badge-right">
          <h2>{badge.title}</h2>
          <p>
            Issued by <a href="#">{badge.issuer}</a>
          </p>
          <p className="description">{badge.description}</p>
          <a href="#" className="learn-more">
            Learn more
          </a>

          <h3>Skills</h3>
          <div className="skills-list">
            {badge.skills.map((skill, index) => (
              <span key={index} className="skill-chip">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
