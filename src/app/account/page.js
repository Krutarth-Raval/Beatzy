'use client';

import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Moon, Sun, Trash2, LogOut, Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

export default function AccountPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const handleClearHistory = () => {
    localStorage.removeItem('history');
    window.dispatchEvent(new Event('historyUpdated'));
    setShowClearHistoryModal(false);
  };

  const handleDeleteAccount = async () => {
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' });
      if (res.ok) {
        signOut({ callbackUrl: '/login' });
      }
    } catch (error) {
      console.error('Failed to delete account', error);
    }
  };

  if (!session?.user) {
    return <div style={{ padding: '24px', color: 'var(--text-primary)' }}>Please log in...</div>;
  }

  return (
    <div className="content-scroll">
      <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}>
            {session.user.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--text-primary)' }}>{session.user.name}</h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>{session.user.email}</p>
          </div>
        </div>

        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>Settings</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={toggleTheme} className="account-action-btn">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>Theme: {theme === 'light' ? 'Light' : 'Dark'}</span>
          </button>

          <button onClick={() => setShowClearHistoryModal(true)} className="account-action-btn">
            <Trash2 size={20} />
            <span>Clear Search History</span>
          </button>

          {session.user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
            <Link href="/admin" className="account-action-btn" style={{ textDecoration: 'none' }}>
              <ShieldAlert size={20} />
              <span>Admin Dashboard</span>
            </Link>
          )}

          <Link href="/about" className="account-action-btn" style={{ textDecoration: 'none' }}>
            <Info size={20} />
            <span>About Beatzy</span>
          </Link>
        </div>

        <h2 style={{ fontSize: '1.2rem', margin: '32px 0 16px 0', color: '#ff4d4f', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>Danger Zone</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setShowSignOutModal(true)} className="account-action-btn danger">
            <LogOut size={20} />
            <span>Log Out</span>
          </button>

          <button onClick={() => setShowDeleteAccountModal(true)} className="account-action-btn danger">
            <AlertTriangle size={20} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .account-action-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 16px;
          background-color: var(--bg-input);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: var(--text-primary);
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .account-action-btn:hover {
          background-color: var(--bg-hover);
          transform: translateY(-1px);
        }
        .account-action-btn.danger {
          color: #ff4d4f;
          border-color: rgba(255, 77, 79, 0.3);
        }
        .account-action-btn.danger:hover {
          background-color: rgba(255, 77, 79, 0.1);
        }
      `}} />

      {/* Modals */}
      {showClearHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Clear History</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Are you sure you want to clear your local search history? This cannot be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowClearHistoryModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleClearHistory} className="btn-danger">Clear</button>
            </div>
          </div>
        </div>
      )}

      {showSignOutModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Log Out</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Are you sure you want to log out?</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowSignOutModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="btn-danger">Log Out</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountModal && (
        <div className="modal-overlay">
          <div className="modal-content border-red">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#ff4d4f' }}><AlertTriangle size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />Delete Account</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>This will permanently delete your account, all your playlists, and saved tracks. This action CANNOT be undone.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setShowDeleteAccountModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleDeleteAccount} className="btn-danger">Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
