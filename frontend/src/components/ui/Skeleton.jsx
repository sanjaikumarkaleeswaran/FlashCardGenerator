import React from 'react';

const Skeleton = ({
  className = '',
  variant = 'text', // 'text' | 'rect' | 'circle'
  width,
  height,
  ...props
}) => {
  const baseStyle = 'bg-slate-200 dark:bg-slate-800 animate-pulse';
  
  const variants = {
    text: 'h-4 w-full rounded-md',
    rect: 'w-full rounded-2xl',
    circle: 'rounded-full'
  };

  const style = {
    width: width ? width : undefined,
    height: height ? height : undefined
  };

  return (
    <div
      className={`${baseStyle} ${variants[variant]} ${className}`}
      style={style}
      {...props}
    />
  );
};

export default Skeleton;
