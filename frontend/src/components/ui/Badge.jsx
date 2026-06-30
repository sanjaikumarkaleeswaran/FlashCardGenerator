import React from 'react';

const Badge = ({
  children,
  variant = 'info', // 'info' | 'success' | 'warning' | 'error' | 'secondary' | 'outline' | 'easy' | 'medium' | 'hard'
  className = '',
  ...props
}) => {
  const baseStyle = 'inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border';
  
  const variants = {
    info: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-650 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/50',
    success: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-755 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
    warning: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
    error: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50',
    secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/80',
    outline: 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    
    // Difficulty presets
    easy: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450 border-emerald-250 dark:border-emerald-900/40',
    medium: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-450 border-amber-250 dark:border-amber-900/40',
    hard: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-450 border-rose-250 dark:border-rose-900/40'
  };

  return (
    <span className={`${baseStyle} ${variants[variant] || variants.info} ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Badge;
