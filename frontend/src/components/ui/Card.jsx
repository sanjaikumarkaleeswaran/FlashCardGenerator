import React from 'react';

const Card = ({
  children,
  className = '',
  hoverEffect = false,
  glass = false,
  gradientBorder = false,
  onClick,
  ...props
}) => {
  const baseStyle = 'rounded-3xl border transition-all duration-300 overflow-hidden';
  
  const borders = gradientBorder 
    ? 'border-transparent bg-clip-padding relative before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-r before:from-indigo-500 before:to-violet-500 before:rounded-3xl before:-z-10 bg-white dark:bg-slate-900'
    : 'border-slate-200/80 dark:border-slate-800/80';

  const background = glass
    ? 'backdrop-blur-md bg-white/70 dark:bg-slate-900/70'
    : gradientBorder ? '' : 'bg-white dark:bg-slate-900';

  const shadow = glass
    ? 'shadow-xl shadow-slate-100/20 dark:shadow-none'
    : 'shadow-md hover:shadow-lg dark:shadow-none';

  const hover = hoverEffect
    ? 'hover:scale-[1.02] hover:-translate-y-0.5 hover:border-slate-350 dark:hover:border-slate-700/80 hover:shadow-xl dark:hover:shadow-indigo-950/10'
    : '';

  const cursor = onClick ? 'cursor-pointer' : '';

  return (
    <div
      onClick={onClick}
      className={`${baseStyle} ${borders} ${background} ${shadow} ${hover} ${cursor} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '', ...props }) => (
  <div className={`p-6 pb-4 flex items-center justify-between border-b border-slate-100/50 dark:border-slate-800/50 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3 className={`text-lg font-extrabold text-slate-900 dark:text-white leading-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p className={`text-slate-400 dark:text-slate-400 text-xs font-semibold mt-0.5 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`p-6 pt-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100/50 dark:border-slate-800/50 flex items-center justify-end gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
