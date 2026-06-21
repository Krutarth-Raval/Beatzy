"use client";

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, Library, Heart, Search, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import usePlayerStore from '@/store/usePlayerStore';

export default function ExplorePlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { data: session } = useSession();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();

  useEffect(() => {
    fetchExplorePlaylists();
  }, []);

  const fetchExplorePlaylists = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/playlists/explore');
      if (res.ok) {
        const data = await res.json();
        setPlaylists(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPlaylist = async (e, playlist) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.tracks && data.tracks.length > 0) {
          playTrack(data.tracks[0], data.tracks, playlist.name);
        }
      }
    } catch (e) {
      console.error('Failed to play playlist', e);
    }
  };

  const handleSavePlaylist = async (e, playlistId, isSaved) => {
    e.stopPropagation();
    if (!session?.user) {
      alert('Please log in to save playlists.');
      return;
    }
    
    // Optimistic UI update
    setPlaylists(playlists.map(p => {
      if (p.id === playlistId) {
        return {
          ...p,
          isSavedByMe: !isSaved,
          _count: {
            ...p._count,
            savedBy: p._count.savedBy + (isSaved ? -1 : 1)
          }
        };
      }
      return p;
    }));

    try {
      await fetch(`/api/playlists/${playlistId}/save`, {
        method: isSaved ? 'DELETE' : 'POST'
      });
    } catch (error) {
      console.error(error);
      fetchExplorePlaylists(); // Revert on error
    }
  };

  return (
    <div className="container pb-24 min-h-screen" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(var(--bg-main-rgb), 0.8)', backdropFilter: 'blur(12px)', zIndex: 50, padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0, flex: 1 }}>Explore</h1>
      </div>

      <div style={{ padding: '24px 16px' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Search color="var(--primary-color)" /> Discover Playlists
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <div className="loader"></div>
          </div>
        ) : playlists.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
            <Library size={48} style={{ opacity: 0.5, marginBottom: '16px', margin: '0 auto' }} />
            <p>No public playlists found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
            {playlists.map(playlist => {
              // Note: Ideally the API would return `isSavedByMe` if session is available.
              // For now, we rely on the optimistic update.
              const isSaved = playlist.isSavedByMe;
              
              return (
                <div 
                  key={playlist.id}
                  onClick={() => router.push(`/playlists?id=${playlist.id}`)}
                  style={{ 
                    backgroundColor: 'var(--bg-input)', borderRadius: '12px', padding: '16px', 
                    cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                    border: '1px solid transparent'
                  }}
                  onMouseOver={e => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                  onMouseOut={e => { e.currentTarget.style.backgroundColor = 'var(--bg-input)'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: 'var(--bg-main)', borderRadius: '8px', marginBottom: '12px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {playlist.coverImage ? (
                      <img src={playlist.coverImage} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Library size={48} color="var(--text-secondary)" opacity={0.3} />
                    )}
                    
                    <button
                      onClick={(e) => handlePlayPlaylist(e, playlist)}
                      style={{
                        position: 'absolute', bottom: '8px', right: '8px',
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)', color: '#000',
                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        opacity: 0.9, transition: 'opacity 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.opacity = 1}
                      onMouseOut={e => e.currentTarget.style.opacity = 0.9}
                    >
                      <Play size={20} fill="currentColor" style={{ marginLeft: '4px' }} />
                    </button>
                  </div>
                  
                  <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {playlist.name}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 12px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    By {playlist.user?.name || 'Unknown'}
                  </p>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Users size={14} /> {playlist._count?.savedBy || 0}
                    </span>
                    
                    <button
                      onClick={(e) => handleSavePlaylist(e, playlist.id, isSaved)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: isSaved ? 'var(--primary-color)' : 'var(--text-secondary)' }}
                    >
                      <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
