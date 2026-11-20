import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp = true,
  color = 'cyan',
}) {
  const colorAccents = {
    cyan:    { glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]', border: 'border-cyan-500/30', iconBg: 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30' },
    blue:    { glow: 'shadow-[0_0_20px_rgba(37,99,235,0.15)]', border: 'border-blue-500/30', iconBg: 'bg-blue-950/60 text-blue-400 border border-blue-500/30' },
    teal:    { glow: 'shadow-[0_0_20px_rgba(20,184,166,0.15)]', border: 'border-teal-500/30', iconBg: 'bg-teal-950/60 text-teal-400 border border-teal-500/30' },
    emerald: { glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]', border: 'border-emerald-500/30', iconBg: 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' },
    amber:   { glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]', border: 'border-amber-500/30', iconBg: 'bg-amber-950/60 text-amber-400 border border-amber-500/30' },
    rose:    { glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]', border: 'border-rose-500/30', iconBg: 'bg-rose-950/60 text-rose-400 border border-rose-500/30' },
    purple:  { glow: 'shadow-[0_0_20px_rgba(139,92,246,0.15)]', border: 'border-purple-500/30', iconBg: 'bg-purple-950/60 text-purple-400 border border-purple-500/30' },
    indigo:  { glow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]', border: 'border-indigo-500/30', iconBg: 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/30' },
  };

  const style = colorAccents[color] || colorAccents.cyan;

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-[#0D1526]/90 via-[#0A101F]/80 to-[#070B14]/90 border ${style.border} p-5 ${style.glow} hover:-translate-y-0.5 transition-all duration-200 overflow-hidden backdrop-blur-xl group`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl font-black text-white mt-1 tracking-tight">
            {value ?? '—'}
          </p>
        </div>
        {icon && (
          <div className={`p-2.5 rounded-xl ${style.iconBg} shrink-0 ml-3 shadow-md`}>
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                trendUp ? 'text-teal-400' : 'text-rose-400'
              }`}
            >
              {trend}
            </span>
          )}
          {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
