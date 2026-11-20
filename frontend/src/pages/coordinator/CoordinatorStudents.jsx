import useRecordSearch from '../../hooks/useRecordSearch';
import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Users, Search, Edit3, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Input, Select, EmptyState } from '../../components/common/Input';

export default function CoordinatorStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useRecordSearch();

  // Modals
  const [marksModalOpen, setMarksModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Forms — use new_cgpa/new_backlog_count matching coordinator backend
  const [marksForm, setMarksForm] = useState({ new_cgpa: 8.0, new_backlog_count: 0 });
  const [transferForm, setTransferForm] = useState({ new_dept_id: 2 });
  const [departments, setDepartments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const loadStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/coordinator/students?search=${encodeURIComponent(search)}`);
      if (res.success) setStudents(res.students);
    } catch (err) {
      showToast('Error loading department students: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/coordinator/departments').then((r) => {
      if (r.success) setDepartments(r.departments);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadStudents(); }, [search]);

  const openMarksModal = (s) => {
    setSelectedStudent(s);
    setMarksForm({ new_cgpa: s.cgpa, new_backlog_count: s.backlog_count });
    setMarksModalOpen(true);
  };

  const openTransferModal = (s) => {
    setSelectedStudent(s);
    setTransferForm({ new_dept_id: s.dept_id === 1 ? 2 : 1 });
    setTransferModalOpen(true);
  };

  const handleUpdateMarks = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      // Use student_id (roll_no) with new_cgpa/new_backlog_count field names
      const res = await api.post('/coordinator/students/academic-record', {
        student_id: selectedStudent.roll_no,
        new_cgpa: parseFloat(marksForm.new_cgpa),
        new_backlog_count: parseInt(marksForm.new_backlog_count, 10)
      });
      showToast(res.message || 'Academic record updated successfully.', 'success');
      setMarksModalOpen(false);
      loadStudents();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      // Use student_id (roll_no) with new_dept_id
      const res = await api.post('/coordinator/students/transfer', {
        student_id: selectedStudent.roll_no,
        new_dept_id: parseInt(transferForm.new_dept_id, 10)
      });
      showToast(res.message || 'Student transferred successfully.', 'success');
      setTransferModalOpen(false);
      loadStudents();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Department Student Roster</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage student academic records and department assignments.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadStudents()}
            placeholder="Search students by name, enrollment or email..."
            className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Students', value: students.length, color: 'text-cyan-400' },
          { label: 'Placed', value: students.filter(s => s.placement_status === 'Placed').length, color: 'text-emerald-400' },
          { label: 'Unplaced', value: students.filter(s => s.placement_status !== 'Placed').length, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Students Table */}
      <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-3">
          <Users className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-200">Students</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading students...</div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No students found"
            description="No students registered in this department matching your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Enrollment</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">CGPA / Backlogs</th>
                  <th className="py-3 px-4">Placement</th>
                  <th className="py-3 px-4">Applications</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {students.map((s) => (
                  <tr key={s.roll_no} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-400">
                      {s.enrollment_no}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-100">{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{s.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-cyan-400 text-sm">{s.cgpa}</span>
                      <span className={`block text-[10px] ${s.backlog_count > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                        {s.backlog_count} backlogs
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {s.placement_status === 'Placed' ? (
                        <div>
                          <Badge variant="emerald" size="sm">Placed</Badge>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {s.placed_company} • ₹{(s.accepted_package / 100000).toFixed(1)} LPA
                          </p>
                        </div>
                      ) : (
                        <Badge variant="slate" size="sm">Unplaced</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {s.total_applications} applied
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openMarksModal(s)}
                          leftIcon={<Edit3 className="w-3 h-3" />}
                        >
                          Update Marks
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openTransferModal(s)}
                          title="Transfer to another department"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Marks Modal */}
      <Modal
        isOpen={marksModalOpen}
        onClose={() => setMarksModalOpen(false)}
        title={`Update Academic Record: ${selectedStudent?.name}`}
      >
        <form onSubmit={handleUpdateMarks} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
            <p className="text-slate-400">Student: <strong className="text-cyan-400">{selectedStudent?.name}</strong></p>
            <p className="text-slate-500 mt-1">
              Updating marks creates an automatic audit record. Applications that no longer
              meet eligibility criteria after the CGPA change will be automatically rejected.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New CGPA (0.00 – 10.00)"
              type="number"
              step="0.01"
              min="0"
              max="10"
              required
              value={marksForm.new_cgpa}
              onChange={(e) => setMarksForm({ ...marksForm, new_cgpa: e.target.value })}
            />
            <Input
              label="Active Backlogs"
              type="number"
              min="0"
              required
              value={marksForm.new_backlog_count}
              onChange={(e) => setMarksForm({ ...marksForm, new_backlog_count: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
            <Button variant="secondary" onClick={() => setMarksModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Department Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title={`Transfer Student: ${selectedStudent?.name}`}
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-xs">
            <p className="text-slate-400">
              Transferring <strong className="text-cyan-400">{selectedStudent?.name}</strong> to a new department.
              Department enrollment counts will update automatically.
            </p>
          </div>

          <Select
            label="Destination Department"
            required
            value={transferForm.new_dept_id}
            onChange={(e) => setTransferForm({ new_dept_id: e.target.value })}
            options={departments
              .filter((d) => d.dept_id !== selectedStudent?.dept_id)
              .map((d) => ({ value: d.dept_id, label: `${d.dept_code} — ${d.dept_name}` }))}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
            <Button variant="secondary" onClick={() => setTransferModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Confirm Transfer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
