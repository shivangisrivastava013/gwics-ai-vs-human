// GWiCS: AI vs Human Showdown Event Data
window.GWICS_EVENT_DATA = {
  "event": {
    "title": "AI vs Human",
    "subtitle": "The Ultimate Collegiate Showdown",
    "host": "GWiCS (Graduate Women in Computing Sciences)",
    "hostShort": "GWiCS @ NJIT",
    "institution": "New Jersey Institute of Technology",
    "location": "Campus Center Ballroom & Live Stream",
    "address": "150 Bleeker Street, Newark, NJ 07102",
    "date": "Friday, December 5, 2026",
    "time": "6:00 PM – 8:30 PM EST",
    "doorsOpen": "5:45 PM EST · Free Pizza & Refreshments",
    "tagline": "Can your table tell the machine from the mind?",
    "description": "An electrifying evening of deception, deduction, and technology hosted by GWiCS. Compete across 4 high-stakes rounds testing your ability to spot AI-generated imagery, literary mimicry, voice synthesis, and a live prompt battle against large language models.",
    "stats": [
      { "value": "4", "label": "Rounds of Battle" },
      { "value": "25", "label": "Mystery Challenges" },
      { "value": "1", "label": "Live LLM Duel" },
      { "value": "$500+", "label": "Prizes & Swag" }
    ]
  },
  "rounds": [
    {
      "number": 1,
      "id": "round1",
      "title": "Real or AI?",
      "subtitle": "The Visual Turing Test",
      "badge": "10 Images",
      "points": "1 point per correct table vote",
      "format": "Hold up HUMAN or AI card",
      "description": "Examine 10 photographs up close. Look for anatomical anomalies, impossible lighting, repeating geometric noise, garbled typography, or physics-defying backgrounds.",
      "items": [
        {
          "id": "i1",
          "ans": "AI",
          "what": "Crowded campus walkway with signs and posters",
          "tell": "The text on the signs and bulletin board flyers is garbled, unreadable pseudo-text with melted glyphs.",
          "prompt": "photorealistic smartphone photo of a busy university campus walkway, students walking, posters and signs on walls, daytime",
          "image": "assets/media/round1-item01.jpg",
          "hint": "Pay close attention to readable lettering on the wall bulletins and flyers."
        },
        {
          "id": "i2",
          "ans": "HUMAN",
          "what": "Close-up of hands holding a ceramic coffee cup",
          "tell": "Natural knuckles, accurate fingernail beds, 5 distinct fingers, and an authentic micro-chip in the ceramic rim.",
          "prompt": "Real authentic photograph from a coffee shop meetup.",
          "image": "assets/media/round1-item02.jpg",
          "hint": "Inspect the knuckle creases, thumbnail edge, and physical ceramic imperfections."
        },
        {
          "id": "i3",
          "ans": "AI",
          "what": "Newark skyline at sunset across the river",
          "tell": "The golden-hour reflections are hyper-uniform and several futuristic glass high-rises on the horizon do not exist.",
          "prompt": "photorealistic smartphone photo of the Newark New Jersey skyline at sunset from across the river, slight haze",
          "image": "assets/media/round1-item03.jpg",
          "hint": "Do those specific skyscrapers actually match the real Newark / Passaic River skyline?"
        },
        {
          "id": "i4",
          "ans": "HUMAN",
          "what": "Messy student desk: laptop, notes, cables",
          "tell": "Every USB cable traces to an actual port, the notebook cursive is coherent English, and real wear on keycaps.",
          "prompt": "Real photograph taken in an NJIT dorm / graduate lab.",
          "image": "assets/media/round1-item04.jpg",
          "hint": "Trace the cables and try to read the blue ballpoint notes."
        },
        {
          "id": "i5",
          "ans": "AI",
          "what": "Portrait of a smiling graduate student",
          "tell": "Skin has a subtle porcelain airbrushed sheen, the two earrings have mismatched geometric patterns, and background foliage melts.",
          "prompt": "photorealistic smartphone portrait of a smiling graduate student in a hoodie on a college campus, natural light, shallow depth of field",
          "image": "assets/media/round1-item05.jpg",
          "hint": "Compare the left earring with the right earring, and observe the hairline boundary."
        },
        {
          "id": "i6",
          "ans": "HUMAN",
          "what": "Campus courtyard photo with heavy saturation and filters",
          "tell": "Heavily edited is not the same as AI generated! The underlying structural geometry, shadows, and bricks are 100% physically authentic.",
          "prompt": "Real smartphone photo edited with dramatic high-contrast filter.",
          "image": "assets/media/round1-item06.jpg",
          "hint": "Don't mistake digital color grading or HDR saturation for AI synthesis."
        },
        {
          "id": "i7",
          "ans": "AI",
          "what": "Cat sleeping upside down on a living room sofa",
          "tell": "The fur softly fuses into the sofa microfiber weave, and the back paw displays an extra deformed toe pad.",
          "prompt": "photorealistic smartphone photo of a cat sleeping upside down on a couch, funny pose, indoor lighting",
          "image": "assets/media/round1-item07.jpg",
          "hint": "Look where the whiskers meet the fabric and count the rear paw pads."
        },
        {
          "id": "i8",
          "ans": "HUMAN",
          "what": "Group photo from a past GWiCS club workshop",
          "tell": "Natural micro-expressions: one person is mid-laugh, another mid-blink, with authentic lens optical flare.",
          "prompt": "Real club archival photo from GWiCS events.",
          "image": "assets/media/round1-item08.jpg",
          "hint": "Look at the variety of spontaneous facial expressions and eye focus."
        },
        {
          "id": "i9",
          "ans": "AI",
          "what": "Plate of fragrant chicken biryani on a wooden table",
          "tell": "Rice grains repeat in identical tessellated clusters, and the metal spoon handle unnaturally merges into the bowl rim.",
          "prompt": "photorealistic smartphone photo of a plate of chicken biryani on a restaurant table, overhead angle, warm light",
          "image": "assets/media/round1-item09.jpg",
          "hint": "Inspect the spoon reflection and the repeating texture of the spices."
        },
        {
          "id": "i10",
          "ans": "HUMAN",
          "what": "Bizarre optical perspective photo (surreal angle)",
          "tell": "Physical reality can be weirder than AI! The forced perspective is physically genuine with real shadow lines.",
          "prompt": "Real candid optical illusion photo captured in natural lighting.",
          "image": "assets/media/round1-item10.jpg",
          "hint": "Is it an AI hallucination, or simply a clever camera angle in the real world?"
        }
      ]
    },
    {
      "number": 2,
      "id": "round2",
      "title": "Who Wrote It?",
      "subtitle": "The Literary Duel",
      "badge": "10 Classic Pairs",
      "points": "1 point per correct table vote",
      "format": "Hold up card A or card B (Which one is AI?)",
      "description": "One passage was penned by a legendary poet or author; the other was generated by an AI mimicker. Can you detect the authentic human soul from algorithmic imitation?",
      "items": [
        {
          "id": "t1",
          "ai": "B",
          "src": "Emily Dickinson, 1891",
          "image": "assets/media/round2-pair01.png",
          "tell": "Dickinson's famous eccentric dashes and rhythm are irregular and daring. The AI copy strains for a safe, sanitized rhyme in the last line.",
          "h": "“Hope” is the thing with feathers -\nThat perches in the soul -\nAnd sings the tune without the words -\nAnd never stops - at all -",
          "x": "“Courage” is the quiet bird -\nThat nests behind the ribs -\nAnd hums when every hope is spent -\nAnd never asks - for alms -"
        },
        {
          "id": "t2",
          "ai": "A",
          "src": "William Shakespeare, Sonnet 18 (1609)",
          "image": "assets/media/round2-pair02.png",
          "tell": "The AI version falls back on generic romantic tropes: light, clouds, shadow. Shakespeare grounds his sonnet with tangible Elizabethan imagery: rough winds, darling buds of May, and a summer lease.",
          "h": "Shall I compare thee to a summer’s day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May,\nAnd summer’s lease hath all too short a date;",
          "x": "Shall I compare thee to the morning light?\nThou art more constant and more kindly bright:\nThe dawn may falter when the clouds hang low,\nBut thy fair beams no shadow e’er shall know."
        },
        {
          "id": "t3",
          "ai": "A",
          "src": "Robert Frost, Stopping by Woods on a Snowy Evening (1923)",
          "image": "assets/media/round2-pair03.png",
          "tell": "Frost roots his poem in human geography—a specific house, a village, and quiet snow. The AI mimics the rhyming schema but dilutes it into bland clichés: “the light go soft and gray”.",
          "h": "Whose woods these are I think I know.\nHis house is in the village though;\nHe will not see me stopping here\nTo watch his woods fill up with snow.",
          "x": "Whose fields these are I cannot say;\nThe farmer left at end of day;\nHe will not mind me lingering here\nTo see the light go soft and gray."
        },
        {
          "id": "t4",
          "ai": "B",
          "src": "Henry David Thoreau, Walden (1854)",
          "image": "assets/media/round2-pair04.png",
          "tell": "Thoreau's prose is uncompromising, direct, and philosophically dense. The AI paraphrase relies on modern inspirational podcast jargon: “what truly matters”, “live with intention”.",
          "h": "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.",
          "x": "I retreated to the quiet of the forest because I longed to live with intention, to strip life down to what truly matters, and to discover its lessons before my time ran out."
        },
        {
          "id": "t5",
          "ai": "A",
          "src": "William Blake, The Tyger (1794)",
          "image": "assets/media/round2-pair05.png",
          "tell": "Blake's archaic spelling (“Tyger”), visceral mysticism, and “fearful symmetry” provoke awe. The AI substitute (“Lion, lion, golden flame”) is safe, sanitized, and predictable.",
          "h": "Tyger Tyger, burning bright,\nIn the forests of the night;\nWhat immortal hand or eye,\nCould frame thy fearful symmetry?",
          "x": "Lion, lion, golden flame,\nIn the dusk without a name;\nWhat eternal will or art\nCould have forged thy burning heart?"
        },
        {
          "id": "t6",
          "ai": "B",
          "src": "William Wordsworth, 1807",
          "image": "assets/media/round2-pair06.png",
          "tell": "“Suddenly the sunlight kissed / A meadow bright as any dream” is classic AI decorative filler. Wordsworth connects solitude with an explosion of golden daffodils.",
          "h": "I wandered lonely as a cloud\nThat floats on high o’er vales and hills,\nWhen all at once I saw a crowd,\nA host, of golden daffodils;",
          "x": "I drifted slowly like the mist\nThat lingers over field and stream,\nWhen suddenly the sunlight kissed\nA meadow bright as any dream;"
        },
        {
          "id": "t7",
          "ai": "A",
          "src": "Christina Rossetti, Remember (1862)",
          "image": "assets/media/round2-pair07.png",
          "tell": "Rossetti captures bittersweet emotional friction: “Nor I half turn to go yet turning stay”. The AI version retreats to a greeting-card moon cliché.",
          "h": "Remember me when I am gone away,\nGone far away into the silent land;\nWhen you can no more hold me by the hand,\nNor I half turn to go yet turning stay.",
          "x": "Remember me when I have slipped away,\nBeyond the reach of morning and of noon;\nWhen you no longer hear the words I say,\nNor see me linger underneath the moon."
        },
        {
          "id": "t8",
          "ai": "B",
          "src": "John Keats, Endymion (1818)",
          "image": "assets/media/round2-pair08.png",
          "tell": "Keats writes with soaring romantic permanence (“never pass into nothingness”). The AI forces the rhyme “but will always mend”, which feels trite and unearned.",
          "h": "A thing of beauty is a joy for ever:\nIts loveliness increases; it will never\nPass into nothingness;",
          "x": "A lovely thing brings gladness without end:\nIts beauty only deepens; it will never\nFade into silence, but will always mend;"
        },
        {
          "id": "t9",
          "ai": "A",
          "src": "Robert Louis Stevenson, My Shadow (1885)",
          "image": "assets/media/round2-pair09.png",
          "tell": "Stevenson's perspective is authentically childlike, playful, and observant. The AI echo concept is intellectually constructed but emotionally flat.",
          "h": "I have a little shadow that goes in and out with me,\nAnd what can be the use of him is more than I can see.",
          "x": "I have a little echo that follows when I call,\nAnd why it copies everything, I cannot tell at all."
        },
        {
          "id": "t10",
          "ai": "B",
          "src": "Walt Whitman, O Captain! My Captain! (1865)",
          "image": "assets/media/round2-pair10.png",
          "tell": "Whitman's grit (“weather’d every rack”, “fearful trip”) carries historic grief. The AI substitute (“the goal we chased is true”) sounds like corporate motivation.",
          "h": "O Captain! my Captain! our fearful trip is done,\nThe ship has weather’d every rack, the prize we sought is won,",
          "x": "O Leader! my Leader! our weary march is through,\nThe storms have passed us one by one, the goal we chased is true,"
        }
      ]
    },
    {
      "number": 3,
      "id": "round3",
      "title": "Sound Check",
      "subtitle": "The Voice Synthesis Audit",
      "badge": "5 Audio Clips",
      "points": "1 point per correct table vote",
      "format": "Listen twice. Hold up HUMAN or AI card.",
      "description": "Listen closely to pitch variations, breath intake, vocal fry, hesitation pauses, background room resonance, and rhythmic cadence.",
      "items": [
        {
          "id": "a1",
          "ans": "HUMAN",
          "what": "A club member reads the meetup announcement",
          "script": "Hi everyone! Quick reminder that our next meetup is Thursday at six in the student center. Bring a friend, and yes, there will be pizza.",
          "tell": "Noticeable inhalation breath before speaking, a brief conversational stumble, and enthusiastic tempo acceleration when saying “pizza”.",
          "audio": "assets/audio/a1.mp3",
          "synthVoice": "human_natural"
        },
        {
          "id": "a2",
          "ans": "AI",
          "what": "Same announcement generated by synthetic voice",
          "script": "Hi everyone! Quick reminder that our next meetup is Thursday at six in the student center. Bring a friend, and yes, there will be pizza.",
          "tell": "Unnaturally metronomic pacing, zero vocal cord breath friction, and every single syllable receives equal acoustic amplitude.",
          "audio": "assets/audio/a2.mp3",
          "hasBuiltIn": true
        },
        {
          "id": "a3",
          "ans": "AI",
          "what": "Urgent voicemail from an unfamiliar caller asking for help",
          "script": "Hey, it's me. I'm kind of stuck right now and my phone's about to die. Can you call me back as soon as you get this? It's important.",
          "tell": "Acoustically sterile! A genuine rushed call in an emergency would have ambient street/indoor noise and micro-stutters. This is how voice cloning scams trick victims.",
          "audio": "assets/audio/a3.mp3",
          "hasBuiltIn": true
        },
        {
          "id": "a4",
          "ans": "HUMAN",
          "what": "Student laughing mid-sentence during a funny anecdote",
          "script": "So I walked into the wrong lecture hall and sat through twenty minutes of organic chemistry before I realized.",
          "tell": "Genuine diaphragmatic laughter physically modulates vocal airflow. Neural TTS models still sound disjointed when trying to simulate laughter bursts.",
          "audio": "assets/audio/a4.mp3",
          "synthVoice": "human_laughter"
        },
        {
          "id": "a5",
          "ans": "HUMAN",
          "what": "A real member leaves a casual phone voicemail",
          "script": "Hey, it's me. I'm kind of stuck right now and my phone's about to die. Can you call me back as soon as you get this? It's important.",
          "tell": "Compare with Clip 3! Same script, but you can hear the real throat clearing, authentic telephone microphone compression, and natural hesitation.",
          "audio": "assets/audio/a5.mp3",
          "synthVoice": "human_voicemail"
        }
      ]
    },
    {
      "number": 4,
      "id": "round4",
      "title": "The Live Showdown",
      "subtitle": "Humans vs LLM in Real-Time",
      "badge": "Audience Duel",
      "points": "2 points for crowd favorite",
      "format": "Two student volunteers vs AI on stage. Blind vote.",
      "description": "A surprise prompt is revealed on screen. Two audience volunteers and an AI model have 120 seconds to craft the best response. Can the crowd guess which response is machine-generated, and will human wit triumph?",
      "prompts": [
        "Write a 4-line poem about the NJIT campus shuttle.",
        "Write a slogan for a gourmet coffee brand sold exclusively during finals week.",
        "Give a 1-sentence horror story set inside a university computer lab.",
        "Invent a name and tagline for an absurd new campus student club.",
        "Write the worst possible pickup line for an aspiring data scientist.",
        "Explain Wi-Fi to a Victorian time-traveler from 1885 in exactly 2 sentences.",
        "Write a dramatic breakup text from a gaming laptop to its frayed charger cord.",
        "Name 5 creative uses for a paperclip that do not involve holding paper.",
        "Argue that Newark, NJ is objectively superior to NYC in 2 punchy sentences.",
        "Describe the color blue to someone who has never been able to see."
      ]
    }
  ],
  "bonus": {
    "title": "Beat the Bot & Turing Antics",
    "activities": [
      {
        "name": "Quick, Draw! Challenge",
        "badge": "20 Sec Duel",
        "desc": "A student volunteer draws on the projector canvas while Google's neural network tries to guess it in 20 seconds. If human quirkiness confounds the AI, the room earns bonus points!"
      },
      {
        "name": "The Hyper-Local Litmus Test",
        "badge": "Campus Vibe",
        "desc": "“Describe the exact vibe on the 3rd floor of the Van Houten library at 2:30 AM.” Only lived human experience can nail the sensory hyper-local truth."
      },
      {
        "name": "Reverse Turing Test",
        "badge": "Crowd Cross-Exam",
        "desc": "An audience member and an AI answer spontaneous rapid-fire questions from the crowd. The audience votes on which answer had authentic human soul."
      }
    ]
  },
  "debrief": [
    {
      "num": "01",
      "title": "Glyph & Typography Collapse",
      "summary": "AI diffusion models understand semantic concepts better than symbolic orthography. Zoom in on background signage, posters, book titles, and digital clocks—AI renders decorative gibberish rather than valid letters."
    },
    {
      "num": "02",
      "title": "Biometric & Anatomical Artifacts",
      "summary": "Scrutinize hands, earlobes, jewelry symmetry, teeth alignment, and where hair meets collars. Look for fused digits, mismatched earrings, and textures that melt into backdrops."
    },
    {
      "num": "03",
      "title": "Polished but Hollow Prose",
      "summary": "Large language models favor probabilistic, consensus vocabulary. They love stock metaphors (“beacon of hope”, “testament to”, “tapestry of”) and avoid gritty, idiosyncratic specific nouns."
    },
    {
      "num": "04",
      "title": "Acoustic Cadence & Breathless Monotony",
      "summary": "Natural speech has micro-hesitations, glottal stops, breathing intakes, and dynamic shifts in pacing. Synthetic voices are often too uniformly measured, sterile, and free of room acoustics."
    },
    {
      "num": "05",
      "title": "Provenance & Physical Coherence",
      "summary": "When in doubt, check optical physics: do shadow angles match the primary light source? Do reflections in mirrors or puddles mirror the actual geometry? Trace the source."
    }
  ],
  "schedule": [
    { "time": "5:45 PM", "title": "Doors Open & Check-in", "desc": "Check in at the ballroom desk, grab your VIP Table Pass, and enjoy free hot pizza & refreshments." },
    { "time": "6:15 PM", "title": "Opening Remarks & GWiCS Welcome", "desc": "Presidential address from GWiCS leadership, game rules briefing, and table kit distribution." },
    { "time": "6:30 PM", "title": "Round 1: Real or AI?", "desc": "10 visual puzzles on the big screen. Tables vote simultaneously using card paddles." },
    { "time": "7:00 PM", "title": "Round 2: Who Wrote It?", "desc": "10 head-to-head literary face-offs. Classic poetry vs AI LLM mimicry." },
    { "time": "7:30 PM", "title": "Round 3: Sound Check", "desc": "5 audio voice tests. Spotting voice cloning, neural TTS, and deepfake scams." },
    { "time": "7:55 PM", "title": "Round 4: The Live Prompt Showdown", "desc": "Human student champions duel ChatGPT/Gemini live on stage with audience scoring." },
    { "time": "8:15 PM", "title": "Bonus Round & Trophy Presentation", "desc": "Awarding the GWiCS Grand Champion Trophy, swag bundles, and closing debrief." }
  ],
  "gwics": {
    "name": "Graduate Women in Computing Sciences (GWiCS)",
    "chapter": "New Jersey Institute of Technology Chapter",
    "mission": "GWiCS is dedicated to fostering a supportive, vibrant, and empowering academic and professional community for women, non-binary, and historically underrepresented graduate students in computer science, software engineering, and data science.",
    "activities": [
      { "title": "Research Colloquiums", "desc": "Spotlighting graduate student research, thesis defenses, and faculty seminars." },
      { "title": "Industry Mentorship", "desc": "Direct connections with leading women tech executives and engineering alumni." },
      { "title": "Hackathons & Code Sprints", "desc": "Hands-on technical building in AI, cybersecurity, and full-stack development." },
      { "title": "Social & Community", "desc": "Game nights, networking mixers, and supportive peer mentoring cohorts." }
    ],
    "socials": [
      { "name": "Discord Community", "url": "#", "icon": "discord" },
      { "name": "LinkedIn Page", "url": "#", "icon": "linkedin" },
      { "name": "Instagram @gwics_njit", "url": "#", "icon": "instagram" },
      { "name": "Highlander Hub", "url": "#", "icon": "hub" }
    ]
  }
};
