# VoteWise AI Architecture

VoteWise AI is a civic education platform designed to provide accurate, unbiased, and accessible voting information to Indian citizens, with a particular focus on first-time and youth voters.

This document outlines the high-level architecture, infrastructure components, and data flows of the platform.

## 1. System Overview

The system is built on a modern, serverless architecture utilizing Google Cloud Platform (GCP) and Firebase.

### High-Level Components
*   **Frontend Client:** A React/Vite single-page application (SPA) styled with Tailwind CSS, hosted on Firebase Hosting.
*   **Backend API:** A Node.js/Express REST API containerized and deployed on Google Cloud Run.
*   **Database:** Firestore (Native mode) for user state and journey tracking.
*   **AI Engine:** Google Vertex AI (Gemini 2.5 Flash) for dynamic conversational responses and eligibility logic.
*   **Authentication:** Firebase Authentication (Email/Password & Google OAuth).

---

## 2. Infrastructure & Hosting (GCP / Firebase)

### Frontend (Firebase Hosting)
*   **Global CDN:** Serves static assets efficiently globally.
*   **API Gateway (Rewrites):** Firebase Hosting is configured to rewrite all requests matching `/api/**` directly to the Cloud Run backend service. This prevents CORS issues, acts as a unified domain origin, and simplifies deployment.

### Backend (Google Cloud Run)
*   **Serverless Container:** The Node.js application runs as a stateless container.
*   **Scaling:** Configured to scale based on traffic, with a minimum instance count (`min-instances=1`) to prevent cold starts during peak election seasons, and a maximum concurrency limit (`concurrency=80`) to handle high throughput.
*   **Identity:** Runs under a dedicated Service Account with least-privilege access (Firestore User, Vertex AI User).

---

## 3. Core Services Architecture

### 3.1. AI Orchestration Service (`ai.service.js`)
The backend acts as an orchestrator and safety boundary between the user and the LLM.
1.  **Prompt Building:** User input is enriched with context (state, age) and wrapped in strict system prompts (`ai.prompt.js`) to enforce a non-partisan, neutral persona.
2.  **Streaming:** Responses are streamed via Server-Sent Events (SSE) using the official `@google/genai` SDK to provide low-latency feedback.
3.  **Caching:** A dual-tier Node-cache strategy (`ai.cache.js`) reduces LLM calls:
    *   **Generic queries:** Cached for 1 hour.
    *   **Contextual queries:** Cached for 5 minutes.
4.  **Fallback:** Network failures or API timeouts trigger pre-computed fallback responses (`ai.fallback.js`) to ensure graceful degradation.

### 3.2. Journey Orchestration Service
Tracks a user's progression through the voting process (Registration -> Find Polling Station -> Review Candidates).
*   State is managed server-side in Firestore to prevent client-side manipulation.
*   Steps are unlocked sequentially based on completion signals from the frontend.

---

## 4. Data Model (Firestore)

Firestore is used exclusively for state management. All AI conversational history is currently ephemeral and not stored, prioritizing user privacy.

### Collection: `users`
*   **Document ID:** Firebase Auth UID
*   **Schema:**
    ```typescript
    {
      roadmap: Array<{
        id: number;
        title: string;
        status: 'locked' | 'action_required' | 'completed';
        icon: string;
      }>,
      updatedAt: Timestamp;
    }
    ```

---

## 5. Security & Middlewares

The Express application implements several layers of security:
1.  **Firebase Authentication (`authenticate.js`):** Validates Firebase ID tokens via the Admin SDK for protected routes.
2.  **Rate Limiting:**
    *   **Global (`rateLimiter.js`):** DDoS protection using `express-rate-limit`.
    *   **User/AI (`userRateLimiter.js`):** Stricter token-bucket limits specifically for AI endpoints to prevent quota exhaustion and cost spikes.
3.  **AI Moderation (`ai.moderator.js`):** A deterministic, Regex-based safety layer that runs on the backend to flag or block prompt injections, hate speech, and partisan bias *after* the LLM generates a response.
4.  **Input Validation:** Strict `express-validator` chains on all incoming payloads.

---

## 6. CI/CD Pipeline

The project utilizes GitHub Actions for continuous integration and continuous deployment.

### 6.1. Continuous Integration (`ci.yml`)
Runs on every Pull Request to `main`:
*   **Linting:** ESLint and Prettier enforcement.
*   **Security:** `npm audit` and static analysis.
*   **Testing:** Jest execution (100+ tests) enforcing strict coverage thresholds (95% for core logic, 75% globally).

### 6.2. Continuous Deployment
Deployment to GCP and Firebase is automated upon merging to the `main` branch, utilizing Workload Identity Federation for keyless authentication.
