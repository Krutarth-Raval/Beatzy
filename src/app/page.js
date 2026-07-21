'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Loader2, Plus, Search, BarChart2, Music, User as UserIcon, List, Play } from 'lucide-react';
import usePlayerStore from '@/store/usePlayerStore';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import PlaylistSearchModal from '@/components/PlaylistSearchModal';
import PlaylistCard3D from '@/components/PlaylistCard3D';
import TrackThumbnail from '@/components/TrackThumbnail';
import { useSession } from 'next-auth/react';

function PlaylistsContent() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showPlaylistSearchModal, setShowPlaylistSearchModal] = useState(false);
  const [greeting, setGreeting] = useState('Good Evening');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const { data: session } = useSession();
  const { playTrack } = usePlayerStore();

  const loadPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists');
      if (res.ok) {
        const data = await res.json();
        const formattedPlaylists = [
          ...(data.owned || []).map(p => ({ ...p, isCloud: true, isOwner: true, coverArt: p.coverImage, savedCount: p._count?.savedBy || p.savedCount || 0 })),
          ...(data.saved || []).map(p => ({ ...p, isCloud: true, isOwner: false, coverArt: p.coverImage, savedCount: p._count?.savedBy || p.savedCount || 0 }))
        ];
        setPlaylists(formattedPlaylists);
      }
    } catch (error) {
      console.error('Error fetching playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
    
    
    loadPlaylists();
    loadStats();
  }, []);

  return (
    <div className="content-scroll" style={{ paddingBottom: '120px' }}>
      <div className="page-container">



      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>Your Playlists</h2>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowPlaylistSearchModal(true)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className="hover-scale"
            title="Find Playlists"
          >
            <Search size={20} />
          </button>
          
          <button
            onClick={() => setShowCreatePlaylistModal(true)}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'var(--text-primary)',
              border: 'none',
              color: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}
            className="hover-scale"
            title="Create Playlist"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 size={40} className="animate-spin text-primary" />
        </div>
      ) : playlists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--glass-bg)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>You haven't created any playlists yet.</p>
          <button
            onClick={() => setShowCreatePlaylistModal(true)}
            style={{ padding: '10px 24px', borderRadius: '24px', background: 'var(--primary-color)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}
          >
            Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="playlist-grid mobile-limit-2" style={{ marginBottom: '40px' }}>
          {playlists.map((playlist) => (
            <PlaylistCard3D key={playlist.id} playlist={playlist} />
          ))}
        </div>
      )}

      {/* Stats Section */}
      {session && !loadingStats && stats && (stats.topSongs.length > 0 || stats.topPlaylist) && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={24} color="var(--text-secondary)" /> This Month
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            
            {/* Left Column for Artists and Playlist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Top Artists (bento block 1) */}
              {stats.topArtists && stats.topArtists.length > 0 && (
                <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <UserIcon size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Top Artists</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', height: '100px', paddingTop: '10px' }}>
                    {/* 2nd Place */}
                    {stats.topArtists[1] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={stats.topArtists[1].name}>{stats.topArtists[1].name}</div>
                        <div style={{ width: '100%', height: '50px', backgroundColor: 'rgba(255, 255, 255, 0.15)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', color: 'var(--text-primary)', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>2</div>
                      </div>
                    ) : <div style={{ width: '30%' }}></div>}
                    
                    {/* 1st Place */}
                    {stats.topArtists[0] && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '35%', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={stats.topArtists[0].name}>{stats.topArtists[0].name}</div>
                        <div style={{ width: '100%', height: '70px', background: 'linear-gradient(180deg, var(--primary-color) 0%, rgba(0,0,0,0.2) 100%)', boxShadow: '0 -4px 12px rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8px', color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>1</div>
                      </div>
                    )}
                    
                    {/* 3rd Place */}
                    {stats.topArtists[2] ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%', height: '100%', justifyContent: 'flex-end' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={stats.topArtists[2].name}>{stats.topArtists[2].name}</div>
                        <div style={{ width: '100%', height: '35px', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px 6px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '4px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>3</div>
                      </div>
                    ) : <div style={{ width: '30%' }}></div>}
                  </div>
                </div>
              )}

              {/* Top Playlist (bento block 2) */}
              {stats.topPlaylist && (
                <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                    <List size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Top Playlist</span>
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stats.topPlaylist.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stats.topPlaylist.playCount} plays</div>
                </div>
              )}
            </div>

            {/* Right Column for Songs (bento block 3) */}
            {stats.topSongs.length > 0 && (
              <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <Music size={16} /> <span style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>Top Songs</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {stats.topSongs.map((song, idx) => (
                    <div 
                      key={song.id} 
                      onClick={() => playTrack(song, stats.topSongs, 'Top Songs This Month')}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                      onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.9rem' }}>{idx + 1}</div>
                      <div style={{ width: '40px', height: '40px', flexShrink: 0, position: 'relative' }}>
                        <TrackThumbnail track={song} size={40} borderRadius="6px" showBackground={true} />
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.95rem' }}>{song.title}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: '500' }}>{song.playCount} plays</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreatePlaylistModal && (
        <CreatePlaylistModal 
          onClose={() => setShowCreatePlaylistModal(false)}
          onPlaylistCreated={loadPlaylists}
        />
      )}

      {showPlaylistSearchModal && (
        <PlaylistSearchModal
          onClose={() => setShowPlaylistSearchModal(false)}
          onPlaylistSaved={loadPlaylists}
        />
      )}
      </div>
    </div>
  );
}

export default function PlaylistsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--text-primary)' }} />
      </div>
    }>
      <PlaylistsContent />
    </Suspense>
  );
}
