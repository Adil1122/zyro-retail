import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="rounded-[16px] border border-dashed border-[#C9C1B6] bg-[#FBF8F4] px-6 py-10 text-center flex flex-col items-center justify-center gap-3">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[#F1EBE3] text-[#08343A] flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-md">
        <h3 className="font-display text-[17px] font-bold text-[#0B2A2F]">{title}</h3>
        <p className="text-[14px] text-[#52666A] leading-relaxed">{body}</p>
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
