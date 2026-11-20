import React from 'react';

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  footer,
  noPadding = false,
  hover = true,
}) {
  return (
    <div
      className={`cyber-card overflow-hidden ${
        hover ? 'hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="px-5 py-4 border-b border-cyan-500/10 flex items-center justify-between gap-4">
          <div>
            {title && <h3 className="text-sm font-bold text-slate-100 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 font-normal">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5'}>{children}</div>
      {footer && (
        <div className="px-5 py-3.5 bg-slate-950/40 border-t border-cyan-500/10 text-xs text-slate-400">
          {footer}
        </div>
      )}
    </div>
  );
}
