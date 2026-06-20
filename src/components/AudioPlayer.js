"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import usePlayerStore from '@/store/usePlayerStore';
import { getAudioBlob } from '@/lib/db';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ChevronDown, List, Loader2, Music, Sparkles, Plus, Check } from 'lucide-react';
import { FastAverageColor } from 'fast-average-color';
import Image from 'next/image';
import PlaylistSaveModal from './PlaylistSaveModal';
import { removeTrack, addTrackToPlaylist } from '@/lib/db';

export default function AudioPlayer() {
  const audioRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isBlobLoading, setIsBlobLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const loadedTrackIdRef = useRef(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [bgColor, setBgColor] = useState('var(--bg-main)');

  // Removed dynamic CSS injection, now natively in globals.css
  const [dragProgress, setDragProgress] = useState(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const saveActionRef = useRef(false);

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
    isFetchingRelated,
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

      // Clear previous audio URL to stop old song immediately
      setAudioUrl((prevUrl) => {
        if (prevUrl && prevUrl.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
        return null;
      });
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
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
        } else if (isActive) {
          // Stream directly from our Next.js backend proxy to bypass Piped CORS and IP binding errors
          setAudioUrl((prevUrl) => {
            if (prevUrl && prevUrl.startsWith('blob:')) URL.revokeObjectURL(prevUrl);
            return `/api/download-direct?id=${currentTrack.id}`;
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
  }, [currentTrack?.id]);

  // Check if saved
  useEffect(() => {
    const saved = !!currentTrack?.playlistId;
    setIsSaved(saved);
    saveActionRef.current = saved;
  }, [currentTrack]);

  const handleToggleSave = async (e) => {
    if (e) e.stopPropagation();
    const playlistId = currentTrack?.playlistId || queue.find(t => t.playlistId)?.playlistId;
    
    if (!playlistId) {
      setShowSaveModal(true);
      return;
    }

    const willSave = !isSaved;
    setIsSaved(willSave);
    saveActionRef.current = willSave;

    if (willSave) {
      try {
        const trackIdBeingSaved = currentTrack.id;
        const res = await fetch(`/api/download-direct?id=${currentTrack.id}`);
        if (!res.ok) throw new Error("Failed to download audio data");
        const contentType = res.headers.get('content-type') || 'audio/mp4';
        const blob = await res.blob();

        // Check if user hasn't toggled off while downloading
        if (saveActionRef.current && usePlayerStore.getState().currentTrack?.id === trackIdBeingSaved) {
          await addTrackToPlaylist(playlistId, currentTrack, blob);
          window.dispatchEvent(new CustomEvent('playlist-updated'));
          usePlayerStore.setState(state => {
            const newQueue = [...state.queue];
            const idx = newQueue.findIndex(t => t.id === currentTrack.id);
            if (idx !== -1) newQueue[idx] = { ...newQueue[idx], playlistId };
            return {
              queue: newQueue,
              currentTrack: state.currentTrack?.id === currentTrack.id ? { ...state.currentTrack, playlistId } : state.currentTrack
            };
          });
        }
      } catch (err) {
        console.error("Save failed", err);
        if (saveActionRef.current) setIsSaved(false);
      }
    } else {
      try {
        await removeTrack(currentTrack.id);
        window.dispatchEvent(new CustomEvent('playlist-updated'));
        usePlayerStore.setState(state => {
          const newQueue = [...state.queue];
          const idx = newQueue.findIndex(t => t.id === currentTrack.id);
          if (idx !== -1) {
            const updated = { ...newQueue[idx] };
            delete updated.playlistId;
            newQueue[idx] = updated;
          }
          const current = state.currentTrack;
          if (current?.id === currentTrack.id) {
            const updatedCurr = { ...current };
            delete updatedCurr.playlistId;
            return { queue: newQueue, currentTrack: updatedCurr };
          }
          return { queue: newQueue };
        });
      } catch (err) {
        console.error("Remove failed", err);
      }
    }
  };

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
  }, [currentTrack, isPlaying, displayCover, queueName]);

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
    setDragProgress(newTime);
    setIsDraggingProgress(true);
  };

  const handleProgressRelease = (e) => {
    const newTime = parseFloat(e.target.value);
    setIsDraggingProgress(false);
    setDragProgress(null);
    seek(newTime);
  };

  const getSafeDuration = () => {
    if (duration && duration !== Infinity && !isNaN(duration)) return duration;
    if (currentTrack && currentTrack.duration != null) {
      if (typeof currentTrack.duration === 'number') {
        return currentTrack.duration > 0 ? currentTrack.duration : 100;
      }
      if (typeof currentTrack.duration === 'string') {
        const parts = currentTrack.duration.split(':').reverse();
        let totalSeconds = 0;
        totalSeconds += (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0) * 3600;
        return totalSeconds > 0 ? totalSeconds : 100;
      }
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
      if (prevPercentage > 0.75 && percentage < 0.25) {
        percentage = 1;
      }
      else if (prevPercentage < 0.25 && percentage > 0.75) {
        percentage = 0;
      }
    }

    return Math.max(0, Math.min(1, percentage)) * safeDuration;
  };

  const handlePointerDown = (e) => {
    setIsDraggingProgress(true);
    const rect = e.currentTarget.getBoundingClientRect();
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

  if (!currentTrack) return null;

  const audioTag = (
    <audio
      ref={audioRef}
      src={audioUrl || undefined}
      onTimeUpdate={handleTimeUpdate}
      onLoadedMetadata={handleLoadedMetadata}
      onEnded={handleEnded}
      onWaiting={() => setIsBuffering(true)}
      onPlaying={() => setIsBuffering(false)}
      onCanPlay={() => setIsBuffering(false)}
      onLoadStart={() => setIsBuffering(true)}
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
        padding: '24px',
        overflowY: 'hidden',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        width: '100%',
        backgroundColor: '#050505',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: displayCover ? `url(${displayCover})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) brightness(0.5)',
          opacity: 1,
          zIndex: -1,
        }} />
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(to bottom, rgba(20,20,20,0.1) 0%, rgba(20,20,20,0.9) 100%)',
          zIndex: -1,
        }} />

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

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>

          <div style={{ textAlign: 'center', width: '100%', marginTop: '10px' }}>
            <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.8rem', fontWeight: '800', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: '8px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.artists}
            </p>
          </div>

          <div style={{ width: '100%', maxWidth: '350px', aspectRatio: '1/1', margin: '24px auto', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-input)', boxShadow: '0 15px 35px rgba(0,0,0,0.6)' }}>
            {displayCover ? (
              <img
                src={displayCover}
                alt="Cover"
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', WebkitUserDrag: 'none' }}
                onError={(e) => {
                  if (!e.target.dataset.error) {
                    e.target.dataset.error = true;
                    e.target.src = `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`;
                  }
                }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem' }}>🎵</div>
            )}
          </div>

          <div style={{ flex: 1, minHeight: '5px' }}></div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingBottom: '10px' }}>

            <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px', position: 'relative' }}>
              <div style={{ position: 'absolute', right: 0, top: '-45px' }}>
                <button onClick={handleToggleSave} style={{
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--text-primary)',
                  border: 'none', cursor: 'pointer', transition: 'transform 0.2s',
                  transform: saveActionRef.current ? 'scale(1.1)' : 'scale(1)'
                }}>
                  {isSaved ? <Check size={18} color="var(--bg-main)" /> : <Plus size={18} color="var(--bg-main)" />}
                </button>
              </div>

              <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                <input
                  type="range"
                  min={0}
                  max={safeDuration}
                  step="any"
                  value={isDraggingProgress && dragProgress !== null ? dragProgress : progress}
                  onChange={handleProgressChange}
                  onMouseUp={handleProgressRelease}
                  onTouchEnd={handleProgressRelease}
                  onKeyUp={handleProgressRelease}
                  className="custom-range"
                  style={{
                    width: '100%',
                    background: `linear-gradient(to right, var(--primary-color) ${((isDraggingProgress && dragProgress !== null ? dragProgress : progress) / safeDuration) * 100}%, var(--bg-hover) ${((isDraggingProgress && dragProgress !== null ? dragProgress : progress) / safeDuration) * 100}%)`
                  }}
                />
                {(isBlobLoading || isBuffering) && <div className="loading-overlay"></div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '500' }}>
                <span>{formatTime(isDraggingProgress && dragProgress !== null ? dragProgress : progress)}</span>
                <span>{formatTime(safeDuration)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '320px', marginBottom: '20px' }}>
              <button onClick={toggleShuffle} style={{ background: 'none', border: 'none', color: shuffle === 'smart' ? 'var(--primary-color)' : shuffle === 'on' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                <div style={{ position: 'relative' }}>
                  <Shuffle size={24} />
                  {shuffle === 'smart' && <Sparkles size={12} style={{ position: 'absolute', top: -6, right: -6, color: 'var(--primary-color)' }} />}
                </div>
              </button>

              <button onClick={playPrevious} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <SkipBack size={36} fill="currentColor" />
              </button>

              <button onClick={togglePlay} disabled={isBlobLoading || isBuffering} style={{
                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: (isBlobLoading || isBuffering) ? 'not-allowed' : 'pointer',
                opacity: (isBlobLoading || isBuffering) ? 0.5 : 1, boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
              }}>
                {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" style={{ marginLeft: '4px' }} />}
              </button>

              <button onClick={playNext} disabled={isFetchingRelated} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: isFetchingRelated ? 'not-allowed' : 'pointer' }}>
                {isFetchingRelated ? <Loader2 size={36} className="animate-spin" color="var(--primary-color)" /> : <SkipForward size={36} fill="currentColor" />}
              </button>

              <button onClick={toggleRepeat} style={{ background: 'none', border: 'none', color: repeat !== 'off' ? 'var(--primary-color)' : 'var(--text-secondary)', cursor: 'pointer' }}>
                {repeat === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
              </button>
            </div>
          </div>
        </div>

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
                let displayQueue = queue.slice(queueIndex);
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
                      <div style={{ width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-input)', position: 'relative' }}>
                        {(track.coverArt || track.thumbnail) && (() => {
                          const rawThumb = track.coverArt || track.thumbnail;
                          const cover = rawThumb.includes('i.ytimg.com') ? rawThumb.split('?')[0] : rawThumb.replace(/=w\d+-h\d+.*/, '=w200-h200-l90-rj');
                          return (
                            <>
                              <div className="skeleton-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transition: 'opacity 0.3s' }}></div>
                              <img src={cover} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1, opacity: 0, transition: 'opacity 0.3s ease' }} alt="cover" onLoad={(e) => { e.currentTarget.style.opacity = 1; if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.style.opacity = 0; }} onError={(e) => { if (!e.target.dataset.error) { e.target.dataset.error = true; e.target.src = `https://i.ytimg.com/vi/${track.id}/mqdefault.jpg`; } else { if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.style.opacity = 0; } }} />
                            </>
                          );
                        })()}
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
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-input)', marginRight: '16px', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', position: 'relative' }}>
          {displayCover ? (
            <>
              <div className="skeleton-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transition: 'opacity 0.3s' }}></div>
              <img
                src={displayCover}
                alt="Cover"
                style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', WebkitUserDrag: 'none', position: 'relative', zIndex: 1, opacity: 0, transition: 'opacity 0.3s ease' }}
                onLoad={(e) => { e.currentTarget.style.opacity = 1; if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.style.opacity = 0; }}
                onError={(e) => { if (!e.target.dataset.error) { e.target.dataset.error = true; e.target.src = `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`; } else { if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.style.opacity = 0; } }}
              />
            </>
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
            disabled={isBlobLoading || isBuffering}
            style={{
              width: '42px', height: '42px', borderRadius: '50%',
              backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: (isBlobLoading || isBuffering) ? 0.5 : 1,
            }}
          >
            {isPlaying
              ? <Pause size={20} fill="currentColor" />
              : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); if (!isFetchingRelated) playNext(); }}
            disabled={isFetchingRelated}
            style={{ color: 'var(--text-primary)', padding: '4px', cursor: isFetchingRelated ? 'not-allowed' : 'pointer' }}
          >
            {isFetchingRelated ? <Loader2 size={22} className="animate-spin" color="var(--primary-color)" /> : <SkipForward size={22} fill="currentColor" />}
          </button>
        </div>

        {/* Non-interactive progress strip at the very bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', backgroundColor: 'var(--border-color)' }}>
          <div 
            style={{
              width: `${Math.min((progress / safeDuration) * 100, 100)}%`,
              height: '100%',
              backgroundColor: 'var(--primary-color)',
              transition: 'width 0.5s linear',
          }} />
          {(isBlobLoading || isBuffering) && <div className="loading-overlay" style={{ height: '100%', top: 0, transform: 'none', background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)' }}></div>}
        </div>
      </div>

      {/* ── DESKTOP PLAYER BAR ───────────────────────────────── */}
      <div className="desktop-player-bar">
        {/* 1. Track Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <div style={{ width: '50px', aspectRatio: '1', backgroundColor: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
            {displayCover ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <div className="skeleton-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transition: 'opacity 0.3s' }}></div>
                <img
                  src={displayCover}
                  alt="Cover"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'relative', zIndex: 1, opacity: 0, transition: 'opacity 0.3s ease' }}
                  onLoad={(e) => { e.currentTarget.style.opacity = 1; if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.style.opacity = 0; }}
                  onError={(e) => { if (!e.target.dataset.error) { e.target.dataset.error = true; e.target.src = `https://i.ytimg.com/vi/${currentTrack.id}/hqdefault.jpg`; } else { if (e.currentTarget.previousSibling) e.currentTarget.previousSibling.style.opacity = 0; } }}
                />
              </div>
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
          <button onClick={handleToggleSave} style={{ background: 'none', border: 'none', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isSaved ? <Check size={24} color="var(--primary-color)" /> : <Plus size={24} color="var(--text-secondary)" />}
          </button>
        </div>

        {/* 2. Controls & Progress */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={(e) => { e.stopPropagation(); toggleShuffle(); }} style={{ background: 'none', border: 'none', color: shuffle === 'smart' ? 'var(--primary-color)' : shuffle === 'on' ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
              <div style={{ position: 'relative' }}>
                <Shuffle size={20} fill={shuffle !== 'off' ? 'currentColor' : 'none'} />
                {shuffle === 'smart' && <Sparkles size={10} style={{ position: 'absolute', top: -4, right: -4, color: 'var(--primary-color)' }} />}
              </div>
            </button>
            <button onClick={(e) => { e.stopPropagation(); playPrevious(); }} style={{ color: 'var(--text-primary)' }}>
              <SkipBack size={24} fill="currentColor" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} disabled={isBlobLoading || isBuffering} style={{
              width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: (isBlobLoading || isBuffering) ? 0.5 : 1,
            }}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); if (!isFetchingRelated) playNext(); }} disabled={isFetchingRelated} style={{ color: 'var(--text-primary)', cursor: isFetchingRelated ? 'not-allowed' : 'pointer', background: 'none', border: 'none', padding: 0 }}>
              {isFetchingRelated ? <Loader2 size={24} className="animate-spin" color="var(--primary-color)" /> : <SkipForward size={24} fill="currentColor" />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleRepeat(); }} style={{ color: repeat !== 'off' ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
              {repeat === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '500px', gap: '10px' }}>
            <span className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', minWidth: '40px', textAlign: 'right' }}>{formatTime(isDraggingProgress && dragProgress !== null ? dragProgress : progress)}</span>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="range"
                min={0}
                max={safeDuration}
                step="any"
                value={isDraggingProgress && dragProgress !== null ? dragProgress : progress}
                onClick={(e) => e.stopPropagation()}
                onChange={handleProgressChange}
                onMouseUp={handleProgressRelease}
                onTouchEnd={handleProgressRelease}
                onKeyUp={handleProgressRelease}
                className="custom-range"
                style={{
                  width: '100%',
                  cursor: 'pointer',
                  background: `linear-gradient(to right, var(--primary-color) ${((isDraggingProgress && dragProgress !== null ? dragProgress : progress) / safeDuration) * 100}%, var(--bg-hover) ${((isDraggingProgress && dragProgress !== null ? dragProgress : progress) / safeDuration) * 100}%)`
                }}
              />
              {(isBlobLoading || isBuffering) && <div className="loading-overlay"></div>}
            </div>
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
