# Design System — Student Planner MMDC

> **Status:** Authoritative (Source of Truth)  
> **Target Platforms:** Desktop & Mobile (Responsive Web / iPhone Safari)  
> **Architecture:** Pure Native CSS3 & Semantic HTML5 (No external UI frameworks)

---

## 1. Principles & Vision

1. **Academic Clarity & Low Cognitive Load**:  
   Coursework across MMDC involves multiple platforms (Camu, Coursera, Google Drive, email). The planner's UI must remain clean, predictable, and distraction-free. Information density should be balanced with generous whitespace.
2. **Immediate Feedback & Zero Friction**:  
   Edits to subjects, titles, notes, and properties save reactively. Actions provide clear visual and audible/screen-reader confirmation.
3. **Ergonomic on Desktop and Mobile**:  
   Designed for desktop multi-window workflows with a sticky sidebar, and optimized for iPhone one-handed navigation with touch-friendly targets (minimum 44px touch height) and safe-area insets.
4. **Accessibility First (WCAG 2.1 AA Compliant)**:  
   High contrast, fully visible focus rings, native semantic landmarks, accessible keyboard alternatives for drag-and-drop, and polite screen-reader announcements.

---

## 2. Design Tokens (Colors & Theming)

The design system uses CSS Custom Properties declared in `:root`. Dark theme activates automatically based on `prefers-color-scheme: dark` and respects `[data-theme="light"]` overrides.

### 2.1 Neutral & Surface Tokens

| Token | Light Theme Value | Dark Theme Value | Usage |
| :--- | :--- | :--- | :--- |
| `--canvas` | `#FFFFFF` | `#191919` | Application base background |
| `--surface` | `#F7F8FA` | `#202020` | Sidebar, table headers, elevated cards |
| `--hover` | `#F1F3F7` | `#262626` | Interactive hover background on rows/buttons |
| `--text` | `#1B2430` | `#E8E8E8` | Primary text and headings |
| `--muted` | `#6B7280` | `#9B9B9B` | Subtext, timestamps, placeholders, table headers |
| `--border` | `#E3E7EE` | `#333333` | Structural dividers, table borders, card borders |
| `--input` | `#64748B` | `#8A94A6` | Unfocused form field borders |

### 2.2 Brand & Accent Tokens

| Token | Light Theme Value | Dark Theme Value | Usage |
| :--- | :--- | :--- | :--- |
| `--accent` | `#1D4ED8` (Blue 700) | `#6B93FF` (Blue 400) | Primary buttons, active focus rings, link accents |
| `--accent-text` | `#FFFFFF` | `#0B1220` | Text/icon contrast color on primary accent backgrounds |

### 2.3 Semantic Status & Urgency Tokens

| Status / Urgency | Foreground Token | Foreground Value (Light / Dark) | Background Token | Background Value (Light / Dark) |
| :--- | :--- | :--- | :--- | :--- |
| **Not Started** | `--g` | `#4B5563` / `#B8B8B8` | `--gbg` | `#EEF0F4` / `#333333` |
| **In Progress** | `--b` | `#1E40AF` / `#93B4FF` | `--bbg` | `#DBEAFE` / `#1E2F57` |
| **Done / Completed** | `--ok` | `#166534` / `#86EFAC` | `--okbg` | `#DCFCE7` / `#14391F` |
| **Overdue / Urgent** | `--od` | `#991B1B` / `#FCA5A5` | `--odbg` | `#FEE2E2` / `#4A1D1D` |
| **Due Soon (≤ 7 days)** | `--soon` | `#92400E` / `#FCD34D` | `--soonbg` | `#FEF3C7` / `#433512` |

---

## 3. Typography & Text Hierarchy

Primary font stack:
```css
font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```

### Scale & Hierarchy

| Element / Class | Size / Line Height | Weight | Letter Spacing | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `h1`, `.title` | 28px / 36px | 700 (Bold) | Normal | Page titles, project headers |
| `h2` | 20px / 28px | 600 (Semibold) | Normal | Section headings (`Subjects`, `Assignments`) |
| Base Body | 16px / 24px | 400 (Regular) | Normal | Inputs, form controls, primary content |
| Tables & `.si` | 14px / 20px | 400 / 500 / 600 | Normal | Sidebar navigation items, table data rows |
| `.meta` | 14px / 20px | 400 (Regular) | Normal | Dates, secondary info, helper descriptions |
| Section Header (`.sh`) | 12px / 16px | 600 (Semibold) | `0.04em` (Uppercase) | Sidebar category labels (`PROJECTS`) |
| `.tag` (Due soon/Overdue) | 12px / 16px | 600 (Semibold) | Normal | Urgency badges inside table cells |

---

## 4. Spacing, Geometry & Layout System

### 4.1 Border Radii
- **Tags & Badges (`.tag`)**: `4px`
- **Pills, Chips & Navigation Items (`.pill`, `.chip`, `.si`)**: `6px`
- **Buttons, Form Inputs & Card Wrappers (`button`, `input`, `.wrap`)**: `8px`
- **Modals & Dialog Cards (`.dlg`)**: `10px`

