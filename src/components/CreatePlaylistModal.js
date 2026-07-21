"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function CreatePlaylistModal({ onClose, onCreate, onPlaylistCreated }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (name.trim() && !loading) {
      setLoading(true);
      try {
        const res = await fetch('/api/playlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim() })
        });
        if (res.ok) {
          if (onCreate) onCreate(name.trim());
          if (onPlaylistCreated) onPlaylistCreated();
          onClose();
        } else {
          console.error("Failed to create playlist");
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '16px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Create Playlist</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Playlist name..."
              maxLength={15}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max 15 characters</span>
              <span style={{ fontSize: '0.8rem', color: name.length === 15 ? '#ff4d4f' : 'var(--text-secondary)' }}>
                {name.length}/15
              </span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!name.trim() || loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: name.trim() && !loading ? 'var(--text-primary)' : 'var(--border-color)', 
              color: name.trim() && !loading ? 'var(--bg-main)' : 'var(--text-secondary)', 
              borderRadius: '8px', 
              border: 'none', 
              fontWeight: '600', 
              cursor: name.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}
