import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
  footer,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    function handleKeyDown(e) {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const fields = panelRef.current?.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]');
        if (!fields?.length) return;
        const first = fields[0];
        const last = fields[fields.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      panelRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (isOpen) previousFocus?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Mount outside animated/transformed pages so the dialog covers the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-[#040711]/85 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />

        {/* Panel */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`relative transform overflow-hidden rounded-2xl bg-[#0B1224] text-left border border-cyan-500/25 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_25px_rgba(6,182,212,0.15)] transition-all sm:my-8 w-full ${maxWidth}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-cyan-500/15 px-6 py-4 bg-[#0D162B]">
            <h3 id={titleId} className="text-base font-bold text-white tracking-tight">{title}</h3>
            <button
              type="button"
              aria-label="Close dialog"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto text-slate-200">{children}</div>

          {/* Optional footer */}
          {footer && (
            <div className="border-t border-cyan-500/15 px-6 py-4 bg-[#090E1D] flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
