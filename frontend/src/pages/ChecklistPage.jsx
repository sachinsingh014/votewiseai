import React, { useState, useEffect } from 'react';
import { fetchWithRetry } from '../utils/fetchWithRetry';

export default function ChecklistPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChecklist();
  }, []);

  const fetchChecklist = async () => {
    try {
      const response = await fetchWithRetry('/api/checklist');
      setData(response.data);
    } catch (err) {
      console.error('Checklist error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (itemId, completed) => {
    try {
      // Optimistic update
      setData((prev) => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? { ...i, completed } : i),
      }));

      await fetchWithRetry('/api/checklist/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, completed })
      });
      fetchChecklist();
    } catch (err) {
      console.error('Toggle error:', err);
      fetchChecklist(); // Revert on error
    }
  };

  if (loading) return <div className="p-8 text-center" aria-live="polite">Loading Checklist...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load checklist.</div>;

  return (
    <main id="main-content" className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-[var(--color-neutral-900)] mb-2">Voter Readiness</h1>
      <p className="text-[var(--color-neutral-600)] mb-8">Track your journey to the ballot box.</p>

      <div className="bg-white rounded-xl shadow-sm border border-[var(--color-neutral-200)] p-6 mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-[var(--color-neutral-700)]">Overall Progress</span>
          <span className="font-bold text-[var(--color-primary-600)]">{data.progress}%</span>
        </div>
        <div className="w-full bg-[var(--color-neutral-100)] rounded-full h-3">
          <div 
            className="bg-[var(--color-primary-600)] h-3 rounded-full transition-all duration-500" 
            style={{ width: `${data.progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {data.items.map((item) => (
          <label 
            key={item.id} 
            className={`flex items-center p-4 rounded-xl border cursor-pointer transition ${item.completed ? 'bg-green-50 border-green-200' : 'bg-white border-[var(--color-neutral-200)] hover:border-[var(--color-primary-300)]'}`}
          >
            <input
              type="checkbox"
              checked={item.completed}
              onChange={(e) => handleToggle(item.id, e.target.checked)}
              className="w-5 h-5 text-[var(--color-primary-600)] rounded focus:ring-[var(--color-primary-500)]"
            />
            <span className={`ml-4 text-lg ${item.completed ? 'text-green-800 line-through opacity-70' : 'text-[var(--color-neutral-800)]'}`}>
              {item.text}
            </span>
          </label>
        ))}
      </div>
    </main>
  );
}
