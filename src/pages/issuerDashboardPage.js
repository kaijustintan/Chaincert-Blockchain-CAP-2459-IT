import React, { useState } from "react";
import "../styles/issuerDashboardPage.css";

export default function IssuerDashboardPage() {
  const [templates, setTemplates] = useState([
    { id: 1, name: "Fundamentals of Ruby on Rails", state: "Published", updated: "1 Aug 2023", issued: 8 },
    { id: 2, name: "Javascript Fundamentals", state: "Published", updated: "17 Jul 2023", issued: 22 },
    { id: 3, name: "Analyze Data with Python", state: "Published", updated: "1 May 2023", issued: 20 },
    { id: 4, name: "Trusted Partner - Reseller", state: "Published", updated: "1 May 2023", issued: 2 },
  ]);

  return (
    <div className="issuer-dashboard">
      <h2>Credential Templates</h2>
      <div className="dashboard-header">
        <div className="tabs">
          <button className="active">Templates</button>
          <button>Earners</button>
          <button>Recommendations</button>
          <button>Collections</button>
          <button>Issue</button>
        </div>
        <button className="create-btn">+ Import Template/Credential</button>
      </div>

      <table className="template-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>State</th>
            <th>Updated</th>
            <th>Issued</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id}>
              <td>{template.name}</td>
              <td>{template.state}</td>
              <td>{template.updated}</td>
              <td>{template.issued}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
