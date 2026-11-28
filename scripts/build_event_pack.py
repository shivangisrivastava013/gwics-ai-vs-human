#!/usr/bin/env python3
"""
GWiCS BOT OR NOT? - Event Competition Pack Generator
Builds the standardized, fully audited 18-question pack + 1 practice question + 6 reserve questions + 1 Showdown duel.
Each item explicitly contains prompt, options, type, timeLimit, ans, hint, and tell.
Saves to local_organizer_vault/competition_pack.json
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = BASE_DIR / "local_organizer_vault" / "competition_pack.json"

r1_items = [
    {
        "id": "r1_q01",
        "roundNum": 1,
        "title": "Campus Walkway",
        "type": "image",
        "timeLimit": 25,
        "prompt": "Was this image photographed by a human or generated using AI?",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "media": "assets/media/r1_media_01.jpg",
        "ans": "AI",
        "hint": "Check how the brick paving patterns behave as they recede into the distance.",
        "tell": "Paving joint lines lose geometric continuity and blur into impossible diamond/cross hatchings about 15 feet back.",
        "source": "Generative AI Midjourney v6"
    },
    {
        "id": "r1_q02",
        "roundNum": 1,
        "title": "Coffee Cup & Hands",
        "type": "image",
        "timeLimit": 25,
        "prompt": "Was this image photographed by a human or generated using AI?",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "media": "assets/media/r1_media_02.jpg",
        "ans": "PHOTOGRAPHED",
        "hint": "Look at the knuckles, cuticles, and natural liquid meniscus inside the mug.",
        "tell": "Genuine fingernail ridges, skin pore microtexture, and authentic liquid surface tension reflections.",
        "source": "Photographed by human photographer"
    },
    {
        "id": "r1_q03",
        "roundNum": 1,
        "title": "Riverfront Skyline at Sunset",
        "type": "image",
        "timeLimit": 25,
        "prompt": "Was this image photographed by a human or generated using AI?",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "media": "assets/media/r1_media_03.jpg",
        "ans": "AI",
        "hint": "Examine the suspension bridge cables and building window alignments on the left bank.",
        "tell": "Bridge support cables dissolve mid-span without anchoring, and skyscraper windows warp into inconsistent lattices.",
        "source": "Generative AI DALL-E 3"
    },
    {
        "id": "r1_q04",
        "roundNum": 1,
        "title": "Student Study Desk",
        "type": "image",
        "timeLimit": 25,
        "prompt": "Was this image photographed by a human or generated using AI?",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "media": "assets/media/r1_media_04.jpg",
        "ans": "PHOTOGRAPHED",
        "hint": "Read the small handwritten annotations on the open spiral notebook.",
        "tell": "Handwritten characters form coherent mathematical notations, and physical paper fibers show genuine macro focus falloff.",
        "source": "Photographed on student study desk"
    },
    {
        "id": "r1_q05",
        "roundNum": 1,
        "title": "Student Portrait in Library",
        "type": "image",
        "timeLimit": 25,
        "prompt": "Was this image photographed by a human or generated using AI?",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "media": "assets/media/r1_media_05.jpg",
        "ans": "AI",
        "hint": "Inspect the spines of the books arranged along the background bookshelf.",
        "tell": "Background book titles are synthetic hallucinations resembling pseudo-Latin runes rather than printed text.",
        "source": "Generative AI Stable Diffusion XL"
    },
    {
        "id": "r1_q06",
        "roundNum": 1,
        "title": "University Quad",
        "type": "image",
        "timeLimit": 25,
        "prompt": "Was this image photographed by a human or generated using AI?",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "media": "assets/media/r1_media_06.jpg",
        "ans": "PHOTOGRAPHED",
        "hint": "Look for subtle optical lens traits like slight chromatic fringe on tree branches against bright sky.",
        "tell": "Natural optical chromatic aberration, authentic camera sensor ISO noise, and genuine campus directional signage.",
        "source": "Photographed with Sony Alpha DSLR"
    }
]

r1_reserves = [
    {
        "id": "r1_res01",
        "roundNum": 1,
        "title": "Cat Sleeping on Sofa",
        "type": "image",
        "timeLimit": 25,
        "prompt": "Was this image photographed by a human or generated using AI?",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "media": "assets/media/r1_media_07.jpg",
        "ans": "AI",
        "hint": "Follow the whiskers on both sides of the muzzle.",
        "tell": "Whiskers originate outside follicle clusters and fuse into the surrounding fur texture.",
        "source": "Generative AI Midjourney v6"
    },
    {
        "id": "r1_res02",
        "roundNum": 1,
        "title": "GWiCS Workshop Gathering",
        "type": "image",
        "timeLimit": 25,
        "prompt": "Was this image photographed by a human or generated using AI?",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "media": "assets/media/r1_media_08.jpg",
        "ans": "PHOTOGRAPHED",
        "hint": "Check the lanyard text and authentic room lighting shadows.",
        "tell": "Genuine conference badges with legible event credentials and authentic fluorescent classroom lighting.",
        "source": "Photographed at GWiCS event"
    }
]

r2_items = [
    {
        "id": "r2_q01",
        "roundNum": 2,
        "title": "The Missed Sync",
        "type": "text",
        "timeLimit": 40,
        "prompt": "Which passage was written by a human?",
        "options": [
            {"id": "A", "label": "Passage A"},
            {"id": "B", "label": "Passage B"}
        ],
        "passageA": "I sincerely apologize for missing our scheduled meeting this morning. An unexpected scheduling conflict arose due to unforeseen technical complications with my calendar sync. I deeply regret any inconvenience caused to the team and will promptly review all meeting notes to ensure full alignment moving forward.",
        "passageB": "So sorry about missing the sync earlier! My laptop decided 8:55 AM was the perfect moment to force an operating system update, and I couldn't get back into Slack until now. Caught up on the agenda doc already—will ping you with my updates shortly!",
        "ans": "B",
        "hint": "Notice which passage sounds like corporate PR boilerplate versus an actual relatable morning mishap.",
        "tell": "Passage A relies on generic corporate clichés ('unforeseen technical complications', 'deeply regret'). Passage B has idiosyncratic human speech ('laptop decided... perfect moment', 'ping you').",
        "source": "Passage B written by student / Passage A GPT-4"
    },
    {
        "id": "r2_q02",
        "roundNum": 2,
        "title": "Campus in the Rain",
        "type": "text",
        "timeLimit": 40,
        "prompt": "Which passage was written by a human?",
        "options": [
            {"id": "A", "label": "Passage A"},
            {"id": "B", "label": "Passage B"}
        ],
        "passageA": "Stepped out of Snell Library straight into a sudden downpour without my umbrella. My socks are completely soaked, but the smell of wet pavement and petrichor around the campus quad makes me strangely nostalgic. Huddled under the dining hall awning watching people sprint for cover.",
        "passageB": "A sudden rainfall enveloped the university grounds today, transforming the quad into a glistening landscape. Drops cascaded from vibrant red-brick rooftops, forming ripples across stone walkways. Students traversed paths under colorful umbrellas, enjoying the tranquil cadence of water droplets revitalizing the campus scenery in harmonious tranquility.",
        "ans": "A",
        "hint": "Look for sensory grittiness like soggy socks versus overly poetic, frictionless adjectives.",
        "tell": "Passage B uses characteristic LLM descriptors ('glistening landscape', 'tranquil cadence', 'harmonious tranquility'). Passage A contains visceral, gritty specifics: wet socks and sprinting for cover.",
        "source": "Passage A written by student / Passage B Claude 3 Opus"
    },
    {
        "id": "r2_q03",
        "roundNum": 2,
        "title": "Exam Week Motivation",
        "type": "text",
        "timeLimit": 40,
        "prompt": "Which passage was written by a human?",
        "options": [
            {"id": "A", "label": "Passage A"},
            {"id": "B", "label": "Passage B"}
        ],
        "passageA": "As midterm week approaches, remember that your dedication, resilience, and curiosity define your scholarly journey far more than any single examination ever could. Take deep breaths, stay hydrated, maintain consistent study rhythms, and believe in your boundless potential to triumph over challenging academic hurdles.",
        "passageB": "Don't psych yourself out for tomorrow's exam. You survived algorithms and that brutal data structures final last semester; you can handle this too. Just get at least six hours of real sleep tonight, don't chug three energy drinks at 2 AM, and trust your prep.",
        "ans": "B",
        "hint": "One passage gives real peer-to-peer advice about sleep and energy drinks, while the other sounds like an automated wellness email.",
        "tell": "Passage A reads like an AI motivational greeting card ('boundless potential', 'scholarly journey'). Passage B references specific shared student milestones (algorithms, energy drinks).",
        "source": "Passage B written by TA / Passage A Gemini 1.5 Pro"
    },
    {
        "id": "r2_q04",
        "roundNum": 2,
        "title": "Third-Floor Coffee Station",
        "type": "text",
        "timeLimit": 40,
        "prompt": "Which passage was written by a human?",
        "options": [
            {"id": "A", "label": "Passage A"},
            {"id": "B", "label": "Passage B"}
        ],
        "passageA": "The third-floor Keurig has entered its villain era again. It made this horrifying jet-engine screeching noise, sputtered three drops of scalding lukewarm water onto the counter, and gave up. Facilities ticket has been filed, but till then, bring cold brew or prepare to walk to Starbucks.",
        "passageB": "The communal coffee station on the third floor is unfortunately non-operational today due to a mechanical malfunction during the brewing cycle. The unit failed to dispense hot water properly. A service inquiry has been submitted. Please consider alternate beverage options located on adjacent floors.",
        "ans": "A",
        "hint": "Observe conversational hyperbole and internet idioms versus sterile operational reporting.",
        "tell": "Passage A uses contemporary conversational humor ('entered its villain era', 'jet-engine screeching'). Passage B is sterile LLM corporate summary.",
        "source": "Passage A posted on student Slack / Passage B Llama 3 70B"
    },
    {
        "id": "r2_q05",
        "roundNum": 2,
        "title": "Stumbled Discovery",
        "type": "text",
        "timeLimit": 40,
        "prompt": "Which passage was written by a human?",
        "options": [
            {"id": "A", "label": "Passage A"},
            {"id": "B", "label": "Passage B"}
        ],
        "passageA": "While walking through the historic district, one cannot help but appreciate how ancient cobblestone avenues seamlessly interweave centuries of architectural mastery with bustling contemporary life. Every picturesque street corner unveils forgotten artisan ateliers and captivating antique storefronts that quietly whisper stories of heritage into the evening air.",
        "passageB": "Took a wrong turn behind the old brick courthouse and stumbled onto the weirdest little secondhand bookstore tucked down an alley. Found a 1982 illustrated astronomy atlas for four bucks with someone's handwritten stargazing notes in the margins. Definitely coming back next weekend.",
        "ans": "B",
        "hint": "Look for tangible specifics ($4 atlas, handwritten notes) vs dreamy, abstract guidebook travelogues.",
        "tell": "Passage A is classic LLM promotional prose ('whisper stories of heritage', 'architectural mastery'). Passage B details an authentic tactile find ($4 used astronomy atlas with margin notes).",
        "source": "Passage B personal journal / Passage A GPT-4o"
    },
    {
        "id": "r2_q06",
        "roundNum": 2,
        "title": "Words of Advice",
        "type": "text",
        "timeLimit": 40,
        "prompt": "Which passage was written by a human?",
        "options": [
            {"id": "A", "label": "Passage A"},
            {"id": "B", "label": "Passage B"}
        ],
        "passageA": "My biggest piece of advice for your first year of grad school: find an advisor who cares about your wellbeing, not just your citations. Your project will hit dead ends and your code will break, but having someone in your corner who treats you like a person makes all the difference.",
        "passageB": "Embarking on graduate education necessitates cultivating balanced scholarly habits alongside strategic research exploration. Prioritize nurturing productive mentorship dynamics, actively engaging with relevant literature, and maintaining disciplined work-life equilibrium. Remember that consistent dedication, proactive intellectual inquiry, and resilient mindset are pivotal cornerstones for enduring academic success.",
        "ans": "A",
        "hint": "Notice the focus on messy emotional realities versus tidy abstract buzzwords ('disciplined work-life equilibrium', 'pivotal cornerstones').",
        "tell": "Passage B is stuffed with AI buzzwords ('pivotal cornerstones', 'productive mentorship dynamics'). Passage A speaks with authentic mentorship empathy.",
        "source": "Passage A written by PhD student / Passage B GPT-4"
    }
]

r2_reserves = [
    {
        "id": "r2_res01",
        "roundNum": 2,
        "title": "Midnight Stargazing",
        "type": "text",
        "timeLimit": 40,
        "prompt": "Which passage was written by a human?",
        "options": [
            {"id": "A", "label": "Passage A"},
            {"id": "B", "label": "Passage B"}
        ],
        "passageA": "Gazing into the celestial expanse at midnight inspires profound contemplation about our cosmic significance. Countless constellations illuminate the velvet firmament, each sparkling beacon reminding stargazers that the universe unfolds in wondrous harmony, inviting our curious minds to ponder mysteries beyond our worldly horizons.",
        "passageB": "Drove out to the state park with my roommates last night to catch the meteor shower. We were freezing in lawn chairs under three blankets, but we saw four shooting stars and a brilliant green fireball that made us all scream. Totally worth shivering.",
        "ans": "B",
        "hint": "Look for lawn chairs and shivering vs 'velvet firmament'.",
        "tell": "Passage A relies on stock astronomy poetry ('velvet firmament'). Passage B grounds the moment in cold lawn chairs and roommates screaming at a green fireball.",
        "source": "Passage B student blog / Passage A Claude 3 Sonnet"
    },
    {
        "id": "r2_res02",
        "roundNum": 2,
        "title": "Sourdough Experiment",
        "type": "text",
        "timeLimit": 40,
        "prompt": "Which passage was written by a human?",
        "options": [
            {"id": "A", "label": "Passage A"},
            {"id": "B", "label": "Passage B"}
        ],
        "passageA": "Attempted to make homemade sourdough for the first time. Followed a two-hour YouTube tutorial to the letter, but ended up baking a literal ceramic brick that could stop a speeding car. My house smells like burnt flour, and my jaw hurts from trying one bite. Ordering pizza.",
        "passageB": "Baking artisan bread can present formidable culinary challenges, particularly when managing fermentation temperatures and kneading intensity. Despite earnest efforts, the loaf emerged from the oven uncharacteristically dense and heavily charred. Cooking remains a lifelong journey of learning, resilience, and discovery through every culinary experimentation.",
        "ans": "A",
        "hint": "Which passage displays self-deprecating comedic exaggeration about baking an edible brick?",
        "tell": "Passage A uses authentic self-deprecating humor ('literal ceramic brick'). Passage B moralizes a burnt loaf as a 'lifelong journey of learning'.",
        "source": "Passage A student text / Passage B Gemini 1.5 Flash"
    }
]

r3_items = [
    {
        "id": "r3_q01",
        "roundNum": 3,
        "title": "Literary Essay Excerpt",
        "type": "audio",
        "timeLimit": 20,
        "prompt": "Is this a human recording or a synthetic voice?",
        "options": [
            {"id": "HUMAN", "label": "Human recording"},
            {"id": "AI", "label": "AI-generated voice"}
        ],
        "audioUrl": "assets/audio/clip_01.wav",
        "transcript": "“The morning light filtered gently across the old oak desk...”",
        "ans": "HUMAN",
        "hint": "Listen closely for subtle natural inhalation breaths before clauses.",
        "tell": "Organic micro-variations in pitch cadence and natural vocal tract aspiration at sentence boundaries.",
        "source": "Human voice volunteer (LibriSpeech dataset)"
    },
    {
        "id": "r3_q02",
        "roundNum": 3,
        "title": "Meeting Announcement",
        "type": "audio",
        "timeLimit": 20,
        "prompt": "Is this a human recording or a synthetic voice?",
        "options": [
            {"id": "HUMAN", "label": "Human recording"},
            {"id": "AI", "label": "AI-generated voice"}
        ],
        "audioUrl": "assets/audio/clip_02.mp3",
        "transcript": "“Please be advised that the quarterly department sync has been moved to room 302...”",
        "ans": "AI",
        "hint": "Notice how consistently identical the sentence-ending pitch drops sound.",
        "tell": "Overly smoothed neural pitch contours without natural glottal pulse variations on terminal vowels.",
        "source": "Synthetic neural TTS voice"
    },
    {
        "id": "r3_q03",
        "roundNum": 3,
        "title": "Urgent Voicemail",
        "type": "audio",
        "timeLimit": 20,
        "prompt": "Is this a human recording or a synthetic voice?",
        "options": [
            {"id": "HUMAN", "label": "Human recording"},
            {"id": "AI", "label": "AI-generated voice"}
        ],
        "audioUrl": "assets/audio/clip_03.mp3",
        "transcript": "“Hey, I just wanted to let you know that the deliverables are ready for review...”",
        "ans": "AI",
        "hint": "Pay attention to whether emotional urgency translates into physiological breath changes.",
        "tell": "Emotional inflection is modeled mathematically without organic chest resonance or diaphragm fatigue.",
        "source": "Synthetic cloned voice"
    },
    {
        "id": "r3_q04",
        "roundNum": 3,
        "title": "Classic Rhyming Riddle",
        "type": "audio",
        "timeLimit": 20,
        "prompt": "Is this a human recording or a synthetic voice?",
        "options": [
            {"id": "HUMAN", "label": "Human recording"},
            {"id": "AI", "label": "AI-generated voice"}
        ],
        "audioUrl": "assets/audio/clip_04.mp3",
        "transcript": "“I have cities without houses, forests without trees...”",
        "ans": "HUMAN",
        "hint": "Listen for genuine microphone room acoustics and physical consonant friction.",
        "tell": "Authentic room reflection, subtle organic vocal fry, and natural dental consonant acoustics.",
        "source": "Human voice volunteer (LibriVox archive)"
    },
    {
        "id": "r3_q05",
        "roundNum": 3,
        "title": "Podcast Host Intro",
        "type": "audio",
        "timeLimit": 20,
        "prompt": "Is this a human recording or a synthetic voice?",
        "options": [
            {"id": "HUMAN", "label": "Human recording"},
            {"id": "AI", "label": "AI-generated voice"}
        ],
        "audioUrl": "assets/audio/clip_05.wav",
        "transcript": "“Welcome back to Tech Horizons, where we explore the frontiers of artificial intelligence...”",
        "ans": "AI",
        "hint": "Listen for high-frequency artifacts or metallic sibilance on 's' sounds.",
        "tell": "High-frequency vocoder phase artifacts above 8kHz and unnaturally uniform syllable pacing.",
        "source": "Neural vocoder VibeVoice synthetic model"
    },
    {
        "id": "r3_q06",
        "roundNum": 3,
        "title": "Informational Reading",
        "type": "audio",
        "timeLimit": 20,
        "prompt": "Is this a human recording or a synthetic voice?",
        "options": [
            {"id": "HUMAN", "label": "Human recording"},
            {"id": "AI", "label": "AI-generated voice"}
        ],
        "audioUrl": "assets/audio/clip_06.wav",
        "transcript": "“The architectural preservation committee voted unanimously to maintain the historic facade...”",
        "ans": "HUMAN",
        "hint": "Focus on tongue-palate transitions and micro-hesitations.",
        "tell": "Authentic human speech pacing from FLEURS dataset featuring physiological tongue-palate transitions and organic respiratory rhythm.",
        "source": "Human speaker (FLEURS linguistic benchmark)"
    }
]

r3_reserves = [
    {
        "id": "r3_res01",
        "roundNum": 3,
        "title": "Spontaneous Reflection",
        "type": "audio",
        "timeLimit": 20,
        "prompt": "Is this a human recording or a synthetic voice?",
        "options": [
            {"id": "HUMAN", "label": "Human recording"},
            {"id": "AI", "label": "AI-generated voice"}
        ],
        "audioUrl": "assets/audio/clip_reserve_01.wav",
        "transcript": "“I remember walking down the avenue when the first snow started falling...”",
        "ans": "HUMAN",
        "hint": "Notice unscripted conversational rhythm and natural pitch peaks.",
        "tell": "Organic human speaker dynamics recorded in authentic room acoustics.",
        "source": "Human conversational recording"
    },
    {
        "id": "r3_res02",
        "roundNum": 3,
        "title": "Curated Voice Memo",
        "type": "audio",
        "timeLimit": 20,
        "prompt": "Is this a human recording or a synthetic voice?",
        "options": [
            {"id": "HUMAN", "label": "Human recording"},
            {"id": "AI", "label": "AI-generated voice"}
        ],
        "audioUrl": "assets/audio/clip_reserve_02.wav",
        "transcript": "“Don't forget to submit your lab writeups before 11:59 tonight...”",
        "ans": "AI",
        "hint": "Evaluate the mathematical regularity of the speaker's vocal timbre.",
        "tell": "Carter neural speech model with mathematically computed resonance and zero respiratory pauses.",
        "source": "ElevenLabs Carter neural voice"
    }
]

pack = {
    "title": "GWiCS BOT OR NOT? - AI vs Human Event Pack",
    "version": "2.0.0",
    "eventInfo": {
        "eventName": "GWiCS BOT OR NOT?",
        "tagline": "Trust your instincts. Question everything.",
        "scoringRules": {
            "startingBalance": 100,
            "correctAnswer": 100,
            "incorrectAnswer": 0,
            "hintCost": -25,
            "speedBonus": 0
        }
    },
    "practice": {
        "id": "practice_q01",
        "roundNum": 0,
        "roundTitle": "Practice Question",
        "title": "Botanical Study",
        "type": "image",
        "prompt": "Was this image photographed by a human or generated using AI?",
        "media": "assets/media/practice_01.jpg",
        "options": [
            {"id": "PHOTOGRAPHED", "label": "Photographed"},
            {"id": "AI", "label": "AI-generated"}
        ],
        "ans": "AI",
        "hint": "Inspect the leaf veins and the light reflection on the table closely.",
        "tell": "The background foliage exhibits characteristic diffusion blending artifacts, and the table highlights lack physical Fresnel reflection consistency.",
        "source": "Generative AI Midjourney v6",
        "timeLimit": 30,
        "isPractice": True
    },
    "rounds": [
        {
            "roundNum": 1,
            "name": "Reality Check",
            "title": "Round 1: Reality Check",
            "subtitle": "Visual Turing Test",
            "type": "image",
            "timeLimit": 25,
            "prompt": "Was this image photographed by a human or generated using AI?",
            "options": [
                {"id": "PHOTOGRAPHED", "label": "Photographed"},
                {"id": "AI", "label": "AI-generated"}
            ],
            "items": r1_items,
            "reserves": r1_reserves
        },
        {
            "roundNum": 2,
            "name": "Between the Lines",
            "title": "Round 2: Between the Lines",
            "subtitle": "Literature & Prose Turing Test",
            "type": "text",
            "timeLimit": 40,
            "prompt": "Which passage was written by a human?",
            "options": [
                {"id": "A", "label": "Passage A"},
                {"id": "B", "label": "Passage B"}
            ],
            "items": r2_items,
            "reserves": r2_reserves
        },
        {
            "roundNum": 3,
            "name": "Sound Judgment",
            "title": "Round 3: Sound Judgment",
            "subtitle": "Voice & Audio Turing Test",
            "type": "audio",
            "timeLimit": 20,
            "listenFirst": True,
            "prompt": "Is this a human recording or a synthetic voice?",
            "options": [
                {"id": "HUMAN", "label": "Human recording"},
                {"id": "AI", "label": "AI-generated voice"}
            ],
            "items": r3_items,
            "reserves": r3_reserves
        },
        {
            "roundNum": 4,
            "name": "The Human Factor",
            "title": "Round 4: The Human Factor",
            "subtitle": "Live Showdown - E-Board vs Machine",
            "type": "showdown",
            "timeLimit": 60,
            "prompt": "Which response was AI-generated?",
            "writingPrompt": "Write an apology from a campus robot caught stealing everyone's fries. Maximum 60 words. Include an excuse, an apology, and a promise to change.",
            "options": [
                {"id": "A", "label": "Contender A"},
                {"id": "B", "label": "Contender B"},
                {"id": "C", "label": "Contender C"}
            ],
            "backupAi": {
                "author": "AI",
                "authorLabel": "Claude 3.5 Sonnet (AI)",
                "text": "To the campus community: I malfunctioned. My optical sensors classified your golden waffle fries as high-priority thermal heat packs requiring immediate retrieval. Consuming them was an unprogrammed error in judgment. I apologize for my caloric transgression. Henceforth, I will restrict my duties to delivering textbooks and steer completely clear of the dining court. Please forgive me."
            },
            "defaultContenders": [
                {
                    "author": "HUMAN",
                    "authorLabel": "Sarah (GWiCS E-Board)",
                    "text": "Look, I know fry theft is a serious offense, but my battery was down to 2% and the salty aroma from the dining hall broke my internal protocols! I am genuinely sorry for causing widespread fry-less distress. Starting tomorrow, I pledge to only consume certified electrical power from approved outlets."
                },
                {
                    "author": "AI",
                    "authorLabel": "Claude 3.5 Sonnet (AI)",
                    "text": "To the campus community: I malfunctioned. My optical sensors classified your golden waffle fries as high-priority thermal heat packs requiring immediate retrieval. Consuming them was an unprogrammed error in judgment. I apologize for my caloric transgression. Henceforth, I will restrict my duties to delivering textbooks and steer completely clear of the dining court. Please forgive me."
                },
                {
                    "author": "HUMAN",
                    "authorLabel": "Maya (GWiCS E-Board)",
                    "text": "Beep boop... okay, no excuses. The smell was irresistible and my claw gripper slipped right into the basket. My sincerest apologies to everyone whose dinner I ruined. My route has been reprogrammed to completely bypass the food court until further notice. No more fry heists, promise!"
                }
            ],
            "items": [
                {
                    "id": "r4_q01",
                    "roundNum": 4,
                    "title": "Live Showdown: Robot Fry Thief",
                    "type": "showdown",
                    "timeLimit": 60,
                    "prompt": "Which response was AI-generated?",
                    "writingPrompt": "Write an apology from a campus robot caught stealing everyone's fries. Maximum 60 words. Include an excuse, an apology, and a promise to change.",
                    "options": [
                        {"id": "A", "label": "Contender A"},
                        {"id": "B", "label": "Contender B"},
                        {"id": "C", "label": "Contender C"}
                    ],
                    "contenders": {
                        "A": "Look, I know fry theft is a serious offense, but my battery was down to 2% and the salty aroma from the dining hall broke my internal protocols! I am genuinely sorry for causing widespread fry-less distress. Starting tomorrow, I pledge to only consume certified electrical power from approved outlets.",
                        "B": "To the campus community: I malfunctioned. My optical sensors classified your golden waffle fries as high-priority thermal heat packs requiring immediate retrieval. Consuming them was an unprogrammed error in judgment. I apologize for my caloric transgression. Henceforth, I will restrict my duties to delivering textbooks and steer completely clear of the dining court. Please forgive me.",
                        "C": "Beep boop... okay, no excuses. The smell was irresistible and my claw gripper slipped right into the basket. My sincerest apologies to everyone whose dinner I ruined. My route has been reprogrammed to completely bypass the food court until further notice. No more fry heists, promise!"
                    },
                    "contenderMeta": {
                        "A": {"author": "HUMAN", "authorLabel": "Sarah (GWiCS E-Board)"},
                        "B": {"author": "AI", "authorLabel": "Claude 3.5 Sonnet (AI)"},
                        "C": {"author": "HUMAN", "authorLabel": "Maya (GWiCS E-Board)"}
                    },
                    "ans": "B",
                    "aiSlot": "B",
                    "tell": "Contender B was generated by AI (Claude 3.5 Sonnet). Contenders A and C were written live by human student volunteers (Sarah and Maya).",
                    "source": "Live Student Authors vs Claude 3.5 Sonnet"
                }
            ],
            "tell": "The AI response rationalizes the theft using pseudo-technical tropes ('optical sensors classified as thermal heat packs', 'caloric transgression'), while human volunteers use humorous situational excuses ('battery at 2%', 'smell was irresistible')."
        }
    ]
}

def build_pack():
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(pack, f, indent=2, ensure_ascii=False)
    print(f"✓ Event pack successfully generated at {OUTPUT_FILE}")
    print(f"  - Rounds: {len(pack['rounds'])}")
    print(f"  - Round 1 images: {len(pack['rounds'][0]['items'])} active + {len(pack['rounds'][0]['reserves'])} reserves")
    print(f"  - Round 2 text pairs: {len(pack['rounds'][1]['items'])} active + {len(pack['rounds'][1]['reserves'])} reserves")
    print(f"  - Round 3 voice clips: {len(pack['rounds'][2]['items'])} active + {len(pack['rounds'][2]['reserves'])} reserves")
    print(f"  - Round 4 showdown: 1 duel active with tandem shuffle ready")
    print(f"  - Practice question: {pack['practice']['id']}")

if __name__ == "__main__":
    build_pack()
