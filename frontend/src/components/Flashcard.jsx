import React from 'react';

const Flashcard = ({ card, isFlipped, onFlip }) => {
  const getDifficultyColor = (diff) => {
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
    <div 
      onClick={onFlip}
      className="w-full h-80 max-w-xl mx-auto cursor-pointer perspective-1000 group"
    >
      <div 
        className={`relative w-full h-full duration-500 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* FRONT SIDE (Question) */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-3xl border border-slate-200/80 shadow-lg hover:shadow-xl hover:border-slate-300 transition-all duration-300 flex flex-col justify-between p-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            {card.setTitle && (
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide truncate max-w-[200px]">
                {card.setTitle}
              </span>
            )}
            <span className={`text-xs px-2.5 py-1 font-bold rounded-full border ${getDifficultyColor(card.difficulty)}`}>
              {card.difficulty || 'medium'}
            </span>
          </div>

          {/* Question Text */}
          <div className="flex-1 overflow-y-auto my-4 pr-1">
            <div className="min-h-full flex items-center justify-center">
              <h3 className="text-slate-800 text-base sm:text-lg font-bold text-center leading-relaxed py-2">
                {card.question}
              </h3>
            </div>
          </div>

          {/* Footer Instruction */}
          <div className="text-center text-xs font-medium text-slate-400 uppercase tracking-wider group-hover:text-indigo-500 transition-colors">
            Click Card to Show Answer
          </div>
        </div>

        {/* BACK SIDE (Answer) */}
        <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-tr from-slate-50 to-indigo-50/20 rounded-3xl border border-indigo-100 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-between p-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
              Answer
            </span>
            <span className="text-xs font-semibold text-slate-400">
              Set: {card.setTitle || 'Generated Set'}
            </span>
          </div>

          {/* Answer Text */}
          <div className="flex-1 overflow-y-auto my-4 pr-1">
            <div className="min-h-full flex items-center justify-center">
              <p className="text-indigo-950 text-sm sm:text-base font-medium text-center leading-relaxed py-2">
                {card.answer}
              </p>
            </div>
          </div>

          {/* Footer Instruction */}
          <div className="text-center text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            Click Card to See Question
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
