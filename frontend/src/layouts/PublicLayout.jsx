import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { GraduationCap, ArrowRight, Menu, X } from 'lucide-react';
import Button from '../components/common/Button';

export default function PublicLayout() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 15);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // When on login page, render LoginPage full-screen with its own dedicated layout
  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#070B14] text-slate-100 selection:bg-cyan-500/30 selection:text-white">
      {/* Public Header matching high-tech SaaS look */}
      <header
        className={`sticky top-0 z-30 transition-all duration-300 ${
          scrolled
            ? 'bg-[#090F1E]/90 backdrop-blur-md border-b border-cyan-500/15 shadow-[0_4px_24px_rgba(0,0,0,0.6)]'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight block">CampusHire</span>
              <span className="text-[10px] text-cyan-400 font-bold block tracking-widest uppercase">
                IIT Indore
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-cyan-300 transition-colors">Portals &amp; Workflows</a>
            <a href="#architecture" className="hover:text-cyan-300 transition-colors">Enterprise Security</a>
            <a href="#team" className="hover:text-cyan-300 transition-colors">Development Team</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button size="sm" variant="cyan" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Enter Portal
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-cyan-500/15 bg-[#090F1E] px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-300 hover:text-cyan-300 py-1">Portals &amp; Workflows</a>
            <a href="#architecture" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-300 hover:text-cyan-300 py-1">Enterprise Security</a>
            <a href="#team" onClick={() => setMobileOpen(false)} className="block text-sm text-slate-300 hover:text-cyan-300 py-1">Development Team</a>
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button size="sm" variant="cyan" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Enter Portal
              </Button>
            </Link>
          </div>
        )}
      </header>

      {/* Main view */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-[#050811] text-slate-400 py-12 border-t border-cyan-500/10 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-20 bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">CampusHire — College Placement Management System</p>
              <p className="text-xs text-slate-400">CS 257 DBIS Lab Minor Project &bull; Indian Institute of Technology Indore</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 text-center md:text-right">
            <div className="flex items-center justify-center md:justify-end gap-2 text-cyan-400 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <span className="font-semibold">MySQL 8.0 &bull; Python Flask Connected</span>
            </div>
            <p>Supervised by Mrs. Aruna Tiwari &bull; Evaluation: November 16, 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
