"use client";
import { useState, useEffect } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import useModalStore from '@/store/useModalStore';

export default function PwaInstallButton({ variant = 'icon' }) {
  const { showAlert } = useModalStore();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed / running in PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      showAlert("Install Beatzy", "To install Beatzy on your device, tap your browser's menu (⋮ or Share icon) and select 'Add to Home Screen' or 'Install App'.");
    }
  };

  if (isStandalone) {
    // Hide entirely if already running inside the PWA app
    return null;
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={handleInstallClick}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
          backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
          borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', marginTop: '8px'
        }}
        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Download size={18} />
        <span style={{ fontWeight: '600' }}>Install App</span>
      </button>
    );
  }

  // Icon variant for header
  return (
    <button
      onClick={handleInstallClick}
      style={{
        color: 'var(--primary-color)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
        background: 'none', border: 'none', cursor: 'pointer',
        marginRight: '8px'
      }}
      title="Install App"
    >
      <Download size={24} />
    </button>
  );
}
