import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import Button from '../../components/common/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950/30 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md animate-fadeInUp">
        <div className="text-8xl font-black text-white/5 select-none leading-none mb-4">403</div>
        <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mx-auto -mt-16 mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Access Denied</h1>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          Your account role does not have authorization to access this section of the CampusHire placement portal.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Home
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="ghost" size="md" leftIcon={<LogIn className="w-4 h-4 text-slate-400" />}
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              Switch Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
