import useRecordSearch from '../../hooks/useRecordSearch';
import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Calendar,
  IndianRupee,
  Building2,
  Search,
  Filter,
  Send,
  Lock,
  Clock,
  Sparkles,
  Users
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { Input, Select, EmptyState } from '../../components/common/Input';

export default function BrowseDrives() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingDriveId, setApplyingDriveId] = useState(null);

  // Filters
  const [search, setSearch] = useRecordSearch();
  const [eligibilityFilter, setEligibilityFilter] = useState('');

  const { showToast } = useToast();

  const loadDrives = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/drives');
      if (res.success) setDrives(res.drives);
    } catch (err) {
      showToast('Error loading drives: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrives();
  }, []);

  const handleApply = async (driveId) => {
    setApplyingDriveId(driveId);
    try {
      const res = await api.post('/student/apply', { drive_id: driveId });
      showToast(res.message, 'success');
      loadDrives();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setApplyingDriveId(null);
    }
  };

  const filteredDrives = drives.filter((d) => {
    const matchesSearch =
      d.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.job_title?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (eligibilityFilter === 'eligible') return d.is_eligible && !d.has_applied;
    if (eligibilityFilter === 'ineligible') return !d.is_eligible;
    if (eligibilityFilter === 'applied') return d.has_applied;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Briefcase className="w-6 h-6 text-cyan-400" />
            Browse Placement Drives
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time institutional eligibility verification and open campus recruitment opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            Total Drives: <strong className="text-cyan-400">{drives.length}</strong>
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies or job titles..."
              className="pl-9"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <Select
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value)}
            options={[
              { value: '', label: 'All Placement Drives' },
              { value: 'eligible', label: 'Eligible to Apply Only' },
              { value: 'ineligible', label: 'Ineligible Drives Only' },
              { value: 'applied', label: 'Already Applied' }
            ]}
          />
        </div>
      </div>

      {/* Drives Grid */}
      {filteredDrives.length === 0 && !loading ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8 text-cyan-400/60" />}
          title="No placement drives found"
          description="Try adjusting your search query or filter settings."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDrives.map((d) => (
            <div
              key={d.drive_id}
              className={`rounded-2xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden group shadow-lg ${
                d.has_applied
                  ? 'bg-[#0B1630]/80 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
                  : d.is_eligible
                  ? 'bg-[#0B132B]/80 border-slate-800/90 hover:border-cyan-500/50 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]'
                  : 'bg-[#080E20]/60 border-slate-800/50 opacity-80'
              }`}
            >
              {/* Card Header & Body */}
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-black shrink-0 shadow-sm">
                        {d.company_name?.charAt(0) || 'C'}
                      </div>
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        {d.company_name}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors leading-tight">
                      {d.job_title}
                    </h3>
                  </div>

                  <div>
                    {d.has_applied ? (
                      <Badge variant="cyan" size="sm" dot>
                        {d.my_application_status || 'Applied'}
                      </Badge>
                    ) : d.is_eligible ? (
                      <Badge variant="emerald" size="sm" dot>
                        Eligible
                      </Badge>
                    ) : (
                      <Badge variant="rose" size="sm" dot>
                        Ineligible
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Key Metrics Pill Grid */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#070D1E]/70 border border-slate-800/70 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                      Package
                    </span>
                    <span className="font-extrabold text-cyan-300 text-sm">
                      ₹{(d.package_offered / 100000).toFixed(2)} LPA
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                      Vacancies
                    </span>
                    <span className="font-bold text-slate-200">
                      {d.vacancies} Positions
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
                      Drive Date
                    </span>
                    <span className="font-bold text-slate-200">
                      {d.drive_date?.split('T')[0] || 'TBD'}
                    </span>
                  </div>
                </div>

                {/* Eligibility Criteria Details */}
                <div className="p-3 rounded-xl border border-slate-800/60 bg-[#070D1E]/40 text-xs space-y-2">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Min CGPA: <strong className="text-slate-200">{d.min_cgpa ?? 'None'}</strong></span>
                    <span>Max Backlogs: <strong className="text-slate-200">{d.max_backlogs ?? 'None'}</strong></span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-800/50">
                    <span className="truncate max-w-[180px]">
                      Depts: <strong className="text-cyan-400">{d.eligible_departments}</strong>
                    </span>
                    <span>Mode: <strong className="text-slate-200">{d.mode}</strong></span>
                  </div>
                </div>

                {/* Ineligibility Reason Alert */}
                {!d.is_eligible && (
                  <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span className="leading-relaxed">{d.eligibility_reason}</span>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3.5 border-t border-slate-800/80 bg-[#070D1E]/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Campus Drive #{d.drive_id}
                </span>

                {d.has_applied ? (
                  <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 bg-cyan-950/50 px-3 py-1.5 rounded-lg border border-cyan-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Application Submitted
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant={d.is_eligible ? 'cyan' : 'secondary'}
                    disabled={!d.is_eligible}
                    isLoading={applyingDriveId === d.drive_id}
                    onClick={() => handleApply(d.drive_id)}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Apply Now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
