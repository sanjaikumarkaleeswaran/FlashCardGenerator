import React from 'react';

const LoadingSpinner = ({ size = 'medium', message = 'Processing...' }) => {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    medium: 'w-12 h-12 border-4',
    large: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <div
        className={`${sizeClasses[size]} border-indigo-200 border-t-indigo-600 rounded-full animate-spin`}
      />
      {message && (
        <p className="text-slate-500 font-medium text-sm animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
