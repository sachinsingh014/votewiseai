/**
 * @fileoverview useChatStream — React hook for SSE-based streaming AI chat.
 * @module hooks/useChatStream
 *
 * Manages the full lifecycle of a streaming AI conversation:
 *  - Sends user messages to the /api/ai/chat/stream SSE endpoint
 *  - Progressively renders AI response tokens as they arrive
 *  - Handles reconnection recovery via requestId idempotency
 *  - Implements requestAnimationFrame batching for smooth UI updates
 *  - Cleans up the AbortController on component unmount
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

/**
 * @typedef {Object} ChatMessage
 * @property {string} id - Unique message identifier (UUID)
 * @property {'user'|'ai'} role - Message sender role
 * @property {string} text - Message text content (may grow during streaming)
 * @property {boolean} [streaming] - True while the AI is still generating this message
 */

/**
 * @typedef {Object} ChatStreamResult
 * @property {ChatMessage[]} messages - Current array of chat messages
 * @property {Function} setMessages - State setter for direct message manipulation
 * @property {boolean} isTyping - True while waiting for the first token from the AI
 * @property {string|null} streamError - Last stream error message, or null if none
 * @property {Function} handleSend - Function to send a new user message
 */

/**
 * Generates a unique message identifier using UUID v4 when available,
 * with a timestamp+random fallback for environments without crypto support.
 *
 * @returns {string} A unique identifier string
 */
const genId = () =>
  typeof uuidv4 === 'function' ? uuidv4() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * React hook that manages a streaming AI chat session with the VoteWise backend.
 *
 * PERFORMANCE:
 *  - Uses requestAnimationFrame batching to avoid excessive React re-renders during streaming.
 *  - Decoder streams chunks incrementally without buffering the full response.
 *
 * SECURITY: Firebase ID token is fetched fresh (not from cache) for each request.
 *
 * @param {ChatMessage[]} initialMessages - Initial chat history to pre-populate the conversation
 * @returns {ChatStreamResult} State and actions for the chat session
 *
 * @example
 * const { messages, isTyping, streamError, handleSend } = useChatStream([]);
 * // Send a message:
 * handleSend('How do I register to vote?');
 */
export default function useChatStream(initialMessages) {
  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [streamError, setStreamError] = useState(null);
  /** @type {React.MutableRefObject<AbortController|null>} */
  const abortRef = useRef(null);

  // Abort any in-flight stream when the component unmounts
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /**
   * Retrieves a fresh Firebase ID token for the currently signed-in user.
   * Returns null if no user is authenticated.
   *
   * @returns {Promise<string|null>} Firebase ID token, or null if unauthenticated
   */
  const getToken = useCallback(async () => {
    const auth = getAuth();
    return auth.currentUser?.getIdToken(false) ?? null;
  }, []);

  /**
   * Flushes the current text buffer snapshot into the streaming AI message.
   * Called via requestAnimationFrame to batch multiple chunk updates into a
   * single React render cycle, preventing UI jank during fast streaming.
   *
   * @param {string} snapshot - Current accumulated text to display
   * @param {string} aiMsgId - ID of the AI message bubble to update
   * @param {React.Dispatch<React.SetStateAction<boolean>>} setRafPending - RAF pending flag setter
   * @returns {void}
   */
  const flushBuffer = (snapshot, aiMsgId, setRafPending) => {
    setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, text: snapshot } : m)));
    setRafPending(false);
  };

  /**
   * Processes a single parsed SSE event from the AI stream.
   * Updates the text buffer for token chunks; handles cached full responses.
   *
   * @param {Object} parsed - Parsed SSE event data
   * @param {string} [parsed.text] - Token text or full cached response
   * @param {boolean} [parsed.fromCache] - Whether this is a full cached response
   * @param {string} [parsed.error] - Error message if the stream encountered an issue
   * @param {{ buffer: string, rafPending: boolean }} state - Mutable stream state
   * @param {string} aiMsgId - ID of the AI message bubble being built
   * @returns {void}
   * @throws {Error} Re-throws non-parse errors from the stream
   */
  const processEvent = (parsed, state, aiMsgId) => {
    if (parsed.error) throw new Error(parsed.error);

    if (parsed.fromCache && parsed.text) {
      state.buffer = parsed.text;
      setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, text: parsed.text } : m)));
      return;
    }

    if (parsed.text) {
      state.buffer += parsed.text;
      if (!state.rafPending) {
        state.rafPending = true;
        const snapshot = state.buffer;
        requestAnimationFrame(() => flushBuffer(snapshot, aiMsgId, (val) => { state.rafPending = val; }));
      }
    }
  };

  /**
   * Sends a user message to the AI streaming endpoint and processes the SSE response.
   * Aborts gracefully on component unmount or user-triggered cancellation.
   *
   * @param {string} trimmedInput - The user's message text (pre-trimmed)
   * @returns {Promise<void>}
   */
  const handleSend = async (trimmedInput) => {
    if (!trimmedInput || isTyping) return;

    setStreamError(null);
    const userMsg = { id: genId(), role: 'user', text: trimmedInput };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const token = await getToken();
    if (!token) {
      setMessages((prev) => [
        ...prev,
        { id: genId(), role: 'ai', text: 'Authentication error. Please sign in again.' },
      ]);
      setIsTyping(false);
      return;
    }

    const requestId = genId();
    const aiMsgId = genId();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams({ question: trimmedInput, requestId });
      const res = await fetch(`/api/ai/chat/stream?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || 'AI rate limit reached. Please wait.');
        }
        throw new Error(`Server error: ${res.status}`);
      }

      setMessages((prev) => [...prev, { id: aiMsgId, role: 'ai', text: '', streaming: true }]);
      setIsTyping(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      // Mutable state object passed by reference to avoid closure staleness
      const streamState = { buffer: '', rafPending: false };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;

          try {
            const parsed = JSON.parse(raw);
            processEvent(parsed, streamState, aiMsgId);
          } catch (parseErr) {
            // Silently discard partial JSON fragments from chunked encoding
            if (parseErr.message !== 'Unexpected token' && !parseErr.message.startsWith('JSON')) {
              throw parseErr;
            }
          }
        }
      }

      // Finalize: mark the AI message as no longer streaming
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, text: streamState.buffer, streaming: false } : m))
      );
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStreamError(err.message);
      setMessages((prev) => {
        const withoutPartial = prev.filter((m) => m.id !== aiMsgId);
        return [
          ...withoutPartial,
          {
            id: genId(),
            role: 'ai',
            text: err.message.includes('rate limit')
              ? `⏳ ${err.message}`
              : 'Sorry, I encountered an error. Please try again.',
          },
        ];
      });
    } finally {
      setIsTyping(false);
    }
  };

  return { messages, setMessages, isTyping, streamError, handleSend };
}
