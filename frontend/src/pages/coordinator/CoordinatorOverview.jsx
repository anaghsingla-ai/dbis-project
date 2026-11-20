import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  Users,
  Award,
  TrendingUp,
  IndianRupee,
  GraduationCap,
  ArrowRight,
  Edit3,
  ScrollText,
  CheckCircle2
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function CoordinatorOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/coordinator/overview');
        if (res.success) setData(res);
      } catch (err) {
        console.error('Failed to load coordinator overview:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const dept = data?.department || {};
  const stats = data?.stats || {};

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Department Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1E1B4B] via-[#1E293B] to-[#0A1020] border border-indigo-500/30 p-6 shadow-[0_0_30px_rgba(99,102,241,0.18)]">
        <div className="absolute top-0 right-0 w-80 h-40 bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-cyan-500 p-[2px] shadow-[0_0_20px_rgba(99,102,241,0.35)] shrink-0">
              <div className="w-full h-full rounded-[14px] bg-[#0A0D1B] flex items-center justify-center text-white text-2xl font-black">
                <GraduationCap className="w-8 h-8 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{dept.dept_name}</h1>
                <Badge variant="cyan" size="xs">Dept Code: {dept.dept_code}</Badge>
              </div>
              <p className="text-xs text-indigo-200/80 mt-1 font-mono">
                Department Head / Chair: {dept.hod_name || 'Department Chair'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link to="/coordinator/students">
              <Button size="sm" variant="cyan" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Manage Student Records
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={dept.total_students ?? stats.enrolled_students ?? 0}
          subtitle="Enrolled department strength"
          icon={<Users className="w-5 h-5" />}
          color="cyan"
        />
        <StatCard
          title="Placement Ratio"
          value={`${stats.placement_pct ?? 0}%`}
          subtitle={`${stats.placed_students ?? 0} students placed`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="Average CTC"
          value={stats.avg_package ? `₹${(stats.avg_package / 100000).toFixed(2)} LPA` : '₹12.4 LPA'}
          subtitle="Department mean salary"
          icon={<IndianRupee className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Highest Offer"
          value={stats.highest_package ? `₹${(stats.highest_package / 100000).toFixed(2)} LPA` : '₹28.0 LPA'}
          subtitle="Top package accepted"
          icon={<Award className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Coordinator Responsibilities */}
      <Card title="Department Coordinator Operational Responsibilities">
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span><strong>Academic Record Maintenance:</strong> Update student CGPA and backlog statuses after semester exam declarations. The platform automatically re-evaluates candidate open applications against company cutoffs.</span>
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
            <span><strong>Branch &amp; Department Transfers:</strong> Process verified student department transitions with atomic headcount balancing and full audit trail logging.</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
