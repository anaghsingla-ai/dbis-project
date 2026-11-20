import useRecordSearch, { matchesRecord } from '../../hooks/useRecordSearch';
import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Briefcase,
  Plus,
  Calendar,
  IndianRupee,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { Input, Select, EmptyState } from '../../components/common/Input';

export default function DriveManagement() {
  const [search, setSearch] = useRecordSearch();
  const [drives, setDrives] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createDriveModalOpen, setCreateDriveModalOpen] = useState(false);
  const [createRoundModalOpen, setCreateRoundModalOpen] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [existingRounds, setExistingRounds] = useState([]);
  const [openingDriveId, setOpeningDriveId] = useState(null);
  const roundTypes = ['Aptitude Test', 'GD', 'Technical Interview', 'HR Interview'];
  const roundSetupClosed = (drive) => Number(drive.total_rounds) >= 4 || Number(drive.has_final_round) > 0 || Number(drive.rounds_started) > 0 || Number(drive.offers_issued) > 0;

  // Form for sp_create_drive
  const [driveForm, setDriveForm] = useState({
    company_id: '',
    job_title: '',
    job_description: '',
    offer_type: 'Full-Time',
    package_offered: 1200000,
    vacancies: 2,
    mode: 'On-Campus',
    drive_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    min_cgpa: 7.5,
    max_backlogs: 0,
    eligible_departments: 'CSE,EE',
    min_10th_percentage: 60,
    min_12th_percentage: 60
  });

  // Form for Selection_Round
  const [roundForm, setRoundForm] = useState({
    round_no: 1,
    round_type: 'Aptitude Test',
    round_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    mode: 'On-Campus',
    venue: 'Computer Lab 1'
  });

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [drivesRes, compsRes] = await Promise.all([
        api.get('/admin/drives'),
        api.get('/admin/companies')
      ]);
      if (drivesRes.success) setDrives(drivesRes.drives);
      if (compsRes.success) {
        setCompanies(compsRes.companies);
        if (compsRes.companies.length > 0 && !driveForm.company_id) {
          setDriveForm((prev) => ({ ...prev, company_id: compsRes.companies[0].company_id }));
        }
      }
    } catch (err) {
      showToast('Error loading drives: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/admin/drives', driveForm);
      showToast(res.message, 'success');
      setCreateDriveModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openRoundModal = async (drive) => {
    setOpeningDriveId(drive.drive_id);
    try {
      const res = await api.get(`/admin/drives/${drive.drive_id}/rounds`);
      const rounds = res.rounds || [];
      setExistingRounds(rounds);
      setSelectedDrive(drive);
      setRoundForm({
        round_no: Math.max(0, ...rounds.map((round) => Number(round.round_no))) + 1,
        round_type: 'HR Interview',
        round_date: drive.drive_date?.split('T')[0] || '',
        mode: drive.mode || 'On-Campus',
        venue: ''
      });
      setCreateRoundModalOpen(true);
    } catch (err) {
      showToast('Could not load rounds: ' + err.message, 'error');
    } finally {
      setOpeningDriveId(null);
    }
  };

  const handleCreateRound = async (e) => {
    e.preventDefault();
    if (!selectedDrive) return;
    const roundNo = Number(roundForm.round_no);
    if (!Number.isInteger(roundNo) || roundNo < 1) {
      showToast('Round number must be a positive whole number.', 'error');
      return;
    }
    if (existingRounds.some((round) => Number(round.round_no) === roundNo)) {
      showToast('That round number already exists. Choose another number.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post('/admin/rounds', {
        ...roundForm,
        round_no: roundNo,
        drive_id: selectedDrive.drive_id
      });
      showToast(res.message, 'success');
      setCreateRoundModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      <input aria-label="Search records" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Search names, companies, job titles?"
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            Placement Drive Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Recruitment campaigns, corporate packages, academic criteria, and selection rounds
          </p>
        </div>
        <Button
          size="sm"
          variant="cyan"
          onClick={() => setCreateDriveModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Drive
        </Button>
      </div>

      {drives.filter((record) => matchesRecord(record, search)).length === 0 && !loading ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8 text-cyan-400/60" />}
          title="No placement drives found"
          description="Create your first placement drive to begin campus recruitment."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {drives.filter((record) => matchesRecord(record, search)).map((d) => (
            <div
              key={d.drive_id}
              className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 hover:border-cyan-500/40 p-5 shadow-lg flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      {d.company_name}
                    </span>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors mt-0.5">
                      {d.job_title}
                    </h3>
                  </div>
                  <Badge variant={d.mode === 'On-Campus' ? 'cyan' : 'emerald'} size="sm">
                    {d.mode}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#070D1E]/70 border border-slate-800/70 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Package</span>
                    <span className="font-extrabold text-cyan-300 text-sm">
                      ₹{(d.package_offered / 100000).toFixed(2)} LPA
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vacancies</span>
                    <span className="font-bold text-slate-100">{d.vacancies} Positions</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Drive Date</span>
                    <span className="font-bold text-slate-100">{d.drive_date?.split('T')[0]}</span>
                  </div>
                </div>

                {/* Eligibility Criteria Pill Box */}
                <div className="mt-3 p-3 rounded-xl border border-slate-800/60 bg-[#070D1E]/40 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Min CGPA: <strong className="text-slate-200">{d.min_cgpa ?? 'None'}</strong></span>
                    <span>Max Backlogs: <strong className="text-slate-200">{d.max_backlogs ?? 'None'}</strong></span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/50">
                    <span className="truncate max-w-[200px]">Eligible Depts: <strong className="text-cyan-400">{d.eligible_departments}</strong></span>
                    <span>10th / 12th: <strong className="text-slate-200">{d.min_10th_percentage || 0}% / {d.min_12th_percentage || 0}%</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-400 font-mono text-[11px]">
                  <span><strong className="text-slate-200">{d.total_applicants}</strong> Applicants</span>
                  <span>&bull;</span>
                  <span><strong className="text-cyan-400">{d.total_rounds}</strong> Rounds</span>
                  <span>&bull;</span>
                  <span><strong className="text-emerald-400">{d.offers_issued}</strong> Offers</span>
                </div>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => openRoundModal(d)}
                  disabled={openingDriveId !== null || roundSetupClosed(d)}
                  title={roundSetupClosed(d) ? 'Round setup is complete or evaluations have begun. No additional rounds can be added.' : 'Configure up to 4 rounds; HR Interview is the final round.'}
                  isLoading={openingDriveId === d.drive_id}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-cyan-400" />}
                >
                  {roundSetupClosed(d) ? 'Rounds Finalized' : 'Add Round'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Drive */}
      <Modal
        isOpen={createDriveModalOpen}
        onClose={() => setCreateDriveModalOpen(false)}
        title="Create New Placement Drive & Academic Criteria"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateDrive} className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Create a recruitment drive along with verified academic eligibility criteria. Real-time eligibility evaluation is automatically linked.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Hiring Company"
              value={driveForm.company_id}
              onChange={(e) => setDriveForm({ ...driveForm, company_id: parseInt(e.target.value) })}
              options={companies.map((c) => ({ value: c.company_id, label: c.company_name }))}
            />
            <Input
              label="Job / Role Title"
              required
              value={driveForm.job_title}
              onChange={(e) => setDriveForm({ ...driveForm, job_title: e.target.value })}
              placeholder="e.g. Systems Engineer"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Package Offered (INR CTC)"
              type="number"
              required
              value={driveForm.package_offered}
              onChange={(e) => setDriveForm({ ...driveForm, package_offered: parseFloat(e.target.value) })}
            />
            <Input
              label="Vacancies"
              type="number"
              required
              value={driveForm.vacancies}
              onChange={(e) => setDriveForm({ ...driveForm, vacancies: parseInt(e.target.value) })}
            />
            <Input
              label="Drive Date"
              type="date"
              required
              value={driveForm.drive_date}
              onChange={(e) => setDriveForm({ ...driveForm, drive_date: e.target.value })}
            />
          </div>

          <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-[#070D1E] space-y-3">
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Academic Eligibility Rules
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Min CGPA"
                type="number"
                step="0.01"
                value={driveForm.min_cgpa}
                onChange={(e) => setDriveForm({ ...driveForm, min_cgpa: parseFloat(e.target.value) })}
              />
              <Input
                label="Max Backlogs"
                type="number"
                value={driveForm.max_backlogs}
                onChange={(e) => setDriveForm({ ...driveForm, max_backlogs: parseInt(e.target.value) })}
              />
              <Input
                label="Eligible Depts (CSE,EE or ALL)"
                value={driveForm.eligible_departments}
                onChange={(e) => setDriveForm({ ...driveForm, eligible_departments: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setCreateDriveModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cyan" isLoading={actionLoading}>
              Create Placement Drive
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Round */}
      <Modal
        isOpen={createRoundModalOpen}
        onClose={() => setCreateRoundModalOpen(false)}
        title={`Add Selection Round: ${selectedDrive?.job_title}`}
      >
        <form onSubmit={handleCreateRound} className="space-y-3">
          <p className="text-xs text-cyan-200">One round is enough. Add only the rounds your company needs (up to 4). HR Interview can be Round 1, 2, 3, or 4 and ends the sequence. Configure the sequence before evaluations. Passing the last configured round automatically grants the student an offer.</p>
          {existingRounds.length > 0 && (
            <div className="rounded-xl border border-slate-700 p-3 text-xs space-y-1">
              <p className="font-semibold text-cyan-300">Existing rounds</p>
              {existingRounds.map((round) => (
                <p key={round.round_id}>Round {round.round_no}: {round.round_type} {round.round_date ? `(${round.round_date.split('T')[0]})` : ''}</p>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Round Number"
              type="number"
              min="1"
              max="4"
              readOnly
              step="1"
              required
              value={roundForm.round_no}
              onChange={(e) => setRoundForm({ ...roundForm, round_no: e.target.value })}
            />
            <Select
              label="Round Type"
              value={roundForm.round_type}
              onChange={(e) => setRoundForm({ ...roundForm, round_type: e.target.value })}
              options={roundTypes.filter((type) => !existingRounds.some((round) => round.round_type === type))
                .map((type) => ({ value: type, label: type === 'HR Interview' ? 'HR Interview (final round)' : type === 'GD' ? 'Group Discussion (GD)' : type }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Round Mode"
              value={roundForm.mode}
              onChange={(e) => setRoundForm({ ...roundForm, mode: e.target.value })}
              options={['On-Campus', 'Off-Campus', 'Virtual'].map((mode) => ({ value: mode, label: mode }))}
            />
            <Input
              label="Venue / Link"
              value={roundForm.venue}
              onChange={(e) => setRoundForm({ ...roundForm, venue: e.target.value })}
              placeholder="e.g. Lab 2 or Google Meet"
            />
            <Input
              label="Round Date"
              type="date"
              value={roundForm.round_date}
              onChange={(e) => setRoundForm({ ...roundForm, round_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setCreateRoundModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cyan" isLoading={actionLoading}>
              {roundForm.round_type === 'HR Interview' ? 'Save Final Round' : 'Save Round'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
