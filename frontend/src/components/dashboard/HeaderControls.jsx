import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Search, RefreshCw, LogOut, UserCheck } from 'lucide-react';
import api from '../../api/client';
import { matchesRecord } from '../../hooks/useRecordSearch';

function useDismiss(ref, close) {
  useEffect(() => {
    const click = (event) => { if (!ref.current?.contains(event.target)) close(); };
    const key = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('pointerdown', click);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', click);
      document.removeEventListener('keydown', key);
    };
  }, [ref, close]);
}

const panel = 'absolute top-full mt-2 rounded-xl border border-slate-700 bg-[#0B132B] shadow-2xl z-30';

const searchSources = {
  TPO_ADMIN: [
    { endpoint: '/admin/students', key: 'students', kind: 'Student', path: '/admin/students', label: 'name', detail: 'enrollment_no' },
    { endpoint: '/admin/companies', key: 'companies', kind: 'Company', path: '/admin/companies', label: 'company_name', detail: 'industry_type' },
    { endpoint: '/admin/drives', key: 'drives', kind: 'Drive', path: '/admin/drives', label: 'job_title', detail: 'company_name' }
  ],
  STUDENT: [{ endpoint: '/student/drives', key: 'drives', kind: 'Drive', path: '/student/drives', label: 'job_title', detail: 'company_name' }],
  COMPANY_HR: [
    { endpoint: '/hr/drives', key: 'drives', kind: 'Drive', path: '/hr/drives', label: 'job_title', detail: 'company_name' },
    { endpoint: '/hr/applicants', key: 'applicants', kind: 'Candidate', path: '/hr/applicants', label: 'student_name', detail: 'enrollment_no' }
  ],
  DEPARTMENT_COORDINATOR: [{ endpoint: '/coordinator/students', key: 'students', kind: 'Student', path: '/coordinator/students', label: 'name', detail: 'enrollment_no' }]
};

