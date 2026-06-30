import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, AlertCircle, FileText, ChevronRight, Check } from 'lucide-react';
import { flashcardService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CreateFlashcards = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSet, setGeneratedSet] = useState(null);

  // Dynamic loading messages
  const [loadingMsg, setLoadingMsg] = useState('Analyzing notes...');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setGeneratedSet(null);

    const cleanNotes = notes.strip ? notes.strip() : notes.trim();
    if (cleanNotes.length < 30) {
      setError('Study notes must be at least 30 characters long.');
      return;
    }

    setIsLoading(true);
    setLoadingMsg('Initializing spaCy NLP pipeline...');

    // Simulate stepping through pipeline steps for premium feel
    const timers = [];
    timers.push(setTimeout(() => setLoadingMsg('Performing POS tagging & tokenization...'), 1500));
    timers.push(setTimeout(() => setLoadingMsg('Running Named Entity Recognition (NER)...'), 3000));
    timers.push(setTimeout(() => setLoadingMsg('Applying dependency parsing grammar rules...'), 4500));
    timers.push(setTimeout(() => setLoadingMsg('Structuring flashcards database records...'), 6000));

    try {
      const data = await flashcardService.generate(cleanNotes);
      setGeneratedSet(data);
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Failed to parse flashcards. Make sure your notes contain full factual sentences.'
      );
    } finally {
      timers.forEach(t => clearTimeout(t));
      setIsLoading(false);
    }
  };

  const getDifficultyBadge = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'hard':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Flashcards</h1>
        <p className="text-slate-500 font-medium text-sm mt-1">
          Paste textbook text, notes, or articles. Our local spaCy model will extract flashcards automatically.
        </p>
      </div>

      {error && (
        <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-16 shadow-md text-center space-y-4">
          <LoadingSpinner size="large" message={loadingMsg} />
        </div>
      ) : generatedSet ? (
        /* Results View */
        <div className="space-y-6 animate-slide-up">
          <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold text-sm">
                <Check className="w-4 h-4" />
                <span>Generation Complete!</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">{generatedSet.title}</h2>
              <p className="text-slate-400 text-xs font-semibold">
                Generated {generatedSet.card_count} flashcards successfully.
              </p>
            </div>
            <button
              onClick={() => navigate(`/review?setId=${generatedSet.id}`)}
              className="w-full md:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-emerald-250 transition-all text-base"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Start Reviewing Now</span>
            </button>
          </div>

          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xl font-extrabold text-slate-800">Generated Flashcards</h3>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {generatedSet.cards.map((card, idx) => (
              <div 
                key={card.id || idx}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Card #{idx + 1}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 font-bold border rounded-full ${getDifficultyBadge(card.difficulty)}`}>
                    {card.difficulty}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question</h4>
                    <p className="text-slate-800 font-bold text-base mt-0.5">{card.question}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Answer</h4>
                    <p className="text-indigo-950 font-medium text-sm mt-0.5">{card.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => {
                setGeneratedSet(null);
                setNotes('');
              }}
              className="text-slate-500 hover:text-indigo-600 text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 px-6 py-3 rounded-2xl shadow-sm transition-all"
            >
              Paste New Notes
            </button>
          </div>
        </div>
      ) : (
        /* Form View */
        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
            <div className="flex items-center space-x-2 text-slate-700 font-bold text-base pb-2 border-b border-slate-50">
              <FileText className="w-5 h-5 text-indigo-500" />
              <span>Input Study Materials</span>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Notes / Article Text
              </label>
              <textarea
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Example: Photosynthesis is the process by which green plants convert sunlight into chemical energy. Chlorophyll absorbs light energy. Photosynthesis occurs in chloroplasts. Albert Einstein developed the theory of relativity in 1915."
                rows={10}
                className="block w-full p-4 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-sm leading-relaxed"
              />
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 font-medium pt-2">
              <span>Minimum length: 30 characters</span>
              <span className={notes.length >= 30 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                {notes.length} characters
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={notes.length < 30}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-indigo-150 transition-all duration-200 text-base disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Generate Flashcards</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateFlashcards;
