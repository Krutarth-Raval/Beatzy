"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import usePlayerStore from '@/store/usePlayerStore';
import { getAudioBlob } from '@/lib/db';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ChevronDown, List } from 'lucide-react';
import { FastAverageColor } from 'fast-average-color';
import Image from 'next/image';

export default function AudioPlayer() {
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isBlobLoading, setIsBlobLoading] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [bgColor, setBgColor] = useState('var(--bg-main)');
  const [dragProgress, setDragProgress] = useState(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  const {
    currentTrack,
    queueName,
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

  // Dominant color extraction has been removed to prevent 429 Too Many Requests errors from CDNs.

  // Handle Media Session API (Lock Screen controls)
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artists,
        album: queueName || currentTrack.album || 'Beatzy Playlist',
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
  }, [currentTrack, isPlaying, queueName]);

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
      
      const storeState = usePlayerStore.getState();
      audioRef.current.volume = storeState.volume;
      audioRef.current.muted = storeState.isMuted;
      
      if (storeState.progress > 0 && audioRef.current.currentTime === 0) {
        audioRef.current.currentTime = storeState.progress;
      }
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

  const dragProgressRef = useRef(null);
  const currentDisplayProgress = dragProgress !== null ? dragProgress : progress;

  const updateProgressFromPointer = (rect, clientX, clientY, prevProgress) => {
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    let percentage = angle / (2 * Math.PI);

    if (prevProgress !== null) {
      const prevPercentage = prevProgress / safeDuration;
      // Prevent jumping from near 100% to near 0% when crossing 12 o'clock clockwise
      if (prevPercentage > 0.75 && percentage < 0.25) {
        percentage = 1;
      }
      // Prevent jumping from near 0% to near 100% when crossing 12 o'clock anti-clockwise
      else if (prevPercentage < 0.25 && percentage > 0.75) {
        percentage = 0;
      }
    }

    return Math.max(0, Math.min(1, percentage)) * safeDuration;
  };

  const handlePointerDown = (e) => {
    setIsDraggingProgress(true);
    const rect = e.currentTarget.getBoundingClientRect();
    // On initial touch, allow jumping anywhere by passing null for prevProgress
    const newProgress = updateProgressFromPointer(rect, e.clientX, e.clientY, null);
    dragProgressRef.current = newProgress;
    setDragProgress(newProgress);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (isDraggingProgress) {
      const rect = e.currentTarget.getBoundingClientRect();
      const newProgress = updateProgressFromPointer(rect, e.clientX, e.clientY, dragProgressRef.current);
      dragProgressRef.current = newProgress;
      setDragProgress(newProgress);
    }
  };

  const handlePointerUp = (e) => {
    if (isDraggingProgress) {
      setIsDraggingProgress(false);
      const rect = e.currentTarget.getBoundingClientRect();
      const finalProgress = updateProgressFromPointer(rect, e.clientX, e.clientY, dragProgressRef.current);
      dragProgressRef.current = null;
      setDragProgress(null);
      seek(finalProgress);
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const pathname = usePathname();

  if (!currentTrack) return null; // Don't render anything if no track is queued

  if (isMobileExpanded) {
    return (
      <div className="audio-player-mobile-expanded animate-fade-in" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: bgColor,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        overflowY: 'auto'
      }}>
        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl || undefined}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

        {/* Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '40px' }}>
          <button
            onClick={() => setIsMobileExpanded(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <ChevronDown size={28} />
          </button>
          {/* 
          <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
            {queueName || currentTrack.album || 'Beatzy Playlist'}
          </span>

          <button
            onClick={() => setIsMobileExpanded(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <List size={24} />
          </button> */}
        </div>

        {/* Main Content Flexible */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>

          {/* Track Info (Top) */}
          <div style={{ textAlign: 'center', width: '100%', marginTop: '10px' }}>
            <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.8rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: '8px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.artists}
            </p>
          </div>

          {/* Square Cover Art */}
          <div style={{ width: '100%', maxWidth: '350px', aspectRatio: '1/1', margin: '24px auto', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-input)', boxShadow: '0 15px 35px rgba(0,0,0,0.6)' }}>
            {currentTrack.coverArt ? (
              <img src={currentTrack.coverArt} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🎵</div>
            )}
          </div>

          {/* Flexible Space */}
          <div style={{ flex: 1, minHeight: '5px' }}></div>

          {/* Bottom Group */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingBottom: '50px' }}>

            {/* Linear Progress */}
            <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
              <input
                type="range"
                min={0}
                max={safeDuration}
                step="any"
                value={progress}
                onChange={handleProgressChange}
                className="custom-range"
                style={{
                  width: '100%',
                  background: `linear-gradient(to right, var(--primary-color) ${(progress / safeDuration) * 100}%, var(--bg-hover) ${(progress / safeDuration) * 100}%)`
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
                <span>{formatTime(progress)}</span>
                <span>{formatTime(safeDuration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '320px', marginBottom: '20px' }}>
              <button onClick={toggleShuffle} style={{ background: 'none', border: 'none', color: shuffle ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                <Shuffle size={24} />
              </button>

              <button onClick={playPrevious} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <SkipBack size={36} fill="currentColor" />
              </button>

              <button onClick={togglePlay} disabled={isBlobLoading} style={{
                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: isBlobLoading ? 'not-allowed' : 'pointer',
                opacity: isBlobLoading ? 0.5 : 1, boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
              }}>
                {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" style={{ marginLeft: '4px' }} />}
              </button>

              <button onClick={playNext} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <SkipForward size={36} fill="currentColor" />
              </button>

              <button onClick={toggleRepeat} style={{ background: 'none', border: 'none', color: repeat !== 'off' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                {repeat === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
              </button>
            </div>
          </div>
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
        backgroundColor: 'var(--glass-bg)',
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
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', }}>
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
            width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
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
            className="custom-range"
            style={{
              flex: 1,
              cursor: 'pointer',
              background: `linear-gradient(to right, var(--primary-color) ${(progress / safeDuration) * 100}%, var(--bg-hover) ${(progress / safeDuration) * 100}%)`
            }}
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
