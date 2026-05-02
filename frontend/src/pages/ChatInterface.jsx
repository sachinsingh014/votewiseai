import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useChatStream from '../hooks/useChatStream';
import { TypingIndicator, ChatMessage } from '../components/chat/ChatMessages';

const INITIAL_MESSAGES = [
  {
    id: 'init-1',
    role: 'ai',
    text: 'Namaste! I am VoteWise AI. Ask me any question about the upcoming elections, voter registration, or polling locations.',
    streaming: false,
  },
];

export default function ChatInterface() {
  const { messages, setMessages, isTyping, streamError, handleSend } = useChatStream(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSendClick = () => {
    handleSend(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendClick();
    }
  };

  return (
    <div className="flex h-screen font-inter overflow-hidden" style={{ background: '#f8fafc' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed md:relative top-0 left-0 h-full w-72 z-30 flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}
        aria-label="Chat sidebar"
      >
        <div className="p-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2.5 mb-5" aria-label="Go to VoteWise AI home">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-md shadow-orange-500/30">
              <span className="material-symbols-outlined text-white text-base" aria-hidden="true">how_to_vote</span>
            </div>
            <span className="font-black text-white text-lg">VoteWise <span className="text-orange-400">AI</span></span>
          </Link>
          <button
            id="new-chat-btn"
            onClick={() => setMessages(INITIAL_MESSAGES)}
            className="w-full flex items-center gap-2 btn-gradient-orange text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20"
            aria-label="Start a new chat"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
            New Chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4" aria-label="Chat history">
          <p className="text-xs uppercase tracking-widest text-slate-500 px-2 mb-3 font-bold">Suggestions</p>
          {['How to register to vote', 'Find my polling booth', 'Voter ID requirements'].map((item) => (
            <button
              key={item}
              onClick={() => { setInput(item); setSidebarOpen(false); }}
              className="w-full text-left px-3.5 py-3 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white text-sm transition-all duration-200 mb-1 flex items-center gap-2.5"
              aria-label={`Ask: ${item}`}
            >
              <span className="material-symbols-outlined text-base text-slate-600" aria-hidden="true">chat_bubble</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            to="/guide"
            className="w-full flex items-center gap-2 px-3.5 py-3 rounded-xl text-slate-400 hover:text-orange-400 hover:bg-orange-500/10 text-sm font-semibold transition-all duration-200"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">map</span>
            My Voting Guide
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0 shadow-sm">
          <button
            id="sidebar-toggle-btn"
            className="md:hidden w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            <span className="material-symbols-outlined" aria-hidden="true">menu</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="material-symbols-outlined text-white text-base" aria-hidden="true">smart_toy</span>
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm leading-none">VoteWise AI</p>
              <p className="text-xs text-slate-400 leading-none mt-0.5">Civic Intelligence</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
            <span className="text-emerald-700 text-xs font-bold">Online</span>
          </div>
        </header>

        <main
          id="chat-messages"
          className="flex-1 overflow-y-auto p-5 md:p-8"
          aria-label="Chat messages"
          aria-live="polite"
        >
          <div className="max-w-2xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isTyping && <TypingIndicator />}
            {streamError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl px-4 py-3 mb-4">
                <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5">error</span>
                <span><strong>Error:</strong> {streamError}</span>
              </div>
            )}
            <div ref={bottomRef} aria-hidden="true" />
          </div>
        </main>

        <div className="px-5 md:px-8 pb-3 flex gap-2 flex-wrap max-w-2xl mx-auto w-full">
          {['Find polling booth', 'Check voter ID status', 'Election dates'].map((chip) => (
            <button
              key={chip}
              onClick={() => setInput(chip)}
              className="px-4 py-1.5 rounded-full border border-slate-200 text-slate-500 text-xs font-semibold hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200"
              aria-label={`Suggested question: ${chip}`}
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6 pt-2 border-t border-slate-100 bg-white flex-shrink-0 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.06)]">
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
            <div className="flex-1 relative">
              <label htmlFor="chat-input" className="sr-only">Type your question</label>
              <textarea
                id="chat-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder="Ask a question about Indian elections..."
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all duration-200 leading-relaxed disabled:bg-slate-50 disabled:text-slate-400 shadow-sm"
                aria-label="Chat input field"
              />
            </div>
            <button
              id="send-message-btn"
              onClick={onSendClick}
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 btn-gradient-orange disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed text-white rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/25"
              aria-label="Send message"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
