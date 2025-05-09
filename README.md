# Front End Final 2025
# Industrial Assessment Center – React Frontend  
*A Vite + React + TypeScript single-page UI for exploring IAC recommendation data*

---

## 1 · System Requirements

| Tool | Minimum Version | Why it matters |
|------|-----------------|----------------|
| **Node.js** | **18.x** (LTS or newer) | Vite 5, ESLint 9, and many dev-deps rely on modern Node APIs |
| **npm**     | **9.x** (bundled with Node 18) | lock-file v3 & workspaces support |

> **CPU/RAM**: no native builds; 2 GB RAM is plenty.  
> **OS**: macOS 💻, Linux 🐧, Windows 🪟 (WSL recommended).

---

## 2 · Runtime Dependencies (production)

| Package | Major Ver. | Purpose |
|---------|-----------:|---------|
| **react**            | 18 | UI engine (hooks) |
| **react-dom**        | 18 | DOM renderer |
| **recharts**         | 2  | D3-powered bar charts |
| **lucide-react**     | 0  | Feather-style SVG icons |
| **html2canvas**      | 1  | DOM → PNG exports |
| **jspdf**            | 2  | Client-side PDF exports |

*(developer-only, styling, and linting deps unchanged – see previous version for full lists.)*

---

## 3 · Installing Dependencies & Running Locally

```bash
# 1 · Clone the repo
git clone https://github.com/your-org/iac-frontend.git
cd iac-frontend

# 2 · Install packages (standard)
npm install          # pulls exact versions from package-lock

#    Optional, fully reproducible install:
# npm ci

# 3 · Start the dev server
npm run dev          # → http://localhost:5173

