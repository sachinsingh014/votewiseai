# VoteWise AI System Flow

This document visualizes the core data and control flows within the VoteWise AI platform, detailing how the React Frontend, Node.js Backend, and Google Cloud services interact.

---

## 1. Authentication & API Access Flow

This flow describes how a user signs in and how the backend secures subsequent API requests.

```mermaid
sequenceDiagram
    participant User
    participant React Frontend
    participant Firebase Auth (Google)
    participant Express Backend
    participant Firestore DB

    User->>React Frontend: Clicks "Sign In"
    React Frontend->>Firebase Auth (Google): Request OAuth / Email Login
    Firebase Auth (Google)-->>React Frontend: Returns JWT (ID Token)
    React Frontend->>React Frontend: Updates AuthContext (User Session)
    
    Note over React Frontend,Express Backend: Subsequent API Requests
    
    React Frontend->>Express Backend: API Request (Header: Authorization: Bearer <token>)
    Express Backend->>Express Backend: authenticate.js Middleware
    Express Backend->>Firebase Auth (Google): Verify JWT signature
    
    alt Token Invalid / Expired
        Firebase Auth (Google)-->>Express Backend: Validation Failed
        Express Backend-->>React Frontend: 401 Unauthorized
    else Token Valid
        Firebase Auth (Google)-->>Express Backend: Decoded Token (UID)
        Express Backend->>Express Backend: attach `req.user`
        Express Backend->>Firestore DB: Fetch/Update User Data
        Firestore DB-->>Express Backend: Data
        Express Backend-->>React Frontend: 200 OK + Payload
    end
```

---

## 2. AI Chat Streaming Flow (The Core Engine)

This flow illustrates the journey of a user's question, passing through safety checks, caching, and streaming back via Server-Sent Events (SSE).

```mermaid
sequenceDiagram
    participant Frontend Chat
    participant API Gateway (Cloud Run)
    participant Rate Limiter
    participant AI Cache
    participant AI Orchestrator
    participant Vertex AI (Gemini)

    Frontend Chat->>API Gateway (Cloud Run): GET /api/ai/chat/stream?question=...
    API Gateway (Cloud Run)->>Rate Limiter: Check Quota (10 req/min)
    
    alt Rate Limit Exceeded
        Rate Limiter-->>Frontend Chat: 429 Too Many Requests
    else Rate Limit OK
        Rate Limiter->>AI Cache: Check if response exists
        
        alt Cache Hit
            AI Cache-->>Frontend Chat: Return cached response immediately
        else Cache Miss
            AI Cache->>AI Orchestrator: Generate new response
            AI Orchestrator->>AI Orchestrator: Build strict System Prompt (ai.prompt.js)
            AI Orchestrator->>Vertex AI (Gemini): Send prompt + User context
            
            loop Streaming Chunks
                Vertex AI (Gemini)-->>AI Orchestrator: Return text chunk
                AI Orchestrator->>AI Orchestrator: Run Regex Moderation (ai.moderator.js)
                
                alt Content Blocked (Threat/Injection)
                    AI Orchestrator--xFrontend Chat: Abort Stream + Send Safety Warning
                else Content Safe
                    AI Orchestrator-->>Frontend Chat: Forward chunk via SSE
                    Frontend Chat->>Frontend Chat: Update typing UI
                end
            end
            
            AI Orchestrator->>AI Cache: Store final complete string in cache
            Vertex AI (Gemini)-->>AI Orchestrator: Stream End
            AI Orchestrator-->>Frontend Chat: Close SSE Connection
        end
    end
```

---

## 3. User Journey Tracking Flow

This flow tracks how a user progresses through their personalized voter registration roadmap.

```mermaid
sequenceDiagram
    participant User
    participant React Dashboard
    participant Backend API
    participant Firestore DB

    User->>React Dashboard: Completes a step (e.g., "Find Polling Station")
    React Dashboard->>Backend API: POST /api/journey/progress { stepId: 2 }
    
    Backend API->>Backend API: Authenticate & Validate Request
    Backend API->>Firestore DB: Read current user `roadmap` array
    Firestore DB-->>Backend API: Return current state
    
    Backend API->>Backend API: Update Step 2 to `completed`
    Backend API->>Backend API: Unlock Step 3 (set to `action_required`)
    
    Backend API->>Firestore DB: Write updated `roadmap` array
    Firestore DB-->>Backend API: Write Confirmed
    
    Backend API-->>React Dashboard: 200 OK + New Roadmap State
    React Dashboard->>React Dashboard: Re-render UI (Unlock animations)
```

---

## 4. Fallback & Graceful Degradation Flow

If the primary AI service (Vertex AI) goes offline or times out, the system degrades gracefully without breaking the user experience.

```mermaid
flowchart TD
    A[User Asks Question] --> B(Backend Attempts Vertex AI Call)
    B --> C{Is Vertex AI Responding?}
    
    C -- Yes --> D[Stream Normal Response]
    
    C -- No / Timeout --> E{Categorize Intent}
    E -- Eligibility --> F[Return Static Eligibility Rules + ECI Link]
    E -- Registration --> G[Return Static Registration Steps + ECI Link]
    E -- General/Other --> H[Return Generic ECI Fallback]
    
    F --> I[Display in Chat UI with 'Fallback' flag]
    G --> I
    H --> I
```
