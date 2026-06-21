import React, { useState, useEffect } from 'react';
import { Search, X, Music, User, Plus, Check, Loader2, ListMusic } from 'lucide-react';

export default function PlaylistSearchModal({ onClose, onPlaylistSaved, onPlaylistSelected, playlists = [] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingTo, setSavingTo] = useState({});

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      searchPlaylists(query);
    }
  };

  const searchPlaylists = async (q) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playlists/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlaylist = async (e, playlistId) => {
    e.stopPropagation();
    if (savingTo[playlistId] === 'saved') return;

    setSavingTo(prev => ({ ...prev, [playlistId]: 'saving' }));
    try {
      const res = await fetch(`/api/playlists/${playlistId}/save`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to save');
      
      setSavingTo(prev => ({ ...prev, [playlistId]: 'saved' }));
      if (onPlaylistSaved) onPlaylistSaved();
      
      setTimeout(() => {
        setSavingTo(prev => ({ ...prev, [playlistId]: null }));
      }, 2000);
    } catch (err) {
      console.error('Error saving playlist', err);
      setSavingTo(prev => ({ ...prev, [playlistId]: null }));
    }
  };

  return (
    <div className="animate-fade-in" onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
      <div className="animate-scale-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '100%', padding: '24px', backgroundColor: 'var(--bg-main)', borderRadius: '16px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '70vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '700' }}>Search Playlists</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <ListMusic size={20} color="var(--text-secondary)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search for public playlists... (Press Enter)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: '100%',
              padding: '16px 48px 16px 48px',
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <button
            onClick={() => searchPlaylists(query)}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', color: 'var(--text-secondary)' }}
          >
            <Search size={20} />
          </button>
        </div>

        <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
              <Loader2 className="animate-spin" color="var(--primary-color)" size={24} />
            </div>
          ) : results.length > 0 ? (
            results.map(playlist => (
              <div
                key={playlist.id}
                onClick={() => {
                  if (onPlaylistSelected) {
                    onPlaylistSelected(playlist);
                  } else {
                    window.location.href = `/playlists?id=${playlist.id}`;
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '12px',
                  backgroundColor: 'var(--bg-input)', borderRadius: '12px', cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  textDecoration: 'none'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
              >
                <div style={{ width: '56px', height: '56px', backgroundColor: 'var(--bg-main)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {playlist.coverImage ? (
                    <img src={playlist.coverImage} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Music size={24} color="var(--text-secondary)" />
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: '600', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {playlist.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
                    <User size={12} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playlist.user?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>{playlist._count?.songs || 0} tracks</span>
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    const isAlreadySaved = playlists?.some(p => p.id === playlist.id);
                    if (isAlreadySaved) {
                      e.stopPropagation();
                      return;
                    }
                    handleSavePlaylist(e, playlist.id);
                  }}
                  style={{
                    background: (savingTo[playlist.id] === 'saved' || playlists?.some(p => p.id === playlist.id)) ? 'transparent' : 'var(--text-primary)', 
                    color: (savingTo[playlist.id] === 'saved' || playlists?.some(p => p.id === playlist.id)) ? 'var(--primary-color)' : 'var(--bg-main)',
                    border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (savingTo[playlist.id] === 'saved' || playlists?.some(p => p.id === playlist.id)) ? 'default' : 'pointer', 
                    transition: 'transform 0.1s'
                  }}
                  title={(savingTo[playlist.id] === 'saved' || playlists?.some(p => p.id === playlist.id)) ? "Already in Library" : "Save to Library"}
                >
                  {savingTo[playlist.id] === 'saving' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (savingTo[playlist.id] === 'saved' || playlists?.some(p => p.id === playlist.id)) ? (
                    <Check size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                </button>
              </div>
            ))
          ) : query.length > 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '0.9rem' }}>
              No public playlists found.
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '0.9rem' }}>
              Search for public playlists created by other users.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
