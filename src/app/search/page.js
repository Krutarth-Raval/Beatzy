'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Search, Play, Download, LogOut, Music, Loader2, X, Disc3, Menu, MessageSquare, Plus, Settings, Trash2, Moon, Sun, AlertTriangle, Home as HomeIcon, Mic, Library, ChevronDown, ChevronRight, ChevronLeft, Info, Camera, History, Check, Zap } from 'lucide-react';
import Tesseract from 'tesseract.js';
import PlaylistSaveModal from '@/components/PlaylistSaveModal';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import PlaylistSearchModal from '@/components/PlaylistSearchModal';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import usePlayerStore from '@/store/usePlayerStore';
import PwaInstallButton from '@/components/PwaInstallButton';
import useModalStore from '@/store/useModalStore';
import { useTheme } from '@/components/ThemeProvider';

function SearchContent() {
  const { showAlert } = useModalStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { currentTrack: globalTrack } = usePlayerStore();
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showPlaylistSearchModal, setShowPlaylistSearchModal] = useState(false);

  // Modes: 'extract', 'song', 'playlist'
  const [mode, setMode] = useState('extract');

  const [searchQuery, setSearchQuery] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');

  const [results, setResults] = useState([]); // YT search results
  const [playlistResults, setPlaylistResults] = useState([]); // Beatzy playlists results
  const [albumData, setAlbumData] = useState(null); // Spotify data

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  const [trackToSave, setTrackToSave] = useState(null);
  const [tracksToSave, setTracksToSave] = useState(null); // Array of tracks
  const [isInstantSaving, setIsInstantSaving] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null); // Requires: id (YT id), title

  // Download Popup State
  const [dlPopup, setDlPopup] = useState({ show: false, loading: false, url: null, error: null, title: '' });

  // Sidebar and History State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [resetCount, setResetCount] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isPlaylistsExpanded, setIsPlaylistsExpanded] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [historyItemToDelete, setHistoryItemToDelete] = useState(null);
  const [showViewAllHistoryModal, setShowViewAllHistoryModal] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(6);

  // Scroll to Top state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    const scrollContainer = document.querySelector('.main-area') || window;
    let scrollTimeout = null;
    
    const handleScroll = (e) => {
      const target = e.target === document ? window : e.target;
      const scrollTop = target.scrollY !== undefined ? target.scrollY : target.scrollTop;
      
      const scrolled = scrollTop > 300;
      
      setIsScrolling(true);
      setShowScrollTop(false);

      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        setIsScrolling(false);
        if (scrolled) {
          setShowScrollTop(true);
        }
      }, 300);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const savedHistoryExpanded = localStorage.getItem('isHistoryExpanded');
    if (savedHistoryExpanded !== null) {
      setIsHistoryExpanded(savedHistoryExpanded === 'true');
    }

    const savedPlaylistsExpanded = localStorage.getItem('isPlaylistsExpanded');
    if (savedPlaylistsExpanded !== null) {
      setIsPlaylistsExpanded(savedPlaylistsExpanded === 'true');
    }
  }, []);

  const toggleHistoryExpanded = () => {
    const newState = !isHistoryExpanded;
    setIsHistoryExpanded(newState);
    localStorage.setItem('isHistoryExpanded', newState);
  };

  const togglePlaylistsExpanded = () => {
    const newState = !isPlaylistsExpanded;
    setIsPlaylistsExpanded(newState);
    localStorage.setItem('isPlaylistsExpanded', newState);
  };

  const loadSidebarPlaylists = async () => {
    try {
      let cloudP = [];
      try {
        const res = await fetch('/api/playlists', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          cloudP = [
            ...(data.owned || []).map(p => ({ ...p, isCloud: true, isOwner: true })),
            ...(data.saved || []).map(p => ({ ...p, isCloud: true, isOwner: false }))
          ];
        }
      } catch (e) {
        console.error('Failed to load cloud playlists for sidebar', e);
      }
      setPlaylists(cloudP);
    } catch (error) {
      console.error(error);
    }
  };

  const handleInstantSave = async () => {
    if (!session?.user) {
      showAlert('You must be logged in to save playlists.');
      return;
    }
    
    setIsInstantSaving(true);
    try {
      // 1. Create Playlist
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: albumData.title, 
          description: '', 
          isPublic: false,
          coverImage: albumData.coverArt || null
        })
      });
      
      if (!res.ok) throw new Error('Failed to create playlist');
      const newPlaylist = await res.json();
      
      // 2. Add all songs
      const bulkRes = await fetch(`/api/playlists/${newPlaylist.id}/songs/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: albumData.tracks })
      });
      
      if (!bulkRes.ok) throw new Error('Failed to add tracks');
      
      showAlert('Playlist saved instantly!', 'success');
      loadSidebarPlaylists();
    } catch (error) {
      console.error(error);
      showAlert('Failed to save playlist instantly.');
    } finally {
      setIsInstantSaving(false);
    }
  };

  useEffect(() => {
    loadSidebarPlaylists();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    const t = searchParams.get('type');
    if (q) {
      if (t === 'spotify') {
        setMode('extract');
        setSpotifyUrl(q);
        triggerExtract(q, true);
      } else {
        setMode('song');
        setSearchQuery(q);
        triggerSearch(q, true);
      }
    }
  }, [searchParams]);

  const handleSidebarCreatePlaylist = () => {
    setShowCreatePlaylistModal(true);
  };

  const handlePlayPlaylistDirectly = async (playlistId) => {
    try {
      const res = await fetch(`/api/playlists/${playlistId}`);
      if (res.ok) {
        const data = await res.json();
        const t = data.tracks || [];
        if (t.length > 0) {
          const usePlayerStore = (await import('@/store/usePlayerStore')).default;
          usePlayerStore.getState().playTrack(t[0], t);
        } else {
          showAlert("Empty Playlist", "This playlist is empty.");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async (page = 0) => {
    if (!session?.user) return;
    try {
      if (page > 0) setLoadingMoreHistory(true);
      const res = await fetch(`/api/history?page=${page}`);
      if (res.ok) {
        const data = await res.json();
        setHasMoreHistory(data.hasMore);
        if (page === 0) {
          setHistory(data.items);
        } else {
          setHistory(prev => [...prev, ...data.items]);
        }
        setHistoryPage(page);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      if (page > 0) setLoadingMoreHistory(false);
    }
  };

  const handleScrollHistory = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasMoreHistory && !loadingMoreHistory) {
      fetchHistory(historyPage + 1);
    }
  };

  useEffect(() => {
    fetchHistory(0);
  }, [session]);

  const addToHistory = async (item) => {
    // Prevent consecutive duplicate entries
    if (history.length > 0 && history[0].query === item.query && history[0].type === item.type) {
      return;
    }

    // Optimistic update locally
    setHistory(prev => [item, ...prev]);

    if (session?.user) {
      try {
        await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      } catch (err) {
        console.error('Failed to save history to DB', err);
      }
    }
  };

  const deleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    setHistoryItemToDelete(id);
    setShowDeleteSingleHistoryModal(true);
  };

  const confirmDeleteSingleHistory = async () => {
    if (!historyItemToDelete) return;
    setHistory(prev => prev.filter(item => item.id !== historyItemToDelete));
    setShowDeleteSingleHistoryModal(false);
    if (session?.user && historyItemToDelete) {
      fetch(`/api/history?id=${historyItemToDelete}`, { method: 'DELETE' }).catch(console.error);
    }
  };

  const promptClearAllHistory = () => {
    setSettingsOpen(false);
    setShowClearHistoryModal(true);
  };

  const confirmClearAllHistory = async () => {
    setHistory([]);
    setShowClearHistoryModal(false);
    if (session?.user) {
      fetch('/api/history', { method: 'DELETE' }).catch(console.error);
    }
  };

  const deleteAccount = async () => {
    setSettingsOpen(false);
    setShowDeleteAccountModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (session?.user) {
      await fetch('/api/account', { method: 'DELETE' });
      signOut();
    }
  };

  const loadHistoryItem = (item) => {
    setSidebarOpen(false);
    setShowViewAllHistoryModal(false);
    if (item.type === 'search') {
      setMode('song');
      setSearchQuery(item.query);
      setTimeout(() => triggerSearch(item.query, true), 0);
    } else {
      setMode('extract');
      setSearchQuery(item.query);
      setTimeout(() => triggerExtract(item.query, true), 0);
    }
  };

  const triggerSearch = async (queryToSearch, fromHistory = false) => {
    if (!queryToSearch) return;
    setLoading(true); setError(''); setResults([]); setAlbumData(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryToSearch)}&type=music`);

      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error('Server returned an invalid response (HTML instead of JSON). This usually means the server crashed.');
      }

      if (!res.ok) throw new Error(data?.error || 'Unknown server error');

      setResults(data);
      if (!fromHistory) {
        const image = data.length > 0 ? (data[0].thumbnail || data[0].coverArt) : null;
        addToHistory({ type: 'search', query: queryToSearch, title: queryToSearch, image });
      }

      // Fetch Beatzy Playlists concurrently or subsequently
      try {
        const playlistRes = await fetch(`/api/playlists/search?q=${encodeURIComponent(queryToSearch)}`);
        if (playlistRes.ok) {
          const playlistData = await playlistRes.json();
          setPlaylistResults(playlistData);
        }
      } catch (err) {
        console.error('Failed to fetch playlist results', err);
      }

    } catch (err) {
      showAlert("Search Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerExtract = async (url, fromHistory = false) => {
    if (!url) return;
    setLoading(true); setError(''); setAlbumData(null); setResults([]); setPlaylistResults([]);
    try {
      const isYouTube = url.includes('youtube.com/playlist') || url.includes('music.youtube.com/playlist');
      const apiEndpoint = isYouTube ? '/api/yt-playlist' : '/api/spotify';

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      let data;
      try {
        data = await res.json();
      } catch (err) {
        throw new Error('Server returned an invalid response (HTML instead of JSON). This usually means the server crashed.');
      }

      if (!res.ok) throw new Error(data?.error || 'Unknown server error');

      const formattedTracks = data.tracks.map(t => {
        let id = t.id || '';
        if (!isYouTube && !id.includes('spotify:')) {
          id = `spotify:track:${id}`;
        }
        return {
          ...t,
          id,
          thumbnail: t.thumbnail || t.coverArt || (isYouTube ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
          coverArt: t.coverArt || t.thumbnail || (isYouTube ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
          title: t.title || t.name,
          artist: t.artist || t.artists,
          type: isYouTube ? 'youtube' : 'spotify'
        };
      });

      setAlbumData({
        ...data,
        tracks: formattedTracks,
        displayType: isYouTube ? 'YouTube Playlist' : (data.type === 'album' ? 'Spotify Album' : 'Spotify Playlist')
      });
      if (!fromHistory) {
        addToHistory({ type: 'spotify', query: url, title: data.title || url, image: data.coverArt || data.thumbnail });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    
    if (mode === 'extract') {
      triggerExtract(query);
    } else if (mode === 'playlist') {
      triggerSearch(query);
    } else {
      triggerSearch(query);
    }
  };

  const playYTTrack = (track) => {
    setCurrentTrack({ id: track.id, title: track.title });
  };

  const playTrack = async (track) => {
    setCurrentTrack({ id: 'loading', title: 'Searching YouTube...' });
    try {
      const primaryArtist = track.artist || (track.artists || '').split(',')[0].trim();
      // Include album name in query when available — helps find the exact version
      const query = track.album
        ? `${track.name} ${primaryArtist} ${track.album}`
        : `${track.name} ${primaryArtist}`;
      const params = new URLSearchParams({
        q: query,
        type: 'music',
        bestMatch: '1',
        songName: track.name,
        artist: primaryArtist,
      });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCurrentTrack({ id: data[0].id, title: track.name });
      } else {
        showAlert("Not Found", "Could not find this song on YouTube.");
        setCurrentTrack(null);
      }
    } catch (e) {
      showAlert("Error", "Error finding song.");
      setCurrentTrack(null);
    }
  };

  const downloadTrack = (track) => {
    setTrackToSave({ 
      ...track, 
      type: 'spotify',
      title: track.title || track.name,
      artist: track.artist || track.artists,
      name: track.name || track.title,
      artists: track.artists || track.artist
    });
  };

  const handleDownloadYT = (track) => {
    setTrackToSave({ 
      ...track, 
      type: 'youtube',
      name: track.name || track.title,
      artists: track.artists || track.artist,
      title: track.title || track.name,
      artist: track.artist || track.artists,
      coverArt: track.coverArt || track.thumbnail
    });
  };

  const downloadTrackDirectly = async (track) => {
    setDlPopup({ show: true, loading: true, url: null, error: null, title: track.name });
    try {
      const primaryArtist = track.artist || (track.artists || '').split(',')[0]?.trim() || '';
      // Include album name in query when available — helps find the exact version
      const query = track.album
        ? `${track.name} ${primaryArtist} ${track.album}`
        : `${track.name} ${primaryArtist}`;
      const params = new URLSearchParams({
        q: query,
        type: 'music',
        bestMatch: '1',
        songName: track.name,
        artist: primaryArtist,
      });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (data && data.length > 0) {
        fetchDirectDownload(data[0].id, track.name);
      } else {
        setDlPopup(prev => ({ ...prev, loading: false, error: "Could not find this song for download." }));
      }
    } catch (e) {
      setDlPopup(prev => ({ ...prev, loading: false, error: "Error finding download link." }));
    }
  };

  const handleSaveDirectly = (track) => {
    setTrackToSave(null);
    if (track.type === 'spotify') {
      downloadTrackDirectly(track);
    } else {
      setDlPopup({ show: true, loading: true, url: null, error: null, title: track.title || track.name });
      fetchDirectDownload(track.id, track.title || track.name);
    }
  };

  const fetchDirectDownload = async (id, title) => {
    try {
      const res = await fetch(`/api/download?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const isFallback = data.url && (
        data.url.includes('omenrosebank') || 
        data.url.includes('fallback') || 
        data.url.includes('australie-eta') || 
        data.url.includes('lapinede') || 
        data.url.includes('mygomp3')
      );

      if (!isFallback) {
        // Automatically trigger the direct download stream via our local API proxy
        const link = document.createElement('a');
        link.href = `/api/download-direct?id=${id}`;
        link.download = `${title}.m4a`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Hide the popup immediately since the download has started
        setDlPopup({ show: false, loading: false, url: null, error: null, title: '' });
      } else {
        // Show fallback modal with the third-party link
        setDlPopup(prev => ({ ...prev, loading: false, url: data.url, title: data.title || title }));
      }
    } catch (e) {
      setDlPopup(prev => ({ ...prev, loading: false, error: e.message || "Failed to extract high quality link." }));
    }
  };

  const closePlayer = () => { setCurrentTrack(null); };

  const resetState = () => {
    setResults([]);
    setAlbumData(null);
    setSearchQuery('');
    setSpotifyUrl('');
    setSidebarOpen(false);
    setIsListening(false);
    setResetCount(prev => prev + 1);
  };

  const handleVoiceSearch = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Your browser does not support voice search (Web Speech API).");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(''); // clear previous errors
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'not-allowed') {
          setError("Microphone access denied. Please check your permissions.");
        } else if (event.error === 'no-speech' || event.error === 'aborted') {
          // ignore
        } else {
          setError(`Voice search error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setError("Voice search couldn't be started on this device/browser.");
      setIsListening(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setMode('search');
    setIsAnalyzingImage(true);
    setSearchQuery('Reading lyrics from image...');

    try {
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng',
        { logger: m => console.log(m) }
      );

      const cleanedText = text.trim().replace(/\n/g, ' ');
      setSearchQuery(cleanedText);
      if (cleanedText) {
        triggerSearch(cleanedText);
      } else {
        setError("Couldn't read any text from the image.");
        setSearchQuery('');
      }
    } catch (err) {
      console.error(err);
      setError("Failed to process image.");
      setSearchQuery('');
    } finally {
      setIsAnalyzingImage(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', height: '100dvh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#212121' }}>
        <Loader2 className="animate-spin" size={48} color="var(--text-primary)" />
      </div>
    );
  }

  if (!session && isOnline && status !== 'loading') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem', backgroundColor: '#212121', color: 'var(--text-primary)' }}>
        <div style={{ padding: '3rem', maxWidth: '500px', width: '100%' }}>
          <img src="/white.png" width={64} height={64} className="logo-img animate-spin" style={{ marginBottom: '1.5rem' }} alt="Beatzy Logo" />
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700' }}>Beatzy</h1>
          <p style={{ color: '#ececec', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
            Extract albums, search songs, and download MP3s effortlessly.
          </p>
          <button
            onClick={() => signIn('google')}
            style={{
              backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              width: '100%'
            }}
          >
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mode-cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; width: 100%; margin-bottom: 40px; animation-delay: 0.1s; }
        .recent-activity-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        @media (max-width: 600px) {
          .mode-cards-grid { grid-template-columns: repeat(2, 1fr); }
          .mode-cards-grid > div:nth-child(3) { grid-column: span 2; }
          .recent-activity-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 400px) {
          .recent-activity-grid { grid-template-columns: repeat(1, 1fr); }
        }
      `}} />

        {/* Scrollable Content */}
        <div className="content-scroll">
          {!isOnline ? (
            <div key="offline-state" className="animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-secondary)', textAlign: 'center' }}>
              <AlertTriangle size={64} style={{ marginBottom: '24px', opacity: 0.5 }} />
              <h2 style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px' }}>You are offline</h2>
              <p style={{ maxWidth: '400px', marginBottom: '32px', lineHeight: '1.5' }}>It looks like you've lost your internet connection. You can still listen to your saved offline playlists.</p>
              
              {playlists.length > 0 ? (
                <button
                  onClick={() => router.push('/playlists')}
                  style={{
                    backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)',
                    padding: '12px 32px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '10px', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.opacity = 0.8}
                  onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                >
                  <Library size={20} /> Go to Playlists
                </button>
              ) : (
                <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '16px', backgroundColor: 'var(--bg-hover)', borderRadius: '8px' }}>You don't have any offline playlists saved yet.</p>
              )}
            </div>
          ) : (
            <>
              <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                
                {/* Centralized Search Input */}
                <div className="input-box-container" style={{ width: '100%', maxWidth: '100%', marginBottom: '1px', padding: '4px 12px' }}>
                  <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                    <input
                      type="text"
                      className="search-input"
                      placeholder={mode === 'extract' ? 'Extract Spotify or YouTube playlist...' : mode === 'song' ? 'Search for a song...' : 'Search for Beatzy playlists...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzingImage} style={{ background: 'none', border: 'none', color: isAnalyzingImage ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: isAnalyzingImage ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', transition: 'color 0.2s' }}>
                      {isAnalyzingImage ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                    </button>
                    <button type="button" onClick={handleVoiceSearch} style={{ background: 'none', border: 'none', color: isListening ? '#ff4d4f' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', transition: 'color 0.2s', animation: isListening ? 'pulse 1.5s infinite' : 'none' }}>
                      {isListening ? <X size={20} /> : <Mic size={20} />}
                    </button>
                    <button type="submit" disabled={loading || !searchQuery} style={{ backgroundColor: loading || !searchQuery ? 'var(--border-color)' : 'var(--text-primary)', color: loading || !searchQuery ? 'var(--text-secondary)' : 'var(--bg-main)', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', border: 'none', cursor: loading || !searchQuery ? 'not-allowed' : 'pointer' }}>
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                    </button>
                  </form>
                </div>
                  
                {/* Mode Selector Tabs */}
                <div className="hide-scrollbar" style={{ display: 'inline-flex', gap: '4px', alignSelf: 'flex-start', background: 'var(--bg-input)', borderRadius: '10px', padding: '3px', marginBottom: '32px', maxWidth: '100%', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                  <button type="button" onClick={() => setMode('extract')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: mode === 'extract' ? 'var(--primary-color)' : 'transparent', color: mode === 'extract' ? 'var(--bg-main)' : 'var(--text-secondary)', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.9rem' }}>
                    <Zap size={14} /> <span className={mode === 'extract' ? '' : 'hide-on-mobile'}>Extract Mode</span>
                  </button>
                  <button type="button" onClick={() => setMode('song')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: mode === 'song' ? 'var(--primary-color)' : 'transparent', color: mode === 'song' ? 'var(--bg-main)' : 'var(--text-secondary)', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.9rem' }}>
                    <Search size={14} /> <span className={mode === 'song' ? '' : 'hide-on-mobile'}>Song Search</span>
                  </button>
                  <button type="button" onClick={() => setMode('playlist')} style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: mode === 'playlist' ? 'var(--primary-color)' : 'transparent', color: mode === 'playlist' ? 'var(--bg-main)' : 'var(--text-secondary)', fontWeight: '600', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', flexShrink: 0, fontSize: '0.9rem' }}>
                    <Library size={14} /> <span className={mode === 'playlist' ? '' : 'hide-on-mobile'}>Playlists</span>
                  </button>
                </div>

                {/* Recent Activity Mini View */}
                {!albumData && results.length === 0 && !loading && history.length > 0 && (
                  <div className="animate-fade-in-up" style={{ width: '100%', marginBottom: '24px', animationDelay: '0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                      <h3 style={{ fontWeight: '600', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><History size={20} /> Recent Activity</h3>
                      <button onClick={() => setShowClearHistoryModal(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }} className="hover-scale">Clear All</button>
                    </div>
                    <div className="recent-activity-grid">
                      {history.slice(0, Math.min(24, visibleHistoryCount)).map((item, idx) => {
                        const hue = (idx * 137.5) % 360;
                        return (
                          <div key={item.id || idx} className="hover-scale" style={{ background: 'var(--bg-input)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            {/* Mode Icon at top right */}
                            <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', padding: '6px', borderRadius: '50%', color: '#fff', zIndex: 10, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {item.type === 'search' ? <Search size={14} /> : <Zap size={14} />}
                            </div>
                            
                            <div onClick={() => loadHistoryItem(item)} style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column' }}>
                              {/* Image Header */}
                              <div style={{ height: '180px', background: item.image ? `url(${item.image}) center/cover no-repeat` : `linear-gradient(135deg, hsl(${hue}, 70%, 20%), hsl(${(hue + 60) % 360}, 70%, 10%))`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {!item.image && (item.type === 'search' ? <Search size={64} color="rgba(255,255,255,0.15)" /> : <Zap size={64} color="rgba(255,255,255,0.15)" />)}
                              </div>
                              {/* Card Body - Clamped Text */}
                              <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, paddingRight: '8px' }}>
                                  {item.title}
                                </span>
                                <button onClick={(e) => { e.stopPropagation(); deleteHistoryItem(e, item.id); }} style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', color: 'var(--text-secondary)' }} className="hover-scale">
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {history.length > visibleHistoryCount && visibleHistoryCount < 24 && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
                        <button onClick={() => setVisibleHistoryCount(prev => Math.min(24, prev + 6))} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 24px', borderRadius: '20px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s' }} className="hover-scale">
                          View More
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

          {/* Spotify Results Section */}
          {albumData && (
            <div className="animate-fade-in album-data-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 768px) {
                  .album-data-wrapper .album-header-flex {
                    flex-direction: column !important;
                    align-items: center !important;
                    text-align: center !important;
                    gap: 1.5rem !important;
                  }
                  .album-data-wrapper .album-text-section {
                    flex-basis: auto !important;
                    width: 100% !important;
                  }
                  .album-data-wrapper .album-buttons-flex {
                    justify-content: center !important;
                    width: 100% !important;
                  }
                  .album-data-wrapper .album-buttons-flex > button {
                    flex: 1 !important;
                  }
                }
              `}} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {albumData.displayType || albumData.type || 'Playlist'}
                </h3>
                <button onClick={resetState} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s' }} className="hover-scale" onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                  <X size={14} /> New Search
                </button>
              </div>
              <div className="album-header-flex" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '2rem', marginBottom: '2rem' }}>
                {albumData.coverArt && (
                  <img
                    src={albumData.coverArt}
                    alt="Cover"
                    draggable={false}
                    style={{ width: '150px', height: '150px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', flexShrink: 0 }}
                  />
                )}
                <div className="album-text-section" style={{ flex: '1 1 300px', minWidth: 0 }}>
                  <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', fontWeight: '700', marginBottom: '0.5rem', lineHeight: '1.2', wordBreak: 'break-word' }}>{albumData.title}</h1>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>{albumData.tracks.length} tracks available</p>
                  <div className="album-buttons-flex" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button onClick={() => setTracksToSave(albumData.tracks)} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', transition: 'background-color 0.2s', whiteSpace: 'nowrap', justifyContent: 'center' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}>
                      <Plus size={18} /> Add All
                    </button>
                    <button onClick={handleInstantSave} disabled={isInstantSaving} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: 'var(--primary-color)', color: 'var(--bg-main)', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '0.95rem', cursor: isInstantSaving ? 'not-allowed' : 'pointer', border: 'none', opacity: isInstantSaving ? 0.7 : 1, transition: 'opacity 0.2s', whiteSpace: 'nowrap', justifyContent: 'center' }}>
                      {isInstantSaving ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} Save Instantly
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                {albumData.tracks.map((track, index) => (
                  <div
                    key={`${track.id}-${index}`}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '12px',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={{ width: '32px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{index + 1}</span>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <h4 style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.name}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track?.artists || track?.artist || 'Unknown Artist'}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => playTrack(track)} style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                        <Play size={16} />
                      </button>
                      <button onClick={() => downloadTrack(track)} style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Search Results Section */}
          {results.length > 0 && (
            <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Search Results</h3>
                <button onClick={resetState} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s' }} className="hover-scale" onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-secondary)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                  <X size={14} /> New Search
                </button>
              </div>
              <div className="results-grid">
                {results.map((track) => (
                  <div key={track.id} className="track-card">
                    <div style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000' }}>
                      <img 
                        src={track.thumbnail} 
                        alt={track.title} 
                        draggable={false} 
                        onError={(e) => {
                          if (!e.target.dataset.error) {
                            e.target.dataset.error = true;
                            if (track.thumbnail.includes('googleusercontent')) {
                              e.target.src = track.thumbnail.split('=')[0];
                            } else {
                              e.target.src = track.thumbnail.replace('/maxresdefault', '/mqdefault').replace('/hqdefault', '/mqdefault');
                            }
                          }
                        }}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} 
                      />
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {track.duration}
                      </div>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{track.title}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>{track.artist}</p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                        <button onClick={() => playYTTrack(track)} style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
                          <Play size={16} /> Play
                        </button>
                        <button onClick={() => handleDownloadYT(track)} style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
                          <Plus size={16} /> Save
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {playlistResults.length > 0 && (
                <div style={{ marginTop: '40px', paddingBottom: '20px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>Beatzy Playlists</h2>
                  <div className="results-grid">
                    {playlistResults.map((playlist, i) => (
                      <div key={`playlist-${playlist.id}-${i}`} className="track-card animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, cursor: 'pointer' }} onClick={() => router.push(`/?id=${playlist.id}`)}>
                        <div style={{ position: 'relative', paddingTop: '100%', backgroundColor: 'var(--bg-input)' }}>
                          {playlist.coverImage ? (
                            <img src={playlist.coverImage} alt={playlist.name} loading="lazy" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                              <Music size={40} />
                            </div>
                          )}
                        </div>
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <h3 style={{ fontWeight: '600', marginBottom: '4px', fontSize: '1.1rem' }}>{playlist.name}</h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>by {playlist.ownerName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>


        {/* Global YouTube Player Modal */}
        {currentTrack && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: '20px' }}>
            <div className="glass-panel animate-fade-in" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontWeight: '600', fontSize: '1.2rem', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {currentTrack.title}
                </h4>
                <button onClick={closePlayer} style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-main)', borderRadius: '50%', padding: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}>
                  <X size={20} />
                </button>
              </div>
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden', background: 'black', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                {currentTrack.id === 'loading' ? (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Loader2 className="animate-spin" size={48} color="white" />
                  </div>
                ) : (
                  <iframe style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Log Out Modal */}
        {showSignOutModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass-panel animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', padding: '24px', width: '100%', maxWidth: '400px', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Log out?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>Are you sure you want to log out of Beatzy?</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowSignOutModal(false)} style={{ padding: '8px 16px', color: 'var(--text-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: '600' }}>Cancel</button>
                <button onClick={() => signOut()} style={{ padding: '8px 16px', backgroundColor: '#ff4d4f', color: 'white', borderRadius: '8px', fontWeight: '600' }}>Log out</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteAccountModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass-panel animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', padding: '24px', width: '100%', maxWidth: '400px', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#ff4d4f' }}>Delete Account?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>This action is permanent. All your search history will be deleted. Are you absolutely sure?</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowDeleteAccountModal(false)} style={{ padding: '8px 16px', color: 'var(--text-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: '600' }}>Cancel</button>
                <button onClick={confirmDeleteAccount} style={{ padding: '8px 16px', backgroundColor: '#ff4d4f', color: 'white', borderRadius: '8px', fontWeight: '600' }}>Delete forever</button>
              </div>
            </div>
          </div>
        )}



        {/* Clear History Modal */}
        {showClearHistoryModal && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="glass-panel animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', padding: '24px', width: '100%', maxWidth: '400px', borderRadius: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>Clear all history?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>This will permanently remove all your recent searches from all devices.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowClearHistoryModal(false)} style={{ padding: '8px 16px', color: 'var(--text-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: '600' }}>Cancel</button>
                <button onClick={confirmClearAllHistory} style={{ padding: '8px 16px', backgroundColor: '#ff4d4f', color: 'white', borderRadius: '8px', fontWeight: '600' }}>Clear all</button>
              </div>
            </div>
          </div>
        )}



        {/* Direct Download Popup Modal */}
        {dlPopup.show && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '16px', position: 'relative', textAlign: 'center' }}>
              <button onClick={() => setDlPopup({ show: false, loading: false, url: null, error: null, title: '' })} style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: '600' }}>Download MP3</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{dlPopup.title}</p>
              {dlPopup.loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <Loader2 className="animate-spin" size={32} color="var(--text-primary)" />
                  <p>Extracting High Quality Link...</p>
                </div>
              )}
              {dlPopup.error && (<div style={{ color: '#ff6b6b' }}><p>{dlPopup.error}</p></div>)}
              {dlPopup.url && (
                <a href={dlPopup.url} target="_blank" rel="noopener noreferrer" download onClick={() => setTimeout(() => setDlPopup(prev => ({ ...prev, show: false })), 500)} style={{ display: 'inline-flex', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)', padding: '12px 32px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '600', alignItems: 'center', gap: '10px' }}>
                  <Download size={20} /> Download Now
                </a>
              )}
            </div>
          </div>
        )}

        {(trackToSave || tracksToSave) && (
          <PlaylistSaveModal 
            track={trackToSave} 
            tracks={tracksToSave}
            onClose={() => { setTrackToSave(null); setTracksToSave(null); loadSidebarPlaylists(); }} 
          />
        )}

        {showCreatePlaylistModal && (
          <CreatePlaylistModal 
            onClose={() => setShowCreatePlaylistModal(false)}
            onPlaylistCreated={loadSidebarPlaylists}
          />
        )}

        {showPlaylistSearchModal && (
          <PlaylistSearchModal
            onClose={() => setShowPlaylistSearchModal(false)}
            onPlaylistSaved={loadSidebarPlaylists}
            track={trackToSave}
          />
        )}

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={() => {
              const scrollContainer = document.querySelector('.main-area') || window;
              scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover-scale animate-fade-in"
            style={{
              position: 'fixed',
              bottom: '160px',
              right: '24px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-color)',
              color: 'var(--bg-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 900,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
        )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-main)' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--text-primary)' }} />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
