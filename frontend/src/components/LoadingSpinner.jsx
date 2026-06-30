import React from 'react';

const LoadingSpinner = ({ size = 'medium', message = 'Processing...' }) => {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    medium: 'w-12 h-12 border-[3px]',
    large: 'w-16 h-16 border-[4px]',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <div className="relative">
        {/* Glow Effect */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 blur opacity-20 animate-pulse`} />
        
        {/* Spinner */}
        <div
          className={`${sizeClasses[size]} relative border-slate-100 dark:border-slate-800/80 border-t-indigo-650 dark:border-t-indigo-400 rounded-full animate-spin`}
        />
      </div>
      
      {message && (
        <p className="text-slate-500 dark:text-slate-400 font-bold text-xs tracking-wide uppercase animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
