import React from 'react';

const Input = React.forwardRef(({
  label,
  type = 'text',
  placeholder = '',
  error = '',
  description = '',
  className = '',
  icon: Icon,
  rows,
  children,
  ...props
}, ref) => {
  const baseInputStyle = 'block w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all font-medium text-sm leading-relaxed';
  const paddingStyle = Icon ? 'pl-11 pr-4' : 'px-4';
  const yPaddingStyle = type === 'textarea' ? 'py-3' : 'h-11';
  
  const borderStateStyle = error
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25'
    : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/25';

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}
      
      <div className="relative w-full">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
        
        {type === 'textarea' ? (
          <textarea
            ref={ref}
            rows={rows || 4}
            placeholder={placeholder}
            className={`${baseInputStyle} ${paddingStyle} ${yPaddingStyle} ${borderStateStyle}`}
            {...props}
          />
        ) : type === 'select' ? (
          <select
            ref={ref}
            className={`${baseInputStyle} ${paddingStyle} ${yPaddingStyle} ${borderStateStyle} appearance-none cursor-pointer pr-10`}
            {...props}
          >
            {children}
          </select>
        ) : (
          <input
            ref={ref}
            type={type}
            placeholder={placeholder}
            className={`${baseInputStyle} ${paddingStyle} ${yPaddingStyle} ${borderStateStyle}`}
            {...props}
          />
        )}

        {type === 'select' && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>
      
      {description && !error && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight font-medium">
          {description}
        </p>
      )}
      
      {error && (
        <p className="text-xs font-semibold text-rose-500 dark:text-rose-455">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
