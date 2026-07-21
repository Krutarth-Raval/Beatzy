"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Play, Pause, Trash2, Folder, Loader2, Plus, Edit2, Check, X, Redo2, Copy, Shuffle, GripVertical, Image as ImageIcon, Camera, ChevronDown, Menu, Library, ChevronRight, Disc3, Sparkles, Settings, Share2, Globe, Lock, BookmarkPlus, BookmarkMinus, Search, Music } from 'lucide-react';
import { polyfill } from 'mobile-drag-drop';
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour';
import usePlayerStore from '@/store/usePlayerStore';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import PlaylistSearchModal from '@/components/PlaylistSearchModal';
import PwaInstallButton from '@/components/PwaInstallButton';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import useModalStore from '@/store/useModalStore';

import TrackThumbnail from '@/components/TrackThumbnail';

const PlaylistCoverDynamic = ({ coverArt, songs, isSidebar = false }) => {
  const [thumb, setThumb] = useState(coverArt);

  useEffect(() => {
    if (coverArt) {
      setThumb(coverArt);
      return;
    }

    if (songs && songs.length > 0) {
      const firstSong = songs[0].song || songs[0]; // handle both nested and flat tracks
      if (firstSong) {
        const isSpotify = firstSong.id?.includes('spotify:');
        const initial = firstSong.thumbnail || firstSong.coverArt || firstSong.thumbnails?.[0]?.url || firstSong.thumbnail?.[0]?.url || (!isSpotify && firstSong.id ? `https://i.ytimg.com/vi/${firstSong.id.replace('youtube-', '')}/hqdefault.jpg` : '');
        if (initial) {
          setThumb(initial);
        } else if (isSpotify) {
          const id = firstSong.id.replace('spotify:track:', '');
          const oembedUrl = `https://open.spotify.com/oembed?url=spotify:track:${id}`;
          fetch(`/api/proxy-audio?url=${encodeURIComponent(oembedUrl)}`)
            .then(res => res.json())
            .then(data => { if (data.thumbnail_url) setThumb(data.thumbnail_url); })
            .catch(() => { });
        } else {
          setThumb(null);
        }
      } else {
        setThumb(null);
      }
    } else {
      setThumb(null);
    }
  }, [coverArt, songs?.[0]?.id]);

  if (thumb) return <img src={thumb.split('?')[0]} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />;
  return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isSidebar ? '1rem' : '3rem', backgroundColor: 'var(--bg-hover)' }}>🎵</div>;
};

