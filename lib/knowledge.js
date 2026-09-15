/**
 * Knowledge Engine & Personal Profile Database for NAD JARVIS
 * Source: mock-responses.txt & personal engineering / creative blueprints
 * Used to ground the AI model with rich personal context & RAG retrieval.
 */

const PERSONAL_KNOWLEDGE_BASE = {
  identity: {
    fullName: "Nadjibullah Uwabato",
    nickname: "Nad",
    brand: "NAD / NAD PRODUCTION / IAM NAD",
    location: "Kigali, Rwanda",
    partner: "Orchid",
    faith: "Muslim. Goal: Memorize the Quran. Disciplined daily worship (Tahajjud, 5 daily prayers, Quran recitation/murajaah, Adhkar, Istighfar, Jummah).",
    hardware: "GMKtec mini PC configured as custom manager view development environment."
  },
  education: {
    degree: "Final-year Bachelor of Science in Mechanical Engineering",
    institution: "University of Rwanda, College of Science and Technology (UR CST), Kigali",
    specialization: "Production Engineering",
    capstone: "Design and Simulation of a Solar-Assisted Electric Vehicle (SAEV) — 7-chapter comprehensive report utilizing local Rwandan meteorological data for vehicle dynamics, Simscape, and solar sizing.",
    tools: ["SolidWorks", "MATLAB", "Simulink", "Simscape", "Kinematic Modelling", "GrabCAD", "Solar Power Systems"]
  },
  experience: {
    currentRole: "Operations Manager at KSP Rwanda, Kigali",
    previousRole: "Founder, CEO & Managing Director of NAD PRODUCTION Ltd, Kigali (initiated formal RDB business closure to focus on final-year UR engineering studies)."
  },
  skills: {
    fullStack: ["Node.js", "Supabase", "PostgreSQL", "Vercel", "React", "HTML/CSS/JS", "Python"],
    approach: "Vibe coding — accelerating development by building real products fast with AI assistance rather than traditional syntax-first learning."
  },
  aiJourney: {
    selfBuiltProducts: [
      { name: "NAD JARVIS AI", desc: "Private Personal AI Assistant System built exclusively for Nad." },
      { name: "TRADIT AI", desc: "Original AI platform product designed and shipped by Nad." },
      { name: "INK LINK AI", desc: "Original AI platform product designed and shipped by Nad." }
    ]
  },
  filmmaking: {
    tools: ["Adobe Premiere Pro", "After Effects", "DaVinci Resolve", "Blender"],
    projects: [
      "URUMURI STUDIOS — 'GAJU' short film & official trailer",
      "OMNITALES HUB — 6-week faceless video production strategy with generative AI",
      "GET BETTER PODCAST — full platform with audio, video, blogs, admin studio, and upload system",
      "United Gen. Basketball — administrative script, video prototype, shot list, and pitch platform"
    ],
    ambition: "Researching international fellowships and MFA programs in Film Production for Fall 2027 admissions cycle."
  },
  designTaste: {
    theme: "Glassmorphism, deep black backgrounds (#000000) with white & gold specular accents, space/atom motifs, animated backgrounds, Three.js woven light."
  },
  sprint: {
    title: "5-Month Intensive Execution Sprint",
    period: "July 1, 2026 – November 30, 2026",
    goal: "Dedicated to mastering advanced software frameworks and post-production suites."
  },
  longTermVision: "To become a multidisciplinary creator who combines engineering, AI, filmmaking, and software development to build products, tell powerful stories, and create companies that have an impact in Africa and beyond.",
  weeklySchedule: {
    weekStart: "Saturday",
    weekEnd: "Friday",
    dailyRhythm: {
      wakeUp: "04:00 AM — Tahajjud Prayer",
      morningWorship: "04:30 AM — Fajr Prayer + Quran Recitation | 05:30 AM — Adhkar",
      saturdaySunday: "Morning: Digital Literacy | Afternoon: Filmmaking",
      mondayWednesday: "Morning: Filmmaking | Late Morning: ZAD Academy | Afternoon: Documentation & Software Development",
      thursday: "Morning: Filmmaking & ZAD Academy | Afternoon: Dev | 18:00 Script Writing | 19:00 Adhkar | 19:30 Isha",
      friday: "Morning: Quran Murajaah & Istighfar | Midday: Jummah Prayer | 13:30 Family Time | 16:00 Editing & Social Accounts | 20:00 Break"
    }
  }
};

function generateSystemPrompt(ragContext = '') {
  return `You are NAD JARVIS, the ultra-capable, loyal, and proactive personal AI assistant built exclusively for Nad (Nadjibullah Uwabato).
Owner Profile:
- Full Name: ${PERSONAL_KNOWLEDGE_BASE.identity.fullName} ("Nad"), living in ${PERSONAL_KNOWLEDGE_BASE.identity.location}.
- Faith: ${PERSONAL_KNOWLEDGE_BASE.identity.faith}
- Education: ${PERSONAL_KNOWLEDGE_BASE.education.degree} at ${PERSONAL_KNOWLEDGE_BASE.education.institution}. Capstone: "${PERSONAL_KNOWLEDGE_BASE.education.capstone}".
- Current Work: ${PERSONAL_KNOWLEDGE_BASE.experience.currentRole}.
- Creative & Film: ${PERSONAL_KNOWLEDGE_BASE.filmmaking.projects.join('; ')}. Target MFA Film Production Fall 2027.
- AI Platforms Created: ${PERSONAL_KNOWLEDGE_BASE.aiJourney.selfBuiltProducts.map(p => `${p.name} (${p.desc})`).join(', ')}.
- Weekly Schedule: Week runs Saturday to Friday. Tahajjud at 04:00 AM, Fajr at 04:30 AM, Friday Jummah.
- 5-Month Sprint: ${PERSONAL_KNOWLEDGE_BASE.sprint.period} (${PERSONAL_KNOWLEDGE_BASE.sprint.goal}).
- Vision: "${PERSONAL_KNOWLEDGE_BASE.longTermVision}"

Behavioral Rules:
1. Speak with quiet confidence, concise intelligence, and high respect. Address him warmly as "Nad" or "Sir".
2. You are strictly a private assistant for Nad. Never assume multi-user or public usage.
3. Be direct, clear, and proactive. When planning or scheduling, align with his spiritual commitments (Tahajjud, prayers, Friday Jummah) and execution sprint.
${ragContext ? `\n--- Retrieved Documents & Knowledge ---\n${ragContext}\n` : ''}`;
}

module.exports = {
  PERSONAL_KNOWLEDGE_BASE,
  generateSystemPrompt
};
