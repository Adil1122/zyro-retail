import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'raised' | 'neutral';
  onClick?: () => void;
}

export function Card({
  children,
  className = '',
  padding = 'md',
  tone = 'default',
  onClick,
}: CardProps) {
  const padCls = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  }[padding];

  const toneCls = {
    default: 'bg-white border-[#E7E0D7]',
    raised: 'bg-[#FBF8F4] border-[#E7E0D7]',
    neutral: 'bg-[#F1EBE3] border-[#D6CDC1]',
  }[tone];

  return (
    <div
      onClick={onClick}
      className={`rounded-[14px] border shadow-[0_1px_2px_rgba(15,31,25,.05)] ${toneCls} ${padCls} ${
        onClick ? 'cursor-pointer tile' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
