"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, Loader2 } from 'lucide-react';
import { getPlaylists, createPlaylist, addTrackToPlaylist } from '@/lib/db';

export default function PlaylistSaveModal({ track, onClose }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [error, setError] = useState('');
  const hasAttemptedCreate = useRef(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const p = await getPlaylists();
      if (p.length === 0) {
        if (!hasAttemptedCreate.current) {
          hasAttemptedCreate.current = true;
          const newPlaylist = await createPlaylist('MyPlaylist');
          saveToPlaylist(newPlaylist.id);
        }
      } else {
        setPlaylists(p);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load playlists");
    } finally {
      setLoading(false);
    }
  };

  const saveToPlaylist = async (playlistId) => {
    setSaving(true);
    setError('');
    try {
      let ytId = track.id;
      if (track.type === 'spotify' || !track.id) {
        const query = `${track.name || track.title} ${track.artists?.split(',')[0] || ''}`.trim();
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=music`);
        const data = await res.json();
        if (data && data.length > 0) {
          ytId = data[0].id;
          if (!track.duration && data[0].duration) {
            track.duration = data[0].duration;
          }
          if ((!track.artists || track.artists === 'Unknown Artist') && data[0].artist) {
            track.artists = data[0].artist;
          }
          if (!track.coverArt && data[0].thumbnail) {
            track.coverArt = data[0].thumbnail;
          }
        } else {
          throw new Error("Could not find song on YouTube for downloading");
        }
      }

      const blobRes = await fetch(`/api/download-direct?id=${ytId}`);
      if (!blobRes.ok) throw new Error("Failed to download audio data");
      
      const contentLength = blobRes.headers.get('content-length');
      const contentType = blobRes.headers.get('content-type') || 'audio/mp4';
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      
      const reader = blobRes.body.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) {
          setDownloadProgress(`${Math.round((loaded / total) * 100)}%`);
        } else {
          setDownloadProgress(`${(loaded / (1024 * 1024)).toFixed(1)} MB`);
        }
      }
      
      const blob = new Blob(chunks, { type: contentType });

      await addTrackToPlaylist(playlistId, { ...track, id: ytId }, blob);

      onClose();
    } catch (e) {
      console.error(e);
      setError(e.message || "An error occurred while saving the track");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '16px', position: 'relative' }}>
        <button onClick={onClose} disabled={saving} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', fontWeight: '700', color: 'var(--text-primary)' }}>Save to...</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title || track.name}</p>

        {error && <p style={{ color: '#ff4d4f', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</p>}

        {saving ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: '16px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={64} color="var(--primary-color)" style={{ position: 'absolute' }} />
              {downloadProgress && <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{downloadProgress}</span>}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Downloading audio and saving to device...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 className="animate-spin" size={24} color="var(--text-secondary)" />
              </div>
            ) : playlists.length > 0 && (
              playlists.map(p => (
                <button
                  key={p.id}
                  onClick={() => saveToPlaylist(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-input)', borderRadius: '10px', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <Folder size={20} color="var(--primary-color)" />
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{p.name}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
