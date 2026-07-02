import React, { useState, useEffect } from 'react';
import { Volume2, Pause, Sparkles, RotateCcw } from 'lucide-react';
import Badge from './ui/Badge';

const CARD_GRADIENTS = [
  { front: 'from-indigo-600 via-purple-600 to-pink-600', back: 'from-emerald-500 via-teal-500 to-cyan-500' },
  { front: 'from-violet-600 via-fuchsia-600 to-pink-500', back: 'from-indigo-500 via-blue-500 to-cyan-500' },
  { front: 'from-rose-500 via-orange-500 to-amber-500', back: 'from-emerald-600 via-green-500 to-teal-500' },
  { front: 'from-blue-600 via-indigo-600 to-violet-600', back: 'from-amber-500 via-orange-500 to-rose-500' },
  { front: 'from-cyan-500 via-sky-600 to-indigo-600', back: 'from-emerald-500 via-lime-500 to-green-600' },
];

const Flashcard = ({ card, isFlipped, onFlip, onSwipeLeft, onSwipeRight }) => {
  const [speakRate, setSpeakRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Swipe gesture state variables
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);

  // Stable gradient index based on card id
  const gradientIndex = card?.id
    ? Math.abs(card.id.toString().charCodeAt(0)) % CARD_GRADIENTS.length
    : 0;
  const gradient = CARD_GRADIENTS[gradientIndex];

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
  }, [isFlipped]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getDifficultyVariant = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'easy';
      case 'medium': return 'medium';
      case 'hard': return 'hard';
      default: return 'medium';
    }
  };

  const handleSpeak = (e, text) => {
    e.stopPropagation();
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
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speakRate;
      utterance.onstart = () => { setIsPlaying(true); setIsPaused(false); };
      utterance.onend = () => { setIsPlaying(false); setIsPaused(false); };
      utterance.onerror = () => { setIsPlaying(false); setIsPaused(false); };
      window.speechSynthesis.speak(utterance);
    }
  };

  const cycleRate = (e) => {
    e.stopPropagation();
    const nextRate = speakRate === 1.0 ? 1.2 : speakRate === 1.2 ? 0.8 : 1.0;
    setSpeakRate(nextRate);
    if (isPlaying && !isPaused) {
      window.speechSynthesis.cancel();
      const text = isFlipped ? card.answer : card.question;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = nextRate;
      utterance.onstart = () => { setIsPlaying(true); setIsPaused(false); };
      utterance.onend = () => { setIsPlaying(false); setIsPaused(false); };
      utterance.onerror = () => { setIsPlaying(false); setIsPaused(false); };
      window.speechSynthesis.speak(utterance);
    }
  };

  // Touch Gesture Handlers
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStart.x;
    const diffY = touch.clientY - touchStart.y;
    
    // Scroll-safe check: if vertical movement is larger, let the user scroll
    if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
      return;
    }
    
    if (Math.abs(diffY) > Math.abs(diffX) * 1.3) {
      setIsSwiping(false);
      setDragOffset({ x: 0, y: 0 });
      return;
    }
    
    if (e.cancelable) {
      e.preventDefault();
    }
    setDragOffset({ x: diffX, y: diffY });
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    const threshold = 100; // Drag threshold to trigger action
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (dragOffset.x < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const cardStyle = {
    transform: isSwiping || Math.abs(dragOffset.x) > 0
      ? `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.25}px, 0) rotate(${dragOffset.x * 0.04}deg)`
      : '',
    transition: isSwiping ? 'none' : 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.25)',
  };

  return (
    <div
      onClick={onFlip}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={cardStyle}
      className="w-full h-80 max-w-xl mx-auto cursor-pointer perspective-1000 group relative select-none"
    >
      {/* Outer ambient glow - colorful pulsing */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient.front} rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500`} />

      {/* Swipe Indicator Glow Overlay */}
      {Math.abs(dragOffset.x) > 10 && (
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none z-30 transition-opacity duration-100 flex items-center justify-center"
          style={{
            backgroundColor: dragOffset.x > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `3px solid ${dragOffset.x > 0 ? '#10b981' : '#ef4444'}`,
            opacity: Math.min(Math.abs(dragOffset.x) / 120, 0.8)
          }}
        >
          <span className={`px-4 py-2 rounded-2xl text-white font-extrabold text-sm uppercase tracking-wider shadow-lg ${
            dragOffset.x > 0 ? 'bg-emerald-500' : 'bg-rose-500'
          }`}>
            {dragOffset.x > 0 ? 'Mastered ✓' : 'Practice ↺'}
          </span>
        </div>
      )}

      <div
        className={`relative w-full h-full duration-[600ms] transition-transform transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT SIDE (Question) */}
        <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between">
          {/* Gradient Header Band */}
          <div className={`bg-gradient-to-r ${gradient.front} p-5 text-white`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/70 block">
                  Question
                </span>
                <span className="text-[11px] font-bold text-white/90 truncate max-w-[200px] block mt-0.5">
                  {card.setTitle || 'SmartFlash AI'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* TTS Controls */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center bg-white/20 rounded-xl p-0.5 backdrop-blur-sm"
                >
                  <button
                    onClick={(e) => handleSpeak(e, card.question)}
                    className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-all cursor-pointer"
                    title={isPlaying && !isPaused ? 'Pause' : isPaused ? 'Resume' : 'Read aloud'}
                  >
                    {isPlaying && !isPaused ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={cycleRate}
                    className="px-1.5 py-0.5 text-[9px] font-extrabold text-white/80 hover:text-white transition-colors"
                    title="Cycle speed"
                  >
                    {speakRate}x
                  </button>
                </div>
                <Badge variant={getDifficultyVariant(card.difficulty)}>
                  {card.difficulty || 'medium'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Question Body */}
          <div className="flex-1 bg-white dark:bg-slate-900 flex items-center justify-center p-8 overflow-y-auto">
            <h3 className="text-slate-900 dark:text-white text-lg sm:text-xl font-extrabold text-center leading-relaxed">
              {card.question}
            </h3>
          </div>

          {/* Footer Hint */}
          <div className={`bg-gradient-to-r ${gradient.front} bg-opacity-5 py-3 flex items-center justify-center gap-2 border-t border-white/10 bg-white dark:bg-slate-900`}>
            <RotateCcw className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Click to flip for answer
            </span>
          </div>
        </div>

        {/* BACK SIDE (Answer) */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between">
          {/* Gradient Header Band - Answer color */}
          <div className={`bg-gradient-to-r ${gradient.back} p-5 text-white`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-white/70 block">
                  Answer
                </span>
                <span className="text-[11px] font-bold text-white/90 truncate max-w-[200px] block mt-0.5">
                  {card.setTitle || 'SmartFlash AI'}
                </span>
              </div>
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center bg-white/20 rounded-xl p-0.5 backdrop-blur-sm"
              >
                <button
                  onClick={(e) => handleSpeak(e, card.answer)}
                  className="p-1.5 hover:bg-white/20 text-white rounded-lg transition-all cursor-pointer"
                  title="Read answer aloud"
                >
                  {isPlaying && !isPaused ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={cycleRate}
                  className="px-1.5 py-0.5 text-[9px] font-extrabold text-white/80 hover:text-white transition-colors"
                  title="Cycle speed"
                >
                  {speakRate}x
                </button>
              </div>
            </div>
          </div>

          {/* Answer Body */}
          <div className="flex-1 bg-white dark:bg-slate-900 flex items-center justify-center p-8 overflow-y-auto">
            <p className="text-slate-900 dark:text-white text-base sm:text-lg font-extrabold text-center leading-relaxed">
              {card.answer}
            </p>
          </div>

          {/* Footer Hint */}
          <div className="bg-white dark:bg-slate-900 py-3 flex items-center justify-center gap-2 border-t border-slate-100 dark:border-slate-800">
            <RotateCcw className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Click to see question
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