export function HeaderSearch({ user }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  useDismiss(ref, () => setOpen(false));
  useEffect(() => { setOpen(false); setQuery(''); }, [location.pathname, location.search]);
  useEffect(() => {
    let cancelled = false;
    const term = query.trim();
    setResults([]); setActive(0); setError('');
    if (!term) { setLoading(false); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      const sources = searchSources[user.role] || [];
      const responses = await Promise.allSettled(sources.map(async (source) => {
        const data = await api.get(source.endpoint, { params: { search: term } });
        return (data[source.key] || []).filter((row) => matchesRecord(row, term)).slice(0, 6).map((row) => ({
          label: row[source.label] || row.name || row.company_name,
          detail: row[source.detail], kind: source.kind,
          path: `${source.path}?search=${encodeURIComponent(term)}`
        }));
      }));
      if (cancelled) return;
      setResults(responses.flatMap((response) => response.status === 'fulfilled' ? response.value : []));
      if (responses.some((response) => response.status === 'rejected')) setError('Some records could not be loaded. Try again.');
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, user.role]);
  const choose = (result) => { navigate(result.path); setOpen(false); setQuery(''); };
  return (
    <form ref={ref} className="relative flex-1 max-w-md" onSubmit={(event) => {
      event.preventDefault(); if (results[active]) choose(results[active]);
    }}>
      <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input aria-label="Search students, companies and drives" aria-expanded={open} aria-controls="header-search-results"
        value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setActive((value) => Math.max(0, Math.min(value + 1, results.length - 1))); }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
        }} placeholder="Search students, companies, drives?"
        className="w-full bg-[#0B132B] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-400" />
      {open && <div id="header-search-results" className={`${panel} left-0 right-0 max-h-80 overflow-y-auto p-1`}>
        {!query.trim() ? <p className="p-3 text-xs text-slate-400">Type a name, enrollment number, company, or job title.</p> : loading ?
          <p className="p-3 text-xs" role="status">Searching records?</p> : <>
            {error && <p role="alert" className="p-3 text-xs text-rose-300">{error}</p>}
            {results.map((result, index) => <button type="button" key={`${result.kind}-${index}`} onClick={() => choose(result)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-xs hover:bg-slate-800 ${active === index ? 'bg-slate-800' : ''}`}>
              <span className="text-cyan-300 text-[10px] uppercase">{result.kind}</span>
              <span className="block font-semibold">{result.label}</span><span className="text-slate-400">{result.detail}</span>
            </button>)}
            {!results.length && !error && <p className="p-3 text-xs text-slate-400">No matching records.</p>}
          </>}
      </div>}
    </form>
  );
}

async function loadActivity(role) {
  if (role === 'TPO_ADMIN') {
    const data = await api.get('/admin/stats');
    return [
      ...(data.stats.pending_offers ? [{ id: 'pending', text: `${data.stats.pending_offers} offers awaiting student responses`, path: '/admin/offers' }] : []),
      ...(data.stats.upcoming_drives ? [{ id: 'drives', text: `${data.stats.upcoming_drives} upcoming placement drives`, path: '/admin/drives' }] : [])
    ];
  }
  if (role === 'STUDENT') {
    const data = await api.get('/student/offers');
    return (data.offers || []).filter((offer) => offer.offer_status === 'Pending').map((offer) => ({
      id: `offer-${offer.offer_id}`, text: `Offer from ${offer.company_name}: ${offer.job_title}`, path: '/student/offers'
    }));
  }
  if (role === 'COMPANY_HR') {
    const data = await api.get('/hr/drives');
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return (data.drives || []).filter((drive) => drive.drive_date?.slice(0, 10) >= today).map((drive) => ({
      id: `drive-${drive.drive_id}`, text: `${drive.job_title} — ${drive.drive_date.slice(0, 10)}`, path: '/hr/drives'
    }));
  }
  const data = await api.get('/coordinator/audit-history');
  return (data.logs || []).slice(0, 8).map((log) => ({
    id: `audit-${log.log_id}`, text: `${log.field_name} updated: ${log.old_value ?? '—'} → ${log.new_value ?? '—'}`, path: '/coordinator/audit'
  }));
}

export function NotificationMenu({ user }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const location = useLocation();
  useDismiss(ref, () => setOpen(false));
  useEffect(() => { setOpen(false); }, [location.pathname]);
  const refresh = async () => {
    setLoading(true); setError('');
    try { setItems(await loadActivity(user.role)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [user.role, location.pathname]);
  return <div ref={ref} className="relative">
    <button type="button" title="Notifications" aria-label="Notifications" aria-expanded={open} aria-controls="notifications-panel"
      onClick={() => { setOpen(!open); if (!open) refresh(); }}
      className="relative w-9 h-9 rounded-xl bg-[#0B132B] border border-slate-700 flex items-center justify-center hover:border-cyan-400">
      <Bell className="w-4 h-4" />
      {!error && items.length > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-rose-500 px-1 text-[10px]">{items.length}</span>}
    </button>
    {open && <section id="notifications-panel" aria-label="Current notifications" className={`fixed top-16 right-3 sm:absolute sm:top-full sm:right-0 mt-2 rounded-xl border border-slate-700 bg-[#0B132B] shadow-2xl z-30 w-72 max-w-[calc(100vw-1.5rem)] p-3`}>
      <div className="flex justify-between items-center mb-2"><h2 className="text-sm font-bold">Notifications</h2>
        <button type="button" aria-label="Refresh notifications" disabled={loading} onClick={refresh} className="p-1 hover:text-cyan-300 disabled:opacity-40"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">Current activity from your placement records</p>
      {loading ? <p className="text-xs py-3" role="status">Loading…</p> : error ? <p className="text-xs text-rose-300 py-3" role="alert">{error} Use refresh to retry.</p> : items.length ?
        <div className="max-h-72 overflow-y-auto">{items.map((item) => <Link key={item.id} to={item.path} onClick={() => setOpen(false)} className="block text-xs p-3 rounded-lg hover:bg-slate-800 border-b border-slate-800">{item.text}</Link>)}</div> :
        <p className="text-xs text-slate-400 py-3">No updates needing attention.</p>}
    </section>}
  </div>;
}

export function AccountMenu({ user, label, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, () => setOpen(false));
  return <div ref={ref} className="relative pl-3 border-l border-slate-800">
    <button type="button" aria-label="Open account menu" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-2 text-left">
      <span className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-600 flex items-center justify-center text-sm font-bold">{user.full_name?.charAt(0) || 'U'}</span>
      <span className="hidden sm:block"><span className="block text-xs font-bold">{user.full_name}</span><span className="block text-[10px] text-cyan-400">{label}</span></span>
    </button>
    {open && <div className={`${panel} right-0 w-64 p-3 space-y-2`}>
      <p className="text-sm font-bold">{user.full_name}</p><p className="text-xs text-slate-400 break-all">{user.email || user.username}</p><p className="text-xs text-cyan-300">{label}</p>
      {user.role === 'STUDENT' && <Link to="/student/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 text-xs p-2 rounded-lg hover:bg-slate-800"><UserCheck className="w-4 h-4" />Edit profile</Link>}
      <button type="button" onClick={onLogout} className="flex items-center gap-2 text-xs text-rose-300 p-2 rounded-lg hover:bg-slate-800 w-full"><LogOut className="w-4 h-4" />Sign out</button>
    </div>}
  </div>;
}
