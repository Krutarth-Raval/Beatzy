'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { Loader2, Plus, Search } from 'lucide-react';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import PlaylistSearchModal from '@/components/PlaylistSearchModal';
import PlaylistCard3D from '@/components/PlaylistCard3D';
import { useSession } from 'next-auth/react';

function PlaylistsContent() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showPlaylistSearchModal, setShowPlaylistSearchModal] = useState(false);

  const { data: session } = useSession();

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

  useEffect(() => {
    loadPlaylists();
  }, []);

  return (
    <div className="content-scroll" style={{ padding: '24px', paddingBottom: '120px' }}>
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
        <div className="playlist-grid">
          {playlists.map((playlist) => (
            <PlaylistCard3D key={playlist.id} playlist={playlist} />
          ))}
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
