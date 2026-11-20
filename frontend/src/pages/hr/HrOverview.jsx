import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Building2,
  Briefcase,
  Users,
  Award,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function HrOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/hr/overview');
        if (res.success) setData(res);
      } catch (err) {
        console.error('Failed to load HR overview:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const company = data?.company || {};
  const stats = data?.stats || {};

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Corporate HR Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#062A29] via-[#083332] to-[#0A1A2E] border border-teal-500/30 p-6 shadow-[0_0_30px_rgba(20,184,166,0.18)]">
        <div className="absolute top-0 right-0 w-80 h-40 bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-teal-500 via-emerald-600 to-cyan-500 p-[2px] shadow-[0_0_20px_rgba(20,184,166,0.35)] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#071317] flex items-center justify-center text-white text-2xl font-black">
                {company.company_name?.charAt(0) || 'C'}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{company.company_name}</h1>
                <Badge variant="teal" size="xs">
                  {company.industry_type || 'Technology Partner'}
                </Badge>
              </div>
              <p className="text-xs text-teal-200/80 mt-1 font-mono">
                HR Contact: {company.hr_contact_name} ({company.hr_contact_email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/hr/applicants">
              <Button size="sm" variant="cyan" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Review Applicants
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Drives"
          value={stats.total_drives ?? 0}
          subtitle="Placement campaigns"
          icon={<Briefcase className="w-5 h-5" />}
          color="cyan"
        />
        <StatCard
          title="Total Applicants"
          value={stats.total_applicants ?? 0}
          subtitle="Pre-screened candidates"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Shortlisted"
          value={stats.shortlisted_candidates ?? 0}
          subtitle="Passed interview rounds"
          icon={<TrendingUp className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="Offers Accepted"
          value={stats.hired_candidates ?? 0}
          subtitle={`${stats.pending_offers ?? 0} pending acceptance`}
          icon={<Award className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Recruitment Instructions Card */}
      <Card title="Recruitment Instructions &amp; Evaluation Guidelines">
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span><strong>Pre-screened Candidate Roster:</strong> Candidates appearing in your applicant dashboard have verified their academic eligibility against your specific CGPA cutoffs, backlog restrictions, and department criteria.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span><strong>Recording Round Outcomes:</strong> Record Pass, Fail, or On-Hold for each assessment stage. The database automatically cascades results, advancing candidates or releasing vacancies.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span><strong>Issuing Final Job Offers:</strong> Once candidates clear all interview rounds, TPO Administration coordinates the formal offer issuance with single-acceptance enforcement.</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
