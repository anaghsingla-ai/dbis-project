import useRecordSearch, { matchesRecord } from '../../hooks/useRecordSearch';
import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Users, Play, ExternalLink, AlertTriangle, Lock, RefreshCw, Award, Star } from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Select, Input, EmptyState } from '../../components/common/Input';

export default function HrApplicants() {
  const [search, setSearch] = useRecordSearch();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Evaluation modal
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [evalForm, setEvalForm] = useState({
    round_id: '',
    outcome: 'Pass',
    score: 85,
    remarks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [grantingId, setGrantingId] = useState(null);

  const { showToast } = useToast();

  const loadApplicants = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hr/applicants');
      if (res.success) setApplicants(res.applicants);
    } catch (err) {
      showToast('Error loading applicants: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplicants();
  }, []);

  const openEvalModal = async (applicant) => {
    setSelectedApplicant(applicant);
    try {
      const res = await api.get(`/hr/drives/${applicant.drive_id}/applicants/${applicant.student_id}/rounds`);
      if (res.success) {
        const fetchedRounds = res.rounds;
        setRounds(fetchedRounds);

        const activeRound = fetchedRounds.find((r) => r.outcome === 'On-Hold') ||
                            fetchedRounds.find((r) => !r.outcome) ||
                            fetchedRounds[0];

        if (activeRound) {
          setEvalForm({
            round_id: String(activeRound.round_id),
            outcome: activeRound.outcome === 'On-Hold' ? 'Pass' : (activeRound.outcome || 'Pass'),
            score: activeRound.score !== null && activeRound.score !== undefined ? activeRound.score : 80,
            remarks: activeRound.remarks || ''
          });
        }
        setEvalModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to load candidate round progress: ' + err.message, 'error');
    }
  };

  const handleRoundChange = (roundId) => {
    const selectedRound = rounds.find((r) => String(r.round_id) === String(roundId));
    if (selectedRound) {
      setEvalForm({
        round_id: String(selectedRound.round_id),
        outcome: selectedRound.outcome === 'On-Hold' ? 'Pass' : (selectedRound.outcome || 'Pass'),
        score: selectedRound.score !== null && selectedRound.score !== undefined ? selectedRound.score : 80,
        remarks: selectedRound.remarks || ''
      });
    } else {
      setEvalForm((prev) => ({ ...prev, round_id: roundId }));
    }
  };

  const selectedRoundObj = rounds.find((r) => String(r.round_id) === String(evalForm.round_id));
  const isFinalized = selectedRoundObj?.outcome === 'Pass' || selectedRoundObj?.outcome === 'Fail';
  const isOnHold = selectedRoundObj?.outcome === 'On-Hold';
  const isLastRound = !!selectedRoundObj && !rounds.some((round) => Number(round.round_no) > Number(selectedRoundObj.round_no));
  const canGrantExisting = isLastRound && selectedRoundObj?.outcome === 'Pass';

  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (!selectedApplicant) return;
    if (canGrantExisting) {
      setIsSubmitting(true);
      try {
        const res = await api.post('/hr/offers', { student_id: selectedApplicant.student_id, drive_id: selectedApplicant.drive_id });
        showToast(res.message, 'success');
        setEvalModalOpen(false);
        await loadApplicants();
      } catch (err) { showToast(err.message, 'error'); }
      finally { setIsSubmitting(false); }
      return;
    }
    if (isFinalized) {
      showToast('This round result is finalized and cannot be altered.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.post('/hr/rounds/record-result', {
        student_id: selectedApplicant.student_id,
        round_id: parseInt(evalForm.round_id, 10),
        outcome: evalForm.outcome,
        score: parseFloat(evalForm.score),
        remarks: evalForm.remarks
      });
      showToast(res.message || 'Round result recorded successfully.', res.warning ? 'warning' : 'success');
      setEvalModalOpen(false);
      await loadApplicants();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const grantCandidateOffer = async (candidate) => {
    setGrantingId(candidate.application_id);
    try {
      const res = await api.post('/hr/offers', { student_id: candidate.student_id, drive_id: candidate.drive_id });
      showToast(res.message, 'success');
      await loadApplicants();
    } catch (err) { showToast(err.message, 'error'); }
    finally { setGrantingId(null); }
  };

  const statusVariant = (s) => {
    if (s === 'Shortlisted') return 'emerald';
    if (s === 'Rejected') return 'rose';
    if (s === 'Withdrawn') return 'amber';
    return 'cyan';
  };

  const outcomeVariant = (o) => {
    if (o === 'Pass') return 'emerald';
    if (o === 'Fail') return 'rose';
    if (o === 'On-Hold') return 'amber';
    return 'cyan';
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      <input aria-label="Search records" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Search names, companies, job titles?"
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Candidate Pipeline</h1>
          <p className="text-sm text-slate-400 mt-1">
            Use 1 to 4 configured rounds. A Pass in the last round selects the candidate and automatically grants an offer.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={loadApplicants}
          isLoading={loading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Applicants', value: applicants.length, color: 'text-cyan-400' },
          { label: 'Shortlisted', value: applicants.filter(a => a.status === 'Shortlisted').length, color: 'text-emerald-400' },
          { label: 'Under Review', value: applicants.filter(a => a.status === 'Applied').length, color: 'text-blue-400' },
          { label: 'Withdrawn', value: applicants.filter(a => a.status === 'Withdrawn').length, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Applicants Table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-200">All Candidates</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading applicants...</div>
        ) : applicants.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No applicants yet"
            description="Students who apply to your placement drives will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Applied Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">CGPA</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Latest Round</th>
                  <th className="py-3 px-4">Resume</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {applicants.filter((record) => matchesRecord(record, search)).map((a) => (
                  <tr key={a.application_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-100">{a.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{a.enrollment_no} • {a.email}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">{a.job_title}</td>
                    <td className="py-3 px-4 text-slate-400">{a.dept_name}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-cyan-400">{a.cgpa}</span>
                      <span className={`block text-[10px] ${a.backlog_count > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                        {a.backlog_count} backlogs
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusVariant(a.status)} size="sm">{a.offer_status === 'Accepted' ? 'Placed' : a.offer_status === 'Pending' ? 'Offer granted' : a.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {a.latest_round_outcome ? (
                        <Badge variant={outcomeVariant(a.latest_round_outcome)} size="sm">
                          {a.latest_round_outcome}
                        </Badge>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Not evaluated</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {a.resume_link ? (
                        <a
                          href={a.resume_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {a.ready_for_offer ? <Button size="sm" variant="success" isLoading={grantingId === a.application_id} disabled={grantingId !== null} onClick={() => grantCandidateOffer(a)}>Select &amp; Grant Offer</Button> : a.offer_status ? <Badge variant="emerald">{a.offer_status === 'Pending' ? 'Awaiting student response' : a.offer_status}</Badge> : ['Applied', 'Shortlisted'].includes(a.status) ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => openEvalModal(a)}
                          leftIcon={<Play className="w-3 h-3" />}
                        >
                          Evaluate
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-600">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Evaluation Modal */}
      <Modal
        isOpen={evalModalOpen}
        onClose={() => setEvalModalOpen(false)}
        title="Record Selection Round Result"
      >
        <form onSubmit={handleEvaluate} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
            <p className="text-slate-300">
              <span className="text-slate-400">Candidate: </span>
              <strong className="text-cyan-400">{selectedApplicant?.name}</strong>
              <span className="text-slate-500 ml-2">({selectedApplicant?.enrollment_no})</span>
            </p>
            <p className="mt-1 text-slate-400">
              <span>Applied for: </span>
              <strong className="text-slate-200">{selectedApplicant?.job_title}</strong>
            </p>
          </div>

          <Select
            label="Evaluation Round"
            required
            value={evalForm.round_id}
            onChange={(e) => handleRoundChange(e.target.value)}
            options={rounds.map((r) => ({
              value: String(r.round_id),
              label: `Round ${r.round_no}: ${r.round_type}${r.outcome ? ` [${r.outcome}]` : ' [Pending]'}`
            }))}
          />

          {isOnHold && (
            <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Candidate is On-Hold</p>
                <p className="mt-0.5 text-amber-400">
                  Select <strong>Pass</strong> to shortlist or <strong>Fail</strong> to reject.
                </p>
              </div>
            </div>
          )}

          {isFinalized && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-600/50 text-slate-400 text-xs flex items-start gap-2">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-300">Round Result Finalized ({selectedRoundObj?.outcome})</p>
                <p className="mt-0.5 text-slate-500">Finalized results are locked and cannot be changed.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Outcome"
              value={evalForm.outcome}
              disabled={isFinalized}
              onChange={(e) => setEvalForm({ ...evalForm, outcome: e.target.value })}
              options={[
                { value: 'Pass', label: 'Pass — Shortlisted' },
                { value: 'Fail', label: 'Fail — Rejected' },
                { value: 'On-Hold', label: 'On-Hold — Pending' }
              ]}
            />
            <Input
              label="Score (0–100)"
              type="number"
              step="0.1"
              min="0"
              max="100"
              disabled={isFinalized}
              value={evalForm.score}
              onChange={(e) => setEvalForm({ ...evalForm, score: e.target.value })}
            />
          </div>

          <Input
            label="Remarks"
            disabled={isFinalized}
            value={evalForm.remarks}
            onChange={(e) => setEvalForm({ ...evalForm, remarks: e.target.value })}
            placeholder="e.g. Strong technical skills, recommended for next round"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
            <Button variant="secondary" onClick={() => setEvalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isFinalized && !canGrantExisting}>
              {isLastRound && evalForm.outcome === 'Pass' ? 'Select & Grant Offer' : isOnHold ? 'Update On-Hold Decision' : 'Submit Evaluation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
