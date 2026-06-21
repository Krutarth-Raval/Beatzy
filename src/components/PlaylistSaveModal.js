'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Folder, Plus, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function PlaylistSaveModal({ track, onClose }) {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingTo, setSavingTo] = useState({}); // Track saving state for each playlist { id: 'saving' | 'saved' }
  const [error, setError] = useState(null);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const newInputRef = useRef(null);

  useEffect(() => {
    if (showNewInput && newInputRef.current) {
      newInputRef.current.focus();
    }
  }, [showNewInput]);

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const fetchPlaylists = async () => {
    if (!session?.user) {
      setError('You must be logged in to save to cloud playlists.');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        // Only show owned playlists for adding songs
        setPlaylists(data.owned || []);
      }
    } catch (e) {
      console.error('Failed to fetch playlists', e);
    } finally {
      setLoading(false);
    }
  };

  const saveToPlaylist = async (playlistId) => {
    if (!session?.user) return;
    
    setSavingTo(prev => ({ ...prev, [playlistId]: 'saving' }));
    setError(null);

    try {
      const ytId = track.id?.replace('youtube-', '') || track.id;
      
      const res = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ytId,
          title: track.title || track.name || 'Unknown Track',
          artist: track.artist || track.author?.name || 'Unknown Artist',
          thumbnail: track.thumbnail || track.best_thumbnail?.url || track.thumbnails?.[0]?.url || '',
          duration: track.duration || track.duration_string || ''
        })
      });

      if (!res.ok) throw new Error('Failed to add to playlist');
      
      setSavingTo(prev => ({ ...prev, [playlistId]: 'saved' }));
      
      // Reset tick after 2 seconds
      setTimeout(() => {
        setSavingTo(prev => ({ ...prev, [playlistId]: null }));
      }, 2000);
      
    } catch (e) {
      console.error(e);
      setError(e.message || 'An error occurred while saving the track');
      setSavingTo(prev => ({ ...prev, [playlistId]: null }));
    }
  };

  const handleCreateAndSave = async () => {
    if (!newName.trim() || creatingNew || !session?.user) return;
    
    setCreatingNew(true);
    setError(null);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: '', isPublic: false })
      });
      
      if (!res.ok) throw new Error('Failed to create playlist');
      
      const newPlaylist = await res.json();
      setPlaylists(prev => [newPlaylist, ...prev]);
      setShowNewInput(false);
      setNewName('');
      
      // Auto save the track to the newly created playlist
      await saveToPlaylist(newPlaylist.id);
      
    } catch (e) {
      setError('Failed to create playlist');
    } finally {
      setCreatingNew(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div className="animate-fade-in" onClick={e => e.stopPropagation()} style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', maxHeight: '85dvh', overflowY: 'auto', overflowX: 'hidden', padding: '24px', borderRadius: '16px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', fontWeight: '700', color: 'var(--text-primary)' }}>Save to Cloud Playlist</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '20px' }}>
          {track.title || track.name}
        </p>

        {error && <p style={{ color: '#ff4d4f', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="animate-spin" size={24} color="var(--text-secondary)" />
            </div>
          ) : !session?.user ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
              Please log in to use Cloud Playlists.
            </div>
          ) : (
            <>
              {/* Existing playlists */}
              {playlists.map(p => (
                <div
                  key={p.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-input)', borderRadius: '10px', border: '1px solid transparent', transition: 'all 0.2s', width: '100%' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <Folder size={20} color="var(--primary-color)" style={{ flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  </div>
                  
                  <button
                    onClick={() => saveToPlaylist(p.id)}
                    disabled={savingTo[p.id] === 'saving'}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      background: 'none', border: 'none', cursor: savingTo[p.id] === 'saving' ? 'default' : 'pointer',
                      color: savingTo[p.id] === 'saved' ? '#10b981' : 'var(--text-primary)',
                      padding: '4px', borderRadius: '50%',
                      transition: 'all 0.2s'
                    }}
                  >
                    {savingTo[p.id] === 'saving' ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : savingTo[p.id] === 'saved' ? (
                      <Check size={20} />
                    ) : (
                      <Plus size={20} />
                    )}
                  </button>
                </div>
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
                      onChange={e => setNewName(e.target.value.slice(0, 30))}
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
                    <span style={{ fontSize: '0.75rem', color: newName.length === 30 ? '#ff4d4f' : 'var(--text-secondary)', textAlign: 'right', paddingRight: '2px', lineHeight: 1 }}>
                      {newName.length}/30
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
      </div>
    </div>
  );
}
