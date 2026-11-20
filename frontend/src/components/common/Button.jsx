import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  leftIcon,
  rightIcon,
  type = 'button',
  onClick,
  ...props
}) {
  const base =
    'inline-flex items-center justify-center font-semibold tracking-tight ' +
    'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed rounded-xl cursor-pointer';

  const variants = {
    primary:
      'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 ' +
      'text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/30 ' +
      'focus:ring-blue-500',
    cyan:
      'bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 ' +
      'text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-400/30 ' +
      'focus:ring-cyan-500',
    secondary:
      'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/70 hover:border-cyan-500/40 ' +
      'shadow-[0_4px_12px_rgba(0,0,0,0.3)] focus:ring-slate-400',
    danger:
      'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 ' +
      'text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] border border-rose-500/30 focus:ring-rose-500',
    success:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 ' +
      'text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-500/30 focus:ring-emerald-500',
    ghost:
      'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white focus:ring-slate-500',
    dark:
      'bg-slate-950 hover:bg-slate-900 text-white border border-slate-800 shadow focus:ring-slate-700',
    outline:
      'border border-cyan-500/40 text-cyan-400 hover:bg-cyan-950/40 hover:border-cyan-400 focus:ring-cyan-400',
  };

  const sizes = {
    xs: 'px-2.5 py-1 text-xs gap-1',
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2.5',
    xl: 'px-7 py-3 text-base gap-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
