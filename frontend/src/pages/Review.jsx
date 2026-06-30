import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Check, 
  X, 
  Award, 
  RotateCcw, 
  ArrowRight, 
  LayoutDashboard, 
  HelpCircle, 
  Volume2,
  Pause,
  Sliders,
  Sparkles
} from 'lucide-react';
import { flashcardService } from '../services/api';
import Flashcard from '../components/Flashcard';
import LoadingSpinner from '../components/LoadingSpinner';

const Review = () => {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // State for QA cards
  const [isFlipped, setIsFlipped] = useState(false);
  
  // State for Fillups
  const [userAnswer, setUserAnswer] = useState('');
  
  // State for MCQ
  const [selectedOption, setSelectedOption] = useState(null);
  
  // Shared interactive state
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track session metrics
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionNotKnown, setSessionNotKnown] = useState(0);

  // Advanced SM-2 grading toggle and speed
  const [showAdvancedGrading, setShowAdvancedGrading] = useState(false);
  const [speakRate, setSpeakRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Reset speech when the card changes
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const data = await flashcardService.getReviewQueue();
        if (setId) {
          const filtered = data.filter((card) => card.setId === setId);
          setQueue(filtered);
        } else {
          setQueue(data);
        }
      } catch (err) {
        setError('Failed to load flashcard review queue. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchQueue();
  }, [setId]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReviewAction = async (status) => {
    // Map Known -> 4, Not Known -> 1 quality
    const quality = status === 'known' ? 4 : 1;
    await handleReviewSM2(quality);
  };

  const handleReviewSM2 = async (quality) => {
    if (currentIndex >= queue.length) return;
    
    const currentCard = queue[currentIndex];
    
    // Quality >= 3 maps to known, < 3 to practice
    if (quality >= 3) {
      setSessionKnown((prev) => prev + 1);
    } else {
      setSessionNotKnown((prev) => prev + 1);
    }

    try {
      await flashcardService.updateReviewSM2(currentCard.id, quality);
    } catch (err) {
      console.error('Failed to update SM-2 review status:', err);
    }

    // Reset card-specific interactive states
    setIsFlipped(false);
    setUserAnswer('');
    setSelectedOption(null);
    setHasChecked(false);
    setIsCorrect(false);
    
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 200);
  };

  const [currentSpokenText, setCurrentSpokenText] = useState('');

  const handleSpeak = (text) => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      window.speechSynthesis.cancel();
      setCurrentSpokenText(text);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speakRate;
      
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };
      
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      
      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const cycleSpeakRate = () => {
    const nextRate = speakRate === 1.0 ? 1.2 : speakRate === 1.2 ? 0.8 : 1.0;
    setSpeakRate(nextRate);
    
    // If currently speaking, we restart it with the new rate
    if (isPlaying && !isPaused && currentSpokenText) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentSpokenText);
      utterance.rate = nextRate;
      
      utterance.onstart = () => {
        setIsPlaying(true);
        setIsPaused(false);
      };
      utterance.onend = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      utterance.onerror = () => {
        setIsPlaying(false);
        setIsPaused(false);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner message="Loading review queue..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 text-rose-700 border border-rose-100 rounded-3xl text-center space-y-4">
        <p className="font-bold">{error}</p>
        <Link to="/dashboard" className="inline-block bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Session Completed / Empty state
  if (queue.length === 0 || currentIndex >= queue.length) {
    const isCompletedSession = queue.length > 0;
    
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl text-center space-y-8 animate-slide-up">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <Award className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">
            {isCompletedSession ? 'Review Completed!' : 'Queue is Empty!'}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {isCompletedSession 
              ? 'Great job keeping up with your study goals today.' 
              : 'You have no pending flashcards to review. Create or upload text to generate new cards.'}
          </p>
        </div>

        {isCompletedSession && (
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-semibold">
            <div className="text-center">
              <span className="block text-2xl font-extrabold text-emerald-600">{sessionKnown}</span>
              <span className="text-xs text-slate-400">Mastered (Q &gt;= 3)</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-extrabold text-amber-600">{sessionNotKnown}</span>
              <span className="text-xs text-slate-400">Practice (Q &lt; 3)</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="w-full inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md transition-all text-sm cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
          <Link
            to="/create"
            className="w-full inline-flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-6 py-3.5 rounded-2xl shadow-sm transition-all text-sm cursor-pointer"
          >
            <span>Generate More Cards</span>
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = queue[currentIndex];
  const cardType = currentCard.type || 'qa';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8 animate-fade-in">
      {/* Header bar */}
      <div className="flex justify-between items-center px-2">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Study Session
          </span>
          <h2 className="text-lg font-extrabold text-slate-900">
            Card {currentIndex + 1} of {queue.length}
          </h2>
        </div>
        <div className="text-right">
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Anki SM-2 Spaced Repetition</span>
          </span>
        </div>
      </div>

      {/* Render Dynamic Card Body depending on Card Type */}
      {cardType === 'mcq' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide truncate max-w-[220px]">
              Set: {currentCard.setTitle}
            </span>
            <div className="flex items-center gap-2">
              {/* TTS Controls */}
              <div className="flex items-center bg-slate-50 border border-slate-200/60 rounded-xl p-0.5">
                <button 
                  onClick={() => handleSpeak(currentCard.question)}
                  className="p-1 hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                  title={isPlaying && !isPaused ? "Pause reading" : isPaused ? "Resume reading" : "Speak Question"}
                >
                  {isPlaying && !isPaused ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button 
                  onClick={cycleSpeakRate}
                  className="px-1.5 py-0.5 text-[9px] font-extrabold text-slate-500 hover:text-slate-700 transition-colors"
                  title="Cycle read speed"
                >
                  {speakRate}x
                </button>
              </div>
              <span className="text-[10px] px-2 py-0.5 font-bold rounded-full border bg-purple-50 border-purple-200 text-purple-700 uppercase">
                Multiple Choice
              </span>
            </div>
          </div>

          <h3 className="text-slate-800 text-lg sm:text-xl font-bold leading-relaxed">
            {currentCard.question}
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {currentCard.options?.map((opt, oIdx) => {
              const letter = String.fromCharCode(65 + oIdx);
              const isSelected = selectedOption === opt;
              const isCorrectOption = opt === currentCard.answer;

              let btnStyle = 'border-slate-200 bg-slate-50/50 hover:bg-slate-50';
              if (hasChecked) {
                if (isCorrectOption) {
                  btnStyle = 'border-emerald-300 bg-emerald-50 text-emerald-800 font-bold';
                } else if (isSelected) {
                  btnStyle = 'border-rose-300 bg-rose-50 text-rose-800 font-bold';
                } else {
                  btnStyle = 'border-slate-100 bg-slate-50/20 text-slate-400 opacity-60';
                }
              } else if (isSelected) {
                btnStyle = 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold';
              }

              return (
                <button
                  key={oIdx}
                  type="button"
                  disabled={hasChecked}
                  onClick={() => {
                    setSelectedOption(opt);
                    setHasChecked(true);
                    const correct = opt.trim().toLowerCase() === currentCard.answer.trim().toLowerCase();
                    setIsCorrect(correct);
                  }}
                  className={`flex items-center space-x-3 w-full p-4 border rounded-2xl text-left text-sm font-semibold transition-all ${btnStyle} ${!hasChecked && 'cursor-pointer'}`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold ${
                    hasChecked && isCorrectOption
                      ? 'bg-emerald-600 text-white'
                      : hasChecked && isSelected
                        ? 'bg-rose-600 text-white'
                        : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                  }`}>
                    {letter}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : cardType === 'fillup' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-lg p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide truncate max-w-[220px]">
              Set: {currentCard.setTitle}
            </span>
            <div className="flex items-center gap-2">
              {/* TTS Controls */}
              <div className="flex items-center bg-slate-50 border border-slate-200/60 rounded-xl p-0.5">
                <button 
                  onClick={() => handleSpeak(currentCard.question.replace("______", currentCard.answer))}
                  className="p-1 hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                  title={isPlaying && !isPaused ? "Pause reading" : isPaused ? "Resume reading" : "Speak Statement"}
                >
                  {isPlaying && !isPaused ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button 
                  onClick={cycleSpeakRate}
                  className="px-1.5 py-0.5 text-[9px] font-extrabold text-slate-500 hover:text-slate-700 transition-colors"
                  title="Cycle read speed"
                >
                  {speakRate}x
                </button>
              </div>
              <span className="text-[10px] px-2 py-0.5 font-bold rounded-full border bg-amber-50 border-amber-200 text-amber-700 uppercase">
                Fill in the Blank
              </span>
            </div>
          </div>

          <h3 className="text-slate-800 text-lg sm:text-xl font-bold leading-relaxed text-center py-6">
            {currentCard.question}
          </h3>

          <div className="space-y-4">
            {!hasChecked ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!userAnswer.trim()) return;
                  setHasChecked(true);
                  const correct = userAnswer.trim().toLowerCase() === currentCard.answer.trim().toLowerCase();
                  setIsCorrect(correct);
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  required
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="flex-1 p-4 border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-4 rounded-2xl shadow-sm text-sm cursor-pointer"
                >
                  Check Answer
                </button>
              </form>
            ) : (
              <div className={`p-4 rounded-2xl border ${
                isCorrect 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                  : 'bg-rose-50 border-rose-100 text-rose-800'
              } space-y-2`}>
                <div className="flex items-center space-x-2 font-bold text-sm">
                  {isCorrect ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-600" />
                      <span>Correct!</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-rose-600" />
                      <span>Incorrect!</span>
                    </>
                  )}
                </div>
                <p className="text-xs font-semibold">
                  Your guess: <span className="font-bold underline">{userAnswer}</span>
                </p>
                <p className="text-xs font-bold">
                  Correct answer: <span className="underline text-indigo-700">{currentCard.answer}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standard QA 3D Flip Card */
        <Flashcard
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />
      )}

      {/* Review Controls (SM-2 Grader panel) */}
      <div className="space-y-4">
        {(cardType === 'qa' || hasChecked) ? (
          <div className="space-y-4 max-w-xl mx-auto animate-fade-in">
            
            {/* Toggle Advanced Slider option */}
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-500">Grade your recall quality:</span>
              <button 
                onClick={() => setShowAdvancedGrading(!showAdvancedGrading)}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                <Sliders className="w-3 h-3" />
                <span>{showAdvancedGrading ? "Hide 0-5 Grid" : "Show Anki 0-5 Grid"}</span>
              </button>
            </div>

            {/* Standard Review Controls (Known / Practice) */}
            {!showAdvancedGrading ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => handleReviewAction('not_known')}
                  className={`w-full sm:flex-1 inline-flex items-center justify-center space-x-2 border py-4 rounded-2xl transition-all shadow-sm font-bold text-sm cursor-pointer ${
                    (cardType !== 'qa' && !isCorrect)
                      ? 'bg-rose-600 border-rose-600 text-white hover:bg-rose-700 shadow-md ring-2 ring-rose-200'
                      : 'bg-rose-50 border-rose-200 hover:bg-rose-100/50 text-rose-750'
                  }`}
                >
                  <X className="w-4 h-4" />
                  <span>Not Known (Practice)</span>
                </button>
                <button
                  onClick={() => handleReviewAction('known')}
                  className={`w-full sm:flex-1 inline-flex items-center justify-center space-x-2 border py-4 rounded-2xl transition-all shadow-sm font-bold text-sm cursor-pointer ${
                    (cardType !== 'qa' && isCorrect)
                      ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-md ring-2 ring-emerald-200'
                      : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/50 text-emerald-755'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Known (Keep Schedule)</span>
                </button>
              </div>
            ) : (
              /* Anki 0-5 Quality Buttons Grid */
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-250/50 shadow-inner">
                {[
                  { q: 0, label: "Blackout", style: "bg-slate-900 border-slate-900 text-white hover:bg-slate-800" },
                  { q: 1, label: "Incorrect", style: "bg-rose-600 border-rose-600 text-white hover:bg-rose-750" },
                  { q: 2, label: "Familiar", style: "bg-orange-500 border-orange-500 text-white hover:bg-orange-600" },
                  { q: 3, label: "Difficult", style: "bg-amber-500 border-amber-500 text-white hover:bg-amber-600" },
                  { q: 4, label: "Good", style: "bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700" },
                  { q: 5, label: "Perfect", style: "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700" }
                ].map((item) => (
                  <button
                    key={item.q}
                    onClick={() => handleReviewSM2(item.q)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 border rounded-xl text-[10px] font-bold transition-all shadow-sm cursor-pointer ${item.style}`}
                    title={item.label}
                  >
                    <span className="text-base font-extrabold mb-0.5">{item.q}</span>
                    <span className="scale-90 opacity-90">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 bg-slate-100/80 rounded-2xl text-slate-400 text-xs font-bold border border-slate-200/50 max-w-xl mx-auto flex items-center justify-center space-x-1.5 animate-pulse">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Please answer the question above to grade your memory</span>
          </div>
        )}

        <div className="text-center text-xs font-semibold text-slate-400 max-w-xl mx-auto">
          Tip: Grade honestly! Spaced repetition brings forgotten cards back sooner.
        </div>
      </div>
    </div>
  );
};

export default React.memo(Review);
