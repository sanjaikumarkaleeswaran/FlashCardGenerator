import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Check, 
  X, 
  Award, 
  LayoutDashboard, 
  HelpCircle, 
  Volume2,
  Pause,
  Sliders,
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { flashcardService } from '../services/api';
import Flashcard from '../components/Flashcard';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import Card, { CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

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
      <div className="max-w-md mx-auto my-12 p-6 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-3xl text-center space-y-4">
        <p className="font-bold">{error}</p>
        <Link to="/dashboard">
          <Button variant="primary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  // Session Completed / Empty state
  if (queue.length === 0 || currentIndex >= queue.length) {
    const isCompletedSession = queue.length > 0;
    
    return (
      <Card className="max-w-md mx-auto my-12 p-8 shadow-2xl text-center space-y-8 animate-slide-up bg-white/80 dark:bg-slate-900/80 backdrop-blur-md relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-tr from-indigo-500/15 to-pink-500/15 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 rounded-full blur-2xl" />
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/25">
            <Award className="w-12 h-12 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
            {isCompletedSession ? 'Review Completed! 🎉' : 'Queue is Empty!'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            {isCompletedSession 
              ? 'Great job keeping up with your study goals today.' 
              : 'You have no pending flashcards to review. Create or upload text to generate new cards.'}
          </p>
        </div>

        {isCompletedSession && (
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-sm font-semibold">
            <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
              <span className="block text-3xl font-extrabold text-emerald-600 dark:text-emerald-450">{sessionKnown}</span>
              <span className="text-xs text-emerald-700 dark:text-emerald-500 font-bold">✓ Mastered</span>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <span className="block text-3xl font-extrabold text-amber-600 dark:text-amber-450">{sessionNotKnown}</span>
              <span className="text-xs text-amber-700 dark:text-amber-500 font-bold">↺ Practice</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link to="/dashboard" className="w-full">
            <Button variant="primary" className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 border-none shadow-lg shadow-indigo-500/15" icon={LayoutDashboard}>
              Go to Dashboard
            </Button>
          </Link>
          <Link to="/create" className="w-full">
            <Button variant="outline" className="w-full">
              Generate More Cards
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const currentCard = queue[currentIndex];
  const cardType = currentCard.type || 'qa';
  const progressPercent = ((currentIndex + 1) / queue.length) * 100;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6 animate-fade-in">
      {/* Header bar */}
      <div className="flex justify-between items-center px-1">
        <div>
          <span className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
            Study Session
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
            Card {currentIndex + 1} of {queue.length}
          </h2>
        </div>
        <div>
          <Badge variant="info" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Anki SM-2 Spaced Repetition</span>
          </Badge>
        </div>
      </div>

      {/* Progress Bar - rainbow gradient */}
      <div className="w-full bg-slate-100 dark:bg-slate-800/80 h-3 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-indigo-500 via-purple-500 via-pink-500 to-amber-400"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Render Dynamic Card Body depending on Card Type */}
      {cardType === 'mcq' ? (
        <Card className="p-8 space-y-6 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/80 dark:border-slate-800/85">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest truncate max-w-[220px]">
              Set: {currentCard.setTitle}
            </span>
            <div className="flex items-center gap-2">
              {/* TTS Controls */}
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-0.5">
                <button 
                  onClick={() => handleSpeak(currentCard.question)}
                  className="p-1 hover:bg-slate-250/60 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-805 dark:hover:text-white rounded-lg transition-all cursor-pointer"
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
                  className="px-1.5 py-0.5 text-[9px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  title="Cycle read speed"
                >
                  {speakRate}x
                </button>
              </div>
              <Badge variant="info">Multiple Choice</Badge>
            </div>
          </div>

          <h3 className="text-slate-850 dark:text-slate-100 text-lg sm:text-xl font-extrabold leading-relaxed">
            {currentCard.question}
          </h3>

          <div className="grid grid-cols-1 gap-3 pt-2">
            {currentCard.options?.map((opt, oIdx) => {
              const letter = String.fromCharCode(65 + oIdx);
              const isSelected = selectedOption === opt;
              const isCorrectOption = opt === currentCard.answer;

              let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-slate-100/50 dark:hover:bg-slate-950/40 text-slate-800 dark:text-slate-200';
              if (hasChecked) {
                if (isCorrectOption) {
                  btnStyle = 'border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 font-extrabold';
                } else if (isSelected) {
                  btnStyle = 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-400 font-extrabold';
                } else {
                  btnStyle = 'border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/10 text-slate-400 opacity-50';
                }
              } else if (isSelected) {
                btnStyle = 'border-indigo-500 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-850 dark:text-indigo-400 font-extrabold';
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
                  className={`flex items-center space-x-3 w-full p-4 border rounded-2xl text-left text-sm font-semibold transition-all duration-200 active:scale-[0.99] ${btnStyle} ${!hasChecked && 'cursor-pointer'}`}
                >
                  <span className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    hasChecked && isCorrectOption
                      ? 'bg-emerald-600 text-white'
                      : hasChecked && isSelected
                        ? 'bg-rose-600 text-white'
                        : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {letter}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </Card>
      ) : cardType === 'fillup' ? (
        <Card className="p-8 space-y-6 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/80 dark:border-slate-800/85">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800/50">
            <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest truncate max-w-[220px]">
              Set: {currentCard.setTitle}
            </span>
            <div className="flex items-center gap-2">
              {/* TTS Controls */}
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-0.5">
                <button 
                  onClick={() => handleSpeak(currentCard.question.replace("______", currentCard.answer))}
                  className="p-1 hover:bg-slate-250/60 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-all cursor-pointer"
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
                  className="px-1.5 py-0.5 text-[9px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                  title="Cycle read speed"
                >
                  {speakRate}x
                </button>
              </div>
              <Badge variant="warning">Fill in the Blank</Badge>
            </div>
          </div>

          <h3 className="text-slate-850 dark:text-slate-100 text-lg sm:text-xl font-extrabold leading-relaxed text-center py-6">
            {currentCard.question}
          </h3>

          <div className="space-y-4 pt-2">
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
                  className="flex-1 p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-800 dark:text-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all"
                />
                <Button
                  type="submit"
                  variant="primary"
                  className="h-[52px]"
                >
                  Check Answer
                </Button>
              </form>
            ) : (
              <div className={`p-5 rounded-2xl border ${
                isCorrect 
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400' 
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/50 text-rose-800 dark:text-rose-450'
              } space-y-2.5`}>
                <div className="flex items-center space-x-2 font-extrabold text-sm">
                  {isCorrect ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
                      <span>Correct!</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-rose-600 dark:text-rose-450" />
                      <span>Incorrect!</span>
                    </>
                  )}
                </div>
                <p className="text-xs font-semibold">
                  Your guess: <span className="font-bold underline">{userAnswer}</span>
                </p>
                <p className="text-xs font-bold">
                  Correct answer: <span className="underline text-indigo-700 dark:text-indigo-400">{currentCard.answer}</span>
                </p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* Standard QA 3D Flip Card */
        <Flashcard
          card={currentCard}
          isFlipped={isFlipped}
          onFlip={handleFlip}
        />
      )}

      {/* Review Controls (SM-2 Grader panel) */}
      <div className="space-y-4 max-w-xl mx-auto">
        {(cardType === 'qa' || hasChecked) ? (
          <div className="space-y-4 animate-fade-in">
            
            {/* Toggle Advanced Slider option */}
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Grade your recall quality:</span>
              <button 
                onClick={() => setShowAdvancedGrading(!showAdvancedGrading)}
                className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
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
                  className={`w-full sm:flex-1 h-14 px-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer ${
                    (cardType !== 'qa' && !isCorrect)
                      ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/20 border-none'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/30'
                  }`}
                >
                  <X className="w-5 h-5" />
                  <span>Not Known</span>
                </button>
                <button
                  onClick={() => handleReviewAction('known')}
                  className={`w-full sm:flex-1 h-14 px-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer ${
                    (cardType !== 'qa' && isCorrect)
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-emerald-500/20 border-none'
                      : 'bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/30'
                  }`}
                >
                  <Check className="w-5 h-5" />
                  <span>Known ✓</span>
                </button>
              </div>
            ) : (
              /* Anki 0-5 Quality Buttons Grid */
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
                {[
                  { q: 0, label: 'Blackout', style: 'bg-gradient-to-b from-slate-800 to-slate-950 text-white' },
                  { q: 1, label: 'Wrong',    style: 'bg-gradient-to-b from-rose-500 to-rose-700 text-white' },
                  { q: 2, label: 'Hard',     style: 'bg-gradient-to-b from-orange-500 to-amber-600 text-white' },
                  { q: 3, label: 'Okay',     style: 'bg-gradient-to-b from-amber-400 to-yellow-500 text-white' },
                  { q: 4, label: 'Good',     style: 'bg-gradient-to-b from-indigo-500 to-violet-600 text-white' },
                  { q: 5, label: 'Perfect',  style: 'bg-gradient-to-b from-emerald-500 to-cyan-600 text-white' }
                ].map((item) => (
                  <button
                    key={item.q}
                    onClick={() => handleReviewSM2(item.q)}
                    className={`flex flex-col items-center justify-center py-3 px-1 rounded-xl text-[10px] font-extrabold transition-all shadow-md active:scale-90 cursor-pointer hover:opacity-90 ${item.style}`}
                    title={item.label}
                  >
                    <span className="text-lg font-black mb-0.5">{item.q}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4 bg-slate-100/50 dark:bg-slate-900/50 rounded-2xl text-slate-400 dark:text-slate-550 text-xs font-bold border border-slate-200/50 dark:border-slate-850/50 max-w-xl mx-auto flex items-center justify-center space-x-1.5 animate-pulse">
            <HelpCircle className="w-4 h-4 text-slate-405" />
            <span>Please answer the question above to grade your memory</span>
          </div>
        )}

        <div className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 max-w-xl mx-auto uppercase tracking-wider">
          Tip: Grade honestly! Spaced repetition brings forgotten cards back sooner.
        </div>
      </div>
    </div>
  );
};

export default React.memo(Review);
