import React, { useState } from "react";
import "../styles/transcript.css"; // Importing the styles

export default function Transcript() {
  const [searchQuery, setSearchQuery] = useState("");

  // Sample data for the transcript
  const transcriptData = [
    {
      id: 1,
      section: "Introduction",
      content: "Welcome to the transcript. This is the introduction section.",
    },
    {
      id: 2,
      section: "Lecture 1",
      content:
        "In this lecture, we discuss the fundamentals of React and JavaScript.",
    },
    {
      id: 3,
      section: "Lecture 2",
      content:
        "This lecture covers advanced concepts like hooks, context API, and state management.",
    },
    {
      id: 4,
      section: "Conclusion",
      content: "In conclusion, we've covered the essential topics of React.",
    },
  ];

  // Filtering the transcript based on search query
  const filteredData = transcriptData.filter((entry) =>
    entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="transcript-wrapper">
      <h1>Transcript</h1>

      {/* Search bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search Transcript..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Transcript Sections */}
      <div className="transcript-content">
        {filteredData.length === 0 ? (
          <p>No matching content found.</p>
        ) : (
          filteredData.map((item) => (
            <div key={item.id} className="transcript-section">
              <h2>{item.section}</h2>
              <p>{item.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
