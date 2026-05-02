import { useState, useRef, useCallback, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';

const genId = () => (typeof uuidv4 === 'function' ? uuidv4() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function useChatStream(initialMessages) {
  const [messages, setMessages] = useState(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const getToken = useCallback(async () => {
    const auth = getAuth();
    return auth.currentUser?.getIdToken(false) ?? null;
  }, []);

  const handleSend = async (trimmedInput) => {
    if (!trimmedInput || isTyping) return;

    setStreamError(null);
    const userMsg = { id: genId(), role: 'user', text: trimmedInput };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const token = await getToken();
    if (!token) {
      setMessages((prev) => [...prev, { id: genId(), role: 'ai', text: 'Authentication error. Please sign in again.' }]);
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
      let buffer = '';
      let rafPending = false;

      const flush = () => {
        const snapshot = buffer;
        setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, text: snapshot } : m)));
        rafPending = false;
      };

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
            if (parsed.error) throw new Error(parsed.error);

            if (parsed.fromCache && parsed.text) {
              buffer = parsed.text;
              flush();
              continue;
            }

            if (parsed.text) {
              buffer += parsed.text;
              if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(flush);
              }
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected token' && !parseErr.message.startsWith('JSON')) {
              throw parseErr;
            }
          }
        }
      }

      setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, text: buffer, streaming: false } : m)));
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Stream error:', err);
      setStreamError(err.message);
      setMessages((prev) => {
        const withoutPartial = prev.filter((m) => m.id !== aiMsgId);
        return [...withoutPartial, {
          id: genId(), role: 'ai',
          text: err.message.includes('rate limit') ? `⏳ ${err.message}` : 'Sorry, I encountered an error. Please try again.',
        }];
      });
    } finally {
      setIsTyping(false);
    }
  };

  return { messages, setMessages, isTyping, streamError, handleSend };
}
