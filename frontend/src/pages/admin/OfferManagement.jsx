import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Award, Plus, CheckCircle2, Clock, XCircle, Users, Briefcase, Sparkles, ShieldCheck } from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { Select, Input, EmptyState } from '../../components/common/Input';
import { Table, Thead, Tbody, Tr, Th, Td } from '../../components/common/Table';

export default function OfferManagement() {
  const [offers, setOffers] = useState([]);
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);

  // Issue offer modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedDriveId, setSelectedDriveId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const { showToast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [offerRes, driveRes] = await Promise.all([
        api.get('/admin/offers'),
        api.get('/admin/drives')
      ]);
      if (offerRes.success) setOffers(offerRes.offers);
      if (driveRes.success) {
        setDrives(driveRes.drives);
        if (driveRes.drives.length > 0 && !selectedDriveId) {
          setSelectedDriveId(driveRes.drives[0].drive_id);
        }
      }

    } catch (err) {
      showToast('Error loading offers: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedDriveId) return;
    let cancelled = false;
    setCandidates([]);
    setSelectedStudentId('');
    setCandidatesLoading(true);
    api.get('/admin/applications', { params: { drive_id: selectedDriveId } }).then((res) => {
      if (cancelled) return;
      const ready = (res.applications || []).filter((application) => application.ready_for_offer);
      setCandidates(ready);
      setSelectedStudentId(ready.length ? String(ready[0].student_id) : '');
    }).catch((err) => { if (!cancelled) showToast(err.message, 'error'); })
      .finally(() => { if (!cancelled) setCandidatesLoading(false); });
    return () => { cancelled = true; };
  }, [selectedDriveId, issueModalOpen]);

  const handleIssueOffer = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.post('/admin/offers', {
        student_id: parseInt(selectedStudentId, 10),
        drive_id: parseInt(selectedDriveId, 10)
      });
      showToast(res.message, 'success');
      setIssueModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepted': return <Badge variant="emerald" dot>Accepted</Badge>;
      case 'Pending': return <Badge variant="amber" dot>Pending Response</Badge>;
      case 'Declined': return <Badge variant="rose" dot>Declined</Badge>;
      default: return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeInUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-cyan-400" />
            Offer Management & Allocation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Corporate placement offer issuance, institutional vacancy enforcement, and candidate responses
          </p>
        </div>
        <Button
          size="sm"
          variant="cyan"
          onClick={() => setIssueModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Issue Offer
        </Button>
      </div>

      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-2xl border border-slate-800/90 shadow-lg overflow-hidden">
        {offers.length === 0 && !loading ? (
          <div className="p-8">
            <EmptyState
              icon={<Award className="w-8 h-8 text-cyan-400/60" />}
              title="No offers issued yet"
              description="Issue placement offers to candidates who cleared final selection rounds."
            />
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Offer ID</Th>
                <Th>Student</Th>
                <Th>Company & Role</Th>
                <Th>Package Offered</Th>
                <Th>Status</Th>
                <Th>Offer Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {offers.map((o) => (
                <Tr key={o.offer_id}>
                  <Td>
                    <span className="font-mono font-bold text-slate-100">#{o.offer_id}</span>
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-100">{o.student_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{o.enrollment_no} &bull; {o.dept_name}</p>
                  </Td>
                  <Td>
                    <p className="font-semibold text-slate-100">{o.company_name}</p>
                    <p className="text-[11px] text-cyan-400 font-medium">{o.job_title}</p>
                  </Td>
                  <Td>
                    <span className="font-bold text-cyan-300 text-sm">
                      ₹{(o.package_offered / 100000).toFixed(2)} LPA
                    </span>
                  </Td>
                  <Td>{getStatusBadge(o.offer_status)}</Td>
                  <Td className="text-slate-400 font-mono">{o.offer_date?.split('T')[0]}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Modal: Issue Offer */}
      <Modal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        title="Issue Placement Offer"
      >
        <form onSubmit={handleIssueOffer} className="space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed">
            Verify that candidate has cleared final selection rounds and drive vacancies are available before formal issuance.
          </p>

          <Select
            label="Select Placement Drive"
            required
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
            options={drives.map((d) => ({
              value: d.drive_id,
              label: `${d.company_name} — ${d.job_title} (${d.vacancies} vacancies)`
            }))}
          />

          <Select
            label="Select Candidate"
            required
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={candidatesLoading || !candidates.length}
            options={candidates.length ? candidates.map((candidate) => ({
              value: candidate.student_id,
              label: `${candidate.student_name} (${candidate.enrollment_no}) — All rounds cleared`
            })) : [{ value: '', label: candidatesLoading ? 'Loading eligible candidates…' : 'No candidates have cleared all rounds' }]}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setIssueModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="cyan" isLoading={actionLoading} disabled={candidatesLoading || !selectedStudentId}>
              Issue Placement Offer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
