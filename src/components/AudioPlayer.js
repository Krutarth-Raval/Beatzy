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
  const loadedTrackIdRef = useRef(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [bgColor, setBgColor] = useState('var(--bg-main)');
  const [dragProgress, setDragProgress] = useState(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);

  const {
    currentTrack,
    queue,
    queueIndex,
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
    playTrack,
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
    let isActive = true;

    const loadAudio = async () => {
      if (!currentTrack) {
        setAudioUrl((prevUrl) => {
          if (prevUrl && prevUrl.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
          return null;
        });
        return;
      }

      setIsBlobLoading(true);

      try {
        // If it's an offline track from our DB
        if (currentTrack.playlistId) {
          const blob = await getAudioBlob(currentTrack.id);
          if (blob && isActive) {
            const newUrl = URL.createObjectURL(blob);
            setAudioUrl((prevUrl) => {
              if (prevUrl && prevUrl.startsWith('blob:')) {
                URL.revokeObjectURL(prevUrl);
              }
              return newUrl;
            });
          } else if (!blob) {
            console.error("Audio blob not found for track", currentTrack.id);
            if (isActive) playNext(); // Skip broken tracks
          }
        } else if (currentTrack.audioUrl && isActive) {
          // Fallback if we stream directly in the future
          setAudioUrl((prevUrl) => {
            if (prevUrl && prevUrl.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
            return currentTrack.audioUrl;
          });
        }
      } catch (err) {
        console.error("Failed to load audio", err);
      } finally {
        if (isActive) setIsBlobLoading(false);
      }
    };

    loadAudio();

    return () => {
      isActive = false;
    };
  }, [currentTrack]);

  // Dominant color extraction has been removed to prevent 429 Too Many Requests errors from CDNs.

  // Dynamic upgrade of old low-res thumbnails
  const displayCover = currentTrack?.coverArt
    ? currentTrack.coverArt.replace(/=w\d+-h\d+.*/, '=w1200-h1200-l90-rj').replace(/\/(default|mqdefault|hqdefault|sddefault)(\.[a-z]+)$/i, '/maxresdefault$2')
    : null;

  // Handle Media Session API (Lock Screen controls)
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artists,
        album: queueName || currentTrack.album || 'Beatzy Playlist',
        artwork: [
          { src: displayCover || '/placeholder-cover.jpg', sizes: '512x512', type: 'image/jpeg' }
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
    if (audioRef.current && loadedTrackIdRef.current === currentTrack?.id) {
      setProgress(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      loadedTrackIdRef.current = currentTrack?.id;
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

  const audioTag = (
    <audio
      ref={audioRef}
      src={audioUrl || undefined}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
    />
  );

  if (isMobileExpanded) {
    return (
      <>
        {audioTag}
        <div className="audio-player-mobile-expanded animate-fade-in" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px', // Reduced top padding to move elements up
        overflowY: 'hidden',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        width: '100%',
        backgroundColor: '#050505', // solid base so nothing bleeds through
      }}>
        {/* Blurred Background Overlay from Cover Art */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: displayCover ? `url(${displayCover})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) brightness(0.5)',
          opacity: 1, // Full opacity on top of black base
          zIndex: -1,
        }} />
        {/* Gradient fade to ensure text readability */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, rgba(20,20,20,0.1) 0%, rgba(20,20,20,0.9) 100%)',
          zIndex: -1,
        }} />

        {/* Top Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '40px' }}>
          <button
            onClick={() => setIsMobileExpanded(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            <ChevronDown size={28} />
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.5px', textTransform: 'uppercase', opacity: 0.9 }}>
            {queueName || currentTrack.album || 'Beatzy Playlist'}
          </span>

          <button
            onClick={() => setShowQueueModal(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}
          >
            <List size={24} />
          </button>
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
            {displayCover ? (
              <img
                src={displayCover}
                alt="Cover"
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', WebkitUserDrag: 'none' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🎵</div>
            )}
          </div>

          {/* Flexible Space */}
          <div style={{ flex: 1, minHeight: '5px' }}></div>

          {/* Bottom Group */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingBottom: '10px' }}>

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

        {/* Queue Modal Overlay */}
        {showQueueModal && (
          <div className="animate-fade-in-up" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'var(--bg-main)', zIndex: 3000, display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Up Next</h3>
              <button onClick={() => setShowQueueModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}>
                <ChevronDown size={24} />
              </button>
            </div>
            <div className="content-scroll" style={{ flex: 1, padding: '16px', paddingBottom: '40px' }}>
              {(() => {
                // Slice the queue to only show current and upcoming songs
                let displayQueue = queue.slice(queueIndex);
                
                // If we are at the end and repeat is on, append the beginning so the queue always looks populated
                if (repeat === 'all' && displayQueue.length < queue.length) {
                  displayQueue = [...displayQueue, ...queue.slice(0, queueIndex)];
                }

                return displayQueue.map((track, i) => {
                  // The currently playing track is now always the first item in the displayQueue
                  const isPlayingQueue = i === 0;
                  return (
                    <div key={`${track.id}-${i}`} onClick={() => playTrack(track, queue, queueName)} style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      backgroundColor: isPlayingQueue ? 'rgba(255,255,255,0.1)' : 'transparent',
                      borderRadius: '8px', cursor: 'pointer'
                    }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-input)' }}>
                        {(track.coverArt || track.thumbnail) && <img src={(track.coverArt || track.thumbnail).replace(/=w\d+-h\d+.*/, '=w200-h200-l90-rj').replace(/\/(default|mqdefault|hqdefault|sddefault)(\.[a-z]+)$/i, '/maxresdefault$2')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="cover" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: '600', color: isPlayingQueue ? 'var(--primary-color)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artists}</p>
                      </div>
                      {isPlayingQueue && <div className="equalizer-anim" style={{ color: 'var(--primary-color)' }}>...</div>}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>
      </>
    );
  }

  return (
    <>
      {audioTag}
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
        display: pathname === '/playlists' ? 'block' : 'none',
        zIndex: 1000,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      }}>

      {/* ── MOBILE MINI BAR ──────────────────────────────────── */}
      <div className="mobile-mini-bar">
        {/* Thumbnail */}
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-input)', marginRight: '16px', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          {displayCover ? (
            <img
              src={displayCover}
              alt="Cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', WebkitUserDrag: 'none' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music size={24} color="var(--text-secondary)" />
            </div>
          )}
        </div>

        {/* Track Info — stacked title + artist */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.title}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack.artists}
          </p>
        </div>

        {/* Controls: Prev | Play/Pause | Next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); playPrevious(); }}
            style={{ color: 'var(--text-primary)', padding: '4px' }}
          >
            <SkipBack size={22} fill="currentColor" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            disabled={isBlobLoading}
            style={{
              width: '42px', height: '42px', borderRadius: '50%',
              backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isBlobLoading ? 0.5 : 1,
            }}
          >
            {isPlaying
              ? <Pause size={20} fill="currentColor" />
              : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); playNext(); }}
            style={{ color: 'var(--text-primary)', padding: '4px' }}
          >
            <SkipForward size={22} fill="currentColor" />
          </button>
        </div>

        {/* Non-interactive progress strip at the very bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', backgroundColor: 'var(--border-color)' }}>
          <div style={{
            width: `${Math.min((progress / safeDuration) * 100, 100)}%`,
            height: '100%',
            backgroundColor: 'var(--primary-color)',
            transition: 'width 0.5s linear',
          }} />
        </div>
      </div>

      {/* ── DESKTOP PLAYER BAR ───────────────────────────────── */}
      <div className="desktop-player-bar">
        {/* 1. Track Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '50px', aspectRatio: '1', backgroundColor: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
            {displayCover ? (
              <img
                src={displayCover}
                alt="Cover"
                style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', WebkitUserDrag: 'none' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={24} color="var(--text-secondary)" />
              </div>
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
            <button onClick={(e) => { e.stopPropagation(); toggleShuffle(); }} style={{ color: shuffle ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
              <Shuffle size={18} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); playPrevious(); }} style={{ color: 'var(--text-primary)' }}>
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} disabled={isBlobLoading} style={{
              width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isBlobLoading ? 0.5 : 1,
            }}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); playNext(); }} style={{ color: 'var(--text-primary)' }}>
              <SkipForward size={24} fill="currentColor" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleRepeat(); }} style={{ color: repeat !== 'off' ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
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

        {/* 3. Volume */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} style={{ color: 'var(--text-secondary)' }}>
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
    </div>
    </>
  );
}
