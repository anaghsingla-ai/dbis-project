import React from 'react';

export function Input({ label, error, helperText, className = '', id, ...props }) {
  const inputId = id || props.name || Math.random().toString();
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-100 transition-all placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 ${
          error
            ? 'border-rose-500/50 bg-rose-950/20 focus:border-rose-500'
            : 'border-slate-800 bg-[#0B132B]/80 focus:border-cyan-500/60 hover:border-slate-700 shadow-inner'
        } ${className}`}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-rose-400 font-medium">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
}

export function Select({ label, error, options = [], children, className = '', id, ...props }) {
  const selectId = id || props.name || Math.random().toString();
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl border bg-[#0B132B]/90 px-3.5 py-2.5 text-sm text-slate-100 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/25 ${
          error
            ? 'border-rose-500/50 focus:border-rose-500'
            : 'border-slate-800 focus:border-cyan-500/60 hover:border-slate-700'
        } ${className}`}
        {...props}
      >
        {children || options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-400 font-medium">{error}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-cyan-500/20 bg-slate-950/30">
      {icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center text-cyan-400 mb-4 bg-cyan-950/30 border border-cyan-500/20 rounded-2xl shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-200">{title}</h3>
      {description && (
        <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
