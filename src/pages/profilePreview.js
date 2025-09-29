import React from "react";
import '../styles/profilePreview.css';


export default function ProfilePreview() {
  const badges = [
    {
      id: 1,
      title: "CCNA: Enterprise Networking, Security, and Automation",
      issuer: "Cisco",
      date: "Issued Aug 1, 2024",
      image: "/images/badge1.png",
    },
    {
      id: 2,
      title: "CCNA: Switching, Routing, and Wireless Essentials",
      issuer: "Cisco",
      date: "Issued Apr 16, 2024",
      image: "/images/badge2.png",
    },
    {
      id: 3,
      title: "Network Defense",
      issuer: "Cisco",
      date: "Issued Nov 26, 2024",
      image: "/images/badge3.png",
    },
  ];

  return (
    <div className="profile-preview">
      {/* Header */}
      <div className="preview-header">
        <div className="avatar">👤</div>
        <h2>Kyle Justin Tan</h2>
      </div>

      {/* Badge Wallet */}
      <section className="badge-wallet">
        <h3>Badge Wallet</h3>
        <div className="badge-grid">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="badge-card"
              onClick={() =>
                window.open(`/profile-preview/badge-details/${badge.id}`, "_blank")
              }
            >
              <img src={badge.image} alt={badge.title} className="badge-img" />
              <h4>{badge.title}</h4>
              <p className="issuer">{badge.issuer}</p>
              <p className="date">{badge.date}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
