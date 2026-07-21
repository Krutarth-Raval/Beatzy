"use client";

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import usePlayerStore from '@/store/usePlayerStore';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, Volume2, VolumeX, ChevronDown, List, Loader2, Music, Sparkles, Plus, Check } from 'lucide-react';
import { FastAverageColor } from 'fast-average-color';
import Image from 'next/image';
import PlaylistSaveModal from './PlaylistSaveModal';
import TrackThumbnail from './TrackThumbnail';
import YouTubePlayer from 'youtube-player';

const ScrollingText = ({ text, style, className }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const textWidth = textRef.current.getBoundingClientRect().width;
        const containerWidth = containerRef.current.clientWidth;
        if (textWidth > 0 && containerWidth > 0) {
          setIsOverflowing(textWidth > containerWidth);
        }
      }
    };
    checkOverflow();
    const timeout = setTimeout(checkOverflow, 500);
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  return (
    <div ref={containerRef} className={`${isOverflowing ? 'scrolling-text-mask' : ''} ${className || ''}`} style={{ ...style, overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
      <div className={isOverflowing ? 'animate-marquee' : ''} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-block', paddingRight: isOverflowing ? '3rem' : '0' }}>
          <span ref={textRef}>{text}</span>
        </span>
        {isOverflowing && <span style={{ display: 'inline-block', paddingRight: '3rem' }}>{text}</span>}
      </div>
    </div>
  );
};

export default function AudioPlayer() {
  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const progressIntervalRef = useRef(null);
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
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [lyrics, setLyrics] = useState('');
  const [syncedLyrics, setSyncedLyrics] = useState(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [isLyricsDrawerExpanded, setIsLyricsDrawerExpanded] = useState(false);
  const [isUserScrollingLyrics, setIsUserScrollingLyrics] = useState(false);
  const lyricsContainerRefMobile = useRef(null);
  const lyricsContainerRefDesktop = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const [isSaved, setIsSaved] = useState(false);
  const saveActionRef = useRef(false);
  const lyricsTimerRef = useRef(null);

  const {
    currentTrack,
    queue,
    queueIndex,
    queueName,
    queuePlaylistId,
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
    toggleRepeat,
    updateCurrentTrack
  } = usePlayerStore();

  // Create YouTube Player and Proxy
  useEffect(() => {
    if (!ytPlayerRef.current && document.getElementById('youtube-player-container')) {
      ytPlayerRef.current = YouTubePlayer('youtube-player-container', {
        playerVars: { autoplay: 1, controls: 0, playsinline: 1, origin: window.location.origin }
      });
      
      audioRef.current = {
        play: async () => { await ytPlayerRef.current.playVideo(); },
        pause: () => { ytPlayerRef.current.pauseVideo(); },
        set currentTime(time) { ytPlayerRef.current.seekTo(time, true); setProgress(time); },
        get currentTime() { return usePlayerStore.getState().progress; },
        set volume(vol) { ytPlayerRef.current.setVolume(vol * 100); },
        get volume() { return usePlayerStore.getState().volume; },
        set muted(m) { if(m) ytPlayerRef.current.mute(); else ytPlayerRef.current.unMute(); },
        get muted() { return usePlayerStore.getState().isMuted; },
        get duration() { return usePlayerStore.getState().duration; }
      };
      
      setAudioRef(audioRef.current);

      ytPlayerRef.current.on('stateChange', (event) => {
        if (event.data === 1) { // Playing
          setIsBuffering(false);
          setIsBlobLoading(false);
          
          ytPlayerRef.current.getDuration().then(dur => {
            if (dur && dur > 0) {
               setDuration(dur);
            }
          });
          
          const state = usePlayerStore.getState();
          ytPlayerRef.current.setVolume(state.volume * 100);
          if (state.isMuted) ytPlayerRef.current.mute(); else ytPlayerRef.current.unMute();

          if (!progressIntervalRef.current) {
            progressIntervalRef.current = setInterval(async () => {
              if (ytPlayerRef.current) {
                const time = await ytPlayerRef.current.getCurrentTime();
                setProgress(time);
              }
            }, 500);
          }
        } else if (event.data === 0) { // Ended
          window.dispatchEvent(new CustomEvent('yt-player-ended'));
        } else if (event.data === 3) { // Buffering
          setIsBuffering(true);
        }
      });
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [setAudioRef, setDuration, setProgress, currentTrack?.id]);

  // Load track audio source
  useEffect(() => {
    let isActive = true;

    const loadAudio = async () => {
      if (!currentTrack) {
        if (ytPlayerRef.current) ytPlayerRef.current.stopVideo();
        return;
      }

      setIsBlobLoading(true);

      // Pause old track immediately while we fetch the new one
      if (ytPlayerRef.current && loadedTrackIdRef.current !== currentTrack.id) {
         ytPlayerRef.current.pauseVideo();
      }

      try {
        let videoId = currentTrack.id;
        
        if (videoId.includes('spotify:') || videoId.length > 15) {
          const q = encodeURIComponent(`${currentTrack.title || currentTrack.name || ''} ${currentTrack.artists || currentTrack.artist || ''}`);
          const dur = currentTrack.duration || currentTrack.duration_string || '';
          const durationQuery = dur ? `&durationMs=${dur}` : '';
          const res = await fetch(`/api/extract-url?id=${videoId}&q=${q}${durationQuery}`);
          if (res.ok) {
            const data = await res.json();
            if (data.id) videoId = data.id;
          }
        }
        
        videoId = videoId.replace('youtube-', '');

        if (!isActive) return;

        if (ytPlayerRef.current) {
           const state = usePlayerStore.getState();
           const isPlaying = state.isPlaying;
           const startSeconds = state.progress || 0;
           
           if (isPlaying) {
             ytPlayerRef.current.loadVideoById(videoId, startSeconds);
           } else {
             ytPlayerRef.current.cueVideoById(videoId, startSeconds);
           }
           loadedTrackIdRef.current = currentTrack.id;
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

  // Fetch lyrics when track changes if modal is open, or clean up if closed
  useEffect(() => {
    setLyrics('');
    setSyncedLyrics(null);
    if (showLyricsModal) {
      fetchLyrics();
    }
  }, [currentTrack?.id]);

  const parseLrc = (lrcString) => {
    if (!lrcString) return null;
    const lines = lrcString.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    for (const line of lines) {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = parseInt(match[3], 10);
        const msMultiplier = match[3].length === 2 ? 10 : 1;
        const timeInSeconds = minutes * 60 + seconds + (milliseconds * msMultiplier) / 1000;
        const text = line.replace(timeRegex, '').trim();
        parsed.push({ time: timeInSeconds, text });
      }
    }
    return parsed.length > 0 ? parsed : null;
  };

  const fetchLyrics = async () => {
    if (!currentTrack) return;
    setIsLyricsLoading(true);
    try {
      const artist = currentTrack.artists || currentTrack.artist || '';
      const title = currentTrack.title || currentTrack.name || '';
      const res = await fetch(`/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
      if (res.ok) {
        const data = await res.json();
        setLyrics(data.lyrics || 'Lyrics not available.');
        setSyncedLyrics(parseLrc(data.syncedLyrics));
      } else {
        setLyrics('Lyrics not available.');
        setSyncedLyrics(null);
      }
    } catch (err) {
      setLyrics('Lyrics not available.');
      setSyncedLyrics(null);
    } finally {
      setIsLyricsLoading(false);
    }
  };

  const handleToggleLyrics = () => {
    if (!showLyricsModal) {
      setShowLyricsModal(true);
      if (!lyrics && !syncedLyrics) fetchLyrics();
    } else {
      setShowLyricsModal(false);
    }
  };

  const handleLyricsLongPressStart = () => {
    lyricsTimerRef.current = setTimeout(() => {
      setIsLyricsDrawerExpanded(prev => !prev);
    }, 500); // 500ms touch and hold
  };

  const handleLyricsLongPressEnd = () => {
    if (lyricsTimerRef.current) {
      clearTimeout(lyricsTimerRef.current);
    }
  };

  const activeLineIndex = syncedLyrics ? syncedLyrics.findIndex((line, index) => {
    const nextLine = syncedLyrics[index + 1];
    return progress >= line.time && (!nextLine || progress < nextLine.time);
  }) : -1;

  useEffect(() => {
    if (!isUserScrollingLyrics && activeLineIndex !== -1 && showLyricsModal) {
      const container = window.innerWidth <= 768 ? lyricsContainerRefMobile.current : lyricsContainerRefDesktop.current;
      if (container) {
        const activeElement = container.querySelector('.lyric-line-active');
        if (activeElement) {
          const containerHalfHeight = container.clientHeight / 2;
          const elementOffsetTop = activeElement.offsetTop;
          const elementHalfHeight = activeElement.clientHeight / 2;
          container.scrollTo({
            top: elementOffsetTop - containerHalfHeight + elementHalfHeight,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [activeLineIndex, isUserScrollingLyrics, showLyricsModal]);

  const handleLyricsScroll = () => {
    setIsUserScrollingLyrics(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrollingLyrics(false);
    }, 2000);
  };

  const renderLyricsContent = () => {
    if (isLyricsLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '200px' }}>
          <Loader2 size={32} className="animate-spin" color="var(--primary-color)" />
        </div>
      );
    }

    if (syncedLyrics) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px 0 50vh 0', alignItems: 'center' }}>
          {syncedLyrics.map((line, i) => (
            <div 
              key={i} 
              className={i === activeLineIndex ? 'lyric-line-active' : ''} 
              onClick={() => { seek(line.time); setIsUserScrollingLyrics(false); }}
              style={{
                fontSize: i === activeLineIndex ? '1.4rem' : '1.1rem',
                fontWeight: i === activeLineIndex ? '800' : '600',
                color: i === activeLineIndex ? 'var(--primary-color)' : 'var(--text-secondary)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: i === activeLineIndex ? 1 : 0.5,
                transform: i === activeLineIndex ? 'scale(1.05)' : 'scale(1)',
                cursor: 'pointer',
                lineHeight: '1.4',
                maxWidth: '90%'
              }}
            >
              {line.text || '• • •'}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={{ whiteSpace: 'pre-wrap', lineHeight: '2', fontSize: '1.1rem', color: 'var(--text-secondary)', fontWeight: '500', padding: '20px 0' }}>
        {lyrics}
      </div>
    );
  };

  // Check if saved
  useEffect(() => {
    const saved = !!currentTrack?.playlistId;
    setIsSaved(saved);
    saveActionRef.current = saved;

    const handleCloudSave = (e) => {
      if (e.detail?.trackId === currentTrack?.id) {
        setIsSaved(true);
        saveActionRef.current = true;
        // Update Zustand store so a refresh doesn't wipe the playlistId
        if (e.detail?.playlistId) {
          updateCurrentTrack(() => ({ playlistId: e.detail.playlistId }));
        }
      }
    };
    
    const handleCloudRemove = (e) => {
      if (e.detail?.trackId === currentTrack?.id) {
        setIsSaved(false);
        saveActionRef.current = false;
        updateCurrentTrack(() => ({ playlistId: null }));
      }
    };

    window.addEventListener('track-saved-to-cloud', handleCloudSave);
    window.addEventListener('track-removed-from-cloud', handleCloudRemove);
    return () => {
      window.removeEventListener('track-saved-to-cloud', handleCloudSave);
      window.removeEventListener('track-removed-from-cloud', handleCloudRemove);
    };
  }, [currentTrack?.id]);

  const handleToggleSave = async (e) => {
    if (e) e.stopPropagation();
    
    // If it's already saved (has a playlistId), remove it!
    if (isSaved && currentTrack?.playlistId) {
      saveActionRef.current = false;
      setIsSaved(false);
      const previousPlaylistId = currentTrack.playlistId;
      updateCurrentTrack(() => ({ playlistId: null }));
      
      try {
        const ytId = currentTrack.id?.replace('youtube-', '') || currentTrack.id;
        const res = await fetch(`/api/playlists/${previousPlaylistId}/songs?songId=${encodeURIComponent(ytId)}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          window.dispatchEvent(new CustomEvent('track-removed-from-cloud', {
            detail: { trackId: currentTrack.id, playlistId: previousPlaylistId }
          }));
          return;
        } else {
          // Revert on failure
          saveActionRef.current = true;
          setIsSaved(true);
          updateCurrentTrack(() => ({ playlistId: previousPlaylistId }));
        }
      } catch (err) {
        console.error("Direct remove failed:", err);
        saveActionRef.current = true;
        setIsSaved(true);
        updateCurrentTrack(() => ({ playlistId: previousPlaylistId }));
      }
      return; // Skip showing modal
    }
    
    // If we are playing from a playlist that we own, save directly to it without opening the modal
    if (queuePlaylistId && !isSaved) {
      saveActionRef.current = true;
      setIsSaved(true); // Optimistic UI update
      updateCurrentTrack(() => ({ playlistId: queuePlaylistId })); // Optimistic Zustand update
      
      try {
        const ytId = currentTrack.id?.replace('youtube-', '') || currentTrack.id;
        const res = await fetch(`/api/playlists/${queuePlaylistId}/songs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: ytId,
            title: currentTrack.title || currentTrack.name || 'Unknown Track',
            artist: currentTrack.artist || currentTrack.artists || currentTrack.author?.name || 'Unknown Artist',
            thumbnail: currentTrack.thumbnail || currentTrack.coverArt || currentTrack.thumbnails?.[0]?.url || currentTrack.best_thumbnail?.url || '',
            duration: String(currentTrack.duration || currentTrack.duration_string || '')
          })
        });
        
        if (res.ok) {
          // Successfully saved directly
          window.dispatchEvent(new CustomEvent('track-saved-to-cloud', { 
            detail: { trackId: currentTrack.id, playlistId: queuePlaylistId, track: currentTrack } 
          }));
          return;
        } else {
          // Revert if failed
          saveActionRef.current = false;
          setIsSaved(false);
          updateCurrentTrack(() => ({ playlistId: null }));
        }
      } catch (err) {
        console.error("Direct save failed:", err);
        saveActionRef.current = false;
        setIsSaved(false);
        updateCurrentTrack(() => ({ playlistId: null }));
      }
    }
    
    // Fallback: If not playing from an owned playlist, or if direct save failed
    setShowSaveModal(true);
  };

  // Dominant color extraction has been removed to prevent 429 Too Many Requests errors from CDNs.

  // Dynamic upgrade of old low-res thumbnails
  const rawCover = currentTrack?.coverArt || currentTrack?.thumbnail;
  const displayCover = rawCover
    ? rawCover.replace(/=w\d+-h\d+.*/, '=w1200-h1200-l90-rj').replace(/\/(default|mqdefault|hqdefault|sddefault)(\.[a-z]+)$/i, '/maxresdefault$2')
    : null;

  const displayArtist = currentTrack?.artists || currentTrack?.artist || 'Unknown Artist';

  // Handle Media Session API (Lock Screen controls)
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: displayArtist,
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
    if (isPlaying && ytPlayerRef.current) {
      if (loadedTrackIdRef.current === currentTrack?.id) {
        ytPlayerRef.current.playVideo().catch(e => console.error("Autoplay prevented:", e));
      }
    } else if (ytPlayerRef.current && !isPlaying) {
      ytPlayerRef.current.pauseVideo();
    }
  }, [isPlaying, currentTrack?.id]);

  useEffect(() => {
    const onEnded = () => {
      if (usePlayerStore.getState().repeat === 'one') {
        if (ytPlayerRef.current) {
          ytPlayerRef.current.seekTo(0, true);
          ytPlayerRef.current.playVideo();
        }
      } else {
        usePlayerStore.getState().playNext();
      }
    };
    window.addEventListener('yt-player-ended', onEnded);
    return () => window.removeEventListener('yt-player-ended', onEnded);
  }, []);

  // Auto-heal missing duration
  useEffect(() => {
    if (currentTrack?.id && duration > 0 && (!currentTrack.duration || currentTrack.duration === '0') && !currentTrack.duration_string) {
      const trueSeconds = Math.floor(duration);
      fetch(`/api/songs/${currentTrack.id}/duration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: String(trueSeconds) })
      }).catch(e => console.error('Auto-heal duration failed:', e));
    }
  }, [duration, currentTrack]);

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
    <div style={{ display: 'none' }}>
      <div id="youtube-player-container"></div>
    </div>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 'min(20px, 2vh)', flexShrink: 0 }}>
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
            onClick={() => setShowQueueModal(!showQueueModal)}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}
          >
            <List size={24} />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>

          <div style={{ textAlign: 'center', width: '100%', flexShrink: 0 }}>
            <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: 'clamp(1.4rem, 5vh, 1.8rem)', fontWeight: '800', width: '100%' }}>
              <ScrollingText text={currentTrack.title} />
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.9rem, 3vh, 1.1rem)', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack?.artists || currentTrack?.artist || 'Unknown Artist'}
            </p>
          </div>

          <div style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, margin: 'min(24px, 3vh) 0' }}>
            <div style={{ width: '100%', maxWidth: '35vh', height: '100%', maxHeight: '35vh', aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-input)', boxShadow: '0 15px 35px rgba(0,0,0,0.6)' }}>
              <TrackThumbnail track={currentTrack} showBackground={false} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingBottom: '10px', flexShrink: 0 }}>

            <div style={{ width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: 'min(30px, 4vh)', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: '-40px' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleLyrics(); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '16px',
                    padding: '0 16px',
                    height: '32px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                  <Music size={16} /> Lyrics
                </button>
              </div>
              <div style={{ position: 'absolute', right: 0, top: '-40px' }}>
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '320px', marginBottom: 'min(20px, 2vh)' }}>
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
                width: 'min(80px, 10vh)', height: 'min(80px, 10vh)', borderRadius: '50%', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
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
            backgroundColor: 'rgba(20, 20, 20, 0.6)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', zIndex: 3000, display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', backgroundColor: 'transparent' }}>
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
                        <TrackThumbnail track={track} showBackground={false} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: '600', color: isPlayingQueue ? 'var(--primary-color)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track?.artists || track?.artist || 'Unknown Artist'}</p>
                      </div>
                      {isPlayingQueue && <div className="equalizer-anim" style={{ color: 'var(--primary-color)' }}>...</div>}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {showLyricsModal && (
          <div className="animate-fade-in-up" 
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              height: isLyricsDrawerExpanded ? '100%' : '50%',
              backgroundColor: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', zIndex: 3000, display: 'flex', flexDirection: 'column',
              borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
            <div 
              onTouchStart={handleLyricsLongPressStart}
              onTouchEnd={handleLyricsLongPressEnd}
              onMouseDown={handleLyricsLongPressStart}
              onMouseUp={handleLyricsLongPressEnd}
              onMouseLeave={handleLyricsLongPressEnd}
              style={{ padding: '16px 24px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', cursor: 'grab' }}>
              <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--border-color)', borderRadius: '2px', marginBottom: '12px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>Lyrics</h3>
                <button onClick={() => setShowLyricsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px' }}>
                  <ChevronDown size={24} />
                </button>
              </div>
            </div>
            <div 
              ref={lyricsContainerRefMobile}
              onWheel={handleLyricsScroll}
              onTouchMove={handleLyricsScroll}
              className="content-scroll hide-scrollbar" 
              style={{ position: 'relative', flex: 1, padding: '16px 24px 40px', overflowY: 'auto', textAlign: 'center', scrollBehavior: 'smooth' }}>
              {renderLyricsContent()}
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
      onClick={() => { if (typeof window !== 'undefined' && window.innerWidth <= 768) setIsMobileExpanded(true); }}
      style={{
        display: 'block',
        zIndex: 1000,
        bottom: typeof window !== 'undefined' && window.innerWidth <= 768 ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : '0'
      }}>

      {/* ── MOBILE MINI BAR ──────────────────────────────────── */}
      <div className="mobile-mini-bar">
        {/* Thumbnail */}
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-input)', marginRight: '16px', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', position: 'relative' }}>
          <TrackThumbnail track={currentTrack} showBackground={false} />
        </div>

        {/* Track Info — stacked title + artist */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '0.95rem', margin: 0, width: '100%' }}>
            <ScrollingText text={currentTrack.title} />
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTrack?.artists || currentTrack?.artist || 'Unknown Artist'}
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
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <TrackThumbnail track={currentTrack} showBackground={false} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: '16px' }}>
            <div style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem', fontWeight: '600', width: '100%' }}>
              <ScrollingText text={currentTrack.title} />
            </div>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack?.artists || currentTrack?.artist || 'Unknown Artist'}
            </span>
          </div>
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
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 8px' }}></div>
          <button onClick={(e) => { e.stopPropagation(); handleToggleLyrics(); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <Music size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setShowQueueModal(!showQueueModal); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <List size={20} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleToggleSave(e); }} style={{
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--text-primary)',
            border: 'none', cursor: 'pointer', transition: 'transform 0.2s',
            transform: saveActionRef.current ? 'scale(1.1)' : 'scale(1)',
            marginLeft: '4px'
          }}>
            {isSaved ? <Check size={16} color="var(--bg-main)" /> : <Plus size={16} color="var(--bg-main)" />}
          </button>
        </div>
        </div>
      </div>
      
      {/* ── DESKTOP QUEUE MODAL ───────────────────────────────── */}
      {showQueueModal && window.innerWidth > 768 && (
        <div className="animate-fade-in-up" style={{
          position: 'fixed', bottom: '100px', right: '20px', width: '380px', maxHeight: '60vh',
          backgroundColor: 'rgba(20, 20, 20, 0.6)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', zIndex: 3000, display: 'flex', flexDirection: 'column',
          borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Up Next</h3>
            <button onClick={(e) => { e.stopPropagation(); setShowQueueModal(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <ChevronDown size={20} />
            </button>
          </div>
          <div className="content-scroll" style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
            {(() => {
              let displayQueue = queue.slice(queueIndex);
              if (repeat === 'all' && displayQueue.length < queue.length) {
                displayQueue = [...displayQueue, ...queue.slice(0, queueIndex)];
              }

              return displayQueue.map((track, i) => {
                const isPlayingQueue = i === 0;
                return (
                  <div key={`desktop-queue-${track.id}-${i}`} onClick={(e) => { e.stopPropagation(); playTrack(track, queue, queueName); }} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                    backgroundColor: isPlayingQueue ? 'rgba(255,255,255,0.08)' : 'transparent',
                    borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s'
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--bg-main)', position: 'relative' }}>
                      <TrackThumbnail track={track} size={40} showBackground={false} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.9rem', color: isPlayingQueue ? 'var(--primary-color)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track?.artists || track?.artist || 'Unknown Artist'}</p>
                    </div>
                    {isPlayingQueue && <div className="equalizer-anim" style={{ color: 'var(--primary-color)', fontSize: '0.8rem' }}>...</div>}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ── DESKTOP LYRICS MODAL ───────────────────────────────── */}
      {showLyricsModal && window.innerWidth > 768 && (
        <div className="animate-fade-in-up" style={{
          position: 'fixed', bottom: '100px', right: '20px', width: '380px', maxHeight: '60vh', minHeight: '40vh',
          backgroundColor: 'rgba(20, 20, 20, 0.6)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', zIndex: 3000, display: 'flex', flexDirection: 'column',
          borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Lyrics</h3>
            <button onClick={(e) => { e.stopPropagation(); setShowLyricsModal(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
              <ChevronDown size={20} />
            </button>
          </div>
          <div 
            ref={lyricsContainerRefDesktop}
            onWheel={handleLyricsScroll}
            onTouchMove={handleLyricsScroll}
            className="content-scroll hide-scrollbar" 
            style={{ position: 'relative', flex: 1, padding: '20px', overflowY: 'auto', textAlign: 'center', scrollBehavior: 'smooth' }}>
            {renderLyricsContent()}
          </div>
        </div>
      )}

      {showSaveModal && (
        <PlaylistSaveModal 
          track={currentTrack} 
          onClose={() => setShowSaveModal(false)} 
        />
      )}
    </>
  );
}