### 4.2 Touch Targets & Ergonomics
- **Desktop Min Interactive Height**: `36px` to `44px`
- **Mobile Touch Target Requirement**: Minimum `44px` height on all tap targets (`button`, `.si`, inputs, selects, links).
- **Safe Area Insets**:
  ```css
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  ```

### 4.3 Layout Grid & Breakpoints
- **Desktop (`> 720px`)**:
  - Sidebar: Fixed width `260px`, `sticky`, `height: 100dvh`.
  - Main Canvas: Centered, `max-width: 1040px`, padding `8px 16px 64px`.
- **Mobile (`≤ 720px`)**:
  - Sidebar: Off-canvas sliding drawer (`width: 280px`, `z-index: 20`, full viewport height, backdrop shadow).
  - Main Canvas: Full width fluid container with hamburger menu trigger in the top bar.

---

## 5. Component Specifications

### 5.1 Buttons (`button`, `.btn`)
- **Primary (`button.primary`, `.btn.primary`)**:
  - Background: `var(--accent)`
  - Text: `var(--accent-text)`
  - Used for the primary call-to-action on a screen (e.g., `+ Add assignment`, `Save assignment`).
- **Ghost (`button.ghost`)**:
  - Background: `transparent`, Border: `transparent`, Text: `var(--muted)`.
  - Used for secondary controls, icon buttons, and cancel actions.
- **Danger (`button.danger`)**:
  - Background: `var(--odbg)`, Border: `var(--od)`, Text: `var(--od)`.
  - Used inside alert confirmation dialogs (e.g., `Delete project`).

### 5.2 Status Pills & Due Urgency Tags
- **Status Dropdown / Badge (`.pill`)**:
  - Border radius `6px`, font size `14px`, font weight `500`.
  - Classes: `.ns` (Not started), `.ip` (In progress), `.dn` (Done).
- **Urgency Tag (`.tag`)**:
  - `.tag.od`: Overdue (due date < today).
  - `.tag.soon`: Due soon (due date within next 6 days).

### 5.3 Progress Bar (`.bar`)
- Width: `72px`, Height: `6px`, Radius: `3px`, Background: `var(--gbg)`.
- Fill Indicator (`.bar i`): Height `100%`, Background: `var(--accent)`.
- Companion text format: `X/Y · Z%` (e.g., `2/4 · 50%`).

### 5.4 Dynamic Property Row (`.prow`)
Used on subject pages to inspect and edit dynamic metadata (e.g., Coursera links, Credits, Syllabus):
- **Grid Layout**: `24px 200px 1fr 40px` with gap `2px 8px`.
- **Columns**:
  1. Drag handle (`.dh`): `⋮⋮` grab handle with hover/focus opacity transition.
  2. Property Label & Type Selector: Icon button showing type symbol (`≡`, `#`, `◉`, `🔗`, etc.) + inline text input.
  3. Value Field (`.v`): Dynamically renders based on type (URL input with "Open link" shortcut, Date picker, Chips for multi-select, Checkbox, Textarea).
  4. Delete Action (`.x`): Ghost removal button.
- **Drag Feedback**:
  - Dragging item: `opacity: 0.4` (`.prow.drag`).
  - Drop indicators: `box-shadow: 0 -2px 0 var(--accent)` (top) or `box-shadow: 0 2px 0 var(--accent)` (bottom).

### 5.5 Dialogs & Modals (`.scrim`, `.dlg`)
- **Scrim**: `fixed inset: 0`, background `rgba(0,0,0,0.45)`, `z-index: 50`.
- **Dialog Box (`.dlg`)**:
  - Role: `role="alertdialog"`, `aria-modal="true"`.
  - Background: `var(--canvas)`, Border: `1px solid var(--border)`, Radius: `10px`, Max width `420px`.
  - Focus is automatically placed on the default Cancel button.
  - Dismissible via `Escape` key or clicking outside on the scrim.

---

## 6. Accessibility (a11y) & Usability Standards

1. **Focus Ring**:  
   All interactive elements must display `:focus-visible` with a 2px solid `var(--accent)` ring and 2px offset.
2. **Keyboard Reordering**:  
   The drag handle (`.dh`) has `tabindex="0"` and supports `ArrowUp` and `ArrowDown` keys to reorder subject properties without a mouse.
3. **Screen Reader Live Announcements**:  
   An off-screen polite live region (`#live` with `role="status"` and `aria-live="polite"`) announces state changes (e.g., `"Property moved"`, `"Status set to Done"`, `"Assignment saved"`).
4. **Contrast Ratio**:  
   Text against `--canvas` or `--surface` maintains a minimum contrast ratio of `4.5:1` for normal text and `3:1` for bold or large text across both light and dark themes.

---

## 7. Change Management

All future UI additions or styling revisions must:
1. Reference existing tokens in Section 2 rather than hardcoding hexadecimal colors.
2. Maintain mobile touch ergonomics defined in Section 4.
3. Be reflected in this document whenever design specifications evolve.
