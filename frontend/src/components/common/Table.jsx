import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-cyan-500/15 bg-slate-950/40 backdrop-blur-md ${className}`}>
      <table className="w-full text-xs text-left">{children}</table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-[#0B132B]/80 border-b border-cyan-500/15 text-slate-400">
      {children}
    </thead>
  );
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-slate-800/60">{children}</tbody>;
}

export function Tr({ children, className = '', onClick }) {
  return (
    <tr
      className={`transition-colors duration-150 ${
        onClick
          ? 'cursor-pointer hover:bg-cyan-950/20'
          : 'hover:bg-slate-900/40'
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th
      className={`px-4 py-3.5 text-[10px] font-bold text-cyan-300/80 uppercase tracking-widest whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-4 py-3.5 text-slate-200 whitespace-nowrap ${className}`}>
      {children}
    </td>
  );
}
