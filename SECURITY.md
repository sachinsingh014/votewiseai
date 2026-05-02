# VoteWise AI Security & Threat Model

This document outlines the security architecture, threat model, and mitigation strategies implemented in the VoteWise AI infrastructure. Given the sensitive nature of civic tech and the use of Generative AI, security and neutrality are the highest priorities.

---

## 1. Trust Boundaries

The system is designed with explicit trust boundaries:

1.  **Untrusted Zone:** The internet, user browsers, and the React Frontend.
    *   *Rule:* All data originating from the frontend is treated as potentially malicious or malformed.
2.  **Verification Boundary:** Google Cloud Load Balancing & Firebase Hosting API Gateway.
    *   *Rule:* Terminates TLS, enforces CORS, and routes traffic.
3.  **Protected Zone:** Google Cloud Run (Backend API).
    *   *Rule:* Validates tokens, enforces business logic, sanitizes input, and orchestrates external calls.
4.  **Highly Trusted Zone:** Firebase Admin (Firestore) & Vertex AI.
    *   *Rule:* Accessed only via authenticated Service Accounts over internal GCP networks.

---

## 2. Authentication & Authorization

### User Authentication
*   **Provider:** Firebase Authentication (OAuth & Email/Password).
*   **Token Verification:** The backend uses the `firebase-admin` SDK to cryptographically verify JWT (`ID Token`) signatures on every protected request.
*   **Middleware:** The `authenticate.js` middleware ensures `req.user` is populated only with verified claims. Unauthenticated requests are rejected with `401 Unauthorized`.

### Service Authentication
*   The Cloud Run service operates under a dedicated IAM Service Account (`votewise-api-sa`).
*   **Principle of Least Privilege:** This service account is explicitly granted only two roles:
    1.  `roles/aiplatform.user` (to call Vertex AI).
    2.  `roles/datastore.user` (to access Firestore).
*   API Keys are explicitly avoided in production in favor of short-lived Google Application Default Credentials (ADC).

---

## 3. Data Protection & Privacy

### Data in Transit
*   All traffic between the client and Firebase Hosting is encrypted via TLS 1.3.
*   Traffic between Firebase Hosting and Cloud Run is routed internally via GCP infrastructure.

### Data at Rest
*   All Firestore data is encrypted at rest by Google using AES-256.
*   **Data Minimization:** Chat logs and conversational history are intentionally **NOT** stored in the database to protect voter privacy and political affiliations. Only the anonymous `journey` state is persisted.

---

## 4. AI Security & Safety

Generative AI introduces unique attack vectors (e.g., prompt injection, bias). VoteWise AI implements a "defense-in-depth" strategy for LLM interactions.

### 4.1. System Prompt Hardening
The AI persona is strictly defined in `ai.prompt.js`:
*   Explicit instructions to remain neutral, non-partisan, and educational.
*   Directives to refuse queries about predictions, endorsements, or controversial opinions.

### 4.2. Output Moderation Layer (`ai.moderator.js`)
Because LLMs are non-deterministic, we implement a deterministic secondary filter on the backend *before* sending data to the client:
*   **Block Patterns:** Immediately drops responses containing injection leakage (e.g., "ignore previous instructions") or violent threats.
*   **Warn Patterns:** Flags responses containing specific partisan keywords for telemetry and review, ensuring the platform remains unbiased.

### 4.3. Graceful Degradation
If Vertex AI is unavailable, times out, or fails safety checks, the backend falls back to static, safe responses (`ai.fallback.js`) directing users to the official Election Commission of India (ECI) website.

---

## 5. Network & API Protection

### Rate Limiting
To prevent DDoS attacks and API quota exhaustion:
1.  **Global Rate Limiter:** Limits general API endpoints to 100 requests per 15 minutes per IP.
2.  **AI Rate Limiter:** Strictly limits expensive AI endpoints (e.g., `/api/ai/chat`) to 10 requests per minute per IP to prevent billing attacks.

### Input Validation
*   All incoming API payloads are sanitized and validated using `express-validator`.
*   Strict bounds checking (e.g., strings max 500 chars, ages between 18-120).
*   Unknown fields are stripped.

---

## 6. Vulnerability Management

*   **Dependency Scanning:** `npm audit` is run continuously in the GitHub Actions CI pipeline.
*   **Code Quality:** The project enforces 100% test coverage on security-critical files (`authenticate.js`, `ai.moderator.js`, `ai.prompt.js`) to ensure regressions do not introduce vulnerabilities.
*   **Secrets:** No secrets are stored in the repository. Environment variables are injected at runtime via GCP Secret Manager and Terraform.
