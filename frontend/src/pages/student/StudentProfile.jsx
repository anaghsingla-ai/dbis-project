import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { User, Lock, Save, GraduationCap, Building2, Phone, MapPin, FileText, ShieldCheck, Mail } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { Input } from '../../components/common/Input';

export default function StudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    phone: '',
    address: '',
    resume_link: ''
  });

  const { showToast } = useToast();

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get('/student/profile');
        if (res.success) {
          setProfile(res.student);
          setForm({
            phone: res.student.phone || '',
            address: res.student.address || '',
            resume_link: res.student.resume_link || ''
          });
        }
      } catch (err) {
        showToast('Error loading profile: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/student/profile', form);
      showToast(res.message, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="text-center py-16 text-slate-400 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs">Loading verified student profile...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeInUp">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
          <User className="w-6 h-6 text-cyan-400" />
          Student Profile
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Academic credentials and verified placement contact details
        </p>
      </div>

      {/* Read-Only Academic Credentials Card */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100">Verified Academic Record</h2>
              <p className="text-[11px] text-slate-400">
                Official institutional records certified by Department Academic Coordinators
              </p>
            </div>
          </div>
          <Badge variant="cyan" size="xs">Verified Record</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#070D1E]/70 border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Enrollment / PRN</span>
            <span className="font-mono font-bold text-slate-100 text-sm mt-0.5 block">{profile.enrollment_no}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Department</span>
            <span className="font-semibold text-slate-100 mt-0.5 block">{profile.dept_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Cumulative CGPA</span>
            <span className="font-bold text-cyan-400 text-base mt-0.5 block">{profile.cgpa} / 10.0</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Backlogs</span>
            <span className={`font-bold mt-0.5 block ${profile.backlog_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {profile.backlog_count}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">10th Percentage</span>
            <span className="font-semibold text-slate-200 mt-0.5 block">{profile.percentage_10th || '—'}%</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">12th Percentage</span>
            <span className="font-semibold text-slate-200 mt-0.5 block">{profile.percentage_12th || '—'}%</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Current Sem</span>
            <span className="font-semibold text-slate-200 mt-0.5 block">{profile.current_year_sem}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Gender</span>
            <span className="font-semibold text-slate-200 mt-0.5 block">{profile.gender}</span>
          </div>
        </div>
      </div>

      {/* Editable Contact Information */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 p-5 shadow-lg">
        <div className="pb-4 border-b border-slate-800/80 mb-4">
          <h2 className="text-sm font-bold text-slate-100">Contact & Placement Portfolio</h2>
          <p className="text-[11px] text-slate-400">
            Keep your contact number, residence address, and resume portfolio URL updated for recruiters
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Contact Phone"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="9100000001"
            />
            <Input
              label="Resume Link (Google Drive / GitHub / Portfolio)"
              value={form.resume_link}
              onChange={(e) => setForm({ ...form, resume_link: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
          </div>

          <Input
            label="Residential / Campus Hostel Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Hostel H1, IIT Indore"
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="cyan" isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
