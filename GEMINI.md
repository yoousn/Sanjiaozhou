# Project Overview

This is a full-stack web application designed for organizing firearm configurations, performing manual data collection (via web scraping), and displaying a daily password. The application is built with a React frontend and a Node.js (Express) backend, tightly integrated and served together during development and production. Data is persisted using local JSON files rather than a traditional database.

## Main Technologies

-   **Frontend:** React 19, Vite 6, Tailwind CSS 4, Framer Motion, @tanstack/react-query
-   **Backend:** Node.js, Express, TypeScript
-   **Data Storage:** Local JSON files (`data.json`, `daily_pwd.json`, etc.)
-   **Auxiliary Scripts:** Python 3 (used for Bilibili data collection and daily password crawling)
-   **Deployment:** Docker Compose, GitHub Actions

## Architecture

-   **`server.ts`**: The core entry point for the application. It acts as the Express server, handling API routes, reading/writing to local JSON files for persistence, and serving the built Vite frontend.
-   **`src/`**: Contains the frontend React application (components, hooks, pages).
-   **`server/`**: Contains backend modules, utilities, and API route handlers.
-   **`scripts/`**: Contains Python crawler scripts and deployment shell scripts.
-   **`docs/`**: Comprehensive project documentation including rules, deployment steps, and release notes.

## Building and Running

### Prerequisites

-   Node.js 20+
-   npm
-   Python 3

### Key Commands

-   **Install Dependencies:**
    ```bash
    npm install
    ```
-   **Start Development Server:**
    Starts the combined Express/Vite server (using `tsx`) on `http://127.0.0.1:3000`.
    ```bash
    npm run dev
    ```
-   **Restart Server:**
    Kills any process on port 3000 and restarts the dev server.
    ```bash
    npm run restart
    ```
-   **Type Checking:**
    ```bash
    npm run lint
    ```
-   **Build Frontend for Production:**
    ```bash
    npm run build
    ```

## Development Conventions & Rules

-   **Data Persistence:** Runtime data is stored in JSON files (e.g., `data.json`, `daily_pwd.json`, `cookies.txt`). In production, these must reside in a `runtime/` directory mounted via Docker Compose to avoid being overwritten by code deployments.
-   **Data Collection Constraints:** 
    -   The manual data collection flow is strictly defined (Select Firearm -> Select Creator -> Search -> Select Videos -> Select Model -> Test -> Confirm).
    -   The default collection model is locked to `openai/gpt-oss-120b`.
    -   Search processes must display real-time logs, not just a loading spinner.
    -   Duplicate firearm data should be merged, retaining a maximum of 5 entries per firearm.
    -   Ensure absolutely no Chinese character encoding issues (mojibake) across the entire stack.
-   **Documentation & Task Tracking (CRITICAL):** You MUST log your progress and current state to `docs/progress.md` immediately after completing **each individual task or sub-task**. This is mandatory because the Gemini CLI session may need to be reset due to context size limits. If the session is reset, `docs/progress.md` acts as the single source of truth for the AI to resume work without losing track of what has been accomplished. **When logging in `docs/progress.md`, use the explicit date-sequence format `YYYY.M.D-N` (e.g., `2026.4.28-1`, `2026.4.28-2`) for each task entry to maintain strict chronological order.** Formal releases should be documented in `docs/release-notes.md`. Please refer to `docs/project-rules.md` and `docs/collaboration.md` for deeper architectural and collaborative constraints.
-   **UI/UX:** The project utilizes a Drawer component for primary navigation and relies heavily on Tailwind CSS for styling with smooth transitions handled by Framer Motion.
