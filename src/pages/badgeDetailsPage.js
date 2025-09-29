import React from "react";
import { useNavigate, useParams } from "react-router-dom";  // ✅ import hooks
import '../styles/badgeDetailsPage.css';

export default function BadgeDetailsPage() {
  const { id } = useParams();         // ✅ get badge id from URL
  const navigate = useNavigate();     // ✅ for navigation

  // Example badges (later fetch from API or shared data)
  const allBadges = {
    1: {
      title: "CCNA: Enterprise Networking, Security, and Automation",
      issuer: "Cisco",
      issuedTo: "Kyle Justin Tan",
      issuedDate: "August 1, 2024",
      description: "Cisco verifies the earner of this badge successfully.",
      image: "/images/badge1.png",
      skills: ["Networking Basics", "Security", "Automation"],
    },
    2: {
      title: "CCNA: Switching, Routing, and Wireless Essentials",
      issuer: "Cisco",
      issuedTo: "Kyle Justin Tan",
      issuedDate: "April 16, 2024",
      description:
        "Cisco verifies the earner of this badge successfully completed the Switching, Routing, and Wireless Essentials course and achieved this student-level credential. The earner has a foundation in switching operations, wired and wireless LAN configuration using security best practices, redundancy protocols, and developed problem-solving skills.",
      image: "/images/badge2.png",
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
    },
    3: {
      title: "Network Defense",
      issuer: "Cisco",
      issuedTo: "Kyle Justin Tan",
      issuedDate: "November 26, 2024",
      description: "Cisco certifies knowledge in Network Defense strategies.",
      image: "/images/badge3.png",
      skills: ["Firewall", "IDS/IPS", "Cyber Defense"],
    },
  };

  const badge = allBadges[id];

  if (!badge) {
    return <h2 style={{ padding: "20px" }}>Badge not found</h2>;
  }

  return (
    <div className="badge-details-page">
      {/* Header */}
      <div className="details-header">
        <p>
          This badge was issued to <strong>{badge.issuedTo}</strong> |{" "}
          <span>Date issued: {badge.issuedDate}</span>
        </p>
        <div className="actions">
          {/* ✅ Share button redirects to shareCredentialPage */}
          <button
            className="share-btn"
            onClick={() => navigate(`/share-credential/${id}`)}
          >
            Share
          </button>
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
