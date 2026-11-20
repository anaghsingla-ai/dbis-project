import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import {
  Award,
  CheckCircle2,
  XCircle,
  IndianRupee,
  Building2,
  Calendar,
  AlertTriangle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { EmptyState } from '../../components/common/Input';

export default function MyOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Decision Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [decision, setDecision] = useState('Accepted');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const loadOffers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/student/offers');
      if (res.success) setOffers(res.offers);
    } catch (err) {
      showToast('Error loading offers: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
    window.addEventListener('focus', loadOffers);
    return () => window.removeEventListener('focus', loadOffers);
  }, []);

  const openDecisionModal = (offer, dec) => {
    setSelectedOffer(offer);
    setDecision(dec);
    setModalOpen(true);
  };

  const handleRespond = async () => {
    if (!selectedOffer) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/student/offers/respond', {
        offer_id: selectedOffer.offer_id,
        decision
      });
      showToast(res.message, 'success');
      setModalOpen(false);
      loadOffers();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Accepted': return <Badge variant="emerald" dot>Accepted</Badge>;
      case 'Pending': return <Badge variant="amber" dot>Action Required</Badge>;
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
            Placement Offers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review formal corporate job offers and submit binding placement decisions
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-slate-400">
          <Button size="sm" variant="secondary" onClick={loadOffers} isLoading={loading}>Refresh offers</Button>
          <span>Total Offers: <strong className="text-cyan-400">{offers.length}</strong></span>
        </div>
      </div>

      {/* Cyber Policy Callout Banner */}
      <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#0B152B] via-[#0E2042] to-[#0B152B] flex items-start gap-3.5 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-cyan-300">IIT Indore Placement Policy — One Candidate, One Job Offer</p>
          <p className="mt-1 leading-relaxed text-slate-300">
            Accepting an offer is an institutional commitment. Upon acceptance, the system automatically marks this offer as confirmed, auto-declines other concurrent offers, and withdraws you from remaining placement drives to guarantee equitable opportunities for fellow students.
          </p>
        </div>
      </div>

      {offers.length === 0 && !loading ? (
        <EmptyState
          icon={<Award className="w-8 h-8 text-cyan-400/60" />}
          title="No placement offers received yet"
          description="Offers issued after you successfully clear selection rounds will appear here for your formal response."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {offers.map((offer) => (
            <div
              key={offer.offer_id}
              className={`rounded-2xl border backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 ${
                offer.offer_status === 'Accepted'
                  ? 'bg-[#0B1A2E]/80 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
                  : offer.offer_status === 'Pending'
                  ? 'bg-[#0B132B]/80 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.12)]'
                  : 'bg-[#090F1E]/70 border-slate-800/80 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      {offer.company_name}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 mt-0.5">{offer.job_title}</h3>
                  </div>
                  {getStatusBadge(offer.offer_status)}
                </div>

                <div className="mt-5 p-4 rounded-xl bg-[#070D1E]/70 border border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Annual CTC Offered
                  </span>
                  <span className="text-2xl font-black text-cyan-300 mt-1 block tracking-tight">
                    ₹{(offer.package_offered / 100000).toFixed(2)} LPA
                  </span>
                  <div className="mt-3 pt-2.5 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Offer Date: {offer.offer_date?.split('T')[0] || 'N/A'}</span>
                    <span>Ref: #{offer.offer_id}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                {offer.offer_status === 'Pending' ? (
                  <div className="flex items-center gap-2.5 w-full justify-end">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => openDecisionModal(offer, 'Declined')}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="cyan"
                      onClick={() => openDecisionModal(offer, 'Accepted')}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Accept Offer
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-mono w-full text-right flex items-center justify-end gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Status: <span className="font-semibold text-slate-200">{offer.offer_status}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decision Confirmation Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Confirm Decision: ${decision} Offer`}
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-[#070D1E] border border-slate-800 text-xs space-y-1">
            <p className="text-slate-300">
              <strong className="text-slate-100">Company:</strong> {selectedOffer?.company_name}
            </p>
            <p className="text-slate-300">
              <strong className="text-slate-100">Package:</strong> <span className="text-cyan-300 font-bold">₹{(selectedOffer?.package_offered / 100000).toFixed(2)} LPA</span>
            </p>
          </div>

          {decision === 'Accepted' ? (
            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-cyan-300">Institutional One-Offer Policy</p>
                <p className="mt-1 leading-relaxed text-slate-300">
                  Accepting this offer will automatically:
                </p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-slate-300">
                  <li>Formally finalize your placement with <strong>{selectedOffer?.company_name}</strong>.</li>
                  <li>Auto-decline any other active pending offers.</li>
                  <li>Conclude remaining drives and interview schedules.</li>
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              Declining this offer is irreversible. The company vacancy will immediately be released for other students.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={decision === 'Accepted' ? 'cyan' : 'danger'}
              onClick={handleRespond}
              isLoading={isSubmitting}
            >
              Confirm {decision}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
