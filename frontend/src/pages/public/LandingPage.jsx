import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Database,
  Building2,
  Users,
  Award,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Layers,
  MapPin,
  Briefcase,
  BarChart3,
  Globe2,
  ChevronRight
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function LandingPage() {
  return (
    <div className="bg-[#070B14] text-slate-100 overflow-hidden">
      {/* ─── Hero Section with High-Tech Glow ───────────────────────────────── */}
      <section className="relative pt-20 pb-28 lg:pt-28 lg:pb-36 overflow-hidden">
        {/* Futuristic glowing radial aura backgrounds */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-r from-blue-600/20 via-cyan-500/20 to-teal-500/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/15 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-blue-600/15 blur-[100px] pointer-events-none rounded-full" />

        {/* Ambient Grid overlay */}
        <div className="absolute inset-0 bg-cyber-mesh opacity-40 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-bold mb-8 shadow-[0_0_20px_rgba(6,182,212,0.2)] backdrop-blur-md animate-fadeInUp">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Next-Generation Campus Placement Platform &bull; IIT Indore</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-5xl mx-auto leading-[1.1] animate-fadeInUp">
            Intelligent Placement Management, <br />
            <span className="gradient-text-cyan">
              Engineered for Premier Universities
            </span>
          </h1>

          <p className="mt-7 text-base sm:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed animate-fadeInUp">
            Streamline university recruitment across students, corporate partners, coordinators, and placement directors with real-time eligibility tracking, multi-stage candidate pipelines, and comprehensive hiring intelligence.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 animate-fadeInUp">
            <Link to="/login">
              <Button
                size="xl"
                variant="primary"
                rightIcon={<ArrowRight className="w-5 h-5" />}
                className="shadow-[0_0_30px_rgba(37,99,235,0.5)]"
              >
                Launch Placement Portal
              </Button>
            </Link>
            <Link to="/login">
              <button className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl text-sm font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-950/60 hover:border-cyan-400 transition-all cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span>Explore Live Dashboards</span>
              </button>
            </Link>
          </div>

          {/* Quick Metrics Bar matching the reference UI */}
          <div className="mt-16 max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3.5 animate-fadeInUp">
            <div className="p-4 rounded-2xl bg-[#0A101F]/80 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] text-center backdrop-blur-md">
              <p className="text-3xl font-black text-cyan-400">100%</p>
              <p className="text-xs text-slate-300 font-semibold mt-1">Automated Screening</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Real-time eligibility verification</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A101F]/80 border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)] text-center backdrop-blur-md">
              <p className="text-3xl font-black text-blue-400">Zero</p>
              <p className="text-xs text-slate-300 font-semibold mt-1">Offer Conflicts</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Guaranteed one-offer policy</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A101F]/80 border border-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.1)] text-center backdrop-blur-md">
              <p className="text-3xl font-black text-teal-400">Live</p>
              <p className="text-xs text-slate-300 font-semibold mt-1">Audit Trail</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tamper-proof academic logs</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A101F]/80 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)] text-center backdrop-blur-md">
              <p className="text-3xl font-black text-amber-400">4 Roles</p>
              <p className="text-xs text-slate-300 font-semibold mt-1">Unified Access</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Role-scoped security control</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stakeholder Portals Section ───────────────────────────────────── */}
      <section id="features" className="py-24 relative bg-[#090F1E]/80 border-t border-b border-cyan-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="cyan" size="md">Multi-Role Architecture</Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-3 tracking-tight">
              Tailored Portals for <span className="gradient-text-cyan">Every Stakeholder</span>
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Designed to meet the exact operational needs of university management, corporate recruiters, department coordinators, and graduating students.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* TPO Admin */}
            <div className="cyber-card p-6 flex flex-col justify-between group hover:border-cyan-500/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 shadow-[0_0_15px_rgba(6,182,212,0.2)] group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                  TPO Administration
                </h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Central command center for managing campus drives, candidate eligibility cutoffs, hiring reports, and institutional audit trail records.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/15 flex items-center justify-between text-xs text-cyan-300 font-semibold">
                <span>Executive Analytics</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Student */}
            <div className="cyber-card p-6 flex flex-col justify-between group hover:border-blue-500/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-950/70 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-5 shadow-[0_0_15px_rgba(37,99,235,0.2)] group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors">
                  Student Portal
                </h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Browse open recruitment campaigns with real-time eligibility evaluation, 1-click applications, round interview tracking, and offer acceptance.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-blue-500/15 flex items-center justify-between text-xs text-blue-300 font-semibold">
                <span>Direct Application</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* HR Recruiter */}
            <div className="cyber-card p-6 flex flex-col justify-between group hover:border-teal-500/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-teal-950/70 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-5 shadow-[0_0_15px_rgba(20,184,166,0.2)] group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                  Company Recruiter
                </h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Dedicated interface for reviewing pre-screened applicants, evaluating interview stages, recording candidate scores, and issuing verified employment offers.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-teal-500/15 flex items-center justify-between text-xs text-teal-300 font-semibold">
                <span>Talent Evaluation</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Department Coordinator */}
            <div className="cyber-card p-6 flex flex-col justify-between group hover:border-amber-500/50">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-950/70 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-[0_0_15px_rgba(245,158,11,0.2)] group-hover:scale-105 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                  Department Coordinator
                </h3>
                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  Maintain departmental rosters, oversee student academic records, process branch transfers, and monitor department-wise placement ratios.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-amber-500/15 flex items-center justify-between text-xs text-amber-300 font-semibold">
                <span>Academic Oversight</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Enterprise Security & Invariants Section ────────────────────────── */}
      <section id="architecture" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="teal" size="md">Enterprise Reliability</Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-3 tracking-tight">
              Rigorous Business Rules, <span className="gradient-text-teal">Zero Compromise</span>
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Every recruitment operation adheres to strict academic policies, concurrency-safe locks, and automated conflict prevention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="cyber-card p-6 border-l-4 border-l-cyan-500">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Automated Eligibility Engine</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Evaluates minimum CGPA cutoffs, active backlog restrictions, and eligible department branches simultaneously before accepting any candidate submission.
              </p>
            </div>

            <div className="cyber-card p-6 border-l-4 border-l-blue-500">
              <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Concurrency-Safe Vacancy Allocation</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Prevents race conditions and overselling vacancies when multiple candidates accept job offers simultaneously during peak campus hiring rounds.
              </p>
            </div>

            <div className="cyber-card p-6 border-l-4 border-l-teal-500">
              <div className="w-10 h-10 rounded-xl bg-teal-950/80 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Immutable Audit Trail</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Automatically logs all academic score modifications, student department transitions, and final selection statuses with complete timestamp accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Team & Institutional Evaluation Section ─────────────────────────── */}
      <section id="team" className="py-20 bg-[#090F1E] border-t border-cyan-500/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="cyber-card p-8 sm:p-10 border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-3xl pointer-events-none" />

            <div className="max-w-3xl">
              <Badge variant="cyan" size="md">Academic Project</Badge>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight">
                Indian Institute of Technology Indore
              </h2>
              <p className="text-slate-300 text-sm mt-1.5 font-medium">
                CS 257 Database &amp; Information Systems &bull; Supervised by <strong className="text-cyan-300">Mrs. Aruna Tiwari</strong>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Final Laboratory Examination Scheduled: <strong>November 16, 2026</strong>
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { name: 'Anagh Singla', roll: '250001006' },
                { name: 'Arush Agrawal', roll: '250001008' },
                { name: 'Bhuvaneesh Vijayvargiya', roll: '250001017' },
                { name: 'Jay Gupta', roll: '250001035' },
              ].map((member, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#070B14]/80 border border-cyan-500/20 text-center"
                >
                  <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-[0_0_10px_rgba(6,182,212,0.3)] mb-2">
                    {member.name.charAt(0)}
                  </div>
                  <p className="text-sm font-bold text-white truncate">{member.name}</p>
                  <p className="text-xs text-cyan-400 font-mono mt-0.5">{member.roll}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-cyan-500/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span>Production build ready &bull; React + Vite + Python Flask + MySQL 8.0</span>
              </div>
              <Link to="/login">
                <Button variant="cyan" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Access Evaluation Suite
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
