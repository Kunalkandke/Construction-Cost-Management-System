import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Focus trap, ESC to close, scroll lock
function useOverlay(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = ref.current;
    setTimeout(() => (node?.querySelector('[data-autofocus]') || node?.querySelector(FOCUSABLE))?.focus(), 0);
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      if (e.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0]; const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; prev?.focus?.(); };
  }, [open, onClose]);
  return ref;
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  const w = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`glass-strong flex max-h-[92vh] w-full flex-col rounded-b-none sm:rounded-2xl ${w}`}>
        <div className="flex items-center justify-between gap-3 border-b border-ink-300/50 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink-300/50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, side = 'right', width = 'max-w-md' }) {
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 bg-ink-900/40 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`glass-strong absolute top-0 flex h-full w-full ${width} flex-col rounded-none ${side === 'right' ? 'right-0' : 'left-0'}`}>
        <div className="flex items-center justify-between border-b border-ink-300/50 px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close panel" className="rounded-lg p-2 text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

// requireWord: destructive/irreversible actions must type a word to confirm
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false, requireWord, loading }) {
  const [typed, setTyped] = useState('');
  useEffect(() => { if (!open) setTyped(''); }, [open]);
  const blocked = requireWord && typed.trim().toLowerCase() !== requireWord.toLowerCase();
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} disabled={blocked} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <div className="space-y-3 text-sm text-ink-700">
        <div>{message}</div>
        {requireWord && (
          <label className="block">Type <b>{requireWord}</b> to confirm
            <input data-autofocus value={typed} onChange={(e) => setTyped(e.target.value)} className="glass-input mt-1" autoComplete="off" />
          </label>
        )}
      </div>
    </Modal>
  );
}
