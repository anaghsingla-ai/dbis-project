import useRecordSearch from '../../hooks/useRecordSearch';
import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  ArrowRightLeft,
  GraduationCap,
  Eye,
  Edit,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { Input, Select, EmptyState } from '../../components/common/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/common/Table';

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useRecordSearch();
  const [deptFilter, setDeptFilter] = useState('');
  const [placementFilter, setPlacementFilter] = useState('');

  // Modals
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [updateMarksModalOpen, setUpdateMarksModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  // Selected student
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);

  // Forms
  const [regForm, setRegForm] = useState({
    enrollment_no: '', name: '', email: '', phone: '', dob: '2004-01-01',
    gender: 'Male', address: 'IIT Indore Campus', dept_id: 1, current_year_sem: '7-1',
    cgpa: 8.0, backlog_count: 0, percentage_10th: 85, percentage_12th: 85, resume_link: ''
  });

  const [transferForm, setTransferForm] = useState({ roll_no: '', new_dept_id: 1 });
  const [marksForm, setMarksForm] = useState({ roll_no: '', cgpa: 8.0, backlog_count: 0 });
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [stdRes, deptRes] = await Promise.all([
        api.get(`/admin/students?search=${encodeURIComponent(search)}&dept_id=${deptFilter}&placed=${placementFilter}`),
        api.get('/admin/departments')
      ]);
      if (stdRes.success) setStudents(stdRes.students);
      if (deptRes.success) setDepartments(deptRes.departments);
    } catch (err) {
      showToast('Error loading students: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [deptFilter, placementFilter]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    loadData();
  };

  // Register Student
  const handleRegister = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/admin/students', regForm);
      showToast(res.message, 'success');
      setRegisterModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Transfer Student
  const handleTransfer = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/admin/students/transfer', transferForm);
      showToast(res.message, 'success');
      setTransferModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Update Marks
  const handleUpdateMarks = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/admin/students/academic-record', marksForm);
      showToast(res.message, 'success');
      setUpdateMarksModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // View Profile Details
  const viewDetails = async (rollNo) => {
    try {
      const res = await api.get(`/admin/students/${rollNo}`);
      if (res.success) {
        setStudentDetails(res);
        setProfileModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to load student details: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-cyan-400" />
            Student Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete student cohort roster, academic records, and department management
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="cyan"
            onClick={() => setRegisterModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Register Student
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2 relative">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll no, or email..."
              className="pl-9"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <Select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            options={[
              { value: '', label: 'All Departments' },
              ...departments.map((d) => ({ value: d.dept_id, label: `${d.dept_code} - ${d.dept_name}` }))
            ]}
          />
          <Select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            options={[
              { value: '', label: 'All Placement Statuses' },
              { value: 'true', label: 'Placed Only' },
              { value: 'false', label: 'Unplaced Only' }
            ]}
          />
        </form>
      </div>

      {/* Students Table */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg overflow-hidden">
        {students.length === 0 && !loading ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="w-8 h-8 text-cyan-400/60" />}
              title="No students found"
              description="No student records match the given search criteria or filters."
            />
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Roll No</Th>
                <Th>Student Name</Th>
                <Th>Department</Th>
                <Th>CGPA / Backlogs</Th>
                <Th>Placement Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {students.map((s) => (
                <Tr key={s.roll_no}>
                  <Td>
                    <span className="font-mono font-semibold text-slate-100">{s.enrollment_no}</span>
                    <span className="block text-[10px] text-slate-400">ID: #{s.roll_no}</span>
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-100">{s.name}</p>
                    <p className="text-[11px] text-slate-400">{s.email}</p>
                  </Td>
                  <Td>
                    <Badge variant="cyan" size="sm">{s.dept_code || s.dept_name}</Badge>
                  </Td>
                  <Td>
                    <span className="font-bold text-slate-100">{s.cgpa} / 10.0</span>
                    <span className={`block text-[10px] font-semibold ${s.backlog_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {s.backlog_count} {s.backlog_count === 1 ? 'backlog' : 'backlogs'}
                    </span>
                  </Td>
                  <Td>
                    {s.placement_status === 'Placed' ? (
                      <div>
                        <Badge variant="emerald" size="sm" dot>Placed</Badge>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                          {s.placed_company} &bull; <span className="text-cyan-300 font-bold">₹{(s.accepted_package / 100000).toFixed(1)} LPA</span>
                        </p>
                      </div>
                    ) : (
                      <Badge variant="slate" size="sm">Unplaced</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => viewDetails(s.roll_no)}
                        title="View Full Profile"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          setMarksForm({ roll_no: s.roll_no, cgpa: s.cgpa, backlog_count: s.backlog_count });
                          setUpdateMarksModalOpen(true);
                        }}
                        title="Update Academic Record"
                      >
                        <Edit className="w-3.5 h-3.5 text-blue-400" />
                      </Button>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          setTransferForm({ roll_no: s.roll_no, new_dept_id: s.dept_id });
                          setTransferModalOpen(true);
                        }}
                        title="Transfer Department"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Modal: Register Student */}
      <Modal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        title="Register New Student"
      >
        <form onSubmit={handleRegister} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Enrollment / PRN"
              required
              value={regForm.enrollment_no}
              onChange={(e) => setRegForm({ ...regForm, enrollment_no: e.target.value })}
              placeholder="e.g. EN105"
            />
            <Input
              label="Full Name"
              required
              value={regForm.name}
              onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
              placeholder="e.g. Ananya Sen"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              required
              value={regForm.email}
              onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
              placeholder="ananya@iiti.example"
            />
            <Input
              label="Phone"
              required
              value={regForm.phone}
              onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
              placeholder="9100000105"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Department"
              value={regForm.dept_id}
              onChange={(e) => setRegForm({ ...regForm, dept_id: parseInt(e.target.value) })}
              options={departments.map((d) => ({ value: d.dept_id, label: `${d.dept_code}` }))}
            />
            <Input
              label="CGPA (0 - 10)"
              type="number"
              step="0.01"
              required
              value={regForm.cgpa}
              onChange={(e) => setRegForm({ ...regForm, cgpa: parseFloat(e.target.value) })}
            />
            <Input
              label="Backlogs"
              type="number"
              required
              value={regForm.backlog_count}
              onChange={(e) => setRegForm({ ...regForm, backlog_count: parseInt(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="10th Percentage"
              type="number"
              step="0.1"
              value={regForm.percentage_10th}
              onChange={(e) => setRegForm({ ...regForm, percentage_10th: parseFloat(e.target.value) })}
            />
            <Input
              label="12th Percentage"
              type="number"
              step="0.1"
              value={regForm.percentage_12th}
              onChange={(e) => setRegForm({ ...regForm, percentage_12th: parseFloat(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setRegisterModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cyan" isLoading={actionLoading}>
              Register Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Transfer Department */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfer Student Department"
      >
        <form onSubmit={handleTransfer} className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Transferring a student updates institutional enrollment records and automatically adjusts departmental student headcounts.
          </p>

          <Input
            label="Student Roll No"
            readOnly
            value={transferForm.roll_no}
          />

          <Select
            label="New Target Department"
            value={transferForm.new_dept_id}
            onChange={(e) => setTransferForm({ ...transferForm, new_dept_id: parseInt(e.target.value) })}
            options={departments.map((d) => ({ value: d.dept_id, label: `${d.dept_code} - ${d.dept_name}` }))}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cyan" isLoading={actionLoading}>
              Confirm Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Marks */}
      <Modal
        isOpen={updateMarksModalOpen}
        onClose={() => setUpdateMarksModalOpen(false)}
        title="Update Academic Record"
      >
        <form onSubmit={handleUpdateMarks} className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Updating academic records re-evaluates all active placement drive applications in real time according to institutional criteria.
          </p>

          <Input
            label="Student Roll No"
            readOnly
            value={marksForm.roll_no}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New CGPA"
              type="number"
              step="0.01"
              required
              value={marksForm.cgpa}
              onChange={(e) => setMarksForm({ ...marksForm, cgpa: parseFloat(e.target.value) })}
            />
            <Input
              label="New Backlogs"
              type="number"
              required
              value={marksForm.backlog_count}
              onChange={(e) => setMarksForm({ ...marksForm, backlog_count: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setUpdateMarksModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cyan" isLoading={actionLoading}>
              Save Academic Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Full Student Profile */}
      {studentDetails && (
        <Modal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          title={`Profile & Academic History: ${studentDetails.student.name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#070D1E] border border-slate-800 text-xs">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Roll / Enrollment</p>
                <p className="font-semibold text-slate-100 mt-0.5">{studentDetails.student.enrollment_no}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Department</p>
                <p className="font-semibold text-slate-100 mt-0.5">{studentDetails.student.dept_name}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">CGPA</p>
                <p className="font-bold text-cyan-400 text-sm mt-0.5">{studentDetails.student.cgpa} / 10.0</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold">Active Backlogs</p>
                <p className={`font-bold mt-0.5 ${studentDetails.student.backlog_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {studentDetails.student.backlog_count}
                </p>
              </div>
            </div>

            {/* Applications List */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Placement Applications ({studentDetails.applications.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {studentDetails.applications.map((app) => (
                  <div key={app.application_id} className="p-3 rounded-xl bg-[#070D1E]/80 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-100">{app.company_name} &bull; {app.job_title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Applied: {app.application_date?.split('T')[0]}</p>
                    </div>
                    <Badge
                      variant={app.status === 'Shortlisted' ? 'emerald' : app.status === 'Rejected' ? 'rose' : app.status === 'Withdrawn' ? 'amber' : 'cyan'}
                      size="sm"
                    >
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit History */}
            {studentDetails.auditHistory.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Academic Audit Trail
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {studentDetails.auditHistory.map((log) => (
                    <div key={log.log_id} className="p-2.5 rounded-lg bg-[#070D1E]/60 border border-slate-800 text-[11px] flex items-center justify-between font-mono text-slate-300">
                      <span>Changed <strong className="text-cyan-400">{log.field_name}</strong>: {log.old_value} &rarr; {log.new_value}</span>
                      <span className="text-slate-500 text-[10px]">{log.changed_at?.split('T')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
