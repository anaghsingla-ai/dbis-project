import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Building2,
  ArrowRight,
  ShieldAlert,
  Layers,
  Calendar,
  Sparkles
} from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { EmptyState } from '../../components/common/Input';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Withdraw modal
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const { showToast } = useToast();

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/applications');
      if (res.success) setApplications(res.applications);
    } catch (err) {
      showToast('Error loading applications: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleWithdraw = async () => {
    if (!selectedApp) return;
    setIsWithdrawing(true);
    try {
      const res = await api.post('/student/withdraw', { drive_id: selectedApp.drive_id });
      showToast(res.message, 'success');
      setWithdrawModalOpen(false);
      loadApplications();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Placed': return <Badge variant="emerald" dot>Placed</Badge>;
      case 'Offer received': return <Badge variant="cyan" dot>Offer received</Badge>;
      case 'Ready for offer': return <Badge variant="emerald" dot>Ready for offer</Badge>;
      case 'Applied': return <Badge variant="cyan" dot>Applied</Badge>;
      case 'Shortlisted': return <Badge variant="emerald" dot>Shortlisted</Badge>;
      case 'Rejected': return <Badge variant="rose" dot>Not Selected</Badge>;
      case 'Withdrawn': return <Badge variant="amber" dot>Withdrawn</Badge>;
      default: return <Badge variant="slate">{status}</Badge>;
    }
  };

  const getRoundBadge = (outcome) => {
    switch (outcome) {
      case 'Pass':
        return <Badge variant="emerald" size="xs">Cleared</Badge>;
      case 'Fail':
        return <Badge variant="rose" size="xs">Not Cleared</Badge>;
      case 'On-Hold':
        return <Badge variant="amber" size="xs">On Hold</Badge>;
      default:
        return <Badge variant="slate" size="xs">Pending Review</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-cyan-400" />
            My Applications
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track round evaluations, interview milestones, and application progression
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <span>Active Applications: <strong className="text-cyan-400">{applications.filter(a => ['Applied', 'Shortlisted'].includes(a.status)).length}</strong></span>
        </div>
      </div>

      {applications.length === 0 && !loading ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-cyan-400/60" />}
          title="No applications submitted yet"
          description="Browse active placement drives and apply to participate in campus recruitment rounds."
        />
      ) : (
        <div className="space-y-5">
          {applications.map((app) => (
            <div
              key={app.application_id}
              className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 hover:border-cyan-500/30 transition-all p-5 shadow-lg"
            >
              {/* Application Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-sm shrink-0 shadow-md">
                    {app.company_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-100">{app.company_name}</h3>
                      <span className="text-xs text-slate-400">&bull; {app.job_title}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2 flex-wrap">
                      <span>Package: <strong className="text-cyan-300">₹{(app.package_offered / 100000).toFixed(2)} LPA</strong></span>
                      <span className="text-slate-600">&bull;</span>
                      <span>Applied: <strong className="text-slate-300">{app.application_date?.split('T')[0]}</strong></span>
                      <span className="text-slate-600">&bull;</span>
                      <span>App ID: <strong className="text-slate-300">#{app.application_id}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {getStatusBadge(app.placement_stage || app.status)}
                  {['Applied', 'Shortlisted'].includes(app.status) && app.placement_stage !== 'Placed' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setSelectedApp(app);
                        setWithdrawModalOpen(true);
                      }}
                    >
                      Withdraw
                    </Button>
                  )}
                </div>
              </div>

              {['Ready for offer', 'Offer received', 'Placed'].includes(app.placement_stage) && (
                <p className="mt-3 rounded-xl border border-emerald-700 bg-emerald-950/30 p-3 text-xs text-emerald-200">
                  {app.placement_stage === 'Ready for offer' ? 'All selection rounds cleared. Your company can grant the offer from its candidate pipeline.' : app.placement_stage === 'Offer received' ? 'Your offer is ready. Open My Offers to accept or decline it.' : 'You accepted this offer and are placed with this company.'}
                  {app.placement_stage !== 'Ready for offer' && <a className="ml-2 underline" href="/student/offers">View My Offers</a>}
                </p>
              )}
              {/* Selection Pipeline Timeline */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Selection Pipeline ({app.rounds?.length || 0} Stages)
                  </p>
                </div>

                {(!app.rounds || app.rounds.length === 0) ? (
                  <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-[#070D1E]/40 border border-slate-800/50">
                    No selection rounds scheduled yet for this drive. You will be notified when assessment rounds are announced.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {app.rounds.map((r) => (
                      <div
                        key={r.round_id}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                          r.outcome === 'Pass'
                            ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-200'
                            : r.outcome === 'Fail'
                            ? 'bg-rose-950/25 border-rose-500/30 text-rose-200'
                            : r.outcome === 'On-Hold'
                            ? 'bg-amber-950/25 border-amber-500/30 text-amber-200'
                            : 'bg-[#070D1E]/60 border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-100 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-mono text-cyan-400">
                                R{r.round_no}
                              </span>
                              Round {r.round_no}
                            </span>
                            {getRoundBadge(r.outcome)}
                          </div>
                          <p className="text-[11px] text-cyan-400 font-semibold">{r.round_type}</p>
                          {r.remarks && (
                            <p className="text-[10px] text-slate-400 mt-2 italic border-l-2 border-slate-700 pl-2">
                              "{r.remarks}"
                            </p>
                          )}
                        </div>

                        {r.score !== null && r.score !== undefined && (
                          <div className="mt-3 pt-2 border-t border-slate-800/70 font-mono text-[10px] flex items-center justify-between text-slate-400">
                            <span>Score:</span>
                            <span className="font-bold text-slate-200">{r.score} / 100</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Withdraw Modal */}
      <Modal
        isOpen={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        title="Confirm Application Withdrawal"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">Are you sure you want to withdraw?</p>
              <p className="mt-1 leading-relaxed text-amber-200/90">
                Withdrawing from <strong>{selectedApp?.company_name} ({selectedApp?.job_title})</strong> marks your application as <span className="font-semibold text-amber-400">Withdrawn</span>. Any active interview schedule will be released and you will forfeit participation in subsequent rounds.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setWithdrawModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleWithdraw} isLoading={isWithdrawing}>
              Confirm Withdrawal
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
