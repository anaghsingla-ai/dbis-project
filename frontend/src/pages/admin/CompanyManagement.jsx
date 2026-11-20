import useRecordSearch, { matchesRecord } from '../../hooks/useRecordSearch';
import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Building2, Plus, Globe, Mail, Phone, MapPin, Briefcase, Award, ExternalLink, Sparkles } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { Input, EmptyState } from '../../components/common/Input';

export default function CompanyManagement() {
  const [search, setSearch] = useRecordSearch();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    company_name: '', industry_type: 'IT', website: '',
    hr_contact_name: '', hr_contact_email: '', hr_contact_phone: '', address: ''
  });

  const { showToast } = useToast();

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/companies');
      if (res.success) setCompanies(res.companies);
    } catch (err) {
      showToast('Error loading companies: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/admin/companies', form);
      showToast(res.message, 'success');
      setAddModalOpen(false);
      setForm({
        company_name: '', industry_type: 'IT', website: '',
        hr_contact_name: '', hr_contact_email: '', hr_contact_phone: '', address: ''
      });
      loadCompanies();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
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
            <Building2 className="w-6 h-6 text-cyan-400" />
            Company & Recruiter Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Registered corporate partners, industry sectors, recruiter contacts, and placement drives
          </p>
        </div>
        <Button
          size="sm"
          variant="cyan"
          onClick={() => setAddModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Recruiter
        </Button>
      </div>

      {companies.filter((record) => matchesRecord(record, search)).length === 0 && !loading ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8 text-cyan-400/60" />}
          title="No companies registered"
          description="Register participating companies to begin scheduling placement drives."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.filter((record) => matchesRecord(record, search)).map((c) => (
            <div
              key={c.company_id}
              className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 hover:border-cyan-500/40 p-5 shadow-lg flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-black text-base shrink-0 shadow-md">
                      {c.company_name?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-100 group-hover:text-white transition-colors">{c.company_name}</h3>
                      <Badge variant="cyan" size="xs">{c.industry_type}</Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2 p-3 rounded-xl bg-[#070D1E]/60 border border-slate-800/70 text-xs text-slate-300">
                  {c.website && (
                    <p className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate text-slate-300">{c.website}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-slate-300">{c.hr_contact_email} {c.hr_contact_name ? `(${c.hr_contact_name})` : ''}</span>
                  </p>
                  {c.address && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate text-slate-400">{c.address}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                  <strong>{c.total_drives}</strong> Drives
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Award className="w-3.5 h-3.5" />
                  <strong>{c.hired_students}</strong> Placed
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Company Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Recruiter Organization"
      >
        <form onSubmit={handleAdd} className="space-y-3">
          <Input
            label="Company Name"
            required
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            placeholder="e.g. Amazon India"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Industry Type"
              required
              value={form.industry_type}
              onChange={(e) => setForm({ ...form, industry_type: e.target.value })}
              placeholder="e.g. E-Commerce / Cloud"
            />
            <Input
              label="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="amazon.jobs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="HR Contact Name"
              value={form.hr_contact_name}
              onChange={(e) => setForm({ ...form, hr_contact_name: e.target.value })}
              placeholder="e.g. Rajesh Kumar"
            />
            <Input
              label="HR Email"
              type="email"
              required
              value={form.hr_contact_email}
              onChange={(e) => setForm({ ...form, hr_contact_email: e.target.value })}
              placeholder="hr@amazon.example"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="HR Phone"
              value={form.hr_contact_phone}
              onChange={(e) => setForm({ ...form, hr_contact_phone: e.target.value })}
              placeholder="9800000000"
            />
            <Input
              label="Location / Office Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Hyderabad / Bengaluru"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cyan" isLoading={isSubmitting}>
              Register Company
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
