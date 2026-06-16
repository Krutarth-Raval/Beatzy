"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import usePlayerStore from '@/store/usePlayerStore';
import { getAudioBlob } from '@/lib/db';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ChevronDown } from 'lucide-react';
import Image from 'next/image';

export default function AudioPlayer() {
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isBlobLoading, setIsBlobLoading] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    setAudioRef,
    togglePlay,
    playNext,
    playPrevious,
    setProgress,
    setDuration,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat
  } = usePlayerStore();

  // Initialize audio ref
  useEffect(() => {
    if (audioRef.current) {
      setAudioRef(audioRef.current);
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [setAudioRef, currentTrack]);

  // Load track audio source
  useEffect(() => {
    let objectUrl = null;

    const loadAudio = async () => {
      if (!currentTrack) {
        setAudioUrl(null);
        return;
      }

      setIsBlobLoading(true);

      try {
        // If it's an offline track from our DB
        if (currentTrack.playlistId) {
          const blob = await getAudioBlob(currentTrack.id);
          if (blob) {
            objectUrl = URL.createObjectURL(blob);
            setAudioUrl(objectUrl);
          } else {
            console.error("Audio blob not found for track", currentTrack.id);
            playNext(); // Skip broken tracks
          }
        } else if (currentTrack.audioUrl) {
          // Fallback if we stream directly in the future
          setAudioUrl(currentTrack.audioUrl);
        }
      } catch (err) {
        console.error("Failed to load audio", err);
      } finally {
        setIsBlobLoading(false);
      }
    };

    loadAudio();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [currentTrack]);

  // Handle Media Session API (Lock Screen controls)
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artists,
        album: currentTrack.album || 'Beatzy Playlist',
        artwork: [
          { src: currentTrack.coverArt || '/placeholder-cover.jpg', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) togglePlay();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) togglePlay();
      });
      navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in audioRef.current) {
          audioRef.current.fastSeek(details.seekTime);
        } else {
          seek(details.seekTime);
        }
      });
    }
  }, [currentTrack, isPlaying]);

  // Autoplay when url loads or play state changes
  useEffect(() => {
    if (audioUrl && isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Autoplay prevented:", e));
    } else if (audioRef.current && !isPlaying) {
      audioRef.current.pause();
    }
  }, [audioUrl, isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  };

  const formatTime = (timeInSeconds) => {
    if (!timeInSeconds || isNaN(timeInSeconds)) return "0:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
  };

  const getSafeDuration = () => {
    if (duration && duration !== Infinity && !isNaN(duration)) return duration;
    if (currentTrack && currentTrack.duration) {
      const parts = currentTrack.duration.split(':').reverse();
      let totalSeconds = 0;
      totalSeconds += (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0) * 3600;
      return totalSeconds > 0 ? totalSeconds : 100;
    }
    return 100;
  };
  const safeDuration = getSafeDuration();

  const pathname = usePathname();

  if (!currentTrack) return null; // Don't render anything if no track is queued

  if (isMobileExpanded) {
    return (
      <div className="audio-player-mobile-expanded" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-main)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        <button
          onClick={() => setIsMobileExpanded(false)}
          style={{ position: 'absolute', top: '24px', left: '24px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          <ChevronDown size={32} />
        </button>

        {/* Big Track Info */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', marginBottom: '32px', width: '100%', maxWidth: '400px' }}>
          <div style={{ width: '250px', height: '250px', borderRadius: '16px', overflow: 'hidden', backgroundColor: 'var(--bg-input)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            {currentTrack.coverArt ? (
              <img src={currentTrack.coverArt} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>🎵</div>
            )}
          </div>
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.5rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.artists}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '400px', gap: '8px', marginBottom: '32px' }}>
          <input
            type="range"
            min={0}
            max={safeDuration}
            step="any"
            value={progress}
            onChange={handleProgressChange}
            style={{ width: '100%', height: '6px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
            <span>{formatTime(progress)}</span>
            <span>{formatTime(safeDuration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '300px' }}>
          <button onClick={toggleShuffle} style={{ background: 'none', border: 'none', color: shuffle ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}>
            <Shuffle size={24} />
          </button>

          <button onClick={playPrevious} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <SkipBack size={32} fill="currentColor" />
          </button>

          <button onClick={togglePlay} disabled={isBlobLoading} style={{
            width: '72px', height: '72px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: isBlobLoading ? 'not-allowed' : 'pointer',
            opacity: isBlobLoading ? 0.5 : 1
          }}>
            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" style={{ marginLeft: '4px' }} />}
          </button>

          <button onClick={playNext} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <SkipForward size={32} fill="currentColor" />
          </button>

          <button onClick={toggleRepeat} style={{ background: 'none', border: 'none', color: repeat !== 'off' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}>
            {repeat === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="audio-player-bar-clickable"
      onClick={() => { if (window.innerWidth <= 768) setIsMobileExpanded(true); }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border-color)',
        padding: '12px 24px',
        display: pathname === '/playlists' ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1000,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
        gap: '16px',
      }}>
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* 1. Track Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <div className="hide-on-mobile" style={{ width: '50px', height: '50px', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-input)', flexShrink: 0 }}>
          {currentTrack.coverArt ? (
            <img src={currentTrack.coverArt} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.title}
          </h4>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.artists}
          </span>
        </div>
      </div>

      {/* 2. Controls & Progress */}
      <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={(e) => { e.stopPropagation(); toggleShuffle(); }} style={{ background: 'none', border: 'none', color: shuffle ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}>
            <Shuffle size={18} />
          </button>

          <button onClick={(e) => { e.stopPropagation(); playPrevious(); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <SkipBack size={24} fill="currentColor" />
          </button>

          <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} disabled={isBlobLoading} style={{
            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: '#000',
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: isBlobLoading ? 'not-allowed' : 'pointer',
            opacity: isBlobLoading ? 0.5 : 1
          }}>
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>

          <button onClick={(e) => { e.stopPropagation(); playNext(); }} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
            <SkipForward size={24} fill="currentColor" />
          </button>

          <button onClick={(e) => { e.stopPropagation(); toggleRepeat(); }} style={{ background: 'none', border: 'none', color: repeat !== 'off' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}>
            {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '500px', gap: '10px' }}>
          <span className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', minWidth: '40px', textAlign: 'right' }}>{formatTime(progress)}</span>
          <input
            type="range"
            min={0}
            max={safeDuration}
            step="any"
            value={progress}
            onClick={(e) => e.stopPropagation()}
            onChange={handleProgressChange}
            style={{ flex: 1, height: '4px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
          />
          <span className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', minWidth: '40px' }}>{formatTime(safeDuration)}</span>
        </div>
      </div>

      {/* 3. Volume & Extra Actions */}
      <div className="hide-on-mobile" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          style={{ width: '80px', height: '4px', accentColor: 'var(--text-secondary)', cursor: 'pointer' }}
        />
      </div>
    </div>
  );
}
