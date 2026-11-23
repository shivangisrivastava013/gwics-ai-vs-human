// COMPETITION PACK (PROTECTED)
// Kept in host vault and served ONLY through the authenticated Host session.
// Participants and projector receive only current active question metadata without answers or tells.

window.GWICS_COMPETITION_PACK = {
  rounds: [
    {
      roundNum: 1,
      roundId: "r1",
      name: "Round 1: Real or AI?",
      subtitle: "The Visual Turing Test",
      instructions: "Examine the projected image on the main screen. Determine if it is a real camera photo or AI-generated.",
      timeLimit: 45,
      items: [
        {
          id: "r1_q01",
          type: "image",
          title: "Item 01: Campus Walkway",
          prompt: "Observe the students and posters along the walkway. Real photograph or AI-generated?",
          media: "assets/media/r1_media_01.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Examine the text and glyphs printed on the background bulletin board.",
          // HOST ONLY REVEAL DATA:
          ans: "AI",
          tell: "The text on the posters and flyers is garbled, melted pseudo-glyph nonsense characteristic of diffusion model generation."
        },
        {
          id: "r1_q02",
          type: "image",
          title: "Item 02: Coffee Cup & Hands",
          prompt: "Observe the hands holding the ceramic mug. Real photograph or AI-generated?",
          media: "assets/media/r1_media_02.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Inspect the knuckle skin creases, fingernail beds, and rim of the mug.",
          ans: "HUMAN",
          tell: "Natural knuckles, 5 distinct fingers per hand with authentic fingernail anatomy, and a real physical chip on the ceramic mug rim."
        },
        {
          id: "r1_q03",
          type: "image",
          title: "Item 03: Riverfront Skyline at Sunset",
          prompt: "Observe the city skyline across the water at golden hour. Real photograph or AI-generated?",
          media: "assets/media/r1_media_03.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Check whether the high-rise glass buildings on the horizon exist in the actual Newark skyline.",
          ans: "AI",
          tell: "The sunset lighting and reflections are hyper-uniform, and several futuristic twisting glass towers on the horizon do not exist."
        },
        {
          id: "r1_q04",
          type: "image",
          title: "Item 04: Messy Student Study Desk",
          prompt: "Observe the laptop, handwritten notes, and desk accessories. Real photograph or AI-generated?",
          media: "assets/media/r1_media_04.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Trace the USB cables and examine the blue ballpoint handwritten cursive in the notebook.",
          ans: "HUMAN",
          tell: "Every cable connects to an authentic device port, the notebook text is fully legible English handwriting, and keycaps show realistic wear."
        },
        {
          id: "r1_q05",
          type: "image",
          title: "Item 05: Student Portrait in Campus Library",
          prompt: "Observe the student portrait and background books. Real photograph or AI-generated?",
          media: "assets/media/r1_media_05.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Carefully compare the earring on the left ear with the earring on the right ear.",
          ans: "AI",
          tell: "Skin has an overly smooth porcelain sheen, the earrings feature mismatched asymmetric geometric designs, and the background books melt into digital blur."
        },
        {
          id: "r1_q06",
          type: "image",
          title: "Item 06: University Quad with Vintage Filter",
          prompt: "Observe the students walking across the brick courtyard. Real photograph or AI-generated?",
          media: "assets/media/r1_media_06.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Heavy filter saturation and color grading do not equal AI generation. Check the physical shadow lines.",
          ans: "HUMAN",
          tell: "Heavy post-processing or filter styling is not AI generation. The architectural lines, brick geometry, and physical shadows are 100% authentic."
        },
        {
          id: "r1_q07",
          type: "image",
          title: "Item 07: Cat Sleeping on Living Room Sofa",
          prompt: "Observe the sleeping cat on the couch. Real photograph or AI-generated?",
          media: "assets/media/r1_media_07.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Look where the whiskers meet the fabric and inspect the paw pads.",
          ans: "AI",
          tell: "Fur softly fuses into the sofa microfiber weave, and the paws have unnatural fused toe pads."
        },
        {
          id: "r1_q08",
          type: "image",
          title: "Item 08: GWiCS Workshop Gathering",
          prompt: "Observe the students laughing around the conference table. Real photograph or AI-generated?",
          media: "assets/media/r1_media_08.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Look for spontaneous candid micro-expressions like mid-blink and laughing postures.",
          ans: "HUMAN",
          tell: "Authentic group dynamics: genuine mid-laugh and mid-blink micro-expressions with natural room lighting and real laptop reflections."
        },
        {
          id: "r1_q09",
          type: "image",
          title: "Item 09: Biryani Dish on Restaurant Table",
          prompt: "Observe the food dish and spoon. Real photograph or AI-generated?",
          media: "assets/media/r1_media_09.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Look at the pattern of the rice grains and the spoon handle meeting the plate rim.",
          ans: "AI",
          tell: "Rice grains repeat in identical tessellated micro-clusters, and the metallic spoon handle unnaturally merges into the rim of the dish."
        },
        {
          id: "r1_q10",
          type: "image",
          title: "Item 10: Forced-Perspective Campus Trick",
          prompt: "Observe the surreal angle of the student and building. Real photograph or AI-generated?",
          media: "assets/media/r1_media_10.jpg",
          options: [{ id: "HUMAN", label: "👤 REAL PHOTO" }, { id: "AI", label: "🤖 AI GENERATED" }],
          hint: "Could this surreal appearance simply be a playful optical illusion with a real camera?",
          ans: "HUMAN",
          tell: "Physical optical reality can look weirder than AI! The forced perspective is physically genuine with real focal blur and shadow continuity."
        }
      ]
    },
    {
      roundNum: 2,
      roundId: "r2",
      name: "Round 2: Who Wrote It?",
      subtitle: "The Literary Duel",
      instructions: "One passage is by a world-renowned author; the other was authored by AI. Which passage was generated by AI?",
      timeLimit: 60,
      items: [
        {
          id: "r2_q01",
          type: "text",
          title: "Pair 01: On Hope & Courage",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_01.png",
          passageA: "“Hope” is the thing with feathers -\nThat perches in the soul -\nAnd sings the tune without the words -\nAnd never stops - at all -",
          passageB: "“Courage” is the quiet bird -\nThat nests behind the ribs -\nAnd hums when every hope is spent -\nAnd never asks - for alms -",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "Compare the punctuation dashes and observe which last line feels forced to rhyme.",
          ans: "B",
          tell: "Passage B is AI. Passage A is Emily Dickinson's iconic 1891 poem. Dickinson's irregular dashes are idiosyncratic; the AI copy is overly tidy and strains for a neat rhyme."
        },
        {
          id: "r2_q02",
          type: "text",
          title: "Pair 02: On Comparison & Constancy",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_02.png",
          passageA: "Shall I compare thee to the morning light?\nThou art more constant and more kindly bright:\nThe dawn may falter when the clouds hang low,\nBut thy fair beams no shadow e’er shall know.",
          passageB: "Shall I compare thee to a summer’s day?\nThou art more lovely and more temperate:\nRough winds do shake the darling buds of May,\nAnd summer’s lease hath all too short a date;",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "Look for concrete seasonal imagery (May buds, summer lease) vs generic light/cloud romance.",
          ans: "A",
          tell: "Passage A is AI. Passage B is William Shakespeare's Sonnet 18 (1609). The AI substitute uses generic romantic clichés ('morning light', 'clouds'), lacking Shakespeare's tangible specifics."
        },
        {
          id: "r2_q03",
          type: "text",
          title: "Pair 03: In the Woods at Dusk",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_03.png",
          passageA: "Whose fields these are I cannot say;\nThe farmer left at end of day;\nHe will not mind me lingering here\nTo see the light go soft and gray.",
          passageB: "Whose woods these are I think I know.\nHis house is in the village though;\nHe will not see me stopping here\nTo watch his woods fill up with snow.",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "One poem references a real village and falling snow; the other relies on generic filler ('soft and gray').",
          ans: "A",
          tell: "Passage A is AI. Passage B is Robert Frost's 1923 poem 'Stopping by Woods on a Snowy Evening'. Frost grounds his poem in lived geography."
        },
        {
          id: "r2_q04",
          type: "text",
          title: "Pair 04: Deliberate Living",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_04.png",
          passageA: "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.",
          passageB: "I retreated to the quiet of the forest because I longed to live with intention, to strip life down to what truly matters, and to discover its lessons before my time ran out.",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "Notice 19th-century philosophical rigor vs modern podcast catchphrases ('live with intention', 'what truly matters').",
          ans: "B",
          tell: "Passage B is AI. Passage A is Henry David Thoreau's Walden (1854). The AI paraphrase reaches for stock modern inspirational slogans."
        },
        {
          id: "r2_q05",
          type: "text",
          title: "Pair 05: Fierce Creatures of the Night",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_05.png",
          passageA: "Lion, lion, golden flame,\nIn the dusk without a name;\nWhat eternal will or art\nCould have forged thy burning heart?",
          passageB: "Tyger Tyger, burning bright,\nIn the forests of the night;\nWhat immortal hand or eye,\nCould frame thy fearful symmetry?",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "Look for archaic spelling and daring phrasing ('fearful symmetry') vs predictable rhyme.",
          ans: "A",
          tell: "Passage A is AI. Passage B is William Blake's The Tyger (1794). Blake's archaic spelling and visceral rhythm challenge the ear; the AI swap is tame and predictable."
        },
        {
          id: "r2_q06",
          type: "text",
          title: "Pair 06: Wandering & Wildflowers",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_06.png",
          passageA: "I wandered lonely as a cloud\nThat floats on high o’er vales and hills,\nWhen all at once I saw a crowd,\nA host, of golden daffodils;",
          passageB: "I drifted slowly like the mist\nThat lingers over field and stream,\nWhen suddenly the sunlight kissed\nA meadow bright as any dream;",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "Watch out for greeting-card clichés like 'sunlight kissed' and 'meadow bright as any dream'.",
          ans: "B",
          tell: "Passage B is AI. Passage A is William Wordsworth (1807). 'Sunlight kissed' and 'bright as any dream' are classic AI decorative filler."
        },
        {
          id: "r2_q07",
          type: "text",
          title: "Pair 07: Remembering the Departed",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_07.png",
          passageA: "Remember me when I have slipped away,\nBeyond the reach of morning and of noon;\nWhen you no longer hear the words I say,\nNor see me linger underneath the moon.",
          passageB: "Remember me when I am gone away,\nGone far away into the silent land;\nWhen you can no more hold me by the hand,\nNor I half turn to go yet turning stay.",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "Look for bittersweet psychological complexity in the final line vs moon clichés.",
          ans: "A",
          tell: "Passage A is AI. Passage B is Christina Rossetti (1862). Rossetti's line twists with human ambivalence ('half turn to go yet turning stay'); the AI retreats to a generic moon rhyme."
        },
        {
          id: "r2_q08",
          type: "text",
          title: "Pair 08: Enduring Beauty",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_08.png",
          passageA: "A thing of beauty is a joy for ever:\nIts loveliness increases; it will never\nPass into nothingness;",
          passageB: "A lovely thing brings gladness without end:\nIts beauty only deepens; it will never\nFade into silence, but will always mend;",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "Does 'will always mend' make logical and emotional sense, or is it an artificial rhyme?",
          ans: "B",
          tell: "Passage B is AI. Passage A is John Keats' Endymion (1818). The AI line 'but will always mend' is synthetically forced to rhyme."
        },
        {
          id: "r2_q09",
          type: "text",
          title: "Pair 09: Shadows & Companions",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_09.png",
          passageA: "I have a little echo that follows when I call,\nAnd why it copies everything, I cannot tell at all.",
          passageB: "I have a little shadow that goes in and out with me,\nAnd what can be the use of him is more than I can see.",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "One line reflects genuine childlike wonder; the other feels like an intellectual exercise.",
          ans: "A",
          tell: "Passage A is AI. Passage B is Robert Louis Stevenson's My Shadow (1885). Stevenson's voice is authentically playful."
        },
        {
          id: "r2_q10",
          type: "text",
          title: "Pair 10: After the Fearful Journey",
          prompt: "Which text was written by AI?",
          cardImage: "assets/media/r2_card_10.png",
          passageA: "O Captain! my Captain! our fearful trip is done,\nThe ship has weather’d every rack, the prize we sought is won,",
          passageB: "O Leader! my Leader! our weary march is through,\nThe storms have passed us one by one, the goal we chased is true,",
          options: [{ id: "A", label: "Passage A is AI" }, { id: "B", label: "Passage B is AI" }],
          hint: "Compare gritty nautical metaphors ('weather'd every rack') against generic slogans ('the goal we chased is true').",
          ans: "B",
          tell: "Passage B is AI. Passage A is Walt Whitman's O Captain! My Captain! (1865). Whitman's vocabulary carries historical grit."
        }
      ]
    },
    {
      roundNum: 3,
      roundId: "r3",
      name: "Round 3: Sound Check",
      subtitle: "Voice Synthesis & Audio Forensics",
      instructions: "Listen to each audio clip twice over the room speakers. Determine if the recording is a real human voice or AI synthetic speech.",
      timeLimit: 45,
      items: [
        {
          id: "r3_q01",
          type: "audio",
          title: "Clip 01: Meeting Announcement",
          prompt: "Is this speaker authentic human or AI synthetic speech?",
          audioUrl: "assets/audio/clip_01.mp3",
          transcript: "“Hi everyone! Quick reminder that our next meetup is Thursday at six in the student center. Bring a friend, and yes, there will be pizza.”",
          audioAccessibilityNotes: "Acoustic cues: Natural room reverberation, subtle inhalation before speaking, conversational pace variation.",
          options: [{ id: "HUMAN", label: "👤 HUMAN RECORDING" }, { id: "AI", label: "🤖 AI SYNTHETIC SPEECH" }],
          hint: "Listen for natural respiration, tempo acceleration on exciting words, and conversational micro-hesitation.",
          ans: "HUMAN",
          tell: "Noticeable breath intake before speaking, a brief conversational stumble, and enthusiastic tempo pickup on 'pizza'."
        },
        {
          id: "r3_q02",
          type: "audio",
          title: "Clip 02: Meeting Announcement (Comparison)",
          prompt: "Is this speaker authentic human or AI synthetic speech?",
          audioUrl: "assets/audio/clip_02.mp3",
          transcript: "“Hi everyone! Quick reminder that our next meetup is Thursday at six in the student center. Bring a friend, and yes, there will be pizza.”",
          audioAccessibilityNotes: "Acoustic cues: Even syllable spacing, absence of respiratory friction, uniform vocal intensity.",
          options: [{ id: "HUMAN", label: "👤 HUMAN RECORDING" }, { id: "AI", label: "🤖 AI SYNTHETIC SPEECH" }],
          hint: "Listen to the syllable duration: is the cadence metronomically uniform?",
          ans: "AI",
          tell: "Unnaturally measured rhythm, zero breath friction, and every word receives identical amplitude weighting."
        },
        {
          id: "r3_q03",
          type: "audio",
          title: "Clip 03: Urgent Voicemail",
          prompt: "Is this voicemail real human speech or an AI-cloned voice?",
          audioUrl: "assets/audio/clip_03.mp3",
          transcript: "“Hey, it's me. I'm kind of stuck right now and my phone's about to die. Can you call me back as soon as you get this? It's important.”",
          audioAccessibilityNotes: "Acoustic cues: Studio silence in background, missing environmental phone noise, sterile frequency profile.",
          options: [{ id: "HUMAN", label: "👤 HUMAN RECORDING" }, { id: "AI", label: "🤖 AI SYNTHETIC SPEECH" }],
          hint: "In a real rushed call from a dying phone, would there be background street or room noise?",
          ans: "AI",
          tell: "Acoustically sterile without ambient background noise. This is the hallmark of voice-cloning phishing scams."
        },
        {
          id: "r3_q04",
          type: "audio",
          title: "Clip 04: Classroom Anecdote & Laughter",
          prompt: "Is this speaker authentic human or AI synthetic speech?",
          audioUrl: "assets/audio/clip_04.mp3",
          transcript: "“So I walked into the wrong lecture hall and sat through twenty minutes of organic chemistry before I realized.”",
          audioAccessibilityNotes: "Acoustic cues: Diaphragmatic vocal burst, pitch break, authentic laughing articulation.",
          options: [{ id: "HUMAN", label: "👤 HUMAN RECORDING" }, { id: "AI", label: "🤖 AI SYNTHETIC SPEECH" }],
          hint: "Listen to how laughter breaks the words apart. Can current neural TTS handle spontaneous diaphragmatic chuckles?",
          ans: "HUMAN",
          tell: "Genuine diaphragmatic laughter physically disrupts vowel airflow. Synthetic TTS models still sound disjointed when simulating laughter."
        },
        {
          id: "r3_q05",
          type: "audio",
          title: "Clip 05: Casual Voicemail (Comparison)",
          prompt: "Is this voicemail real human speech or AI synthetic speech?",
          audioUrl: "assets/audio/clip_05.mp3",
          transcript: "“Hey, it's me. I'm kind of stuck right now and my phone's about to die. Can you call me back as soon as you get this? It's important.”",
          audioAccessibilityNotes: "Acoustic cues: Natural throat clearing, authentic mobile microphone compression, relaxed conversational pauses.",
          options: [{ id: "HUMAN", label: "👤 HUMAN RECORDING" }, { id: "AI", label: "🤖 AI SYNTHETIC SPEECH" }],
          hint: "Compare with Clip 03: listen for genuine room reverberation and relaxed throat articulation.",
          ans: "HUMAN",
          tell: "Same script as Clip 03, but with natural hesitations, realistic phone mic compression, and authentic room sound."
        }
      ]
    },
    {
      roundNum: 4,
      roundId: "r4",
      name: "Round 4: The Live Showdown",
      subtitle: "Humans vs Generative AI Live",
      instructions: "Two volunteer students and an AI model duel live on stage under a 120-second clock. The room votes blindly on wit and authenticity.",
      timeLimit: 120,
      prompts: [
        "Write a 4-line poem about the campus shuttle arriving 20 minutes late in the rain.",
        "Write a slogan for a gourmet coffee brand sold exclusively during university finals week.",
        "Give a 1-sentence horror story set inside a graduate computing lab at 3:00 AM.",
        "Invent an absurd new student club name and its 1-sentence official mission.",
        "Write the worst possible pickup line for an aspiring data scientist.",
        "Explain Wi-Fi to a Victorian time-traveler from 1885 in exactly 2 sentences.",
        "Write a dramatic breakup text from an overheated laptop to its frayed charger cord."
      ],
      tieBreaker: {
        id: "tie_01",
        title: "TIE-BREAKER SUDDEN DEATH",
        prompt: "Identify the deliberate flaw: The following passage has one word that violates strict poetic meter. Name the word or choose which model generated it.",
        text: "Beneath the stone the silent water flows,\nWhile algorithms compute the golden rose.",
        tell: "Both teams submit a sealed answer on paper. The team with the closest reasoning wins the tie-break."
      }
    }
  ]
};
