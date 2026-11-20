import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import Button from '../../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md animate-fadeInUp">
        <div className="text-8xl font-black text-white/5 select-none leading-none mb-4">404</div>
        <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto -mt-16 mb-6">
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Page Not Found</h1>
        <p className="text-sm text-slate-400 mt-3 leading-relaxed">
          The requested page does not exist or has been relocated within the CampusHire portal.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Home
            </Button>
          </Link>
          <Link to="/login">
            <button className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">
              Go to Login →
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
