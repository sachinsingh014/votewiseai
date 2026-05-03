import React, { useState } from 'react';
import { fetchWithRetry } from '../utils/fetchWithRetry';

export default function EligibilityPage() {
  const [age, setAge] = useState('');
  const [state, setState] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkEligibility = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithRetry('/api/ai/eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age: Number(age), state })
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-[var(--color-neutral-900)] mb-6">Am I Eligible to Vote?</h1>
      
      <form onSubmit={checkEligibility} className="bg-white p-6 rounded-xl shadow-sm border border-[var(--color-neutral-200)] space-y-6">
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1">Your Age</label>
          <input
            id="age"
            type="number"
            min="1"
            max="120"
            required
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full p-3 border border-[var(--color-neutral-300)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent outline-none"
            placeholder="e.g. 18"
          />
        </div>
        
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-[var(--color-neutral-700)] mb-1">Your State / Union Territory</label>
          <input
            id="state"
            type="text"
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full p-3 border border-[var(--color-neutral-300)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent outline-none"
            placeholder="e.g. Delhi, Maharashtra"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !age || !state}
          className="w-full py-3 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-semibold rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Eligibility'}
        </button>
      </form>

      {result && (
        <div className={`mt-8 p-6 rounded-xl border ${result.eligible ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <h2 className={`text-2xl font-bold mb-2 ${result.eligible ? 'text-green-800' : 'text-yellow-800'}`}>
            {result.eligible ? 'You are eligible!' : 'Not quite yet.'}
          </h2>
          <p className={result.eligible ? 'text-green-700' : 'text-yellow-700'}>
            {result.message || result.details}
          </p>
        </div>
      )}
    </main>
  );
}
