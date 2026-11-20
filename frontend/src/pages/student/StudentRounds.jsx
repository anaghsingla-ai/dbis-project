import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Layers,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  MapPin,
  Sparkles,
  ArrowRight,
  Filter
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import { EmptyState } from '../../components/common/Input';

export default function StudentRounds() {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const { showToast } = useToast();

  useEffect(() => {
    async function loadStudentRounds() {
      try {
        const res = await api.get('/student/applications');
        if (res.success && res.applications) {
          // Flatten all rounds across applications
          const allRounds = [];
          res.applications.forEach((app) => {
            if (app.rounds && app.rounds.length > 0) {
              app.rounds.forEach((r) => {
                allRounds.push({
                  ...r,
                  company_name: app.company_name,
                  job_title: app.job_title,
                  package_offered: app.package_offered,
                  drive_id: app.drive_id,
                  app_status: app.status
                });
              });
            }
          });
          setRounds(allRounds);
        }
      } catch (err) {
        showToast('Error loading selection rounds: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadStudentRounds();
  }, []);

  const filteredRounds = rounds.filter((r) => {
    if (filter === 'PASSED') return r.outcome === 'Pass';
    if (filter === 'FAILED') return r.outcome === 'Fail';
    if (filter === 'ON_HOLD') return r.outcome === 'On-Hold';
    if (filter === 'PENDING') return !r.outcome;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-cyan-400" />
            Selection Rounds & Interviews
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete assessment schedule, interview stages, evaluation feedback, and progression status
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0B132B]/90 border border-slate-800 self-start sm:self-auto">
          {['ALL', 'PENDING', 'PASSED', 'ON_HOLD', 'FAILED'].map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === key
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {key === 'ALL' ? 'All Rounds' : key === 'ON_HOLD' ? 'On Hold' : key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Rounds Grid */}
      {filteredRounds.length === 0 && !loading ? (
        <EmptyState
          icon={<Layers className="w-8 h-8 text-cyan-400/60" />}
          title="No selection rounds match the criteria"
          description="Rounds are scheduled as placement drives progress through technical assessments and interviews."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRounds.map((r) => (
            <div
              key={`${r.drive_id}-${r.round_id}`}
              className={`rounded-2xl border backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                r.outcome === 'Pass'
                  ? 'bg-[#0B172B]/80 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                  : r.outcome === 'Fail'
                  ? 'bg-[#140D1E]/80 border-rose-500/30'
                  : r.outcome === 'On-Hold'
                  ? 'bg-[#18131B]/80 border-amber-500/30'
                  : 'bg-[#0B132B]/80 border-slate-800/90 hover:border-cyan-500/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      {r.company_name}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">{r.job_title}</h3>
                  </div>
                  <div>
                    {r.outcome === 'Pass' ? (
                      <Badge variant="emerald" size="xs">Cleared</Badge>
                    ) : r.outcome === 'Fail' ? (
                      <Badge variant="rose" size="xs">Not Cleared</Badge>
                    ) : r.outcome === 'On-Hold' ? (
                      <Badge variant="amber" size="xs">On Hold</Badge>
                    ) : (
                      <Badge variant="slate" size="xs">Scheduled / In Review</Badge>
                    )}
                  </div>
                </div>

                {/* Round Header */}
                <div className="p-3 rounded-xl bg-[#070D1E]/60 border border-slate-800/80 mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">Round {r.round_no}: {r.round_type}</span>
                    {r.score !== null && r.score !== undefined && (
                      <span className="font-mono font-bold text-cyan-400">{r.score}/100</span>
                    )}
                  </div>
                  {r.remarks && (
                    <p className="text-[11px] text-slate-400 italic">"{r.remarks}"</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-cyan-300">
                  ₹{(r.package_offered / 100000).toFixed(2)} LPA
                </span>
                <span className="text-slate-400">
                  Drive #{r.drive_id}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
