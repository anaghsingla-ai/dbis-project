import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  GraduationCap,
  Briefcase,
  FileText,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  MapPin,
  ChevronRight
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function StudentOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      try {
        const res = await api.get('/student/overview');
        if (res.success) setData(res);
      } catch (err) {
        console.error('Failed to load student overview:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOverview();
  }, []);

  const student = data?.student || {};
  const counts = data?.counts || {};
  const upcomingRounds = data?.upcomingRounds || [];

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Student Profile Cyber Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B152B] via-[#0E2248] to-[#091533] border border-cyan-500/30 p-6 shadow-[0_0_30px_rgba(6,182,212,0.18)]">
        {/* Glowing atmospheric auras */}
        <div className="absolute top-0 right-0 w-80 h-40 bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-20 bg-blue-600/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-[2px] shadow-[0_0_20px_rgba(6,182,212,0.35)] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#090F1E] flex items-center justify-center text-white text-2xl font-black">
                {student.name?.charAt(0) || 'S'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{student.name}</h1>
                <Badge variant="cyan" size="xs">
                  {student.dept_name || 'Engineering'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 font-mono flex items-center gap-2 flex-wrap">
                <span>Roll: <strong className="text-white">{student.enrollment_no}</strong></span>
                <span className="text-slate-600">&bull;</span>
                <span>CGPA: <strong className="text-cyan-400">{student.cgpa}</strong></span>
                <span className="text-slate-600">&bull;</span>
                <span>
                  Backlogs: <strong className={student.backlog_count > 0 ? 'text-rose-400' : 'text-emerald-400'}>{student.backlog_count}</strong>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/student/drives">
              <Button size="sm" variant="cyan" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Browse Eligible Drives
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats in Glowing Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Applied"
          value={counts.total_applications ?? 0}
          subtitle="Placement drives applied to"
          icon={<FileText className="w-5 h-5" />}
          color="cyan"
        />
        <StatCard
          title="Active Applications"
          value={counts.active_applications ?? 0}
          subtitle="Currently in selection pipeline"
          icon={<Clock className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Shortlisted Rounds"
          value={counts.shortlisted_count ?? 0}
          subtitle="Passed assessment stages"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="Offers Received"
          value={counts.total_offers ?? 0}
          subtitle={`${counts.accepted_offers ?? 0} accepted • ${counts.pending_offers ?? 0} pending`}
          icon={<Award className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Upcoming Selection Rounds Card */}
      <Card
        title="Upcoming Selection Rounds"
        subtitle="Scheduled interview and assessment rounds for your active applications"
      >
        {upcomingRounds.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Calendar className="w-8 h-8 text-cyan-400/60 mx-auto mb-2" />
            <p className="text-xs">No upcoming selection rounds scheduled at the moment.</p>
            <Link to="/student/drives" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold mt-2 inline-block">
              Browse Open Placement Drives &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingRounds.map((round) => (
              <div
                key={round.round_id}
                className="p-3.5 rounded-xl bg-[#091124] border border-slate-800/80 hover:border-cyan-500/30 flex items-center justify-between text-xs transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 font-bold flex items-center justify-center text-xs shadow-md">
                    R{round.round_no}
                  </div>
                  <div>
                    <p className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {round.company_name} &bull; {round.job_title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {round.round_type} &bull; Venue: {round.venue || 'Virtual / TBD'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-semibold text-white block">
                    {round.round_date?.split('T')[0] || 'Date TBD'}
                  </span>
                  <Badge variant="blue" size="xs">{round.mode || 'On-Campus'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
