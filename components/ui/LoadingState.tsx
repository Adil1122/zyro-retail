import React from 'react';

export interface LoadingStateProps {
  rows?: number;
  label?: string;
}

export function LoadingState({ rows = 4, label }: LoadingStateProps) {
  return (
    <div className="space-y-3 py-2" aria-busy="true">
      {label && <div className="text-[13px] font-medium text-[#52666A]">{label}</div>}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-[12px] border border-[#E7E0D7] bg-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] skel shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded skel" />
            <div className="h-3 w-1/2 rounded skel" />
          </div>
          <div className="h-4 w-20 rounded skel" />
        </div>
      ))}
    </div>
  );
}
