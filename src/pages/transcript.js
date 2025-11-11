import React, { useState } from "react";
import "../styles/transcript.css";

export default function Transcript() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSection, setExpandedSection] = useState(null);

  // Enhanced sample data with more details
  const transcriptData = [
    {
      id: 1,
      section: "Introduction",
      icon: "🎓",
      content: "Welcome to the transcript. This is the introduction section.",
      duration: "5 min",
      date: "Jan 15, 2025",
      topics: ["Overview", "Goals"],
    },
    {
      id: 2,
      section: "Lecture 1",
      icon: "⚛️",
      content:
        "In this lecture, we discuss the fundamentals of React and JavaScript.",
      duration: "45 min",
      date: "Jan 16, 2025",
      topics: ["React Basics", "JavaScript ES6", "Components"],
    },
    {
      id: 3,
      section: "Lecture 2",
      icon: "🔧",
      content:
        "This lecture covers advanced concepts like hooks, context API, and state management.",
      duration: "60 min",
      date: "Jan 17, 2025",
      topics: ["Hooks", "Context API", "State Management"],
    },
    {
      id: 4,
      section: "Conclusion",
      icon: "✨",
      content: "In conclusion, we've covered the essential topics of React.",
      duration: "10 min",
      date: "Jan 18, 2025",
      topics: ["Summary", "Next Steps"],
    },
  ];

  const filteredData = transcriptData.filter(
    (entry) =>
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.section.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSection = (id) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="transcript-page">
      <div className="transcript-container">
        {/* Header Section */}
        <div className="transcript-header">
          <div className="header-content">
            <span className="header-icon">📄</span>
            <h1>Academic Transcript</h1>
            <p className="subtitle">Complete course materials and lecture notes</p>
          </div>
          
          <div className="stats-row">
            <div className="stat-card">
              <span className="stat-icon">📚</span>
              <span className="stat-value">{transcriptData.length}</span>
              <span className="stat-label">Sections</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">⏱️</span>
              <span className="stat-value">2h</span>
              <span className="stat-label">Total Time</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon">✅</span>
              <span className="stat-value">100%</span>
              <span className="stat-label">Complete</span>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <div className="search-bar-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search lectures, topics, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="clear-btn"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="search-results-count">
              Found {filteredData.length} {filteredData.length === 1 ? 'result' : 'results'}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="transcript-content">
          {filteredData.length === 0 ? (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <h3>No matching content found</h3>
              <p>Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="sections-grid">
              {filteredData.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`section-card ${expandedSection === item.id ? 'expanded' : ''}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div 
                    className="section-header"
                    onClick={() => toggleSection(item.id)}
                  >
                    <div className="section-title-row">
                      <span className="section-icon">{item.icon}</span>
                      <div className="section-info">
                        <h2>{item.section}</h2>
                        <div className="section-meta">
                          <span className="meta-item">
                            <span className="meta-icon">📅</span>
                            {item.date}
                          </span>
                          <span className="meta-item">
                            <span className="meta-icon">⏱️</span>
                            {item.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="expand-btn">
                      {expandedSection === item.id ? '−' : '+'}
                    </button>
                  </div>

                  <div className="section-preview">
                    <p>{item.content}</p>
                  </div>

                  {expandedSection === item.id && (
                    <div className="section-details">
                      <div className="topics-section">
                        <h3>📌 Key Topics</h3>
                        <div className="topics-list">
                          {item.topics.map((topic, idx) => (
                            <span key={idx} className="topic-tag">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div className="actions-section">
                        <button className="action-btn primary">
                          <span>📖</span> View Full Notes
                        </button>
                        <button className="action-btn secondary">
                          <span>⬇️</span> Download PDF
                        </button>
                        <button className="action-btn secondary">
                          <span>🔗</span> Share
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="transcript-footer">
          <button className="footer-btn">
            <span>📥</span> Download Complete Transcript
          </button>
          <button className="footer-btn">
            <span>📧</span> Email to Myself
          </button>
          <button className="footer-btn">
            <span>🖨️</span> Print Transcript
          </button>
        </div>
      </div>
    </div>
  );
}