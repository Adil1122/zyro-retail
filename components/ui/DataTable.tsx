'use client';

import React from 'react';

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: 'start' | 'end' | 'center';
  width?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  minWidth?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
  minWidth = '640px',
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="rounded-[14px] border border-[#E7E0D7] bg-white overflow-hidden shadow-[0_1px_2px_rgba(15,31,25,.04)]">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-start" style={{ minWidth }}>
          <thead>
            <tr className="bg-[#FBF8F4] border-b border-[#E7E0D7]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`px-4 py-3 text-[12px] font-semibold uppercase tracking-wide text-[#52666A] ${
                    col.align === 'end'
                      ? 'text-end'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-start'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1EBE3]">
            {rows.map((row, idx) => (
              <tr
                key={rowKey(row, idx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-[#FBF8F4]' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[14px] text-[#0B2A2F] ${
                      col.align === 'end'
                        ? 'text-end'
                        : col.align === 'center'
                          ? 'text-center'
                          : 'text-start'
                    }`}
                  >
                    {col.render(row, idx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