import { useParams } from 'next/navigation';
export default function PlaylistDetailPage() {
  const params = useParams();
  const { showAlert, showConfirm } = useModalStore();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showPlaylistSearchModal, setShowPlaylistSearchModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(true);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [sortMode, setSortMode] = useState("Manual"); // Manual, Old to New, New to Old
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showMoveDropdown, setShowMoveDropdown] = useState(null); // trackId
  const [showCopyDropdown, setShowCopyDropdown] = useState(null); // trackId
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(null);
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({ moves: [], deletes: [], copies: [] });
  const [activeDragHandle, setActiveDragHandle] = useState(null);

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
  const [isDeletingPlaylist, setIsDeletingPlaylist] = useState(false);

  const router = useRouter();
  const { data: session } = useSession();
  const { playTrack, currentTrack, isPlaying, togglePlay, shuffle, toggleShuffle } = usePlayerStore();
  const fileInputRef = useRef(null);
  const selectedPlaylistRef = useRef(selectedPlaylist);
  const scrollRef = useRef(null);

  useEffect(() => {
    selectedPlaylistRef.current = selectedPlaylist;
  }, [selectedPlaylist]);

  useEffect(() => {
    // Enable HTML5 drag-and-drop on mobile touchscreens
    polyfill({
      dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
    });

    const touchmoveListener = () => { };
    window.addEventListener('touchmove', touchmoveListener, { passive: false });

    const handlePlaylistUpdate = (e) => {
      const detail = e?.detail || {};

      // Optimistic update for right section if we added to the current playlist
      if (detail.track && detail.playlistId && selectedPlaylistRef.current?.id === detail.playlistId) {
        setTracks(prev => {
          if (prev.some(t => t.id === detail.track.id)) return prev;
          return [...prev, { ...detail.track, addedAt: new Date().toISOString() }];
        });
      }

      // Silent reload for the left section
      loadPlaylists(true);
    };
    window.addEventListener('playlist-updated', handlePlaylistUpdate);
    window.addEventListener('track-saved-to-cloud', handlePlaylistUpdate);

    return () => {
      window.removeEventListener('touchmove', touchmoveListener);
      window.removeEventListener('playlist-updated', handlePlaylistUpdate);
      window.removeEventListener('track-saved-to-cloud', handlePlaylistUpdate);
    };
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      loadPlaylists();
    } else if (session === null) {
      // If session is definitively null (unauthenticated), we can still clear loading
      setLoading(false);
    }
  }, [session?.user?.id]);

  const loadPlaylists = async (isSilent = false, skipDetailsReload = false) => {
    if (!isSilent) setLoading(true);
    try {
      let cloudP = [];

      try {
        if (!session?.user) {
          setLoading(false);
          return;
        }
        const res = await fetch('/api/playlists');
        if (res.ok) {
          const data = await res.json();
          cloudP = [
            ...(data.owned || []).map(p => ({ ...p, isCloud: true, isOwner: true, coverArt: p.coverImage, savedCount: p._count?.savedBy || p.savedCount || 0 })),
            ...(data.saved || []).map(p => ({ ...p, isCloud: true, isOwner: false, coverArt: p.coverImage, savedCount: p._count?.savedBy || p.savedCount || 0 }))
          ];
        }
      } catch (e) {
        console.error('Failed to load cloud playlists', e);
      }

      const p = [...cloudP];
      setPlaylists(p);

      const targetId = params?.id;

      if (targetId) {
        const target = p.find(x => x.id === parseInt(targetId) || x.id === targetId);
        if (target) {
          if (!skipDetailsReload) {
            loadPlaylistDetails(target);
          } else {
            setSelectedPlaylist(prev => ({ ...prev, ...target, coverArt: target.coverImage }));
          }
          return;
        } else {
          try {
            const res = await fetch(`/api/playlists/${targetId}`);
            if (res.ok) {
              const data = await res.json();
              const publicPlaylist = { ...data, isCloud: true, isOwner: false };
              loadPlaylistDetails(publicPlaylist);
              return;
            }
          } catch (e) { console.error('Failed to load public playlist directly', e); }
        }
      }

      if (p.length > 0 && !selectedPlaylist) {
        if (!skipDetailsReload) loadPlaylistDetails(p[0]);
      } else if (selectedPlaylist) {
        const updated = p.find(x => x.id === selectedPlaylist.id);
        if (updated) setSelectedPlaylist(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleCreatePlaylist = () => {
    setShowCreatePlaylistModal(true);
  };

  const handleNavigation = (target) => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(target);
    } else {
      executeNavigation(target);
    }
  };

  const executeNavigation = (target) => {
    if (target === 'back') {
      router.push('/');
    } else {
      loadPlaylistDetails(target);
    }
  };

  const loadPlaylistDetails = async (playlist) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      document.documentElement.style.setProperty('--scroll', 0);
    }
    setSelectedPlaylist(playlist);
    setLoadingTracks(true);
    setIsEditing(false);
    setIsEditingName(false);
    setShowMoveDropdown(null);
    setShowCopyDropdown(null);
    setHasUnsavedChanges(false);
    setPendingChanges({ moves: [], deletes: [], copies: [] });
    setSortMode("Manual");
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
        setSelectedPlaylist({ ...playlist, ...data, coverArt: data.coverImage, isCloud: true, isOwner: playlist.isOwner, savedCount: data._count?.savedBy || data.savedCount || playlist._count?.savedBy || 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTracks(false);
    }
  };

  const promptDeletePlaylist = (e, id) => {
    if (e) e.stopPropagation();
    setPlaylistToDelete(id);
  };

  const confirmDeletePlaylist = async () => {
    if (!playlistToDelete) return;
    setIsDeletingPlaylist(true);
    try {
      const res = await fetch(`/api/playlists/${playlistToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete playlist');

      if (selectedPlaylist?.id === playlistToDelete) {
        setSelectedPlaylist(null);
        setTracks([]);
      }
      loadPlaylists();
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingPlaylist(false);
      setPlaylistToDelete(null);
    }
  };

  const handleDeleteTrack = (e, trackId) => {
    e.stopPropagation();
    setPendingChanges(prev => ({ ...prev, deletes: [...prev.deletes, trackId] }));
    setTracks(tracks.filter(t => t.id !== trackId));
    setHasUnsavedChanges(true);
  };

  const handlePlayPlaylist = () => {
    if (tracks.length === 0) return;
    const isThisPlaylistPlaying = currentTrack && tracks.some(t => t.id === currentTrack.id);
    if (isThisPlaylistPlaying) {
      togglePlay();
    } else {
      if (shuffle !== 'off') {
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        playTrack(shuffled[0], shuffled, selectedPlaylist?.name, selectedPlaylist?.isOwner ? selectedPlaylist.id : null);
      } else {
        playTrack(tracks[0], tracks, selectedPlaylist?.name, selectedPlaylist?.isOwner ? selectedPlaylist.id : null);
      }
    }
  };

  const handlePlayTrack = (track) => {
    playTrack(track, tracks, selectedPlaylist?.name, selectedPlaylist?.isOwner ? selectedPlaylist.id : null);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled, selectedPlaylist?.name, selectedPlaylist?.isOwner ? selectedPlaylist.id : null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showAlert("Error", "Image must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = event.target.result;
      try {
        const res = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coverImage: base64Str })
        });
        if (res.ok) {
          const updated = await res.json();
          setSelectedPlaylist(prev => ({ ...prev, coverArt: updated.coverImage }));
          loadPlaylists(true);
        } else {
          showAlert("Error", "Failed to update cover image");
        }
      } catch (err) {
        console.error("Image upload error", err);
        showAlert("Error", "An unexpected error occurred.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleVisibility = async () => {
    if (!selectedPlaylist) return;
    setShowSettingsMenu(false);

    try {
      if (selectedPlaylist.isOwner) {
        const newVisibility = !selectedPlaylist.isPublic;

        // Optimistic UI update
        setSelectedPlaylist(prev => ({ ...prev, isPublic: newVisibility }));

        const res = await fetch(`/api/playlists/${selectedPlaylist.id}/visibility`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublic: newVisibility })
        });

        if (!res.ok) {
          // Revert optimistic update on failure
          setSelectedPlaylist(prev => ({ ...prev, isPublic: !newVisibility }));
          showAlert("Error", "Failed to change visibility. Please try again.");
        }
        return;
      }

      if (!session?.user) {
        showAlert("Login Required", "Please log in to change playlist visibility.");
      }
    } catch (e) {
      console.error('Failed to toggle visibility', e);
      showAlert("Error", "Something went wrong. Please try again.");
    }
  };

  const handleShare = () => {
    if (selectedPlaylist?.id) {
      const url = `${window.location.origin}/playlists?id=${selectedPlaylist.id}`;
      navigator.clipboard.writeText(url).then(() => {
        showAlert("Success", "Playlist link copied to clipboard!");
        setShowSettingsMenu(false);
      });
    }
  };

  const handleSavePublicPlaylistDirect = (id) => {
    showConfirm(
      "Remove from Library?",
      "Are you sure you want to remove this playlist from your library?",
      async () => {
        try {
          const res = await fetch(`/api/playlists/${id}/save`, { method: 'DELETE' });
          if (res.ok) {
            showAlert("Success", "Playlist removed from your library");
            if (selectedPlaylist?.id === id) {
              setSelectedPlaylist(null);
              setTracks([]);
            }
            loadPlaylists();
          } else {
            showAlert("Error", "Failed to remove playlist");
          }
        } catch (e) {
          console.error(e);
        }
      },
      null,
      "Remove"
    );
  };

  const handleSavePublicPlaylist = async () => {
    if (!selectedPlaylist?.isCloud || selectedPlaylist?.isOwner) return;
    const isSaved = playlists.some(p => p.id === selectedPlaylist.id && !p.isOwner);

    if (isSaved) {
      showConfirm(
        "Remove from Library?",
        "Are you sure you want to remove this playlist from your library?",
        async () => {
          setIsSavingPlaylist(true);
          try {
            const res = await fetch(`/api/playlists/${selectedPlaylist.id}/save`, { method: 'DELETE' });
            if (res.ok) {
              showAlert("Success", "Playlist removed from your library!");
              setSelectedPlaylist(null);
              setTracks([]);
              loadPlaylists();
            } else {
              showAlert("Error", "Failed to remove playlist.");
            }
          } catch (e) {
            console.error(e);
            showAlert("Error", "An unexpected error occurred.");
          } finally {
            setIsSavingPlaylist(false);
          }
        },
        null,
        "Remove"
      );
      return;
    }

    setIsSavingPlaylist(true);
    try {
      const res = await fetch(`/api/playlists/${selectedPlaylist.id}/save`, { method: 'POST' });
      if (res.ok) {
        showAlert("Success", "Playlist saved to your library!");
        loadPlaylists();
      } else {
        showAlert("Error", "Failed to save playlist.");
      }
    } catch (e) {
      console.error(e);
      showAlert("Error", "An unexpected error occurred.");
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const handleSaveName = async (newName) => {
    const finalName = typeof newName === 'string' ? newName : editNameValue;
    if (!finalName || typeof finalName !== 'string' || !finalName.trim() || finalName.trim() === selectedPlaylist?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const res = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: finalName.trim() })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedPlaylist(prev => ({ ...prev, name: updated.name }));
        loadPlaylists(true); // silent reload for sidebar
      } else {
        showAlert("Error", "Failed to rename playlist.");
      }
    } catch (e) {
      console.error("Rename error:", e);
      showAlert("Error", "An unexpected error occurred.");
    } finally {
      setIsEditingName(false);
    }
  };

  const handleDragStart = (index) => {
    setDraggedItemIndex(index);
  };

  const handleDragEnter = (index) => {
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newTracks = [...tracks];
    const draggedItem = newTracks[draggedItemIndex];
    newTracks.splice(draggedItemIndex, 1);
    newTracks.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    setTracks(newTracks);
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = async () => {
    setDraggedItemIndex(null);
  };

  const handleMoveTrack = (e, track, targetPlaylistId) => {
    e.stopPropagation();
    setPendingChanges(prev => ({ ...prev, moves: [...prev.moves, { track, targetPlaylistId }] }));
    setTracks(tracks.filter(t => t.id !== track.id));
    setHasUnsavedChanges(true);
    setShowMoveDropdown(null);
  };

  const handleCopyTrack = (e, track, targetPlaylistId) => {
    e.stopPropagation();
    setPendingChanges(prev => ({ ...prev, copies: [...prev.copies, { track, targetPlaylistId }] }));
    setHasUnsavedChanges(true);
    setShowCopyDropdown(null);
  };

  const saveAllChanges = async () => {
    if (!selectedPlaylist) return;

    setIsSavingPlaylist(true);
    try {
      if (selectedPlaylist.isOwner && pendingChanges.deletes.length > 0) {
        await fetch(`/api/playlists/${selectedPlaylist.id}/songs/bulk`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songIds: pendingChanges.deletes })
        });
      }

      // Process copies
      if (pendingChanges.copies.length > 0) {
        const copiesByTarget = {};
        pendingChanges.copies.forEach(({ track, targetPlaylistId }) => {
          if (!copiesByTarget[targetPlaylistId]) copiesByTarget[targetPlaylistId] = [];
          copiesByTarget[targetPlaylistId].push(track);
        });
        
        for (const [targetPlaylistId, tracks] of Object.entries(copiesByTarget)) {
          await fetch(`/api/playlists/${targetPlaylistId}/songs/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracks })
          });
        }
      }

      // Process moves
      if (pendingChanges.moves.length > 0) {
        // Step 1: Add to target playlists
        const movesByTarget = {};
        const movedTrackIds = [];
        pendingChanges.moves.forEach(({ track, targetPlaylistId }) => {
          if (!movesByTarget[targetPlaylistId]) movesByTarget[targetPlaylistId] = [];
          movesByTarget[targetPlaylistId].push(track);
          movedTrackIds.push(track.id);
        });
        
        for (const [targetPlaylistId, tracks] of Object.entries(movesByTarget)) {
          await fetch(`/api/playlists/${targetPlaylistId}/songs/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracks })
          });
        }
        
        // Step 2: Remove from current playlist
        if (selectedPlaylist.isOwner && movedTrackIds.length > 0) {
          await fetch(`/api/playlists/${selectedPlaylist.id}/songs/bulk`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ songIds: movedTrackIds })
          });
        }
      }

      setPendingChanges({ moves: [], deletes: [], copies: [] });
      setHasUnsavedChanges(false);
      loadPlaylists(true, true);
      showAlert("Success", "Changes saved successfully.");
    } catch (e) {
      console.error(e);
      showAlert("Error", "Failed to save changes.");
    } finally {
      setIsSavingPlaylist(false);
    }
  };

  const getSortedTracks = () => {
    let sorted = [...tracks];
    if (sortMode === "Old to New") {
      sorted.sort((a, b) => (a.addedAt || a.orderIndex) - (b.addedAt || b.orderIndex));
    } else if (sortMode === "New to Old") {
      sorted.sort((a, b) => (b.addedAt || b.orderIndex) - (a.addedAt || a.orderIndex));
    }
    return sorted;
  };

  const formatDurationMs = (ms, trackId = '') => {
    if (ms == null) return '';
    if (typeof ms === 'string' && ms.includes(':')) return ms;

    let totalSeconds = 0;
    const parsed = typeof ms === 'number' ? ms : parseInt(ms);
    if (isNaN(parsed)) return '';

    // Heuristic: if duration is over 20,000 it's definitely in milliseconds
    if (trackId?.includes('spotify:') || parsed > 20000) {
      totalSeconds = Math.floor(parsed / 1000);
    } else {
      totalSeconds = parsed;
    }

    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = () => {
    let totalSeconds = 0;
    tracks.forEach(t => {
      if (t.duration != null) {
        if (typeof t.duration === 'number') {
          const val = t.duration > 0 ? t.duration : 0;
          if (t.id?.includes('spotify:') || val > 20000) {
            totalSeconds += Math.floor(val / 1000);
          } else {
            totalSeconds += val;
          }
        } else if (typeof t.duration === 'string') {
          if (t.duration.includes(':')) {
            const parts = t.duration.split(':').reverse();
            totalSeconds += (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0) * 3600;
          } else {
            const parsed = parseInt(t.duration) || 0;
            if (t.id?.includes('spotify:') || parsed > 20000) {
              totalSeconds += Math.floor(parsed / 1000);
            } else {
              totalSeconds += parsed;
            }
          }
        }
      }
    });
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours} hr ${mins} min`;
    return `${mins} min`;
  };

  const sortedTracks = getSortedTracks();

  let bgImageUrl = selectedPlaylist?.coverArt || '';
  if (!bgImageUrl && tracks && tracks.length > 0) {
    const firstTrack = tracks[0];
    bgImageUrl = firstTrack.coverArt || firstTrack.thumbnail || '';
    if (!bgImageUrl && firstTrack.id && !firstTrack.id.includes('spotify:')) {
      bgImageUrl = `https://i.ytimg.com/vi/${firstTrack.id.replace('youtube-', '')}/hqdefault.jpg`;
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', overflow: 'hidden', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Blurred Background Overlay (Moved to root to prevent clipping) */}
      {bgImageUrl && (
        <div style={{
          position: 'fixed',
          top: '-10%', left: '-10%', width: '120vw', height: '600px',
          backgroundImage: `url(${bgImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(80px) brightness(0.3) saturate(1.5)',
          opacity: 0.6,
          zIndex: 0,
          pointerEvents: 'none',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)'
        }} />
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media (min-width: 769px) {
          .show-on-mobile { display: none !important; }
        }
        @media (max-width: 768px) {
          .playlist-header-mobile {
            flex-direction: row !important;
            align-items: flex-start !important;
            gap: 16px !important;
            text-align: left;
          }
          .playlist-image-container {
            width: 160px !important;
            height: 160px !important;
            margin: 0 !important;
            z-index: 10;
          }
          .playlist-header-mobile h1 {
            font-size: 1.6rem !important;
            justify-content: flex-start;
          }
          .playlist-info-row {
            justify-content: flex-start !important;
          }
          .playlist-actions-mobile {
            width: 100%;
          }
          .hide-on-mobile { display: none !important; }
        }
      `}} />
      <div className="playlist-page-container" style={{ flex: 1, minHeight: 0, padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '32px', width: '100%' }}>

        {/* Playlist Content View */}
        <div className={`playlist-content-mobile ${!selectedPlaylist ? 'hidden-on-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {!selectedPlaylist ? (
            <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '24px', textAlign: 'center' }}>
              <div style={{ marginBottom: '24px', opacity: 0.3 }}>
                <img src="/white.png" width={80} height={80} className="logo-img animate-spin" alt="Empty state logo" />
              </div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: '1.8rem', fontWeight: '700', marginBottom: '12px', margin: 0 }}>Your Library</h2>
              <p style={{ fontSize: '1.1rem', maxWidth: '400px', lineHeight: '1.5' }}>Select a playlist from the sidebar to view tracks, edit details, or start listening.</p>
            </div>
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Header */}
              <div style={{ position: 'relative', paddingBottom: '150px', marginBottom: '-130px', flexShrink: 0 }}>


                <div className="playlist-header-mobile" style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', position: 'relative', zIndex: 1 }}>

                  {/* Playlist Image with Edit overlay */}
                  <div
                    className="playlist-image-container"
                    onClick={() => { if (selectedPlaylist.isOwner !== false) fileInputRef.current?.click(); }}
                    style={{ flexShrink: 0, width: '250px', height: '250px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', cursor: selectedPlaylist.isOwner !== false ? 'pointer' : 'default', group: 'hover' }}
                  >
                    <PlaylistCoverDynamic coverArt={selectedPlaylist.coverArt} songs={tracks} />
                    {selectedPlaylist.isOwner !== false && (
                      <>
                        <div className="image-edit-overlay" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', color: '#fff' }}>
                          <Camera size={32} style={{ marginBottom: '8px' }} />
                          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Choose Photo</span>
                        </div>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
                      </>
                    )}
                  </div>

                  <div className="playlist-info-container" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 20 }}>

                    {/* Playlist Name Display */}
                    <h1
                      onClick={() => { if (selectedPlaylist.isOwner !== false) { setEditNameValue(selectedPlaylist.name); setIsEditingName(true); } }}
                      style={{ fontSize: 'clamp(1.6rem, 6vw, 3rem)', fontWeight: '800', margin: 0, marginBottom: '16px', lineHeight: '1.1', cursor: selectedPlaylist.isOwner !== false ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '12px', wordBreak: 'break-word' }}
                      title={selectedPlaylist.isOwner !== false ? "Click to rename" : ""}
                    >
                      {selectedPlaylist.name}
                    </h1>

                    <div className="playlist-info-row" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* User Row */}
                      {selectedPlaylist.user?.name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: '600' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg-main)', fontSize: '0.85rem', fontWeight: 'bold', flexShrink: 0 }}>
                            {selectedPlaylist.user.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 'clamp(0.9rem, 1.2vw, 1.1rem)' }}>{selectedPlaylist.user.name}</span>
                        </div>
                      )}

                      {/* Stats Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'clamp(0.85rem, 1.2vw, 1rem)', color: 'var(--text-secondary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(selectedPlaylist.isPublic || selectedPlaylist.isOwner === false) ? (
                          <>
                            <span title="Public Playlist" style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                              <Globe size={16} style={{ marginRight: '6px' }} />
                              {selectedPlaylist.savedCount || 0} save{selectedPlaylist.savedCount !== 1 ? 's' : ''}
                            </span>
                          </>
                        ) : (
                          <span title="Private Playlist" style={{ display: 'flex', alignItems: 'center' }}>
                            <Lock size={16} />
                          </span>
                        )}

                        <span className="hide-on-mobile" style={{ whiteSpace: 'nowrap' }}>• {tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>• {formatTotalDuration()}</span>
                      </div>
                    </div>

                    {/* Buttons Row */}
                    <div className="playlist-actions-mobile" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            toggleShuffle();
                            if (shuffle === 'off' && tracks.length > 0) {
                              const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                              playTrack(shuffled[0], shuffled, selectedPlaylist?.name);
                            }
                          }}
                          disabled={tracks.length === 0}
                          title={`Shuffle: ${shuffle}`}
                          style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: shuffle === 'smart' ? 'var(--primary-color)' : shuffle === 'on' ? 'var(--text-primary)' : 'var(--bg-hover)', color: shuffle !== 'off' ? 'var(--bg-main)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: tracks.length === 0 ? 'not-allowed' : 'pointer', opacity: tracks.length === 0 ? 0.5 : 1, transition: 'all 0.2s', flexShrink: 0 }}
                        >
                          {shuffle === 'smart' ? <Sparkles size={20} /> : <Shuffle size={20} />}
                        </button>
                        <button
                          onClick={handlePlayPlaylist}
                          disabled={tracks.length === 0}
                          style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: tracks.length === 0 ? 'not-allowed' : 'pointer', opacity: tracks.length === 0 ? 0.5 : 1, flexShrink: 0 }}
                        >
                          {currentTrack && tracks.some(t => t.id === currentTrack.id) && isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />}
                        </button>
                        {selectedPlaylist.isOwner !== false && (
                          <button
                            onClick={async () => {
                              if (isEditing && hasUnsavedChanges) {
                                await saveAllChanges();
                              }
                              setIsEditing(!isEditing);
                            }}
                            disabled={isSavingPlaylist}
                            style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isEditing ? 'var(--primary-color)' : 'var(--bg-hover)', color: isEditing ? 'var(--bg-main)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: isSavingPlaylist ? 'default' : 'pointer', transition: 'all 0.2s', opacity: isSavingPlaylist ? 0.7 : 1, flexShrink: 0 }}
                            title={isEditing ? "Finish Editing" : "Edit Playlist"}
                          >
                            {isEditing ? (isSavingPlaylist ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />) : <Edit2 size={20} />}
                          </button>
                        )}

                        {selectedPlaylist.isCloud && selectedPlaylist.isOwner === false && (() => {
                          const isSaved = playlists.some(p => p.id === selectedPlaylist.id && !p.isOwner);
                          return (
                            <button
                              onClick={handleSavePublicPlaylist}
                              disabled={isSavingPlaylist}
                              style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', color: isSaved ? 'var(--primary-color)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'all 0.2s', opacity: isSavingPlaylist ? 0.5 : 1, flexShrink: 0 }}
                              title={isSaved ? "Remove from Library" : "Save to Library"}
                            >
                              {isSavingPlaylist ? <Loader2 className="animate-spin" size={20} /> : (isSaved ? <BookmarkMinus size={20} /> : <BookmarkPlus size={20} />)}
                            </button>
                          );
                        })()}
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Settings and Sort controls above track list */}
              {!loadingTracks && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingLeft: '8px', paddingRight: '8px', position: 'relative', zIndex: 10 }}>
                  {/* Settings Button & Dropdown */}
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowSettingsMenu(!showSettingsMenu)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.8 }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.8}>
                      <Settings size={20} />
                    </button>
                    {showSettingsMenu && (
                      <>
                        <div onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(false); }} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
                        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', width: '240px', overflow: 'hidden', padding: '8px', zIndex: 20 }}>
                          {(selectedPlaylist.isCloud && selectedPlaylist.isOwner) || (!selectedPlaylist.isCloud && session?.user) ? (
                            <>
                              <button onClick={handleToggleVisibility} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                {selectedPlaylist.isPublic ? <Lock size={18} /> : <Globe size={18} />}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: '600' }}>{selectedPlaylist.isPublic ? 'Make Private' : 'Make Public'}</span>
                                  {!selectedPlaylist.isCloud && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Will sync to cloud</span>}
                                </div>
                              </button>
                              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                            </>
                          ) : selectedPlaylist.isCloud && selectedPlaylist.isOwner === false ? (() => {
                            const isSaved = playlists.some(p => p.id === selectedPlaylist.id && !p.isOwner);
                            return (
                              <>
                                <button onClick={handleSavePublicPlaylist} disabled={isSavingPlaylist} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'none', border: 'none', color: isSaved ? 'var(--primary-color)' : 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', opacity: isSavingPlaylist ? 0.5 : 1 }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  {isSavingPlaylist ? <Loader2 className="animate-spin" size={18} /> : (isSaved ? <BookmarkMinus size={18} /> : <BookmarkPlus size={18} />)}
                                  <span>{isSaved ? 'Remove from Library' : 'Save to Library'}</span>
                                </button>
                                <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                              </>
                            )
                          })() : null}
                          <button onClick={handleShare} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '8px', textAlign: 'left' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Share2 size={18} />
                            <span>Share Playlist</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-primary)', opacity: 0.8, cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap' }}
                    >
                      Sort: {sortMode} <ChevronDown size={16} />
                    </button>
                    {showSortDropdown && (
                      <>
                        <div
                          onClick={(e) => { e.stopPropagation(); setShowSortDropdown(false); }}
                          style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                        />
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: 'rgba(30,30,30,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px', zIndex: 10, minWidth: '150px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                          {['Manual', 'Old to New', 'New to Old'].map(mode => (
                            <button
                              key={mode}
                              onClick={() => { setSortMode(mode); setShowSortDropdown(false); }}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: sortMode === mode ? 'var(--bg-hover)' : 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', whiteSpace: 'nowrap' }}
                            >
                              {mode}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Track List */}
              {loadingTracks ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', flexShrink: 0 }}>
                  <img src="/white.png" width={40} height={40} className="logo-img animate-spin" alt="Loading Tracks" style={{ opacity: 0.6 }} />
                </div>
              ) : (
                <div ref={scrollRef} onScroll={(e) => document.documentElement.style.setProperty('--scroll', e.target.scrollTop)} className="hide-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '160px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 1 }}>
                  {sortedTracks.length > 0 ? sortedTracks.map((track, index) => {
                    const isCurrentlyPlaying = currentTrack?.id === track.id;
                    const isDragged = draggedItemIndex === index;

                    return (
                      <div
                        key={track.id}
                        draggable={isEditing && sortMode === 'Manual' && activeDragHandle === index}
                        onDragStart={() => handleDragStart(index)}
                        onDragEnter={() => handleDragEnter(index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => !isEditing && handlePlayTrack(track)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px',
                          backgroundColor: isDragged ? 'var(--bg-hover)' : (isCurrentlyPlaying ? 'rgba(255,255,255,0.05)' : 'transparent'),
                          borderRadius: '12px', cursor: isEditing ? 'grab' : 'pointer',
                          transition: 'background-color 0.2s', opacity: isDragged ? 0.5 : 1,
                          border: isDragged ? '1px dashed var(--border-color)' : '1px solid transparent'
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = isCurrentlyPlaying || isDragged ? 'rgba(255,255,255,0.05)' : 'var(--bg-hover)'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = isCurrentlyPlaying || isDragged ? 'rgba(255,255,255,0.05)' : 'transparent'}
                      >
                        <div
                          style={{ width: '24px', textAlign: 'center', color: isCurrentlyPlaying ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: '600' }}
                          onPointerDown={() => isEditing && setActiveDragHandle(index)}
                          onPointerUp={() => setActiveDragHandle(null)}
                          onPointerLeave={() => setActiveDragHandle(null)}
                        >
                          {isEditing ? <GripVertical size={20} style={{ cursor: 'grab', touchAction: 'none' }} /> : (isCurrentlyPlaying && isPlaying ? <div className="equalizer-anim">...</div> : index + 1)}
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: 'var(--bg-input)', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <TrackThumbnail track={track} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontWeight: '600', color: isCurrentlyPlaying ? 'var(--primary-color)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track?.artists || track?.artist || 'Unknown Artist'}</span>
                        </div>
                        <span className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{formatDurationMs(track.duration, track.id)}</span>

                        {/* Edit Mode Actions */}
                        {isEditing && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowCopyDropdown(showCopyDropdown === track.id ? null : track.id); setShowMoveDropdown(null); }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
                              title="Copy to Playlist"
                            >
                              <Copy size={18} />
                            </button>

                            {showCopyDropdown === track.id && (
                              <div style={{ position: 'absolute', top: '100%', right: '80px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', zIndex: 10, minWidth: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '4px 8px', marginBottom: '4px', borderBottom: '1px solid var(--border-color)' }}>Copy to...</div>
                                {playlists.filter(p => p.id !== selectedPlaylist.id).length === 0 && (
                                  <div style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No other playlists</div>
                                )}
                                {playlists.filter(p => p.id !== selectedPlaylist.id).map(p => (
                                  <button
                                    key={p.id}
                                    onClick={(e) => handleCopyTrack(e, track, p.id)}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={(e) => { e.stopPropagation(); setShowMoveDropdown(showMoveDropdown === track.id ? null : track.id); setShowCopyDropdown(null); }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
                              title="Move to Playlist"
                            >
                              <Redo2 size={18} />
                            </button>

                            {/* Move Dropdown */}
                            {showMoveDropdown === track.id && (
                              <div style={{ position: 'absolute', top: '100%', right: '40px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', zIndex: 10, minWidth: '200px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '4px 8px', marginBottom: '4px', borderBottom: '1px solid var(--border-color)' }}>Move to...</div>
                                {playlists.filter(p => p.id !== selectedPlaylist.id).length === 0 && (
                                  <div style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No other playlists</div>
                                )}
                                {playlists.filter(p => p.id !== selectedPlaylist.id).map(p => (
                                  <button
                                    key={p.id}
                                    onClick={(e) => handleMoveTrack(e, track, p.id)}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={(e) => handleDeleteTrack(e, track.id)}
                              style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '8px' }}
                              title="Delete from device"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No tracks in this playlist.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .playlist-image-container:hover .image-edit-overlay {
          opacity: 1 !important;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {showUnsavedModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Unsaved Changes</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>You have unsaved changes. Do you want to save before leaving?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  setHasUnsavedChanges(false);
                  setPendingChanges({ moves: [], deletes: [], copies: [] });
                  const target = showUnsavedModal;
                  setShowUnsavedModal(null);
                  executeNavigation(target);
                }}
                style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', flex: 1, fontWeight: '600' }}
              >
                Discard
              </button>
              <button
                onClick={async () => {
                  await saveAllChanges();
                  const target = showUnsavedModal;
                  setShowUnsavedModal(null);
                  executeNavigation(target);
                }}
                style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)', border: 'none', cursor: 'pointer', flex: 1, fontWeight: '600' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreatePlaylistModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreatePlaylistModal(false)}
          onCreate={async (name) => {
            setShowCreatePlaylistModal(false);
            try {
              const res = await fetch('/api/playlists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), description: '', isPublic: false })
              });
              if (!res.ok) throw new Error('Failed to create cloud playlist');
              const newPlaylist = await res.json();
              loadPlaylists();
              setSelectedPlaylist(newPlaylist);
              setTracks([]);
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

      {showPlaylistSearchModal && (
        <PlaylistSearchModal
          playlists={playlists}
          onClose={() => setShowPlaylistSearchModal(false)}
          onPlaylistSaved={loadPlaylists}
          onPlaylistSelected={(playlist) => {
            setShowPlaylistSearchModal(false);
            loadPlaylistDetails({ ...playlist, isCloud: true, isOwner: false });
          }}
        />
      )}

      {/* Edit Name Modal */}
      {isEditingName && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '24px' }}>
          <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-input)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Rename Playlist</h3>
            <input
              autoFocus
              value={editNameValue}
              onChange={(e) => setEditNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '24px', outline: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setIsEditingName(false)}
                style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveName}
                style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'var(--primary-color)', color: '#000', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="show-on-mobile sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <div className={`show-on-mobile sidebar ${sidebarOpen ? 'open' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 9999 }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/white.png" width={24} height={24} className="logo-img animate-spin" alt="Beatzy Logo" />
            <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '0.5px' }}>Beatzy Playlists</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)} style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} />
          </button>
        </div>
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => { setSidebarOpen(false); handleNavigation('back'); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
              backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', textDecoration: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={18} /> <span style={{ fontWeight: '600' }}>Back to Beatzy</span>
          </button>

          <button
            onClick={() => { setSidebarOpen(false); handleCreatePlaylist(); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
              backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', marginBottom: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Plus size={18} /> <span style={{ fontWeight: '600' }}>Create Playlist</span>
          </button>

          <button
            onClick={() => { setSidebarOpen(false); setShowPlaylistSearchModal(true); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
              backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Search size={18} /> <span style={{ fontWeight: '600' }}>Search Playlists</span>
          </button>

          <PwaInstallButton variant="sidebar" />

          <div
            onClick={() => setIsPlaylistsExpanded(!isPlaylistsExpanded)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px',
              backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s', userSelect: 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Library size={18} /> <span style={{ fontWeight: '600' }}>My Playlists</span>
            </div>
            {isPlaylistsExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>

          {isPlaylistsExpanded && (
            <div className="hide-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '8px', marginTop: '4px', overflowY: 'auto', maxHeight: '50vh', flexShrink: 0 }}>
              {playlists.map(p => {
                const displayName = p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name;
                return (
                  <div
                    key={p.id}
                    className="history-item"
                    onClick={() => { setSidebarOpen(false); handleNavigation(p); }}
                    style={{ color: 'var(--text-secondary)', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    <Library size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
                    <span style={{ fontSize: '0.9rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
                    <div className="history-item-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (p.isOwner === false) {
                            handleSavePublicPlaylistDirect(p.id);
                          } else {
                            promptDeletePlaylist(e, p.id);
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.color = '#ff4d4f'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        title={p.isOwner === false ? "Remove from Library" : "Delete Playlist"}
                      >
                        {p.isOwner === false ? <BookmarkMinus size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Playlist Modal */}
      {playlistToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '16px', marginTop: 0 }}>Delete Playlist?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Are you sure you want to delete this playlist? This action cannot be undone, and will free up device storage.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPlaylistToDelete(null)}
                style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePlaylist}
                disabled={isDeletingPlaylist}
                style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#ff4d4f', color: '#fff', border: 'none', cursor: isDeletingPlaylist ? 'not-allowed' : 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', opacity: isDeletingPlaylist ? 0.7 : 1 }}
              >
                {isDeletingPlaylist ? <><Loader2 size={16} className="animate-spin" /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Rename Playlist Modal */}
      {isEditingName && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div className="animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', padding: '24px', borderRadius: '16px', position: 'relative' }}>
            <button onClick={() => setIsEditingName(false)} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Rename Playlist</h3>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveName(editNameValue); }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <input
                  autoFocus
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  placeholder="Playlist name..."
                  maxLength={15}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Max 15 characters</span>
                  <span style={{ fontSize: '0.8rem', color: editNameValue.length === 15 ? '#ff4d4f' : 'var(--text-secondary)' }}>
                    {editNameValue.length}/15
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!editNameValue.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: editNameValue.trim() ? 'var(--text-primary)' : 'var(--border-color)',
                  color: editNameValue.trim() ? 'var(--bg-main)' : 'var(--text-secondary)',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '600',
                  cursor: editNameValue.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                Save
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
