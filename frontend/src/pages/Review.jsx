import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check, X, Award, RotateCcw, ArrowRight, LayoutDashboard } from 'lucide-react';
import { flashcardService } from '../services/api';
import Flashcard from '../components/Flashcard';
import LoadingSpinner from '../components/LoadingSpinner';

const Review = () => {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get('setId');

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Track counts during this session
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionNotKnown, setSessionNotKnown] = useState(0);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const data = await flashcardService.getReviewQueue();
        
        // If a specific set is requested, filter queue items
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
    if (currentIndex >= queue.length) return;
    
    const currentCard = queue[currentIndex];
    
    // Save state update in local state for analytics count
    if (status === 'known') {
      setSessionKnown((prev) => prev + 1);
    } else {
      setSessionNotKnown((prev) => prev + 1);
    }

    try {
      // Sync update with backend
      await flashcardService.updateReviewStatus(currentCard.id, status);
    } catch (err) {
      console.error('Failed to update review status in backend:', err);
    }

    // Reset flip state and progress to next card
    setIsFlipped(false);
    
    // Wait for card flip animation to finish turning back before showing the next card content
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 200);
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

  // Completed Session state
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
              : 'You have no pending flashcards to review. Create some new notes to get started.'}
          </p>
        </div>

        {isCompletedSession && (
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-semibold">
            <div className="text-center">
              <span className="block text-2xl font-extrabold text-emerald-600">{sessionKnown}</span>
              <span className="text-xs text-slate-400">Known</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-extrabold text-amber-600">{sessionNotKnown}</span>
              <span className="text-xs text-slate-400">Practice</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            to="/dashboard"
            className="w-full inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md transition-all text-sm"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
          <Link
            to="/create"
            className="w-full inline-flex items-center justify-center space-x-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-6 py-3.5 rounded-2xl shadow-sm transition-all text-sm"
          >
            <span>Create More Flashcards</span>
          </Link>
        </div>
      </div>
    );
  }

  const currentCard = queue[currentIndex];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8 animate-fade-in">
      {/* Session progress header */}
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
          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-bold">
            Spaced Repetition Active
          </span>
        </div>
      </div>

      {/* Render Flashcard */}
      <Flashcard
        card={currentCard}
        isFlipped={isFlipped}
        onFlip={handleFlip}
      />

      {/* Active Review Controls */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 max-w-xl mx-auto pt-4">
        <button
          onClick={() => handleReviewAction('not_known')}
          className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 bg-rose-50 border border-rose-200 hover:bg-rose-100/50 text-rose-700 font-bold px-6 py-4 rounded-2xl transition-all shadow-sm"
        >
          <X className="w-5 h-5" />
          <span>Not Known (+2 Priority)</span>
        </button>
        <button
          onClick={() => handleReviewAction('known')}
          className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100/50 text-emerald-700 font-bold px-6 py-4 rounded-2xl transition-all shadow-sm"
        >
          <Check className="w-5 h-5" />
          <span>Known (-1 Priority)</span>
        </button>
      </div>

      <div className="text-center text-xs font-semibold text-slate-400">
        Tip: If you know the card, marking it "Known" decreases its frequency.
      </div>
    </div>
  );
};

export default React.memo(Review);
