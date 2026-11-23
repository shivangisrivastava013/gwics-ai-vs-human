// DEDICATED PRACTICE BANK (Completely distinct from live competition questions)
// Zero overlap with competition media, literature, or audio.
window.GWICS_PRACTICE_BANK = [
  {
    id: "prac_01",
    type: "image",
    roundName: "Practice · Visual Turing Test",
    title: "Antique Mechanical Movement",
    prompt: "Observe the gears, micro-screws, and ruby bearing jewels. Real photograph or AI-generated?",
    media: "assets/media/practice_01.jpg",
    options: [
      { id: "HUMAN", label: "👤 REAL PHOTOGRAPH" },
      { id: "AI", label: "🤖 AI GENERATED" }
    ],
    hint: "Inspect the micro-screw slots, authentic metallic tool marks, and concentric gear teeth symmetry.",
    ans: "HUMAN",
    tell: "Every gear tooth is physically machined with genuine metallic grain, authentic ruby bearing jewels, and consistent light reflection."
  },
  {
    id: "prac_02",
    type: "image",
    roundName: "Practice · Visual Turing Test",
    title: "Prismatic Crystal Spires",
    prompt: "Observe the floating crystal architecture. Real macro photograph or AI digital generation?",
    media: "assets/media/practice_02.jpg",
    options: [
      { id: "HUMAN", label: "👤 REAL PHOTOGRAPH" },
      { id: "AI", label: "🤖 AI GENERATED" }
    ],
    hint: "Check the vanishing points of the geometric edges and look for impossible floating light anomalies.",
    ans: "AI",
    tell: "The perspective vanishing points conflict across horizontal lines, and the geometric spires exhibit floating physics typical of generative synthesis."
  },
  {
    id: "prac_03",
    type: "text",
    roundName: "Practice · Literary Duel",
    title: "Resilience & The Human Spirit",
    prompt: "Which passage was authored by artificial intelligence?",
    passageA: "You may write me down in history\nWith your bitter, twisted lies,\nYou may trod me in the very dirt\nBut still, like dust, I'll rise.",
    passageB: "You may cast a shadow on my name\nWith words that seek to bind,\nYou may scatter ashes in the wind\nYet strength is what I'll find.",
    options: [
      { id: "A", label: "Passage A is AI" },
      { id: "B", label: "Passage B is AI" }
    ],
    hint: "One passage features fierce, rhythmic, defiant vernacular; the other settles for passive rhyming filler.",
    ans: "B",
    tell: "Passage B is AI. Passage A is Maya Angelou's legendary 1978 poem 'Still I Rise'. Angelou's gritty, defiant cadence contrasts sharply with the AI's safe, generic phrasing."
  },
  {
    id: "prac_04",
    type: "audio",
    roundName: "Practice · Sound Check",
    title: "Acoustic Chime & Vocal Cadence",
    prompt: "Listen to the test frequency sequence. Is this an authentic acoustic instrument recording or a digital synthesizer?",
    audioUrl: "assets/audio/practice_audio.wav",
    transcript: "“Two-tone acoustic test sequence with exponential decay reverberation.”",
    audioAccessibilityNotes: "Acoustic cues: Pure harmonic sine wave oscillation, uniform decay envelope, studio zero-noise floor.",
    options: [
      { id: "HUMAN", label: "👤 ACOUSTIC RECORDING" },
      { id: "AI", label: "🤖 DIGITAL SYNTHESIS" }
    ],
    hint: "Listen to whether the sound contains room ambient noise or if the frequency is mathematically sterile.",
    ans: "AI",
    tell: "The audio is a mathematically pure algorithmic harmonic synthesis, lacking any room air friction or microphone preamp saturation."
  }
];
