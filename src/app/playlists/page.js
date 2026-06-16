"use client";

import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Play, Pause, Trash2, Folder, Loader2, Plus, Edit2, Check, X, Redo2, Copy, Shuffle, GripVertical, Image as ImageIcon, Camera, ChevronDown, Menu, Library, ChevronRight, Disc3 } from 'lucide-react';
import { getPlaylists, deletePlaylist, getTracksForPlaylist, removeTrack, createPlaylist, updatePlaylist, moveTrackToPlaylist, copyTrackToPlaylist, reorderTracks } from '@/lib/db';
import { polyfill } from 'mobile-drag-drop';
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour';
import usePlayerStore from '@/store/usePlayerStore';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import { useRouter } from 'next/navigation';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
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

  const router = useRouter();
  const { playTrack, currentTrack, isPlaying, togglePlay, shuffle, toggleShuffle } = usePlayerStore();
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadPlaylists();

    // Enable HTML5 drag-and-drop on mobile touchscreens
    polyfill({
      dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
    });
    
    const touchmoveListener = () => {};
    window.addEventListener('touchmove', touchmoveListener, { passive: false });
    
    return () => {
      window.removeEventListener('touchmove', touchmoveListener);
    };
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const p = await getPlaylists();
      setPlaylists(p);
      
      const urlParams = new URLSearchParams(window.location.search);
      const targetId = urlParams.get('id');

      if (targetId) {
        const target = p.find(x => x.id === parseInt(targetId) || x.id === targetId);
        if (target) {
          loadPlaylistDetails(target);
          return;
        }
      }

      if (p.length > 0 && !selectedPlaylist) {
        loadPlaylistDetails(p[0]);
      } else if (selectedPlaylist) {
        const updated = p.find(x => x.id === selectedPlaylist.id);
        if (updated) setSelectedPlaylist(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
      const t = await getTracksForPlaylist(playlist.id);
      setTracks(t);
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
    try {
      await deletePlaylist(playlistToDelete);
      if (selectedPlaylist?.id === playlistToDelete) {
        setSelectedPlaylist(null);
        setTracks([]);
      }
      loadPlaylists();
    } catch (e) {
      console.error(e);
    } finally {
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
      if (shuffle) {
        const shuffled = [...tracks].sort(() => Math.random() - 0.5);
        playTrack(shuffled[0], shuffled);
      } else {
        playTrack(tracks[0], tracks);
      }
    }
  };

  const handlePlayTrack = (track) => {
    playTrack(track, tracks);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    playTrack(shuffled[0], shuffled);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPlaylist) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result;
        const updated = await updatePlaylist(selectedPlaylist.id, { coverArt: base64 });
        setSelectedPlaylist(updated);
        const p = await getPlaylists();
        setPlaylists(p);
      } catch (err) {
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveName = async () => {
    if (!editNameValue.trim() || !selectedPlaylist) {
      setIsEditingName(false);
      return;
    }
    try {
      const updated = await updatePlaylist(selectedPlaylist.id, { name: editNameValue.trim() });
      setSelectedPlaylist(updated);
      const p = await getPlaylists();
      setPlaylists(p);
      setIsEditingName(false);
    } catch (err) {
      console.error(err);
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

  const handleMoveTrack = (e, trackId, targetPlaylistId) => {
    e.stopPropagation();
    setPendingChanges(prev => ({ ...prev, moves: [...prev.moves, { trackId, targetPlaylistId }] }));
    setTracks(tracks.filter(t => t.id !== trackId));
    setHasUnsavedChanges(true);
    setShowMoveDropdown(null);
  };

  const handleCopyTrack = (e, trackId, targetPlaylistId) => {
    e.stopPropagation();
    setPendingChanges(prev => ({ ...prev, copies: [...prev.copies, { trackId, targetPlaylistId }] }));
    setHasUnsavedChanges(true);
    setShowCopyDropdown(null);
  };

  const saveAllChanges = async () => {
    if (!selectedPlaylist) return;
    for (const id of pendingChanges.deletes) {
      await removeTrack(id);
    }
    for (const move of pendingChanges.moves) {
      await moveTrackToPlaylist(move.trackId, move.targetPlaylistId);
    }
    for (const copy of pendingChanges.copies) {
      await copyTrackToPlaylist(copy.trackId, copy.targetPlaylistId);
    }
    await reorderTracks(selectedPlaylist.id, tracks.map(t => t.id));
    
    setPendingChanges({ moves: [], deletes: [], copies: [] });
    setHasUnsavedChanges(false);
    loadPlaylists();
  };

  const getSortedTracks = () => {
    let sorted = [...tracks];
    if (sortMode === "Old to New") {
      sorted.sort((a, b) => a.orderIndex - b.orderIndex);
    } else if (sortMode === "New to Old") {
      sorted.sort((a, b) => b.orderIndex - a.orderIndex);
    }
    return sorted;
  };

  const formatTotalDuration = () => {
    let totalSeconds = 0;
    tracks.forEach(t => {
      const parts = t.duration.split(':').reverse();
      totalSeconds += (parseInt(parts[0]) || 0) + (parseInt(parts[1]) || 0) * 60 + (parseInt(parts[2]) || 0) * 3600;
    });
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours} hr ${mins} min`;
    return `${mins} min`;
  };

  const sortedTracks = getSortedTracks();

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', overflow: 'hidden', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @media (min-width: 769px) {
          .show-on-mobile { display: none !important; }
        }
      `}} />
      <div className="playlist-page-container" style={{ flex: 1, minHeight: 0, padding: '24px', maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '32px', width: '100%' }}>
        
        {/* Playlists Sidebar */}
        <div className={`hide-scrollbar playlist-sidebar-mobile ${selectedPlaylist ? 'hidden-on-mobile' : ''}`} style={{ width: '300px', flexShrink: 0, borderRight: '1px solid var(--border-color)', paddingRight: '24px', display: 'flex', flexDirection: 'column', overflowY: 'auto', paddingBottom: '120px' }}>
          <div style={{ marginBottom: '24px' }}>
            <div onClick={() => handleNavigation('back')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}>
              <ArrowLeft size={18} /> Back to Search
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <Folder size={28} color="var(--primary-color)" /> My Playlists
            </h2>
            <button onClick={handleCreatePlaylist} title="Create Playlist" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-hover)', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
              <Plus size={20} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <Loader2 className="animate-spin" size={24} color="var(--text-secondary)" />
            </div>
          ) : playlists.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playlists.map(p => (
                <div 
                  key={p.id}
                  onClick={() => handleNavigation(p)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', 
                    backgroundColor: selectedPlaylist?.id === p.id ? 'var(--bg-hover)' : 'var(--bg-input)', 
                    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' 
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', overflow: 'hidden', flexShrink: 0 }}>
                    {p.coverArt ? (
                      <img src={p.coverArt} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                    )}
                  </div>
                  <span style={{ fontWeight: '600', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  <button 
                    onClick={(e) => promptDeletePlaylist(e, p.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.5 }}
                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                    onMouseOut={e => e.currentTarget.style.opacity = 0.5}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No offline playlists created yet.</p>
          )}
        </div>

        {/* Playlist Content View */}
        <div className={`playlist-content-mobile ${!selectedPlaylist ? 'hidden-on-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          {!selectedPlaylist ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <p>Select a playlist to view tracks</p>
            </div>
          ) : (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Header */}
              <div style={{ position: 'relative', paddingBottom: '150px', marginBottom: '-130px', flexShrink: 0 }}>
                {/* Blurred Background Overlay */}
                <div className="show-on-mobile" style={{
                  position: 'absolute',
                  top: '-24px', left: '-24px', right: '-24px', bottom: 0,
                  backgroundImage: selectedPlaylist?.coverArt ? `url(${selectedPlaylist.coverArt})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(40px) brightness(0.6)',
                  opacity: 0.8,
                  zIndex: -1,
                  WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)'
                }} />
                
                {/* Mobile Header Navbar */}
                <div className="show-on-mobile" style={{ width: '100%', display: 'flex', position: 'relative', zIndex: 1, padding: '0 0 16px 0', justifyContent: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--text-primary)', marginRight: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>
                      <Menu size={28} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Disc3 size={24} color="var(--text-primary)" className="animate-spin" />
                      <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '0.5px' }}>Beatzy Playlist</span>
                    </div>
                  </div>
                </div>

                <div className="playlist-header-mobile" style={{ display: 'flex', alignItems: 'flex-end', gap: '24px', position: 'relative', zIndex: 1 }}>

                {/* Playlist Image with Edit overlay */}
                <div 
                  className="playlist-image-container"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ flexShrink: 0, width: '200px', height: '200px', borderRadius: '16px', backgroundColor: 'var(--bg-input)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', position: 'relative', cursor: 'pointer', group: 'hover' }}
                >
                  {selectedPlaylist.coverArt ? (
                    <img src={selectedPlaylist.coverArt} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🎵</div>
                  )}
                  <div className="image-edit-overlay" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', color: '#fff' }}>
                    <Camera size={32} style={{ marginBottom: '8px' }} />
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Choose Photo</span>
                  </div>
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  
                  {/* Playlist Name Display */}
                  <h1 
                    onClick={() => { setEditNameValue(selectedPlaylist.name); setIsEditingName(true); }}
                    style={{ fontSize: 'clamp(1.6rem, 6vw, 3rem)', fontWeight: '800', margin: 0, marginBottom: '16px', lineHeight: '1.1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                    title="Click to rename"
                  >
                    {selectedPlaylist.name}
                  </h1>

                  <p style={{ color: 'var(--text-secondary)' }}>
                    {tracks.length} track{tracks.length !== 1 ? 's' : ''} • {formatTotalDuration()}
                  </p>
                  
                  {/* Buttons Row */}
                  <div className="playlist-actions-mobile" style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                      onClick={() => {
                        toggleShuffle();
                        if (!shuffle && tracks.length > 0) {
                          const shuffled = [...tracks].sort(() => Math.random() - 0.5);
                          playTrack(shuffled[0], shuffled);
                        }
                      }}
                      disabled={tracks.length === 0}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: shuffle ? 'var(--text-primary)' : 'var(--bg-hover)', color: shuffle ? '#000' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: tracks.length === 0 ? 'not-allowed' : 'pointer', opacity: tracks.length === 0 ? 0.5 : 1, transition: 'all 0.2s' }}
                      title="Toggle Shuffle"
                    >
                      <Shuffle size={20} />
                    </button>
                    <button 
                      onClick={handlePlayPlaylist}
                      disabled={tracks.length === 0}
                      style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: tracks.length === 0 ? 'not-allowed' : 'pointer', opacity: tracks.length === 0 ? 0.5 : 1 }}
                    >
                      {currentTrack && tracks.some(t => t.id === currentTrack.id) && isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: '4px' }} />}
                    </button>
                    <button 
                      onClick={async () => {
                        if (isEditing && hasUnsavedChanges) {
                          await saveAllChanges();
                        }
                        setIsEditing(!isEditing);
                      }}
                      style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: isEditing ? 'var(--primary-color)' : 'var(--bg-hover)', color: isEditing ? '#000' : 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                      title={isEditing ? "Finish Editing" : "Edit Playlist"}
                    >
                      {isEditing ? <Check size={20} /> : <Edit2 size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="playlist-toolbar-mobile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '0px', position: 'relative', zIndex: 1, flexShrink: 0 }}>
                <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Sort: {sortMode} <ChevronDown size={16} />
                  </button>
                  {showSortDropdown && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', zIndex: 10, minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                      {['Manual', 'Old to New', 'New to Old'].map(mode => (
                        <button 
                          key={mode}
                          onClick={() => { setSortMode(mode); setShowSortDropdown(false); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: sortMode === mode ? 'var(--bg-hover)' : 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px' }}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

              {/* Track List */}
              {loadingTracks ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', flexShrink: 0 }}>
                  <Loader2 className="animate-spin" size={32} color="var(--text-secondary)" />
                </div>
              ) : (
                <div className="hide-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '160px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', zIndex: 2 }}>
                  {sortedTracks.length > 0 ? sortedTracks.map((track, index) => {
                    const isCurrentlyPlaying = currentTrack?.id === track.id;
                    const isDragged = draggedItemIndex === index;
                    
                    return (
                      <div 
                        key={track.id}
                        draggable={isEditing && sortMode === 'Manual'}
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
                        <div style={{ width: '24px', textAlign: 'center', color: isCurrentlyPlaying ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: '600' }}>
                          {isEditing ? <GripVertical size={20} style={{ cursor: 'grab' }} /> : (isCurrentlyPlaying && isPlaying ? <div className="equalizer-anim">...</div> : index + 1)}
                        </div>
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', backgroundColor: 'var(--bg-input)', overflow: 'hidden' }}>
                          {(track.coverArt || track.thumbnail) && <img src={track.coverArt || track.thumbnail} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontWeight: '600', color: isCurrentlyPlaying ? 'var(--primary-color)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artists}</span>
                        </div>
                        <span className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{track.duration}</span>
                        
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
                                    onClick={(e) => handleCopyTrack(e, track.id, p.id)}
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
                                    onClick={(e) => handleMoveTrack(e, track.id, p.id)}
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
      <style dangerouslySetInnerHTML={{__html: `
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
              const newPlaylist = await createPlaylist(name);
              const p = await getPlaylists();
              setPlaylists(p);
              loadPlaylistDetails(newPlaylist);
            } catch (e) {
              console.error(e);
            }
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
            <Disc3 size={24} color="var(--text-primary)" className="animate-spin" />
            <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '0.5px' }}>Beatzy Playlists</span>
          </div>
          <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)} style={{ color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} />
          </button>
        </div>
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={() => { setSidebarOpen(false); executeNavigation('back'); }}
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
              borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Plus size={18} /> <span style={{ fontWeight: '600' }}>Create Playlist</span>
          </button>
          
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
                      onClick={(e) => { e.stopPropagation(); promptDeletePlaylist(e, p.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      onMouseOver={e => e.currentTarget.style.color = '#ff4d4f'}
                      onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      title="Delete Playlist"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )})}
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
                style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#ff4d4f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '600' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
