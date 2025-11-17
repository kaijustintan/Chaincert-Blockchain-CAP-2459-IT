// Shared badge data - used across multiple pages
// This ensures consistency between shareCredentialPage, badgeDetailsPage, etc.

export const allBadges = {
  1: {
    title: "CCNA: Enterprise Networking, Security, and Automation",
    issuer: "Cisco",
    issuedTo: "Kyle Justin Tan",
    issuedDate: "August 1, 2024",
    description: "Cisco verifies the earner of this badge successfully completed the Enterprise Networking, Security, and Automation course and achieved this student-level credential. The earner has demonstrated proficiency in enterprise networking concepts, security protocols, and network automation techniques.",
    image: "🎓",
    skills: ["Networking Basics", "Security", "Automation"],
  },
  2: {
    title: "CCNA: Switching, Routing, and Wireless Essentials",
    issuer: "Cisco",
    issuedTo: "Kyle Justin Tan",
    issuedDate: "April 16, 2024",
    description:
      "Cisco verifies the earner of this badge successfully completed the Switching, Routing, and Wireless Essentials course and achieved this student-level credential. The earner has a foundation in switching operations, wired and wireless LAN configuration using security best practices, redundancy protocols, and developed problem-solving skills.",
    image: "🌐",
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
    description: "Cisco certifies knowledge in Network Defense strategies. The earner has demonstrated understanding of firewall configurations, intrusion detection and prevention systems, and cyber defense methodologies.",
    image: "🛡️",
    skills: ["Firewall", "IDS/IPS", "Cyber Defense"],
  },
};

// Helper function to get badge by ID
export const getBadgeById = (id) => {
  return allBadges[id] || null;
};

