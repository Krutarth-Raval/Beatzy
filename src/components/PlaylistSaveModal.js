"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Folder, Plus, Loader2, Check } from 'lucide-react';
import { getPlaylists, createPlaylist, addTrackToPlaylist } from '@/lib/db';

export default function PlaylistSaveModal({ track, onClose, onSaveDirectly }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [error, setError] = useState('');

  // Inline "new playlist" creation state
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const newInputRef = useRef(null);

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (showNewInput && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [showNewInput]);

  const loadPlaylists = async () => {
    try {
      const p = await getPlaylists();
      setPlaylists(p);
      // If no playlists, automatically open the new playlist input
      if (p.length === 0) setShowNewInput(true);
    } catch (e) {
      console.error(e);
      setError('Failed to load playlists');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreatingNew(true);
    setError('');
    try {
      const newPlaylist = await createPlaylist(trimmed);
      setShowNewInput(false);
      setNewName('');
      await saveToPlaylist(newPlaylist.id);
    } catch (e) {
      console.error(e);
      setError('Failed to create playlist');
      setCreatingNew(false);
    }
  };

  const saveToPlaylist = async (playlistId) => {
    setSaving(true);
    setError('');
    try {
      let ytId = track.id;

      if (track.type === 'spotify' || !track.id) {
        const primaryArtist = track.artist || (track.artists || '').split(',')[0]?.trim() || '';
        const query = track.album
          ? `${track.name || track.title} ${primaryArtist} ${track.album}`
          : `${track.name || track.title} ${primaryArtist}`.trim();
        const params = new URLSearchParams({
          q: query,
          type: 'music',
          bestMatch: '1',
          songName: track.name || track.title || '',
          artist: primaryArtist,
        });
        const res = await fetch(`/api/search?${params}`);
        const data = await res.json();
        if (data && data.length > 0) {
          ytId = data[0].id;
          if (!track.duration && data[0].duration) track.duration = data[0].duration;
          if ((!track.artists || track.artists === 'Unknown Artist') && data[0].artist) track.artists = data[0].artist;
          if (!track.coverArt && data[0].thumbnail) track.coverArt = data[0].thumbnail;
        } else {
          throw new Error('Could not find song on YouTube for downloading');
        }
      }

      const blobRes = await fetch(`/api/download-direct?id=${ytId}`);
      if (!blobRes.ok) throw new Error('Failed to download audio data');

      const contentLength = blobRes.headers.get('content-length');
      const contentType = blobRes.headers.get('content-type') || 'audio/mp4';
      let total = contentLength ? parseInt(contentLength, 10) : 0;
      
      // If Content-Length is missing, estimate based on track duration (approx 16KB/sec for 128kbps audio)
      if (!total && track.duration) {
        let durationSecs = 0;
        if (typeof track.duration === 'number') {
          durationSecs = track.duration;
        } else if (typeof track.duration === 'string') {
          const parts = track.duration.split(':').reverse();
          durationSecs += (parseInt(parts[0]) || 0) + (parseInt(parts[1] || 0) * 60) + (parseInt(parts[2] || 0) * 3600);
        }
        if (durationSecs > 0) {
          total = durationSecs * 16000;
        }
      }

      let loaded = 0;

      const reader = blobRes.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setDownloadProgress('100%');
          break;
        }
        chunks.push(value);
        loaded += value.length;
        
        if (total) {
          // Cap at 99% during download in case the estimate is slightly off
          let percent = Math.round((loaded / total) * 100);
          if (percent > 99) percent = 99;
          setDownloadProgress(`${percent}%`);
        } else {
          // Fallback if we still don't have a total
          setDownloadProgress(`${(loaded / (1024 * 1024)).toFixed(1)} MB`);
        }
      }

      const blob = new Blob(chunks, { type: contentType });
      await addTrackToPlaylist(playlistId, { ...track, id: ytId }, blob);

      if (onSaveDirectly) {
        onSaveDirectly(playlistId);
      } else {
        onClose();
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'An error occurred while saving the track');
    } finally {
      setSaving(false);
      setCreatingNew(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', maxHeight: '85dvh', overflowY: 'auto', overflowX: 'hidden', padding: '24px', borderRadius: '16px', position: 'relative' }}>
        <button onClick={onClose} disabled={saving} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', fontWeight: '700', color: 'var(--text-primary)' }}>Save to playlist</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {track.title || track.name}
        </p>

        {error && <p style={{ color: '#ff4d4f', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</p>}

        {saving ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: '16px' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="animate-spin" size={64} color="var(--primary-color)" style={{ position: 'absolute' }} />
              {downloadProgress && <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{downloadProgress}</span>}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Downloading and saving to playlist...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                <Loader2 className="animate-spin" size={24} color="var(--text-secondary)" />
              </div>
            ) : (
              <>
                {/* Existing playlists */}
                {playlists.map(p => (
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
                ))}

                {/* Divider when playlists exist */}
                {playlists.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                )}

                {/* Inline "New Playlist" row */}
                {showNewInput ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', minWidth: 0 }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <input
                        ref={newInputRef}
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value.slice(0, 15))}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreateAndSave(); if (e.key === 'Escape') { setShowNewInput(false); setNewName(''); } }}
                        placeholder="Playlist name..."
                        disabled={creatingNew}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontSize: '0.95rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '0.75rem', color: newName.length === 15 ? '#ff4d4f' : 'var(--text-secondary)', textAlign: 'right', paddingRight: '2px', lineHeight: 1 }}>
                        {newName.length}/15
                      </span>
                    </div>
                    <button
                      onClick={handleCreateAndSave}
                      disabled={!newName.trim() || creatingNew}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: newName.trim() ? 'var(--text-primary)' : 'var(--border-color)',
                        color: newName.trim() ? 'var(--bg-main)' : 'var(--text-secondary)',
                        border: 'none',
                        cursor: newName.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontWeight: '600', fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {creatingNew ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      Save
                    </button>
                    {playlists.length > 0 && (
                      <button
                        onClick={() => { setShowNewInput(false); setNewName(''); }}
                        style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewInput(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'transparent', borderRadius: '10px', border: '1px dashed var(--border-color)', cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left', color: 'var(--text-secondary)' }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <Plus size={20} />
                    <span style={{ fontWeight: '600' }}>New Playlist</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
