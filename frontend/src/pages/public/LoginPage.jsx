import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';
import {
  GraduationCap,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
  Users,
  Award,
  Crown,
  FileText,
  BarChart3,
  ShieldCheck,
  Landmark,
  Sparkles
} from 'lucide-react';
import HexagonalVaultCanvas from '../../components/common/HexagonalVaultCanvas';

// Demo account shortcuts; passwords are entered manually.
const QUICK_DEMO_ROLES = [
  {
    roleKey: 'TPO_ADMIN',
    username: 'admin',
    title: 'TPO Admin',
    icon: Crown,
    color: 'text-amber-400',
    border: 'border-amber-500/30 hover:border-amber-400',
    bg: 'bg-amber-950/40 hover:bg-amber-900/40',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.2)]',
  },
  {
    roleKey: 'STUDENT',
    username: 'aarav',
    title: 'Student',
    icon: GraduationCap,
    color: 'text-cyan-400',
    border: 'border-cyan-500/30 hover:border-cyan-400',
    bg: 'bg-cyan-950/40 hover:bg-cyan-900/40',
    glow: 'shadow-[0_0_12px_rgba(6,182,212,0.2)]',
  },
  {
    roleKey: 'COMPANY_HR',
    username: 'technova_hr',
    title: 'Company HR',
    icon: Building2,
    color: 'text-teal-400',
    border: 'border-teal-500/30 hover:border-teal-400',
    bg: 'bg-teal-950/40 hover:bg-teal-900/40',
    glow: 'shadow-[0_0_12px_rgba(20,184,166,0.2)]',
  },
  {
    roleKey: 'DEPARTMENT_COORDINATOR',
    username: 'cse_coord',
    title: 'Dept. Coordinator',
    icon: Users,
    color: 'text-sky-400',
    border: 'border-sky-500/30 hover:border-sky-400',
    bg: 'bg-sky-950/40 hover:bg-sky-900/40',
    glow: 'shadow-[0_0_12px_rgba(56,189,248,0.2)]',
  },
];

