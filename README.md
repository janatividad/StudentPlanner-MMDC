# Student Planner MMDC

MMDC coursework is spread across Camu, the school portal, Coursera, shared drives, email, and meeting tools. Finding the right syllabus, recording, or submission link takes repeated trips between tabs, and deadlines are easy to miss when each subject is tracked separately.

The primary user is Angelo, an MMDC BSIT Software Development student studying around work in Tokyo. The planner is designed to work comfortably on both desktop and mobile (iPhone). Later releases can serve other MMDC students with private accounts and cloud synchronization.

---

## 📁 Code Structure

The project follows a clean separation of concerns designed by professional software engineering standards. The active focus is currently 100% on the **Frontend UI layer**, while **Backend** and **Archive** structures are established cleanly.

```text
StudentPlanner-MMDC/
│
├── frontend/                          # 🚀 ACTIVE FOCUS: Modular Frontend UI
│   ├── index.html                     # Semantic application entry point
│   ├── package.json                   # Frontend metadata & run scripts
│   ├── assets/                        # Static assets, icons, and media
│   ├── css/                           # Modular CSS Architecture
│   │   ├── variables.css              # Design tokens (colors, light/dark themes, spacing)
│   │   ├── base.css                   # CSS reset, typography, and utility classes
│   │   ├── layout.css                 # Shell layout, sticky/drawer sidebar & responsive grids
│   │   ├── components.css             # Buttons, tables, cards, modals, chips, status pills
│   │   └── main.css                   # Main stylesheet entry bundling all CSS modules
│   └── js/                            # Modular ES6+ JavaScript Architecture
│       ├── app.js                     # Application entry point & lifecycle bootstrapper
│       ├── state.js                   # Reactive state manager with localStorage persistence
│       ├── router.js                  # Hash-based routing & view coordinator
│       ├── events.js                  # Centralized event listeners, inputs & drag-and-drop
│       ├── utils/
│       │   └── helpers.js             # Date helpers (Asia/Manila TZ), sanitization, formatting
│       └── views/                     # Componentized UI View Renderers
│           ├── dashboardView.js       # Main dashboard, project summary & assignment tables
│           ├── subjectView.js         # Subject details & dynamic custom property editor
│           ├── assignmentView.js      # Add/Edit assignment form with validation
│           ├── sidebarView.js         # Sidebar navigation & project menus
│           ├── pageView.js            # General notes & documentation pages
│           └── modalView.js           # Accessible confirmation modal dialogs
│
├── backend/                           # ⏳ ROADMAP: API & Service Scaffolding (Not yet implemented)
│   ├── README.md                      # Backend API specification & database roadmap
│   ├── package.json                   # Backend service package manifest
│   └── src/
│       ├── server.js                  # API server entry point placeholder
│       ├── config/                    # Database and environment configurations
│       ├── controllers/               # Request controllers (assignments, subjects)
│       ├── models/                    # Data models & entity schemas
│       ├── routes/                    # REST API route declarations
│       └── services/                  # Business logic & data access services
│
├── archive/                           # 📦 HISTORICAL BACKUP
│   └── legacy-monolith/
│       └── Study Planner MMDC.html    # Original single-file prototype (safely archived)
│
├── index.html                         # Root redirect to frontend
├── server.js                          # Zero-dependency local Node.js development server
├── package.json                       # Root development scripts
├── .gitignore                         # Standard Git ignore list
└── README.md                          # Project documentation & architecture overview
```

---

## 🛠️ Technology Stack

> **Current Strategy:** Priority is strictly focused on building and refining the **Frontend UI**. Backend services and databases are documented in the roadmap below but are **not yet implemented**.

### Phase 1: Current Active Frontend Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Markup & Semantics** | HTML5 | Accessible landmark roles, dialogs, semantic tags |
| **Styling & Design** | CSS3 (Modular) | Custom Properties (variables), Light/Dark theme media queries, Flexbox & CSS Grid |
| **Client Logic** | JavaScript (ES6+ Modules) | Native ES modules, componentized views, centralized event delegation, zero external runtime libraries |
| **Routing** | Hash Router (`#`) | Client-side view switching (`#`, `#project-:id`, `#subject-:id`, `#new`, `#edit-:id`) |
| **Client Storage** | Browser `localStorage` | Reactive in-memory state with automatic browser persistence & schema migration |
| **Device Optimization** | Mobile-First Responsive | iOS viewport fit (`viewport-fit=cover`), safe-area insets, sliding drawer sidebar |
| **Local Dev Server** | Native Node.js (`node:http`, `node:fs`) | Built-in zero-dependency local server (`server.js`), no npm package downloads needed |

---

### Phase 2: Planned Future Stack (Roadmap Only — Not Yet Implemented)

| Component | Target Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React + TypeScript | Migration target when app complexity warrants component state management |
| **Mobile Access** | Progressive Web App (PWA) | Installable on iPhone / iOS home screen with offline capability |
| **Backend Runtime** | Node.js (Express / Fastify) | RESTful API to handle multi-user accounts and data synchronization |
| **Database** | PostgreSQL | Relational database for subjects, coursework, and user accounts |
| **Database Hosting** | Supabase (Free Tier) | Managed PostgreSQL instance with secure connection pooling |
| **Cloud Infrastructure** | AWS / Vercel | Scalable cloud hosting for backend services and web distribution |
| **Version Control** | Git & GitHub | Source code management and CI/CD pipelines |
| **Engineering Tools** | Gemini (Antigravity), Codex, Herdr | AI implementation, automated review, and terminal workflows |

---

## 🎨 Frontend Features

- **Decoupled Architecture**: Fully separated HTML, modular CSS files, and view-based JavaScript modules.
- **Client-Side State**: Automatic persistence using `localStorage` with version-migration support (v1/v2 to v3).
- **Responsive Layout**: Full sticky sidebar on desktop, automatic touch-friendly sliding drawer on mobile/iPhone.
- **Theme Support**: Seamless Light / Dark theme adapting to system preferences (`prefers-color-scheme`).
- **Accessibility (a11y)**: Semantic HTML, ARIA attributes, keyboard navigation for reordering, and screen-reader announcements (`aria-live`).
- **Dynamic Property Editor**: Drag-and-drop property reordering with keyboard fallbacks (`ArrowUp` / `ArrowDown`).

---

## 🚀 Getting Started

The project includes a built-in, zero-dependency development server that requires **no external npm packages or installations**:

```bash
# Start the local development server
npm start
```

Or start directly with Node.js:

```bash
node server.js
```

Then open your browser at:
👉 **`http://localhost:3000/`**
