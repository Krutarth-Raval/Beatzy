'use client';
import { X } from 'lucide-react';
import useModalStore from '@/store/useModalStore';

export default function GlobalModal() {
  const { isOpen, title, message, type, confirmText, cancelText, onConfirm, onCancel, closeModal } = useModalStore();

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--overlay-scrim)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div className="animate-fade-in" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '16px', position: 'relative', boxShadow: 'var(--shadow-strong)' }}>
        
        {type === 'alert' && (
          <button onClick={closeModal} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        )}

        <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'var(--text-primary)', border: 'none', color: 'var(--bg-main)', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