// Feature highlight cards matching the reference image
const FEATURE_HIGHLIGHTS = [
  {
    icon: Users,
    title: 'Placement',
    subtitle: 'Drives',
  },
  {
    icon: FileText,
    title: 'Application',
    subtitle: 'Tracking',
  },
  {
    icon: BarChart3,
    title: 'Real-time',
    subtitle: 'Analytics',
  },
  {
    icon: ShieldCheck,
    title: 'Secure &',
    subtitle: 'Reliable',
  },
];

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user) redirectUser(user.role);
  }, [user]);

  const redirectUser = (role) => {
    const from = location.state?.from?.pathname;
    if (from && from !== '/login') {
      navigate(from, { replace: true });
      return;
    }
    const paths = {
      TPO_ADMIN: '/admin',
      STUDENT: '/student',
      COMPANY_HR: '/hr',
      DEPARTMENT_COORDINATOR: '/coordinator',
    };
    navigate(paths[role] || '/', { replace: true });
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username || !password) {
      showToast('Please enter both username and password', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const loggedInUser = await login(username, password);
      showToast(`Welcome back, ${loggedInUser.full_name}!`, 'success');
      redirectUser(loggedInUser.role);
    } catch (err) {
      showToast(err.message || 'Invalid credentials', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAccount = (acc) => {
    setUsername(acc.username);
    setPassword('');
    setShowPassword(false);
    showToast(`Enter the password for ${acc.title} to sign in`, 'info');
    document.getElementById('login-password')?.focus();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-[#070B14] text-slate-100 select-none">
      {/* ─── Campus Background with Illuminated IIT Indore Building ─────────── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 transition-opacity duration-1000"
        style={{
          backgroundImage: "url('/campus_evening_bg.jpg')",
          backgroundPosition: 'center bottom',
        }}
      />

      {/* Cinematic Dark Gradient & Ambient Lighting Overlays */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(6, 11, 23, 0.92) 0%, rgba(7, 14, 30, 0.75) 48%, rgba(6, 11, 23, 0.88) 100%), ' +
            'linear-gradient(to bottom, rgba(5, 9, 20, 0.95) 0%, rgba(6, 12, 26, 0.3) 45%, rgba(5, 9, 20, 0.82) 100%)',
        }}
      />

      {/* Subtle Cyan Atmospheric Glow in bottom and right regions */}
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-blue-600/12 blur-[150px] rounded-full pointer-events-none z-0" />

      {/* Subtle Hexagonal Vault Canvas in upper region */}
      <HexagonalVaultCanvas className="z-0" />

      {/* ─── Top Navigation Bar matching reference image ─────────────────────── */}
      <header className="relative z-20 w-full px-6 sm:px-10 lg:px-16 pt-6 pb-4 flex items-center justify-between max-w-7xl mx-auto">
        {/* Brand Logo & Subtitle */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-black text-white tracking-tight block leading-tight">
              CampusHire
            </span>
            <span className="text-[11px] text-slate-400 font-medium block tracking-wide">
              IIT Indore
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/#architecture" className="hover:text-white transition-colors">About</Link>
          <Link to="/#features" className="hover:text-white transition-colors">Features</Link>
        </nav>

      </header>

      {/* ─── Main Hero & Glass Login Grid ──────────────────────────────────── */}
      <main className="relative z-15 flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
          
          {/* ─── Left Hero Section matching reference screenshot ─────────────── */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left py-4">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/70 border border-cyan-500/30 backdrop-blur-md text-xs font-semibold text-cyan-300 mb-6 shadow-[0_0_15px_rgba(6,182,212,0.15)] w-fit animate-fadeInUp">
              <Landmark className="w-3.5 h-3.5 text-cyan-400" />
              <span>IIT Indore Placement Portal</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] animate-fadeInUp">
              Bridge Talent with{' '}
              <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-cyan-400 to-blue-400">
                Opportunity
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed font-normal animate-fadeInUp">
              A unified platform for students, companies, and the institute to manage placements, applications, and offers efficiently.
            </p>

            {/* 4 Feature Highlight Cards matching reference screenshot */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5 sm:gap-4 animate-fadeInUp">
              {FEATURE_HIGHLIGHTS.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={idx}
                    className="w-24 sm:w-28 p-3.5 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/10 hover:border-cyan-400/40 hover:bg-slate-900/70 transition-all flex flex-col items-center justify-center text-center group shadow-md"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-cyan-400 mb-1.5 group-hover:scale-110 transition-transform">
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-200 leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[11px] font-bold text-slate-200 leading-tight">
                      {item.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Right Section: Dark Glass Login Card matching reference image ─── */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end py-2">
            <div className="w-full max-w-[430px] rounded-3xl bg-slate-900/65 backdrop-blur-2xl border border-cyan-500/25 p-7 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.12)] relative animate-fadeInUp">
              
              {/* Card Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Welcome back</span>
                  <span className="inline-block hover:rotate-12 transition-transform">👋</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Sign in to your CampusHire account
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username input with User icon */}
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username or Email"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                </div>

                {/* Password input with Lock icon and Eye toggle */}
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Blue Gradient Sign In Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3.5 px-6 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 text-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Select Demo Account Section matching reference image */}
              <div className="mt-6 pt-5 border-t border-slate-800/80">
                <div className="relative flex items-center justify-center mb-4">
                  <span className="bg-slate-900/65 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider relative z-10">
                    Select Demo Account
                  </span>
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                </div>

                {/* 4 Compact Role Cards Grid matching reference image */}
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_DEMO_ROLES.map((role) => {
                    const RoleIcon = role.icon;
                    return (
                      <button
                        key={role.roleKey}
                        type="button"
                        onClick={() => handleSelectAccount(role)}
                        disabled={isLoading}
                        className={`p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-400/50 hover:bg-cyan-950/30 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:scale-105 group ${role.glow}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${role.color} group-hover:scale-110 transition-transform`}>
                          <RoleIcon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 mt-1 leading-tight group-hover:text-cyan-300 transition-colors">
                          {role.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card Footer Tagline matching reference image */}
              <div className="mt-6 pt-4 border-t border-slate-800/60 text-center">
                <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                  <Landmark className="w-3.5 h-3.5 text-slate-500" />
                  <span>IIT Indore | Placement &amp; Recruitment Portal</span>
                </p>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ─── Bottom Status Indicator ────────────────────────────────────────── */}
      <footer className="relative z-10 w-full py-3 px-6 text-center text-[11px] text-slate-400">
        <span>CampusHire v2.4 &bull; CS257 Minor Project &bull; Evaluation: November 16, 2026</span>
      </footer>
    </div>
  );
}
