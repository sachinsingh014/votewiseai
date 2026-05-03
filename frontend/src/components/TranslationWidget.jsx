import React, { useState } from 'react';
import { fetchWithRetry } from '../utils/fetchWithRetry';

export default function TranslationWidget({ textToTranslate }) {
  const [targetLang, setTargetLang] = useState('hi');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!textToTranslate) return;
    setLoading(true);
    try {
      const response = await fetchWithRetry('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate, targetLang })
      });
      setTranslatedText(response.data.translatedText);
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-[var(--color-neutral-200)] mt-4">
      <div className="flex items-center space-x-2 mb-3">
        <label htmlFor="lang-select" className="text-sm font-medium text-[var(--color-neutral-700)]">Translate to:</label>
        <select 
          id="lang-select"
          value={targetLang} 
          onChange={(e) => setTargetLang(e.target.value)}
          className="p-1.5 border border-[var(--color-neutral-300)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)]"
        >
          <option value="hi">Hindi (हिंदी)</option>
          <option value="bn">Bengali (বাংলা)</option>
          <option value="te">Telugu (తెలుగు)</option>
          <option value="mr">Marathi (मराठी)</option>
          <option value="ta">Tamil (தமிழ்)</option>
        </select>
        <button 
          onClick={handleTranslate}
          disabled={loading || !textToTranslate}
          className="px-3 py-1.5 bg-[var(--color-neutral-100)] hover:bg-[var(--color-neutral-200)] text-[var(--color-neutral-800)] text-sm font-medium rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Translating...' : 'Translate'}
        </button>
      </div>
      
      {translatedText && (
        <div className="p-3 bg-[var(--color-neutral-50)] rounded-lg border border-[var(--color-neutral-200)]">
          <p className="text-[var(--color-neutral-800)]">{translatedText}</p>
        </div>
      )}
    </div>
  );
}
