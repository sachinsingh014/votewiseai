import React, { useState, useEffect } from 'react';
import { fetchWithRetry } from '../utils/fetchWithRetry';

export default function QuizPage() {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithRetry('/api/quiz')
      .then((data) => {
        setQuiz(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Quiz fetch error:', err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedAnswers = Object.entries(answers).map(([id, answer]) => ({ id: Number(id), answer }));
      const response = await fetchWithRetry('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: formattedAnswers })
      });
      setResult(response.data);
    } catch (err) {
      console.error('Submit error:', err);
    }
  };

  if (loading) return <div className="p-8 text-center text-[var(--color-primary-600)]" aria-live="polite">Loading Quiz...</div>;
  if (!quiz) return <div className="p-8 text-center text-red-500">Failed to load quiz.</div>;

  return (
    <main id="main-content" className="max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-[var(--color-neutral-900)] mb-6">Election Knowledge Quiz</h1>
      
      {result ? (
        <div className="bg-green-50 p-6 rounded-xl border border-green-200">
          <h2 className="text-2xl font-bold text-green-800 mb-2">Quiz Complete!</h2>
          <p className="text-lg text-green-700">You scored {result.score} out of {result.total}.</p>
          <p className="mt-2 text-green-600">{result.feedback}</p>
          <button 
            onClick={() => { setResult(null); setAnswers({}); }}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Retake Quiz
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {quiz.map((q, index) => (
            <fieldset key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-[var(--color-neutral-200)]">
              <legend className="text-lg font-medium text-[var(--color-neutral-800)] mb-4">
                {index + 1}. {q.question}
              </legend>
              <div className="space-y-3">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-[var(--color-neutral-50)] transition">
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                      className="w-4 h-4 text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)]"
                      required
                    />
                    <span className="text-[var(--color-neutral-700)]">{opt}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button
            type="submit"
            className="w-full py-3 px-6 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white font-semibold rounded-xl transition"
          >
            Submit Answers
          </button>
        </form>
      )}
    </main>
  );
}
