/* ==========================================================================
   AN INSIDE LOOK — PORTFOLIO CONTENT
   --------------------------------------------------------------------------
   This is the ONLY file you need to edit to change words, images, links,
   documents and contact details. The interface code reads from it.

   QUICK RULES
   • Text goes between quotes:  "like this"
   • Leave a value as ""  (empty quotes) when you don't have it yet.
     The site will show a clearly marked placeholder, or hide the item.
   • Image paths are relative to the website folder. Each project has its
     own folder in assets/, named exactly like the project, e.g.
       "assets/The Pause Between/The Pause Between - Cover Image.png"
     (see README.md, section 4, for which filename goes in which section)
   • Every image keeps its full proportions (nothing is cropped) and can be
     clicked to view it larger.
   • Keep the commas between items. If the site goes blank after an edit,
     a missing comma or quote is the usual cause (see README.md).
   ========================================================================== */

window.PORTFOLIO = {

  /* ------------------------------------------------------------------------
     SITE-WIDE DETAILS
     ------------------------------------------------------------------------ */
  site: {
    title: "An Inside Look",
    name: "Taylor Giles",
    role: "Interior Design Student",
    program: "Honours Bachelor of Interior Design, Georgian College",

    // Your résumé PDF. Leave "" to keep the résumé button disabled.
    // Example: "assets/documents/taylor-giles-resume.pdf"
    resume: "",

    // Your public email address. Leave "" to hide the email link.
    email: "giles.taylor@yahoo.com",

    // Small line shown beneath the vanity. Set to "" to hide it.
    homeHint: "Click the drawers to see what lies inside",
    // The same line on phones / tablets held upright, where the room is
    // wider than the screen and visitors swipe to explore it.
    homeHintMobile: "Swipe to explore · Tap to discover",

    // The quiet link that opens the whole portfolio on one accessible page.
    listLinkText: "A Look Within",
    listLinkLabel: "A Look Within: view the whole portfolio as an accessible list",

    // The phone / tablet button that opens the list of drawers.
    exploreText: "Explore the Drawers"
  },

  /* ------------------------------------------------------------------------
     DRAWER ORDER — as the visitor sees the vanity
       top row:     introduction | projects       | philosophy
       middle row:  drawings     | thesis         | competitions
       bottom row:  experience   | socials        | contact
     Change the order here only if you want sections in different drawers.
     ------------------------------------------------------------------------ */
  drawers: [
    "introduction", "projects", "philosophy",
    "drawings", "thesis", "competitions",
    "experience", "socials", "contact"
  ],

  /* ------------------------------------------------------------------------
     THE NINE SECTIONS
     Every section has:
       label  – the name shown on the drawer and in menus
       title  – the large heading inside the panel
       accent – an optional short script word above the title ("" = none)
     ------------------------------------------------------------------------ */
  sections: {

    /* 1 ─ INTRODUCTION ───────────────────────────────────────────────────── */
    introduction: {
      label: "Introduction",
      title: "Introduction",
      accent: "hello",
      portrait: {
        show: false,                               // true = show a portrait beside the text
        src: "",                                 // e.g. "assets/images/taylor-giles-portrait.jpg"
        alt: "Portrait of Taylor Giles",
        placeholder: "Portrait photograph",
        ratio: "4 / 5",
        // Which part of the photo stays in view when it is cropped to the frame:
        // "horizontal% vertical%". 50% 30% = centred, a little above middle (face).
        // Raise the first number (e.g. 65%) to shift the crop right, away from
        // anything at the left edge of the photo.
        focus: "50% 30%"
      },
      // Soft background image on the right, blended into the page (same as
      // Design Philosophy and Socials). focus = which part stays in view.
      // ?v=… makes browsers fetch a replaced image instead of an old cached
      // copy: change the number whenever you replace the file.
      // dim (0–1) tones a bright photo down so it sits in the espresso page.
      backgroundImage: {
        src: "assets/introduction image.jpg?v=2026-11-09b",
        focus: "52% 58%",
        focusMobile: "50% 62%",
        dim: 0.3
      },
      // Provisional copy — edit freely.
      paragraphs: [
        "I’m Taylor Giles, an interior design student at Georgian College with an interest in creating thoughtful spaces that balance atmosphere, function, and the way people feel within them. My work explores how materials, light, and spatial planning can shape everyday experiences."
      ],
      // Software list and résumé button are hidden on this page for now.
      // To show them again: skills: ["Revit", "AutoCAD", "SketchUp", "Twinmotion"]
      // and showResume: true
      skillsHeading: "Software",
      skills: [],
      showResume: false
    },

    /* 2 ─ PROJECTS ───────────────────────────────────────────────────────── */
    projects: {
      label: "Projects",
      title: "Projects",
      accent: "",
      intro: "",   // optional sentence above the project list
      items: [

        /* The Pause Between */
        {
          id: "the-pause-between",
          title: "The Pause Between",
          projectType: "Academic healthcare design proposal",
          role: "",                                // to confirm, e.g. "Individual project"
          showFacts: false,                        // hides the Project type / My role row
          showTypeOnCard: false,                   // hides the project type under the title on its card
          summary: "An academic healthcare design proposal for the Royal Victoria Hospital main entrance waiting area.",
          // Images live in:  assets/The Pause Between/
          cover: {
            src: "assets/The Pause Between/The Pause Between - Cover Image.png",
            alt: "Aerial view of a curving timber mezzanine wrapping around a free-form pool, with stone paving, planters and soft lounge seating",
            placeholder: "Cover image", ratio: "4 / 3"
          },
          overview: [
            "An academic healthcare design proposal for the Royal Victoria Hospital main entrance waiting area. The concept reframes waiting as an opportunity for restoration through sensory calm, natural elements, and choices between connection and retreat."
          ],
          designIntent: [
            "The Pause Between reimagines the Royal Victoria Hospital’s main entrance waiting area as a place of comfort, connection, and restoration. Inspired by the calming qualities of a spa, the design brings together natural materials, soft lighting, greenery, and water-inspired elements to create a welcoming sensory experience. Spaces for gathering sit alongside quieter areas for retreat, giving visitors choice in how they spend their time. By supporting both connection and privacy, the design aims to ease the uncertainty of waiting and make moments of pause feel like a meaningful part of healing."
          ],
          // No "concept" list here, so the Concept imagery section is hidden.
          // Materials section (after Floor plans / Elevation, before Renderings).
          // Shown as equal circles, each photo cropped to fill its circle;
          // selecting one shows the full uncropped image.
          // Add a caption (e.g. "White oak flooring") to show a centred name beneath.
          materialImages: [
            { src: "assets/The Pause Between/materials (1).png", ratio: "1536 / 1521", caption: "",
              alt: "Material sample: light honey-toned wood plank flooring" },
            { src: "assets/The Pause Between/materials (2).png", ratio: "1536 / 1514", caption: "",
              alt: "Material sample: pale grey terrazzo-look tile with light stone chips" },
            { src: "assets/The Pause Between/materials (3).png", ratio: "1536 / 1026", caption: "",
              alt: "Material sample: rough-textured grey natural stone" },
            { src: "assets/The Pause Between/materials (4).png", ratio: "1536 / 1158", caption: "",
              alt: "Material sample: deep green moss with a small leafy plant" }
          ],
          // Dedicated Floor plans and Elevation sections (shown before the
          // renderings, each drawing full width on a white sheet, click to zoom).
          // ratio = width / height in pixels; keeps tall sheets from growing
          // taller than the screen.
          floorPlans: [
            { src: "assets/The Pause Between/floor plan.png", ratio: "1058 / 1486", caption: "",
              alt: "Floor plan sheet with three levels. Main level: pool, fireplace lounge, red light therapy rooms, health café and bar, reception and sanitation, front lounge, vestibule and exterior patio. Second level: cold plunge and saunas. Third level: mezzanine lounge and changerooms. Scale: not to scale." }
          ],
          elevations: [
            { src: "assets/The Pause Between/elevation.png", caption: "",
              alt: "Rendered interior elevation across the full atrium: stacked lounge levels with elevators, a double-height café, and a reception wall reading Welcome to RVH beneath suspended pendant lights" }
          ],
          // Renderings gallery, laid out in rows: images marked wide: true get a
          // row to themselves; the others sit in pairs, sized so each pair is the
          // same height. ratio = the image's width / height in pixels (keeps
          // every image at its true proportions, never cropped).
          renderings: [
            { src: "assets/The Pause Between/The pause beween - rendering (4).png", ratio: "927 / 361", wide: true,
              alt: "Multi-level atrium with curving glass-railed mezzanines, lounge seating and a waterfall wall, overlooking a snowy waterfront", caption: "" },
            { src: "assets/The Pause Between/The pause beween - rendering (1).png", ratio: "464 / 375",
              alt: "Outdoor waiting lounge with a suspended fireplace, soft lounge chairs and blue ottomans, opening onto a terrace", caption: "" },
            { src: "assets/The Pause Between/The pause beween - rendering (2).png", ratio: "497 / 375",
              alt: "Row of barrel saunas against a rough stone wall, with a hot and cold area sign, robes and a planted pebble border", caption: "" },
            { src: "assets/The Pause Between/The pause beween - rendering (3).png", ratio: "510 / 375",
              alt: "Poolside loungers with folded towels on timber decking beside a curved pool and a timber footbridge", caption: "" },
            { src: "assets/The Pause Between/The pause beween - rendering (6).png", ratio: "543 / 375",
              alt: "Café seating beneath a sculptural wave-like timber ceiling, with fluted columns and a curved banquette", caption: "" },
            { src: "assets/The Pause Between/The pause beween - rendering (5).png", ratio: "928 / 361", wide: true,
              alt: "Lounge and café bar beside a glass water wall with planting, under a slatted timber ceiling", caption: "" }
          ],
          pdf: ""                                  // e.g. "assets/documents/the-pause-between.pdf"
        },

        /* La Paella Restaurante — images in assets/La Paella/ */
        {
          id: "la-paella-restaurante",
          title: "La Paella Restaurante",
          projectType: "Academic restaurant design concept",
          role: "",
          showFacts: false,                        // hides the Project type / My role row
          showTypeOnCard: false,                   // hides the project type under the title on its card
          summary: "An academic Spanish restaurant design concept drawing on warm tavern interiors.",
          // Cover: the Projects overview image and the opening image of the page.
          cover: {
            src: "assets/La Paella/la paella cover.png",
            alt: "Rendering of La Paella: vaulted limestone arches over the dining room, a curved black leather banquette around a red-veined marble table, and a marble host stand",
            focus: "50% 55%"
          },
          overview: [
            "This sophisticated and moody Spanish restaurant embodies the drama, mystery, and warmth of Spain’s historic taverns and architecture. Inspired by traditional Spanish haciendas, the design features vaulted ceilings, arched passageways, and intricate detailing that convey a sense of timeless elegance. Authentic natural limestone walls anchor the space, while a rich, layered material palette in deep, warm tones fosters intimacy and evokes an old-world charm."
          ],
          designIntent: [],                        // add paragraphs to show a Design intent section
          // Drawings: full sheets on white, at their own proportions; select to zoom.
          floorPlans: [
            { src: "assets/La Paella/floor plan.png", ratio: "1164 / 594", caption: "",
              alt: "Floor plan of La Paella: bar with a U-shaped counter, dining room with a curved banquette and square tables, booths, kitchen, office, storage room, staff washroom, bathroom and hallway" },
            { src: "assets/La Paella/rendered floor plan.png", ratio: "1018 / 402", caption: "",
              alt: "Rendered floor plan of La Paella showing limestone flooring, marble bar and tables, burgundy seating and the kitchen" }
          ],
          keyPlans: [],                            // add a key plan image here to show a Key plan section
          moodBoard: [
            { src: "assets/La Paella/mood board.png", ratio: "848 / 740", caption: "",
              alt: "La Paella mood board: deep navy and plum colour swatches, a brass ring chandelier, violet-veined and red-veined marbles, limestone, a black marble bar with a fluted front and a La Paella sign, and a black upholstered bar stool" }
          ],
          // Swatches cropped from the mood board, shown as equal circles.
          // Add a caption (e.g. "Calacatta Viola marble") to name each one.
          materialImages: [
            { src: "assets/La Paella/material - violet marble.png", ratio: "1", caption: "", alt: "Material sample: white marble with deep violet veining" },
            { src: "assets/La Paella/material - rosso marble.png", ratio: "1", caption: "", alt: "Material sample: deep red marble with white veining" },
            { src: "assets/La Paella/material - limestone.png", ratio: "1", caption: "", alt: "Material sample: warm natural limestone" },
            { src: "assets/La Paella/material - plum.png", ratio: "1", caption: "", alt: "Material sample: deep plum" }
          ],
          // Renderings in rows of two, each pair the same height; nothing is cropped.
          renderings: [
            { src: "assets/La Paella/la paella rendering (3).png", ratio: "518 / 336", caption: "",
              alt: "Marble bar beneath a textured limestone ceiling and a large pendant, with high stools and windows to a waterfront skyline" },
            { src: "assets/La Paella/la paella rendering (1).png", ratio: "608 / 400", caption: "",
              alt: "Limestone-walled dining room with burgundy chairs, marble tables and a long marble bar with a lit wine wall" },
            { src: "assets/La Paella/la paella rendering (2).png", ratio: "461 / 336", caption: "",
              alt: "Arched limestone passageways with a column, wall sconces and marble-topped tables" },
            { src: "assets/La Paella/la paella rendering (4).png", ratio: "364 / 400", caption: "",
              alt: "Dining room under a vaulted arch with burgundy armchairs, marble tables and glowing pendant lights" },
            { src: "assets/La Paella/la paella rendering.png", ratio: "501 / 647", caption: "",
              alt: "Classical columns with carved capitals beside marble tables and burgundy chairs, under a dark slatted ceiling" },
            { src: "assets/La Paella/la paella rendering (5).png", ratio: "307 / 372", caption: "",
              alt: "Curved black banquettes around red-veined marble tables, with limestone walls and brass wall sconces" }
          ],
          pdf: ""
        },

        /* Georgian College D Building Remodel — in progress */
        {
          id: "d-building-remodel",
          title: "Georgian College D Building Remodel",
          projectType: "",
          showTypeOnCard: false,
          summary: "A student residence reimagining campus living.",
          rowNote: "In the works",                 // small capitals under the title
          // No cover yet: "Coming Soon" in calligraphy fills the image area.
          coverText: "Coming Soon",
          cover: { src: "", alt: "", placeholder: "Cover image" },
          // "View project" opens this scroll (same design as the Thesis drawer).
          // Delete this block when the project is ready to show its full page.
          comingSoonPage: {
            eyebrow: "Georgian College D Building Remodel",           // small capitals
            line: "Something thoughtful is in the works",             // calligraphy
            heading: "Coming Soon",                                   // large serif capitals
            projectTitle: "Student Residence",                        // calligraphy
            status: "Currently in development"                        // small capitals
          },
          overview: [],
          pdf: ""
        }
      ]
    },

    /* 3 ─ DESIGN PHILOSOPHY ──────────────────────────────────────────────── */
    philosophy: {
      label: "Design Philosophy",
      title: "Design Philosophy",
      accent: "in my words",
      // Provisional copy — edit freely.
      paragraphs: [
        "I believe thoughtful interiors begin with understanding how people want to feel and live within a space. My approach brings together function, atmosphere, and materiality to create environments that feel welcoming and purposeful. I’m interested in how light, nature, and opportunities for both connection and privacy can support everyday well-being."
      ],
      // Soft background image on the right of this section, fading into the
      // page. focus = which part stays in view ("horizontal% vertical%");
      // 38% 52% keeps the brass faucet and marble in frame.
      // Set src to "" to go back to the image boxes below.
      backgroundImage: {
        src: "assets/design philosophy image.jpg",
        focus: "38% 52%",
        focusMobile: "40% 50%"
      },
      // Only used when backgroundImage.src is "".
      images: [
        { src: "", alt: "", caption: "", placeholder: "Supporting detail image" },
        { src: "", alt: "", caption: "", placeholder: "Supporting detail image" }
      ]
    },

    /* 4 ─ TECHNICAL DRAWINGS ─────────────────────────────────────────────── */
    drawings: {
      label: "Technical Drawings",
      title: "Technical Drawings",
      accent: "",
      intro: "",
      // THE DRAWING SET — fills this whole drawer as a turnable set of sheets.
      // Each sheet was rendered from the PDF at two sizes: image (2400px,
      // for turning) and hd (4800px, for zooming into details).
      // To use a new PDF: render its pages the same way, update the list below.
      // Remove this whole "set" block to go back to the category tiles below.
      set: {
        title: "Project Modunest",
        subtitle: "Working drawing package",
        pdf: "assets/Taylor Giles - Working Drawing Package.pdf",
        sheets: [
          { number: "ID",     name: "Cover sheet",                     image: "assets/drawings/working-drawing-package/sheet-01.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-01.jpg" },
          { number: "ID-0",   name: "Site plan",                       image: "assets/drawings/working-drawing-package/sheet-02.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-02.jpg" },
          { number: "ID-1",   name: "Existing plan",                   image: "assets/drawings/working-drawing-package/sheet-03.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-03.jpg" },
          { number: "ID-1.1", name: "Partition plan",                  image: "assets/drawings/working-drawing-package/sheet-04.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-04.jpg" },
          { number: "ID-1.2", name: "Furniture plan",                  image: "assets/drawings/working-drawing-package/sheet-05.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-05.jpg" },
          { number: "ID-1.3", name: "Reflected ceiling plan",          image: "assets/drawings/working-drawing-package/sheet-06.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-06.jpg" },
          { number: "ID-1.4", name: "Power and communication plan",    image: "assets/drawings/working-drawing-package/sheet-07.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-07.jpg" },
          { number: "ID-2",   name: "Interior elevations and section", image: "assets/drawings/working-drawing-package/sheet-08.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-08.jpg" },
          { number: "ID-3",   name: "Wall details",                    image: "assets/drawings/working-drawing-package/sheet-09.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-09.jpg" },
          { number: "ID-4",   name: "Door and window schedule",        image: "assets/drawings/working-drawing-package/sheet-10.jpg", hd: "assets/drawings/working-drawing-package/sheet-hd-10.jpg" }
        ]
      },
      // For each drawing: image = a high-resolution PNG/JPG (2400px+ wide is ideal),
      // pdf = optional full-quality PDF. Select any drawing to view it full size.
      categories: [
        { label: "Floor plans", items: [
          { title: "", project: "", image: "", pdf: "", caption: "", placeholder: "Floor plan" },
          { title: "", project: "", image: "", pdf: "", caption: "", placeholder: "Floor plan" }
        ]},
        { label: "Reflected ceiling plans", items: [
          { title: "", project: "", image: "", pdf: "", caption: "", placeholder: "Reflected ceiling plan" }
        ]},
        { label: "Interior elevations", items: [
          { title: "", project: "", image: "", pdf: "", caption: "", placeholder: "Interior elevation" },
          { title: "", project: "", image: "", pdf: "", caption: "", placeholder: "Interior elevation" }
        ]},
        { label: "Sections and details", items: [
          { title: "", project: "", image: "", pdf: "", caption: "", placeholder: "Section or detail" }
        ]},
        { label: "Millwork drawings", items: [
          { title: "", project: "", image: "", pdf: "", caption: "", placeholder: "Millwork drawing" }
        ]}
      ]
    },

    /* 5 ─ THESIS PROJECT ─────────────────────────────────────────────────── */
    thesis: {
      label: "Thesis Project",

      // COMING SOON — while the thesis is in development, this drawer shows
      // an elegant "coming soon" page instead of the full project below.
      // When your thesis is ready, change  enabled: true  to  enabled: false
      // and everything further down (title, chapters, galleries) will appear.
      comingSoon: {
        enabled: true,
        // The six lines on the rolled letter, top to bottom.
        eyebrow: "Thesis Project",                                   // small capitals
        line: "Something thoughtful is in the works",                // calligraphy
        heading: "Coming Soon",                                      // large serif capitals
        projectTitle: "The Place to Be",                             // calligraphy
        projectSubtitle: "A youth hub for connection & everyday wellness",
        status: "Currently in development"                           // small capitals
      },

      title: "The Place to Be",
      accent: "thesis",
      subtitle: "An Inclusive Youth Hub for Nature, Connection and Everyday Wellness",
      status: "Ongoing thesis proposal",
      summary: [
        "An ongoing thesis proposal for an accessible, everyday environment for young people aged approximately 14–24.",
        "Its focus is choice: visitors can participate, observe, socialize, study, move, connect with nature, or retreat without being forced to join an activity. The proposal explores belonging, nature connection, sensory comfort, and personal agency within an everyday youth environment rather than a clinical treatment facility."
      ],
      themes: ["Belonging", "Nature connection", "Sensory comfort", "Personal agency"],
      // The six chapters. Empty paragraphs/images show as placeholders.
      chapters: [
        {
          heading: "The question",
          paragraphs: [],
          placeholder: "State the thesis question in your own words."
        },
        {
          heading: "The concept",
          paragraphs: [
            "A youth hub built around choice — where participating, observing, socializing, studying, moving, connecting with nature, and retreating are all equally valid ways to spend time."
          ],
          placeholder: "Expand on the concept."
        },
        {
          heading: "Research and insights",
          paragraphs: [],
          placeholder: "Add research findings, precedents and citations.",
          citations: []                            // e.g. "Author, A. (Year). Title. Publisher."
        },
        {
          heading: "Proposed program",
          paragraphs: [],
          // Ways of being in the space, from the thesis focus on choice:
          list: ["Participate", "Observe", "Socialize", "Study", "Move", "Connect with nature", "Retreat"],
          placeholder: "Add the proposed spaces and program areas when defined."
        },
        {
          heading: "Design development",
          paragraphs: [],
          placeholder: "Add sketches, diagrams and process work.",
          images: [
            { src: "", alt: "", caption: "", placeholder: "Development sketch" },
            { src: "", alt: "", caption: "", placeholder: "Diagram" }
          ]
        },
        {
          heading: "Drawings and visualizations",
          paragraphs: [],
          placeholder: "Add plans, sections and visualizations as the design progresses.",
          images: [
            { src: "", alt: "", caption: "", placeholder: "Plan or section" },
            { src: "", alt: "", caption: "", placeholder: "Visualization" }
          ]
        }
      ]
    },

    /* 6 ─ COMPETITIONS ───────────────────────────────────────────────────── */
    competitions: {
      label: "Competitions",
      title: "Competitions",
      accent: "",
      items: [
        {
          id: "inferra",
          title: "Inferra",
          kind: "Fire-feature design concept",
          competition: "",                         // to confirm: competition name / organiser / year (shown once filled in)
          brief: [],                               // to confirm (section appears once filled in)
          // Line under the title, from the presentation board.
          tagline: "Where earth meets fire and individuals gather to connect.",
          // Cover: the rooftop rendering, cropped from board 1 (assets/inferra/).
          // Shown in the Competitions overview row and at the top of the page.
          cover: {
            src: "assets/inferra/inferra-cover.jpg",
            alt: "Rendering of the Inferra firepit on a rooftop terrace at dusk: a dark sculptural stone body with a central flame and a glowing lava channel, surrounded by lounge seating and a city skyline",
            focus: "50% 62%"
          },
          concept: [
            "A fire-feature design concept exploring a sculptural fire bowl and an illuminated lava-inspired channel."
          ],
          // The two full presentation boards, shown whole (never cropped) in order.
          // Originals: assets/inferra competition 1.png and 2.png.
          boards: [
            { src: "assets/inferra/inferra-board-1.jpg", caption: "Board 1 · Concept, finishes and rendering",
              alt: "Inferra presentation board 1: rooftop rendering with the Inferra title, the concept description, finish options (textured glass, moonlight, charcoal, mocha, lava rocks, river stones) and a product rendering" },
            { src: "assets/inferra/inferra-board-2.jpg", caption: "Board 2 · Technical details",
              alt: "Inferra presentation board 2: estimated cost breakdown, controls, lighting, sustainability and heating element notes, interior access and section drawings, features, plan, elevation and isometric views, and a plaza rendering" }
          ],
          // Add real images here and they appear as their own galleries.
          sketches: [],
          renderings: [],
          features: [
            "Sculptural fire bowl",
            "Illuminated lava-inspired channel"
          ],
          future: []                               // to confirm
        },
        {
          id: "cairvia",
          title: "Cairvia",
          kind: "Electric fondue concept",
          // Small label under the title while the project is in development.
          // Delete these lines (or set them to "") when Cairvia is complete.
          comingSoon: "Coming Soon",
          comingSoonNote: "Currently in development.",
          // "View project" opens this scroll (same design as the Thesis drawer).
          // Delete this block when Cairvia is complete to show its full page.
          comingSoonPage: {
            eyebrow: "Cairvia",                                          // small capitals
            line: "Something extraordinary is in the works",             // calligraphy
            heading: "Coming Soon",                                      // large serif capitals
            projectSubtitle: "A sculptural fondue experience",           // serif
            status: "Currently in development"                           // small capitals
          },
          competition: "",
          brief: [],
          concept: [
            "A compact, sculptural electric fondue concept inspired by Canadian stone landscapes, cairns, and conviviality.",
            "It unfolds into a tabletop dining experience, with serving components arranged around a central cooking vessel."
          ],
          sketches: [
            { src: "", alt: "", caption: "", placeholder: "Development sketch" },
            { src: "", alt: "", caption: "", placeholder: "Development sketch" }
          ],
          renderings: [
            { src: "", alt: "", caption: "", placeholder: "Product rendering" },
            { src: "", alt: "", caption: "", placeholder: "Product rendering" }
          ],
          features: [
            "Sculptural form inspired by Canadian stone landscapes and cairns",
            "Unfolds into a tabletop dining experience",
            "Serving components arranged around a central cooking vessel",
            "One heating element, serving the central cooking vessel"
          ],
          future: []
        }
      ]
    },

    /* 7 ─ PROFESSIONAL EXPERIENCE ────────────────────────────────────────── */
    experience: {
      label: "Professional Experience",
      title: "Professional Experience",
      accent: "",
      // Soft background image on the right, blended into the page (same as
      // Introduction, Design Philosophy, Socials and Get in Touch).
      backgroundImage: {
        src: "assets/professional experience image.jpg?v=2026-11-09",
        focus: "50% 58%",
        focusMobile: "50% 62%",
        dim: 0.22
      },
      position: "Junior Designer, Co-op",
      employer: "t-squared design studio inc.",
      supervisor: "Terry Ledger",
      supervisorLabel: "Supervisor",
      location: "Muskoka",
      dates: "May–August 2026",
      intro: [
        "During my summer co-op at t-squared design studio inc., I gained hands-on experience supporting residential design projects in Muskoka. Working with Terry Ledger, I helped prepare drawings, attended site visits, and observed how design decisions develop through construction. The placement strengthened my technical drawing skills, attention to detail, and understanding of coordination between clients, designers, and trades."
      ],
      responsibilities: [
        "Assisted with preparing and revising drawings for permit submissions.",
        "Attended site visits to review project progress and observe construction.",
        "Supported client communication and project coordination.",
        "Assisted with sun and wind studies to inform design decisions.",
        "Coordinated drawing updates in response to client and trade feedback.",
        "Organized project information and managed assigned tasks and deadlines."
      ],
      // Approved project images: add real images here and a gallery appears.
      images: [],
      showResume: false                            // true = show the résumé button again
    },

    /* 8 ─ SOCIALS ────────────────────────────────────────────────────────── */
    socials: {
      label: "Socials",
      title: "Socials",
      accent: "",
      intro: "",
      // Soft background image on the right, blended into the page (same as
      // Design Philosophy). focus = which part stays in view. "" = no image.
      backgroundImage: {
        src: "assets/socials image.jpg",
        focus: "48% 42%",
        focusMobile: "45% 30%"
      },
      // Links stay hidden until you add a real URL (starting with https://).
      links: [
        { platform: "LinkedIn",  handle: "Taylor Giles",       url: "https://www.linkedin.com/in/taylor-giles-845471361/" },
        { platform: "Instagram", handle: "@taylorgilesdesign", url: "https://www.instagram.com/taylorgilesdesign/" },
        { platform: "Pinterest", handle: "@taygiless",         url: "https://ca.pinterest.com/taygiless/projects/" },
        { platform: "Behance",   handle: "",                   url: "" }
      ]
    },

    /* 9 ─ GET IN TOUCH ───────────────────────────────────────────────────── */
    contact: {
      label: "Get in Touch",
      title: "Get in Touch",
      accent: "let’s connect",
      // Provisional invitation — edit freely.
      // Soft background image on the right, blended into the page (same as
      // Introduction, Design Philosophy and Socials). focus = which part stays
      // in view; dim (0–1) tones a bright photo down. "" = no image.
      backgroundImage: {
        src: "assets/get in touch image.jpg?v=2026-11-09",
        focus: "52% 48%",
        focusMobile: "55% 50%",
        dim: 0.22
      },
      invitation: "Thank you for taking an inside look. If you’d like to talk about my work or an opportunity, I’d love to hear from you.",
      // Optional contact form. A static website cannot send email by itself.
      // To switch the form on, create a form at a service such as Formspree,
      // then paste its endpoint URL here, e.g. "https://formspree.io/f/abcdwxyz".
      // While this is "", the form is shown but clearly disabled.
      showForm: true,
      formEndpoint: ""
    }
  }
};
