import React from 'react';
import { cn } from '../lib/utils';

interface TableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export function Table({ headers, children, className }: TableProps) {
  return (
    <div className={cn("overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm", className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            {headers.map((header, i) => (
              <th key={i} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {children}
        </tbody>
      </table>
    </div>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  key?: string | number;
}

export function TableRow({ children, onClick, className }: TableRowProps) {
  return (
    <tr 
      onClick={onClick}
      className={cn(
        "hover:bg-indigo-50/30 transition-colors cursor-pointer group",
        className
      )}
    >
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
}

export function TableCell({ children, className }: TableCellProps) {
  return (
    <td className={cn("px-6 py-4 text-sm text-gray-600", className)}>
      {children}
    </td>
  );
}
