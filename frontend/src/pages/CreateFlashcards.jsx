import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, AlertCircle, FileText, Check, Settings, Clipboard, Upload } from 'lucide-react';
import { flashcardService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import DocumentUpload from './DocumentUpload';

const CreateFlashcards = () => {
  const navigate = useNavigate();
  const [inputMethod, setInputMethod] = useState('text'); // 'text' | 'document'
  const [notes, setNotes] = useState('');
  
  // Document state
  const [docId, setDocId] = useState(null);
  const [docName, setDocName] = useState('');
  
  // Settings
  const [cardType, setCardType] = useState('qa'); // 'qa' | 'fillup' | 'mcq'
  const [cardCount, setCardCount] = useState(10); // 5 | 10 | 20 | 30 | 50
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSet, setGeneratedSet] = useState(null);

  // Dynamic loading messages
  const [loadingMsg, setLoadingMsg] = useState('Analyzing text content...');

  const handleUploadSuccess = (uploadedId, name, preview) => {
    setDocId(uploadedId);
    setDocName(name);
    setError('');
  };

  const handleUploadReset = () => {
    setDocId(null);
    setDocName('');
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setGeneratedSet(null);

    // Validation
    if (inputMethod === 'text') {
      const cleanNotes = notes.trim();
      if (cleanNotes.length < 30) {
        setError('Study notes must be at least 30 characters long.');
        return;
      }
    } else {
      if (!docId) {
        setError('Please upload a document first before generating.');
        return;
      }
    }

    setIsLoading(true);
    setLoadingMsg('Initializing spaCy local parser...');

    // Simulate stepping through pipeline steps for premium feel
    const timers = [];
    timers.push(setTimeout(() => setLoadingMsg('Performing syntactic POS tagging & tokenization...'), 1200));
    timers.push(setTimeout(() => setLoadingMsg('Running local Named Entity Recognition (NER)...'), 2400));
    
    if (cardType === 'mcq') {
      timers.push(setTimeout(() => setLoadingMsg('Formulating distractors and alternative answers...'), 3650));
    } else if (cardType === 'fillup') {
      timers.push(setTimeout(() => setLoadingMsg('Applying grammar masks to key nouns...'), 3650));
    } else {
      timers.push(setTimeout(() => setLoadingMsg('Applying definition and chronological rules...'), 3650));
    }
    
    timers.push(setTimeout(() => setLoadingMsg('Indexing and saving flashcard set into database...'), 4800));

    try {
      const payload = {
        notes: inputMethod === 'text' ? notes : undefined,
        source: inputMethod === 'document' ? docId : undefined,
        count: cardCount,
        type: cardType
      };

      const data = await flashcardService.generate(payload);
      setGeneratedSet(data);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Failed to parse flashcards. Make sure the content contains full factual sentences.'
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
          Upload document files or paste textbook text. Our local spaCy model will extract questions and answers.
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
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-600 font-bold uppercase rounded-md">
                  Source: {generatedSet.source_type}
                </span>
                <span className="text-[10px] px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold uppercase rounded-md">
                  Type: {generatedSet.flashcard_type.toUpperCase()}
                </span>
                <span className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold uppercase rounded-md">
                  Cards: {generatedSet.card_count}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate(`/review?setId=${generatedSet.id}`)}
              className="w-full md:w-auto inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-emerald-250 transition-all text-base cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Start Reviewing Now</span>
            </button>
          </div>

          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xl font-extrabold text-slate-800">Generated Flashcards Preview</h3>
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
                    <p className="text-slate-800 font-bold text-base mt-0.5 leading-relaxed">{card.question}</p>
                  </div>
                  
                  {/* MCQ Options Rendering */}
                  {card.options && card.options.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-50 pt-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Multiple Choice Options</h4>
                      {card.options.map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isCorrect = opt === card.answer;
                        return (
                          <div 
                            key={oIdx}
                            className={`flex items-center space-x-2 py-2 px-3 border rounded-xl text-xs font-bold transition-all ${
                              isCorrect 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-slate-50/50 border-slate-200/60 text-slate-600'
                            }`}
                          >
                            <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-extrabold mr-1 ${
                              isCorrect ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {letter}
                            </span>
                            <span>{opt}</span>
                            {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Correct Answer</h4>
                    <p className="text-indigo-950 font-extrabold text-sm mt-0.5">{card.answer}</p>
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
                handleUploadReset();
              }}
              className="text-slate-500 hover:text-indigo-600 text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer"
            >
              Generate New Set
            </button>
          </div>
        </div>
      ) : (
        /* Form View */
        <form onSubmit={handleGenerate} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Input Selection Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
                
                {/* Input Method Toggle */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Choose Input Method
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setInputMethod('text')}
                      className={`flex items-center justify-center space-x-2 py-4 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                        inputMethod === 'text'
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 font-extrabold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                      }`}
                    >
                      <Clipboard className="w-4 h-4" />
                      <span>Paste Notes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMethod('document')}
                      className={`flex items-center justify-center space-x-2 py-4 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                        inputMethod === 'document'
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 font-extrabold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Document</span>
                    </button>
                  </div>
                </div>

                {/* Conditional Inputs */}
                {inputMethod === 'text' ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Paste Notes / Article Text
                    </label>
                    <textarea
                      required
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Example: Photosynthesis is the process by which green plants convert sunlight into chemical energy. Chlorophyll absorbs light energy. Photosynthesis occurs in chloroplasts. Albert Einstein developed the theory of relativity in 1915."
                      rows={9}
                      className="block w-full p-4 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-sm leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-1">
                      <span>Min length: 30 chars</span>
                      <span className={notes.length >= 30 ? 'text-emerald-600' : 'text-slate-400'}>
                        {notes.length} characters
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Upload Study Document File
                    </label>
                    <DocumentUpload 
                      onUploadSuccess={handleUploadSuccess} 
                      onUploadReset={handleUploadReset} 
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Generation Settings Sidebar Column */}
            <div className="space-y-6">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
                <div className="flex items-center space-x-2 text-slate-700 font-bold text-base pb-3 border-b border-slate-100">
                  <Settings className="w-4.5 h-4.5 text-indigo-500 animate-spin-slow" />
                  <span>Generation Settings</span>
                </div>

                {/* Card Type Selector */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Flashcard Type
                  </label>
                  <div className="flex flex-col space-y-2">
                    {[
                      { id: 'qa', label: 'Question Answer', desc: 'Standard definition & geographical QA' },
                      { id: 'fillup', label: 'Fill in the Blank', desc: 'Cloze sentences with masked keywords' },
                      { id: 'mcq', label: 'Multiple Choice', desc: 'Questions with 4 options and distractors' }
                    ].map((type) => (
                      <label 
                        key={type.id} 
                        className={`flex items-start p-3 border rounded-xl cursor-pointer transition-all ${
                          cardType === type.id 
                            ? 'border-indigo-500 bg-indigo-50/20 text-slate-800' 
                            : 'border-slate-100 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cardType"
                          value={type.id}
                          checked={cardType === type.id}
                          onChange={() => setCardType(type.id)}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <div className="ml-2.5 text-left">
                          <p className="text-xs font-bold">{type.label}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{type.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Card Count Selector */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Number of Cards
                  </label>
                  <select
                    value={cardCount}
                    onChange={(e) => setCardCount(parseInt(e.target.value))}
                    className="block w-full p-3 border border-slate-200 rounded-xl text-slate-800 font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {[5, 10, 20, 30, 50].map(count => (
                      <option key={count} value={count}>{count} Flashcards</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={inputMethod === 'text' ? notes.length < 30 : !docId}
                className="w-full inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold py-4 rounded-2xl shadow-lg hover:shadow-indigo-150 transition-all duration-200 text-base disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span>Generate AI Flashcards</span>
              </button>
            </div>

          </div>
        </form>
      )}
    </div>
  );
};

export default CreateFlashcards;
