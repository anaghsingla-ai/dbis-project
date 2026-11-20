import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FileText,
  Award,
  BarChart3,
  ScrollText,
  LogOut,
  GraduationCap,
  Menu,
  X,
  UserCheck,
  ChevronRight,
  ChevronDown,
  Search,
  Bell,
  Calendar,
  Layers,
  ArrowLeft,
  ArrowRight,
  Settings
} from 'lucide-react';
import Badge from '../components/common/Badge';
import { HeaderSearch, NotificationMenu, AccountMenu } from '../components/dashboard/HeaderControls';

const roleConfig = {
  TPO_ADMIN:               { label: 'Placement Officer', color: 'cyan' },
  STUDENT:                 { label: 'Student Candidate', color: 'blue' },
  COMPANY_HR:              { label: 'Company HR Lead',   color: 'teal' },
  DEPARTMENT_COORDINATOR:  { label: 'Dept Coordinator',  color: 'amber'},
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const historyIndex = window.history.state?.idx || 0;
  const [furthestIndex, setFurthestIndex] = useState(historyIndex);
  useEffect(() => { setFurthestIndex((previous) => Math.max(previous, historyIndex)); }, [location.key, historyIndex]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const academicStart = new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavLinks = () => {
    switch (user?.role) {
      case 'TPO_ADMIN':
        return [
          { name: 'Dashboard',        path: '/admin',              icon: <LayoutDashboard className="w-4 h-4" />, end: true },
          { name: 'Students',         path: '/admin/students',     icon: <Users className="w-4 h-4" /> },
          { name: 'Companies',        path: '/admin/companies',    icon: <Building2 className="w-4 h-4" /> },
          { name: 'Drives & Rounds',  path: '/admin/drives',       icon: <Briefcase className="w-4 h-4" /> },
          { name: 'Applications',     path: '/admin/applications', icon: <FileText className="w-4 h-4" /> },
          { name: 'Offers',           path: '/admin/offers',       icon: <Award className="w-4 h-4" /> },
          { name: 'Audit Logs', path: '/admin/audit-logs', icon: <ScrollText className="w-4 h-4" /> },
          { name: 'Reports',          path: '/admin/reports',      icon: <BarChart3 className="w-4 h-4" /> },
        ];
      case 'STUDENT':
        return [
          { name: 'Dashboard',        path: '/student',              icon: <LayoutDashboard className="w-4 h-4" />, end: true },
          { name: 'Browse Drives',    path: '/student/drives',       icon: <Briefcase className="w-4 h-4" /> },
          { name: 'Applications',     path: '/student/applications', icon: <FileText className="w-4 h-4" /> },
          { name: 'Selection Rounds', path: '/student/rounds',       icon: <Layers className="w-4 h-4" /> },
          { name: 'My Offers',        path: '/student/offers',       icon: <Award className="w-4 h-4" /> },
          { name: 'Profile',          path: '/student/profile',      icon: <UserCheck className="w-4 h-4" /> },
        ];
      case 'COMPANY_HR':
        return [
          { name: 'Dashboard',        path: '/hr',           icon: <LayoutDashboard className="w-4 h-4" />, end: true },
          { name: 'Assigned Drives',  path: '/hr/drives',    icon: <Briefcase className="w-4 h-4" /> },
          { name: 'Candidates',       path: '/hr/applicants',icon: <Users className="w-4 h-4" /> },
          { name: 'Selection Rounds', path: '/hr/applicants',icon: <Layers className="w-4 h-4" /> },
        ];
      case 'DEPARTMENT_COORDINATOR':
        return [
          { name: 'Dashboard',        path: '/coordinator',          icon: <LayoutDashboard className="w-4 h-4" />, end: true },
          { name: 'Student Roster',   path: '/coordinator/students', icon: <Users className="w-4 h-4" /> },
          { name: 'Academic Audit',   path: '/coordinator/audit',    icon: <ScrollText className="w-4 h-4" /> },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();
  const rc = roleConfig[user?.role] || { label: user?.role, color: 'cyan' };

  const SidebarNav = ({ onLinkClick }) => (
    <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
      {navLinks.map((item) => (
        <NavLink
          key={item.name + item.path}
          to={item.path}
          end={!!item.end}
          onClick={onLinkClick}
          className={({ isActive }) =>
            `group flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
              isActive
                ? 'nav-pill-active'
                : item.highlight
                ? 'bg-cyan-950/40 text-cyan-300 hover:bg-cyan-950/60 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`
          }
        >
          <span className="shrink-0 transition-transform group-hover:scale-110">{item.icon}</span>
          <span className="flex-1 truncate">{item.name}</span>
          {item.highlight && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 uppercase tracking-wider border border-cyan-400/30">
              Lab
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex">
      {/* ─── Left Sidebar matching reference image ───────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 shrink-0 bg-[#090F1E] border-r border-cyan-500/10 shadow-[4px_0_24px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Subtle cyan glow in sidebar */}
        <div className="absolute -top-20 -left-20 w-44 h-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-52 h-52 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        {/* Brand Header matching reference screenshot */}
        <div className="p-5 border-b border-cyan-500/10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight flex items-center gap-1">
                CampusHire
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 flex flex-col justify-between overflow-hidden relative z-10">
          <SidebarNav onLinkClick={undefined} />

          {/* Bottom Institute Building Graphic matching reference image! */}
          <div className="p-4 mx-3 mb-3 rounded-2xl bg-gradient-to-t from-cyan-950/40 via-slate-900/40 to-transparent border border-cyan-500/20 relative overflow-hidden text-center group">
            {/* Glowing wave at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-cyan-500/20 to-transparent blur-sm pointer-events-none" />
            <svg
              className="w-16 h-12 mx-auto text-cyan-400/80 mb-2 transition-transform group-hover:scale-105"
              viewBox="0 0 64 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              {/* College architecture sketch */}
              <path d="M4 44H60M8 44V26L32 14L56 26V44M18 44V28M26 44V28M38 44V28M46 44V28M32 6V14M28 8H36" />
              <circle cx="32" cy="20" r="3" fill="currentColor" fillOpacity="0.4" />
            </svg>
            <p className="text-xs font-bold text-white tracking-tight leading-tight">
              IIT Indore
            </p>
            <p className="text-[10px] text-cyan-300 font-medium mt-0.5">
              Placement Portal
            </p>
          </div>
        </div>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-cyan-500/10 bg-[#060B16] relative z-10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </button>
        </div>
      </aside>

      {/* ─── Main Content Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#070B14]">
        {/* Top Navbar matching reference image */}
        <header className="h-16 bg-[#090F1E]/90 backdrop-blur-md border-b border-cyan-500/10 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          {/* Left section: Nav arrows & Global Search */}
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Browser Navigation Controls matching reference screenshot */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => { if ((window.history.state?.idx || 0) > 0) navigate(-1); else navigate(navLinks[0]?.path || '/'); }}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500/40 transition-colors"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(1)}
                disabled={historyIndex >= furthestIndex}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:border-cyan-500/40 transition-colors"
                title="Go Forward"
                aria-label="Go forward"
                style={{ opacity: historyIndex >= furthestIndex ? 0.4 : 1 }}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <HeaderSearch user={user} />
          </div>

          {/* Right section: Selectors, Bell & User Profile */}
          <div className="flex items-center gap-3">
            {/* Institution Pill Dropdown matching reference image */}
            <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B132B] border border-cyan-500/25 text-xs text-cyan-200">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold">IIT Indore</span>
              
            </div>

            {/* Academic Year Dropdown matching reference image */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B132B] border border-teal-500/30 text-xs text-teal-300">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-semibold">{academicStart} - {String(academicStart + 1).slice(-2)}</span>
              
            </div>

            <NotificationMenu user={user} />
            <AccountMenu user={user} label={rc.label} onLogout={handleLogout} />
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-[#040711]/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-64 bg-[#090F1E] h-full flex flex-col border-r border-cyan-500/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-cyan-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-white text-sm">CampusHire</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarNav onLinkClick={() => setMobileMenuOpen(false)} />
              <div className="p-3 border-t border-cyan-500/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-rose-300 hover:bg-rose-950/30 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
