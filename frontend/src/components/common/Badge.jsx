import React from 'react';

export default function Badge({
  children,
  variant = 'cyan',
  size = 'md',
  dot = false,
  className = '',
}) {
  const variants = {
    slate:   'bg-slate-800/70 text-slate-300 border-slate-700/60',
    cyan:    'bg-cyan-950/60 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]',
    blue:    'bg-blue-950/60 text-blue-300 border-blue-500/30 shadow-[0_0_10px_rgba(37,99,235,0.15)]',
    teal:    'bg-teal-950/60 text-teal-300 border-teal-500/30 shadow-[0_0_10px_rgba(20,184,166,0.15)]',
    emerald: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    green:   'bg-emerald-950/60 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    amber:   'bg-amber-950/60 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    rose:    'bg-rose-950/60 text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.15)]',
    purple:  'bg-purple-950/60 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(139,92,246,0.15)]',
    indigo:  'bg-indigo-950/60 text-indigo-300 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.15)]',
  };

  const dotColors = {
    slate:   'bg-slate-400',
    cyan:    'bg-cyan-400 shadow-[0_0_6px_#22d3ee]',
    blue:    'bg-blue-400 shadow-[0_0_6px_#60a5fa]',
    teal:    'bg-teal-400 shadow-[0_0_6px_#2dd4bf]',
    emerald: 'bg-emerald-400 shadow-[0_0_6px_#34d399]',
    green:   'bg-emerald-400 shadow-[0_0_6px_#34d399]',
    amber:   'bg-amber-400 shadow-[0_0_6px_#fbbf24]',
    rose:    'bg-rose-400 shadow-[0_0_6px_#fb7185]',
    purple:  'bg-purple-400 shadow-[0_0_6px_#c084fc]',
    indigo:  'bg-indigo-400 shadow-[0_0_6px_#818cf8]',
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-[10px] font-semibold',
    sm: 'px-2.5 py-0.5 text-xs font-semibold',
    md: 'px-3 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-xs font-bold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-sm ${
        variants[variant] || variants.cyan
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.cyan}`}
        />
      )}
      {children}
    </span>
  );
}
