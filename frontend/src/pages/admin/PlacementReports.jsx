import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { BarChart3, Download, RefreshCw, Award, IndianRupee, Users, Building2, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import Card from '../../components/common/Card';
import StatCard from '../../components/common/StatCard';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

export default function PlacementReports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const { showToast } = useToast();

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reports/placement');
      if (res.success) {
        setReportData(res.report);
        showToast('Institutional placement report snapshot refreshed successfully!', 'success');
      }
    } catch (err) {
      showToast('Error loading report: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const summary = reportData?.summary || {};
  const companyWise = reportData?.companyWise || [];
  const deptWise = reportData?.deptWise || [];

  const exportCsv = () => {
    if (!reportData) return;
    let csv = "DEPARTMENT-WISE PLACEMENT REPORT (IIT INDORE NAAC/NBA ACCREDITATION)\n";
    csv += "Department,Total Enrolled,Placed Students,Placement Percentage (%)\n";
    deptWise.forEach((d) => {
      csv += `"${d.dept_name}",${d.total_students},${d.placed},${d.placement_pct}%\n`;
    });

    csv += "\nCOMPANY-WISE PLACEMENT REPORT\n";
    csv += "Company Name,Placed Candidates,Average Package (INR)\n";
    companyWise.forEach((c) => {
      csv += `"${c.company_name}",${c.students_placed},${c.avg_package}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CampusHire_Placement_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Placement report downloaded as CSV!', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            Placement Reports & Accreditation Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Official institutional placement analytics, department ratios, salary metrics, and recruiter distributions
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadReport}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-cyan-400" />}
          >
            Refresh Data
          </Button>
          <Button
            size="sm"
            variant="cyan"
            onClick={exportCsv}
            disabled={!reportData}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export NAAC CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Students Placed"
          value={summary.students_placed ?? 0}
          subtitle="Accepted offers verified"
          icon={<Award className="w-5 h-5" />}
          color="cyan"
        />
        <StatCard
          title="Average CTC"
          value={summary.avg_package ? `₹${(summary.avg_package / 100000).toFixed(2)} LPA` : '₹0 LPA'}
          subtitle="Mean accepted compensation"
          icon={<IndianRupee className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Highest CTC"
          value={summary.highest_package ? `₹${(summary.highest_package / 100000).toFixed(2)} LPA` : '₹0 LPA'}
          subtitle="Top institutional offer"
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Lowest CTC"
          value={summary.lowest_package ? `₹${(summary.lowest_package / 100000).toFixed(2)} LPA` : '₹0 LPA'}
          subtitle="Base benchmark package"
          icon={<IndianRupee className="w-5 h-5" />}
          color="teal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department-Wise Placements Table */}
        <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg p-5">
          <div className="pb-4 border-b border-slate-800/80 mb-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Department-Wise Placement Statistics
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Accreditation cohort placement ratios</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-[#070D1E]/60">
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Enrolled</th>
                  <th className="py-2.5 px-3">Placed</th>
                  <th className="py-2.5 px-3 text-right">Placement %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {deptWise.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-100 font-sans">{d.dept_name}</td>
                    <td className="py-2.5 px-3 text-slate-300">{d.total_students}</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{d.placed}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Badge variant={d.placement_pct >= 50 ? 'emerald' : 'cyan'}>
                        {d.placement_pct}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Company-Wise Selections Table */}
        <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg p-5">
          <div className="pb-4 border-b border-slate-800/80 mb-3">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Recruiter Selections & Packages
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Corporate partner hiring volumes and averages</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider bg-[#070D1E]/60">
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Hired Students</th>
                  <th className="py-2.5 px-3 text-right">Avg Package</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {companyWise.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-100 font-sans">{c.company_name}</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">{c.students_placed}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                      ₹{(c.avg_package / 100000).toFixed(2)} LPA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
