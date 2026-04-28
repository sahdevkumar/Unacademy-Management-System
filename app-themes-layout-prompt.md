# Comprehensive UI/Theme & Layout Reconstruction Prompt for "Unacademy" ERP

Use the following detailed prompt when you need to recreate or deeply extend this application's user interface and aesthetic. It captures the exact layout structure, component behaviors, coloring, and styling rules originally used.

---

### **Project Goal:**
Recreate a comprehensive School/Academy Management System (ERP) called **"Unacademy"**. The application must feature a high-fidelity, highly technical, clean, and professional "developer-centric" UI heavily inspired by the **Supabase Dashboard** aesthetic.

### **1. Core Tech Stack & Libraries:**
*   **Framework:** React 18+ (Vite)
*   **Styling:** Tailwind CSS (v4 compatible, strictly using utility classes)
*   **Icons:** `lucide-react` (ensure consistent 18px size for nav, standard weights)
*   **Animations:** `framer-motion` for sidebar collapsing, accordion expansions, and modal drop-ins.
*   **State Management:** React Context (`AuthContext`, `ThemeContext`, `ToastContext`).

### **2. Global Theme & Color Palette:**
Implement a systematic theming approach using custom CSS variables (in `index.css`) rather than hardcoded Tailwind colors. Expose these as Tailwind extensions (e.g., `bg-supabase-bg`, `text-supabase-green`).

**Light Theme:**
*   Background: `#f3f4f6`
*   Sidebar/Panels: `#ffffff`
*   Borders: `#e5e7eb`
*   Hover States: `#f9fafb`
*   Text: `#111827`
*   Muted Text: `#6b7280`

**Dark Theme (Default Context):**
*   Background (`--bg`): `#1c1c1c`
*   Sidebar (`--sidebar`): `#181818`
*   Panels/Cards (`--panel`): `#232323`
*   Borders (`--border`): `#2e2e2e`
*   Hover States (`--hover`): `#2a2a2a`
*   Primary Text (`--text`): `#ededed`
*   Muted Text (`--muted`): `#8b909a`

**Brand Accents:**
*   Primary Brand Color: `#3ecf8e` (Supabase Green)
*   Primary Hover: `#34b27b`

**Typography:**
*   **Primary Font:** Inter (`font-sans`)
*   **Code/Technical Font:** JetBrains Mono (`font-mono`) for IDs, metrics, code snippets.

**Scrollbars:**
*   Custom Webkit scrollbar: 8px width.
*   Track: matches `--sidebar` color.
*   Thumb: matches `--border`, with hover matching `--muted`, rounded edges.

### **3. Overall Layout Architecture:**
Use a flexible, responsive layout wrapping the entire app.
*   **Container Layout:** `h-screen w-full flex overflow-hidden bg-supabase-bg text-supabase-text`.
*   **Sidebar Navigation (Left):** Fixed or flexible width (e.g., 256px), collapsible on mobile with a semi-transparent backdrop blur overlay. 
*   **Main Content Area (Right):** Flex-1, containing a sticky Top Header and a scrollable inner container for the main views.

### **4. UI Components & Patterns:**

#### **A. The Sidebar (`Sidebar.tsx`)**
*   **Header Section:** Displays the project initials in a rounded brand-colored box (e.g., Green for regular users, Purple for superadmins), alongside the Project Name (`Unacademy`) and a tiny, mono uppercase subtitle (`Management System` or `System Superadmin`).
*   **Navigation Groups:** Divide links with sticky, uppercase, mono, and muted section headers (e.g., `WORKSPACE`, `ACADEMIC`, `OPERATIONS`, `MANAGEMENT`, `FINANCE`, `ACCOUNT`).
*   **Accordion Menus:** Group related sub-views (e.g., "Schedule", "Teacher", "Finance", "Counselling") into distinct accordion blocks using Framer Motion (`AnimatePresence`, height 0 to auto).
*   **Active States:** An active nav item receives a translucent green background (`bg-supabase-green/10`) and green text (`text-supabase-green`). Inactive items remain muted with a subtle background change on hover.
*   **Bottom Section:** Contains "Settings" and a tiny, mono-styled version number (e.g., `v1.0.0`).

#### **B. The Header (`Header.tsx`)**
*   **Left Side:** A dynamic breadcrumb trail separating parts with slashes (`/`), styling the current page with higher contrast than parent segments. 
*   **Right Side:** Status indicators (e.g., a flashing green dot for "Database Connected"), a manual theme toggle button, and a User Profile avatar/dropdown.

#### **C. Content Views (The "Panels")**
*   Views are wrapped in padding (`p-6`) and constrained to wide maximums.
*   **Page Headers:** Always feature a primary title, a muted subtitle, and right-aligned primary action buttons (e.g., "Add Student", "New Record").
*   **Action Buttons:** Use tight padding (`px-3 py-1.5` or `px-4 py-2`), rounded md/lg corners, bold/medium fonts, and transitions. Primary actions use the solid green background; secondary actions use bordered or translucent styles.

#### **D. Data Tables & Grids**
*   **Structure:** Wrap tables in a `bg-supabase-panel` card with a `border-supabase-border` outline and rounded corners.
*   **Headers:** Table header rows (`th`) must use text uppercase, muted color, explicit letter-spacing (`tracking-wider`), and tiny font sizes (`text-[10px]` or `text-xs`).
*   **Rows:** Table rows (`td`) feature borders separating them, hover states that subtly shift the background, and crisp, standard text sizing.
*   **Empty States:** Include clean empty-state designs with a centered icon, muted text advising "No records found," and an action button to create the first record.

#### **E. Modals & Slide-out Panels**
*   **Modals:** Should use a dark backdrop (`bg-black/50 backdrop-blur-sm`). The modal body is a `bg-supabase-panel` with prominent borders. Header has a title and a close (`X`) button.
*   **Forms inside Panels:** Form labels should match table headers (uppercase, tiny, bold, muted). Inputs are styled with `bg-supabase-sidebar`, outline borders, and a focus ring that transitions to `border-supabase-green` without harsh default browser outlines. 

#### **F. Badges & Tags**
*   Use tiny colored badges for status indicators (e.g., Active/Pending/Approved). Apply `bg-green-500/10 text-green-500` format to achieve a neon-glow effect on dark backgrounds.

### **5. Developer & Admin Features (Crucial to the Identity):**
*   *Do not simulate fake data unless necessary.* Give the user actual tools.
*   Implement standard "Supabase-like" utility views (e.g., `TableEditor`, `SqlEditor`).
*   Always include precise timestamp formatting (e.g., `DD MMM YYYY, HH:MM`).

Use this foundational layout and style guide for all generated pages to ensure the app maintains a relentlessly cohesive and professional vibe.
