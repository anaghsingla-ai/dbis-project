import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { FileText, Search, Filter, Play, CheckCircle2, XCircle, Clock, AlertTriangle, Lock, Sparkles, Layers } from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Select, Input, EmptyState } from '../../components/common/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/common/Table';

export default function ApplicationManagement() {
  const [applications, setApplications] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [driveFilter, setDriveFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Result modal
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [resultForm, setResultForm] = useState({
    round_id: '',
    outcome: 'Pass',
    score: 80,
    remarks: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [appRes, driveRes] = await Promise.all([
        api.get(`/admin/applications?drive_id=${driveFilter}&status=${statusFilter}`),
        api.get('/admin/drives')
      ]);
      if (appRes.success) setApplications(appRes.applications);
      if (driveRes.success) setDrives(driveRes.drives);
    } catch (err) {
      showToast('Error loading applications: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [driveFilter, statusFilter]);

  const openResultModal = async (app) => {
    setSelectedApp(app);
    try {
      const res = await api.get(`/admin/drives/${app.drive_id}/applicants/${app.student_id}/rounds`);
      if (res.success) {
        const fetchedRounds = res.rounds;
        setRounds(fetchedRounds);

        const activeRound = fetchedRounds.find((r) => r.outcome === 'On-Hold') ||
                            fetchedRounds.find((r) => !r.outcome) ||
                            fetchedRounds[0];

        if (activeRound) {
          setResultForm({
            round_id: String(activeRound.round_id),
            outcome: activeRound.outcome === 'On-Hold' ? 'Pass' : (activeRound.outcome || 'Pass'),
            score: activeRound.score !== null && activeRound.score !== undefined ? activeRound.score : 80,
            remarks: activeRound.remarks || ''
          });
        }
        setResultModalOpen(true);
      }
    } catch (err) {
      showToast('Error loading candidate rounds: ' + err.message, 'error');
    }
  };

  const handleRoundChange = (roundId) => {
    const selectedRound = rounds.find((r) => String(r.round_id) === String(roundId));
    if (selectedRound) {
      setResultForm({
        round_id: String(selectedRound.round_id),
        outcome: selectedRound.outcome === 'On-Hold' ? 'Pass' : (selectedRound.outcome || 'Pass'),
        score: selectedRound.score !== null && selectedRound.score !== undefined ? selectedRound.score : 80,
        remarks: selectedRound.remarks || ''
      });
    } else {
      setResultForm((prev) => ({ ...prev, round_id: roundId }));
    }
  };

  const selectedRoundObj = rounds.find((r) => String(r.round_id) === String(resultForm.round_id));
  const isFinalized = selectedRoundObj?.outcome === 'Pass' || selectedRoundObj?.outcome === 'Fail';
  const isOnHold = selectedRoundObj?.outcome === 'On-Hold';
  const isLastRound = !!selectedRoundObj && !rounds.some((round) => Number(round.round_no) > Number(selectedRoundObj.round_no));
  const canGrantExisting = isLastRound && selectedRoundObj?.outcome === 'Pass';

  const handleRecordResult = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (canGrantExisting) {
      setActionLoading(true);
      try {
        const res = await api.post('/admin/offers', { student_id: selectedApp.student_id, drive_id: selectedApp.drive_id });
        showToast(res.message, 'success');
        setResultModalOpen(false);
        await loadData();
      } catch (err) { showToast(err.message, 'error'); }
      finally { setActionLoading(false); }
      return;
    }
    if (isFinalized) {
      showToast('This round result is finalized (Pass/Fail) and cannot be altered.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post('/admin/rounds/record-result', {
        student_id: selectedApp.student_id,
        round_id: parseInt(resultForm.round_id, 10),
        outcome: resultForm.outcome,
        score: parseFloat(resultForm.score),
        remarks: resultForm.remarks
      });
      showToast(res.message, res.warning ? 'warning' : 'success');
      setResultModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied': return <Badge variant="cyan" dot>Applied</Badge>;
      case 'Shortlisted': return <Badge variant="emerald" dot>Shortlisted</Badge>;
      case 'Rejected': return <Badge variant="rose" dot>Rejected</Badge>;
      case 'Withdrawn': return <Badge variant="amber" dot>Withdrawn</Badge>;
      default: return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-cyan-400" />
            Applications & Round Evaluation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track student placement applications and record multi-round selection outcomes
          </p>
        </div>
        <div className="font-mono text-xs text-slate-400">
          Total Applications: <strong className="text-cyan-400">{applications.length}</strong>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <Select
              label="Filter by Drive"
              value={driveFilter}
              onChange={(e) => setDriveFilter(e.target.value)}
              options={[
                { value: '', label: 'All Placement Drives' },
                ...drives.map((d) => ({
                  value: d.drive_id,
                  label: `${d.company_name} — ${d.job_title}`
                }))
              ]}
            />
          </div>
          <div className="sm:col-span-2">
            <Select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Application Statuses' },
                { value: 'Applied', label: 'Applied' },
                { value: 'Shortlisted', label: 'Shortlisted' },
                { value: 'Rejected', label: 'Rejected' },
                { value: 'Withdrawn', label: 'Withdrawn' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Loading placement applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<FileText className="w-8 h-8 text-cyan-400/60" />}
              title="No applications found"
              description="Applications submitted by eligible students will appear here."
            />
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Student</Th>
                <Th>Drive & Company</Th>
                <Th>Academic Specs</Th>
                <Th>Application Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {applications.map((app) => (
                <Tr key={app.application_id}>
                  <Td>
                    <div className="font-semibold text-slate-100">{app.student_name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{app.enrollment_no} &bull; {app.student_email}</div>
                  </Td>
                  <Td>
                    <div className="font-semibold text-slate-100">{app.job_title}</div>
                    <div className="text-[11px] text-cyan-400 font-semibold">{app.company_name}</div>
                  </Td>
                  <Td>
                    <div className="text-cyan-400 font-bold">CGPA: {app.cgpa}</div>
                    <div className="text-[11px] text-slate-400">{app.dept_name} &bull; {app.backlog_count} backlogs</div>
                  </Td>
                  <Td className="text-slate-400 font-mono">
                    {app.application_date ? new Date(app.application_date).toLocaleDateString() : '-'}
                  </Td>
                  <Td>
                    {app.ready_for_offer ? <Badge variant="emerald" dot>Ready for offer</Badge> : getStatusBadge(app.status)}
                  </Td>
                  <Td className="text-right">
                    {['Applied', 'Shortlisted'].includes(app.status) ? (
                      <Button
                        size="xs"
                        variant="cyan"
                        onClick={() => openResultModal(app)}
                        leftIcon={<Play className="w-3 h-3" />}
                      >
                        Evaluate Round
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-mono">Completed</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Record Result Modal */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title="Record Selection Round Evaluation"
      >
        <form onSubmit={handleRecordResult} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#070D1E] border border-slate-800 text-xs space-y-1">
            <p className="text-slate-300">
              <strong className="text-slate-100">Candidate:</strong> {selectedApp?.student_name} ({selectedApp?.enrollment_no})
            </p>
            <p className="text-slate-300">
              <strong className="text-slate-100">Drive:</strong> {selectedApp?.company_name} &mdash; {selectedApp?.job_title}
            </p>
          </div>

          <Select
            label="Selection Round"
            required
            value={resultForm.round_id}
            onChange={(e) => handleRoundChange(e.target.value)}
            options={rounds.map((r) => ({
              value: String(r.round_id),
              label: `Round ${r.round_no}: ${r.round_type}${r.outcome ? ` [${r.outcome}]` : ' [Pending]'}`
            }))}
          />

          {isOnHold && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-300">Candidate is currently On-Hold in this round</p>
                <p className="mt-0.5 text-slate-300 leading-relaxed">
                  Select <strong className="text-emerald-400">Pass</strong> to shortlist candidate and advance to subsequent stages, or <strong className="text-rose-400">Fail</strong> to conclude evaluation.
                </p>
              </div>
            </div>
          )}

          {isFinalized && (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-100">Round Result Finalized ({selectedRoundObj.outcome})</p>
                <p className="mt-0.5 text-slate-400">
                  This result is saved. If this is the final passed round, use Select & Grant Offer below to issue or retrieve the offer.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Evaluation Outcome"
              value={resultForm.outcome}
              disabled={isFinalized}
              onChange={(e) => setResultForm({ ...resultForm, outcome: e.target.value })}
              options={[
                { value: 'Pass', label: isLastRound ? 'Select candidate ? Grant offer' : 'Pass (Advance to Next Stage)' },
                { value: 'Fail', label: 'Fail (Application Unsuccessful)' },
                { value: 'On-Hold', label: 'On-Hold (Pending Final Decision)' }
              ]}
            />
            <Input
              label="Score (out of 100)"
              type="number"
              step="0.01"
              disabled={isFinalized}
              value={resultForm.score}
              onChange={(e) => setResultForm({ ...resultForm, score: e.target.value })}
            />
          </div>

          <Input
            label="Evaluator Remarks"
            disabled={isFinalized}
            value={resultForm.remarks}
            onChange={(e) => setResultForm({ ...resultForm, remarks: e.target.value })}
            placeholder="e.g. Excellent problem solving, recommended for offer"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setResultModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cyan" isLoading={actionLoading} disabled={isFinalized && !canGrantExisting}>
              {isLastRound && resultForm.outcome === 'Pass' ? 'Select & Grant Offer' : isOnHold ? 'Update Decision' : 'Submit Evaluation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
