'use client';

import React, { useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import usePlayerStore from '@/store/usePlayerStore';
import { useRouter } from 'next/navigation';

export default function PlaylistCard3D({ playlist }) {
  const router = useRouter();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayerStore();
  const [isLoading, setIsLoading] = useState(false);
  
  const isThisPlaylistPlaying = currentTrack && currentTrack.playlistId === playlist.id;

  const handlePlayClick = async (e) => {
    e.stopPropagation(); // prevent card click
    if (isThisPlaylistPlaying) {
      togglePlay();
      return;
    }

    if (playlist.songs && playlist.songs.length > 0) {
      playTrack(playlist.songs[0], playlist.songs, playlist.name, playlist.id);
    } else {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/playlists/${playlist.id}/songs`);
        const data = await res.json();
        if (data.songs && data.songs.length > 0) {
          playTrack(data.songs[0], data.songs, playlist.name, playlist.id);
        }
      } catch (err) {
        console.error('Failed to load playlist songs to play', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCardClick = () => {
    router.push(`/playlist/${playlist.id}`);
  };

  // Calculate total duration roughly if songs are present
  let totalHoursStr = "0 min";
  let totalTracks = playlist.totalTracks || playlist.songs?.length || playlist._count?.songs || 0;
  
  if (playlist.totalDurationSeconds > 0) {
    const hours = Math.floor(playlist.totalDurationSeconds / 3600);
    const mins = Math.floor((playlist.totalDurationSeconds % 3600) / 60);
    if (hours > 0) {
      totalHoursStr = `${hours} hr ${mins} min`;
    } else {
      totalHoursStr = `${mins} min`;
    }
  }


  // Cover Art handling
  let coverArt = playlist.coverImage;
  if (!coverArt && playlist.songs && playlist.songs.length > 0) {
      const firstSong = playlist.songs[0].song || playlist.songs[0];
      if (firstSong) {
          const isSpotify = firstSong.id?.includes('spotify:');
          coverArt = firstSong.thumbnail || firstSong.coverArt || firstSong.thumbnails?.[0]?.url || firstSong.thumbnail?.[0]?.url || (!isSpotify && firstSong.id ? `https://i.ytimg.com/vi/${firstSong.id.replace('youtube-', '')}/hqdefault.jpg` : '');
      }
  }

  return (
    <div className="card-3d animate-fade-in-up" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px', backgroundColor: 'var(--bg-input)' }}>
        {coverArt ? (
          <img src={coverArt} alt={playlist.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🎵</div>
        )}
        
        <button 
          className="play-btn-overlay"
          onClick={handlePlayClick}
        >
          {isLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (isThisPlaylistPlaying && isPlaying) ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" style={{ marginLeft: '4px' }} />
          )}
        </button>
      </div>

      <div style={{ padding: '4px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
          {playlist.name}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {totalHoursStr} • {totalTracks} tracks
        </p>
      </div>
    </div>
  );
}
