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

const Flashcard = ({ card, isFlipped, onFlip }) => {
  const [speakRate, setSpeakRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

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

  return (
    <div
      onClick={onFlip}
      className="w-full h-80 max-w-xl mx-auto cursor-pointer perspective-1000 group relative"
    >
      {/* Outer ambient glow - colorful pulsing */}
      <div className={`absolute inset-0 bg-gradient-to-r ${gradient.front} rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-500`} />

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
