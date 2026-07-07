import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { HelpCircle, Loader2, CheckCircle2, XCircle, BrainCircuit } from 'lucide-react';
import { api } from '../services/api';

const Quiz = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const documentId = location.state?.documentId;

  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!documentId) navigate('/library');
    else generateQuiz();
  }, [documentId]);

  const generateQuiz = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/quiz', { document_id: documentId, question_count: 5 });
      setQuiz(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const submitQuiz = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/quiz/submit', {
        quiz_id: quiz._id,
        answers: answers
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20 text-indigo-500">
        <BrainCircuit className="w-16 h-16 animate-pulse mb-4" />
        <h2 className="text-xl font-bold">Generating Adaptive Quiz...</h2>
      </div>
    );
  }

  if (results) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
        <div className="text-center space-y-4 py-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-xl text-white">
          <h1 className="text-5xl font-black">{results.score_percentage}%</h1>
          <p className="text-xl font-medium opacity-90">Grade: {results.grade}</p>
        </div>
        
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Detailed Review</h2>
          {results.results.map((r, i) => (
            <div key={i} className={`p-6 rounded-2xl border ${r.is_correct ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/50' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/10 dark:border-rose-800/50'}`}>
              <div className="flex items-start space-x-3">
                {r.is_correct ? <CheckCircle2 className="w-6 h-6 text-emerald-500 mt-1" /> : <XCircle className="w-6 h-6 text-rose-500 mt-1" />}
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{r.question}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">Your Answer: <span className="font-semibold">{r.your_answer}</span></p>
                  {!r.is_correct && <p className="text-slate-600 dark:text-slate-400">Correct Answer: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{r.correct_answer}</span></p>}
                  <p className="text-sm mt-3 opacity-80 bg-white/50 dark:bg-slate-900/50 p-3 rounded-lg">{r.explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          {quiz?.title || 'Knowledge Assessment'}
        </h1>
        <p className="text-slate-500">Answer the following questions to test your understanding.</p>
      </div>

      {quiz?.questions?.map((q, i) => (
        <div key={q.id} className="p-6 md:p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">
            <span className="text-indigo-500 mr-2">{i + 1}.</span>{q.question}
          </h3>
          {q.type === 'mcq' && (
            <div className="space-y-3 mt-4">
              {q.options?.map(opt => (
                <label key={opt} className={`flex items-center p-4 rounded-xl cursor-pointer transition-all border ${answers[q.id] === opt ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/30 dark:border-indigo-500' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700'}`}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers(prev => ({...prev, [q.id]: opt}))}
                    className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 mr-3"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{opt}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      {quiz && (
        <button 
          onClick={submitQuiz}
          disabled={Object.keys(answers).length !== quiz.questions.length}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-lg text-lg"
        >
          Submit Answers
        </button>
      )}
    </div>
  );
};

export default Quiz;
