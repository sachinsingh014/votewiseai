import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 mb-5" aria-label="VoteWise AI is typing" aria-live="polite">
      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
        <span className="material-symbols-outlined text-white text-base" aria-hidden="true">smart_toy</span>
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-5 py-3.5 card-shadow border border-slate-100">
        <div className="flex gap-1.5 items-center h-5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export function ChatMessage({ message }) {
  if (message.role === 'ai') {
    const isEmpty = !message.text && !message.streaming;
    return (
      <div className="flex items-end gap-3 mb-5">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/25" aria-hidden="true">
          <span className="material-symbols-outlined text-white text-base">smart_toy</span>
        </div>
        <div className={`rounded-2xl rounded-bl-sm px-5 py-4 card-shadow border max-w-sm md:max-w-lg ${
          isEmpty ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'
        }`}>
          {isEmpty ? (
            <p className="text-red-500 text-sm italic">No response received. Check if the backend is running.</p>
          ) : (
            <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
          )}
          {message.streaming && (
            <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse" aria-hidden="true" />
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-3 mb-5 justify-end">
      <div className="px-5 py-4 rounded-2xl rounded-br-sm max-w-sm md:max-w-lg shadow-lg shadow-orange-500/15" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
        <p className="text-white text-sm leading-relaxed">{message.text}</p>
      </div>
    </div>
  );
}
