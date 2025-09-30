import React, { useState } from "react";
import "../styles/issuerDashboardPage.css";

export default function IssuerDashboardPage() {
  const [selectedTab, setSelectedTab] = useState("Templates");

  const [templates, setTemplates] = useState([
    { id: 1, name: "Fundamentals of Ruby on Rails", state: "Published", updated: "1 Aug 2023", issued: 8 },
    { id: 2, name: "Javascript Fundamentals", state: "Published", updated: "17 Jul 2023", issued: 22 },
    { id: 3, name: "Analyze Data with Python", state: "Pending", updated: "1 May 2023", issued: 20 },
    { id: 4, name: "Trusted Partner - Reseller", state: "Revoked", updated: "1 May 2023", issued: 2 },
  ]);

  const [earners, setEarners] = useState([
    { id: 1, name: "Juan Tutri", credential: "Fundamentals of Ruby on Rails", issued: "1 Aug 2023" },
    { id: 2, name: "Claudine Co", credential: "Javascript Fundamentals", issued: "17 Jul 2023" },
    { id: 3, name: "Mike Rofone", credential: "Analyze Data with Python", issued: "1 May 2023" },
  ]);

  const [recommendations, setRecommendations] = useState([
    { id: 1, name: "Josh Kopo", suggestedCredential: "Analyze Data with Python" },
    { id: 2, name: "John Kalong", suggestedCredential: "Fundamentals of Ruby on Rails" },
  ]);

  const [collections, setCollections] = useState([
    { id: 1, name: "Data Science Collection", description: "A collection of credentials related to data science" },
    { id: 2, name: "Web Development Collection", description: "A collection for web development credentials" },
  ]);

  const [issue, setIssue] = useState([
    { id: 1, task: "Issue AWS Cloud Practitioner Credential", status: "Pending" },
    { id: 2, task: "Reissue JavaScript Fundamentals", status: "Issued" },
  ]);

  return (
    <div className="issuer-dashboard">
      <h2>Credential Templates</h2>
      <div className="dashboard-header">
        <div className="tabs">
          {["Templates", "Earners", "Recommendations", "Collections", "Issue"].map((tab) => (
            <button
              key={tab}
              className={selectedTab === tab ? "active" : ""}
              onClick={() => setSelectedTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        {selectedTab === "Templates" && (
          <button className="create-btn">+ Import Template/Credential</button>
        )}
      </div>

      {/* Conditional Content Rendering */}
      {selectedTab === "Templates" && (
        <table className="template-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>State</th>
              <th>Updated</th>
              <th>Issued</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr key={template.id}>
                <td>{template.name}</td>
                <td>
                  <span className={`status-pill ${template.state}`}>{template.state}</span>
                </td>
                <td>{template.updated}</td>
                <td>{template.issued}</td>
                <td>
                  <button className="action-btn">View</button>
                  <button className="action-btn">Edit</button>
                  <button className="action-btn">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedTab === "Earners" && (
        <table className="template-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Credential</th>
              <th>Issued Date</th>
            </tr>
          </thead>
          <tbody>
            {earners.map((earner) => (
              <tr key={earner.id}>
                <td>{earner.name}</td>
                <td>{earner.credential}</td>
                <td>{earner.issued}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedTab === "Recommendations" && (
        <table className="template-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Suggested Credential</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((rec) => (
              <tr key={rec.id}>
                <td>{rec.name}</td>
                <td>{rec.suggestedCredential}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedTab === "Collections" && (
        <div className="collection-cards">
          {collections.map((col) => (
            <div key={col.id} className="collection-card">
              <h4>{col.name}</h4>
              <p>{col.description}</p>
              <button className="action-btn">View Collection</button>
            </div>
          ))}
        </div>
      )}

      {selectedTab === "Issue" && (
        <table className="template-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {issue.map((task) => (
              <tr key={task.id}>
                <td>{task.task}</td>
                <td>
                  <span className={`status-pill ${task.status}`}>{task.status}</span>
                </td>
                <td>
                  <button className="action-btn">Approve</button>
                  <button className="action-btn">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
