import useRecordSearch, { matchesRecord } from '../../hooks/useRecordSearch';
import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Briefcase, Calendar, IndianRupee, Users, Award, Sparkles } from 'lucide-react';
import Badge from '../../components/common/Badge';
import { EmptyState } from '../../components/common/Input';

export default function HrDrives() {
  const [search, setSearch] = useRecordSearch();
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  useEffect(() => {
    async function loadDrives() {
      try {
        const res = await api.get('/hr/drives');
        if (res.success) setDrives(res.drives);
      } catch (err) {
        showToast('Error loading company drives: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadDrives();
  }, []);

  return (
    <div className="space-y-6 animate-fadeInUp">
      <input aria-label="Search records" value={search} onChange={(event) => setSearch(event.target.value)}
        placeholder="Search names, companies, job titles?"
        className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm" />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
          <Briefcase className="w-6 h-6 text-cyan-400" />
          Assigned Recruitment Drives
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Active campus placement campaigns and eligibility criteria scheduled for your organization
        </p>
      </div>

      {drives.filter((record) => matchesRecord(record, search)).length === 0 && !loading ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8 text-cyan-400/60" />}
          title="No drives assigned"
          description="Contact the TPO office to schedule placement drives for your organization."
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
                    <h3 className="text-lg font-bold text-slate-100 group-hover:text-white transition-colors">{d.job_title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{d.offer_type} &bull; {d.mode}</p>
                  </div>
                  <Badge variant="cyan" size="sm">Drive #{d.drive_id}</Badge>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#070D1E]/70 border border-slate-800/80 text-xs">
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

                <div className="mt-3 p-3 rounded-xl border border-slate-800/60 bg-[#070D1E]/40 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Min CGPA: <strong className="text-slate-200">{d.min_cgpa ?? 'None'}</strong></span>
                    <span>Max Backlogs: <strong className="text-slate-200">{d.max_backlogs ?? 'None'}</strong></span>
                  </div>
                  <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/50">
                    <span className="truncate max-w-[200px]">Eligible Depts: <strong className="text-cyan-400">{d.eligible_departments}</strong></span>
                    <span>10th / 12th: <strong className="text-slate-200">{d.min_10th_percentage || 0}% / {d.min_12th_percentage || 0}%</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span><strong className="text-slate-200">{d.total_applicants}</strong> Applicants</span>
                <span>&bull;</span>
                <span><strong className="text-cyan-400">{d.shortlisted_count}</strong> Shortlisted</span>
                <span>&bull;</span>
                <span><strong className="text-emerald-400">{d.hired_count}</strong> Hired</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
