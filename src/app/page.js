'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Search, Play, Download, LogOut, Music, Loader2, X, Disc3, Menu, MessageSquare, Plus } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();

  // Modes: 'search' or 'spotify'
  const [mode, setMode] = useState('spotify');

  const [searchQuery, setSearchQuery] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');

  const [results, setResults] = useState([]); // YT search results
  const [albumData, setAlbumData] = useState(null); // Spotify data

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentTrack, setCurrentTrack] = useState(null); // Requires: id (YT id), title

  // Download Popup State
  const [dlPopup, setDlPopup] = useState({ show: false, loading: false, url: null, error: null, title: '' });

  // Sidebar and History State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const fetchHistory = async () => {
    if (!session?.user) return;
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load history', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [session]);

  const addToHistory = async (item) => {
    // Optimistic update locally
    setHistory(prev => {
      const newHistory = [item, ...prev.filter(i => i.query !== item.query)].slice(0, 50);
      return newHistory;
    });

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

  const loadHistoryItem = (item) => {
    setSidebarOpen(false);
    if (item.type === 'search') {
      setMode('search');
      setSearchQuery(item.query);
      // Wait for state to update, then trigger search
      setTimeout(() => triggerSearch(item.query), 0);
    } else {
      setMode('spotify');
      setSpotifyUrl(item.query);
      setTimeout(() => triggerExtract(item.query), 0);
    }
  };

  const triggerSearch = async (query) => {
    if (!query) return;
    setLoading(true); setError(''); setResults([]); setAlbumData(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
      addToHistory({ type: 'search', query, title: query });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const triggerExtract = async (url) => {
    if (!url) return;
    setLoading(true); setError(''); setAlbumData(null); setResults([]);
    try {
      const isYouTube = url.includes('youtube.com/playlist') || url.includes('music.youtube.com/playlist');
      const apiEndpoint = isYouTube ? '/api/yt-playlist' : '/api/spotify';

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAlbumData(data);
      addToHistory({ type: 'spotify', query: url, title: data.title || url });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => { e.preventDefault(); triggerSearch(searchQuery); };
  const handleExtract = (e) => { e.preventDefault(); triggerExtract(spotifyUrl); };

  const playYTTrack = (track) => {
    setCurrentTrack({ id: track.id, title: track.title });
  };

  const playTrack = async (track) => {
    setCurrentTrack({ id: 'loading', title: 'Searching YouTube...' });
    try {
      const query = `${track.name} ${track.artists}`;
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setCurrentTrack({ id: data[0].id, title: track.name });
      } else {
        alert("Could not find this song on YouTube.");
        setCurrentTrack(null);
      }
    } catch (e) {
      alert("Error finding song.");
      setCurrentTrack(null);
    }
  };

  const downloadTrack = async (track) => {
    setDlPopup({ show: true, loading: true, url: null, error: null, title: track.name });
    try {
      const query = `${track.name} ${track.artists}`;
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
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

  const handleDownloadYT = (track) => {
    setDlPopup({ show: true, loading: true, url: null, error: null, title: track.title });
    fetchDirectDownload(track.id, track.title);
  };

  const fetchDirectDownload = async (id, title) => {
    try {
      const res = await fetch(`/api/download?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDlPopup(prev => ({ ...prev, loading: false, url: data.url, title: data.title || title }));
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
  };

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', height: '100dvh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#212121' }}>
        <Loader2 className="animate-spin" size={48} color="white" />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '2rem', backgroundColor: '#212121', color: 'white' }}>
        <div style={{ padding: '3rem', maxWidth: '500px', width: '100%' }}>
          <Disc3 size={64} color="white" style={{ marginBottom: '1.5rem' }} className="animate-spin" />
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', fontWeight: '700' }}>Beatzy</h1>
          <p style={{ color: '#ececec', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
            Extract albums, search songs, and download MP3s effortlessly.
          </p>
          <button
            onClick={() => signIn('google')}
            style={{
              backgroundColor: 'white',
              color: 'black',
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
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Disc3 size={24} color="white" className="animate-spin" />
          <span style={{ color: 'white', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '0.5px' }}>Beatzy</span>
        </div>
        <div style={{ padding: '12px' }}>
          <button
            onClick={resetState}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
              backgroundColor: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <Plus size={18} /> <span style={{ fontWeight: '600' }}>New Extraction</span>
          </button>
        </div>

        <div className="history-list">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '8px 12px', marginTop: '12px' }}>Recent</p>
          {history.map((item, i) => (
            <div key={i} className="history-item" onClick={() => loadHistoryItem(item)}>
              <MessageSquare size={16} style={{ flexShrink: 0, opacity: 0.7 }} />
              <span style={{ fontSize: '0.9rem' }}>{item.title}</span>
            </div>
          ))}
          {history.length === 0 && (
            <p style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No history yet.</p>
          )}
        </div>

        {/* User Profile Area */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
              {session.user.name?.charAt(0) || 'U'}
            </div>
            <span style={{ color: 'white', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {session.user.name}
            </span>
          </div>
          <button onClick={() => { if (window.confirm("Are you sure you want to sign out?")) signOut(); }} style={{ color: 'var(--text-secondary)', padding: '8px' }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-area">
        {/* Mobile Header */}
        <div className="mobile-header">
          <button onClick={() => setSidebarOpen(true)} style={{ color: 'white', marginRight: '16px' }}>
            <Menu size={24} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Disc3 size={20} color="white" className="animate-spin" />
            <span style={{ color: 'white', fontWeight: '600' }}>Beatzy</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="content-scroll">
          {!albumData && results.length === 0 && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: 'var(--text-secondary)' }}>
              <Disc3 size={64} className="animate-spin" style={{ marginBottom: '24px', opacity: 0.5, }} />
              <h2 style={{ fontSize: '2rem', fontWeight: '600', color: 'white', marginBottom: '12px' }}>How can I help you today?</h2>
              <p>Extract unlimited YouTube playlists, Spotify albums, or search for a song.</p>
            </div>
          )}

          {/* Spotify Results Section */}
          {albumData && (
            <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2rem', marginBottom: '2rem' }}>
                {albumData.coverArt && (
                  <img
                    src={albumData.coverArt}
                    alt="Cover"
                    style={{ width: '150px', height: '150px', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
                  />
                )}
                <div>
                  <p style={{ textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '1px', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                    {albumData.type || 'Playlist'}
                  </p>
                  <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', lineHeight: '1.2' }}>{albumData.title}</h1>
                  <p style={{ color: 'var(--text-secondary)' }}>{albumData.tracks.length} tracks available</p>
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
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artists}</p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => playTrack(track)} style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Play size={16} />
                      </button>
                      <button onClick={() => downloadTrack(track)} style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Download size={16} />
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
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: '600' }}>Search Results</h3>
              <div className="results-grid">
                {results.map((track) => (
                  <div key={track.id} className="track-card">
                    <div style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000' }}>
                      <img src={track.thumbnail} alt={track.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                        {track.duration}
                      </div>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <h4 style={{ fontWeight: '600', marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{track.title}</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>{track.artist}</p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
                        <button onClick={() => playYTTrack(track)} style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: 'var(--primary-color)', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
                          <Play size={16} /> Play
                        </button>
                        <button onClick={() => handleDownloadYT(track)} style={{ flex: 1, padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600', fontSize: '0.9rem' }}>
                          <Download size={16} /> MP3
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="input-area-wrapper">
          {error && <p style={{ color: '#ff6b6b', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>}

          <div className="input-box-container">
            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setMode('spotify')}
                style={{ fontSize: '0.9rem', fontWeight: '600', color: mode === 'spotify' ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Extraction Mode
              </button>
              <button
                onClick={() => setMode('search')}
                style={{ fontSize: '0.9rem', fontWeight: '600', color: mode === 'search' ? 'white' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Search Mode
              </button>
            </div>

            <form onSubmit={mode === 'spotify' ? handleExtract : handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Search size={20} style={{ color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="search-input"
                placeholder={mode === 'spotify' ? "Paste YouTube Playlist or Spotify Link..." : "Search for a song (e.g. Ed Sheeran Shape of You)..."}
                value={mode === 'spotify' ? spotifyUrl : searchQuery}
                onChange={(e) => mode === 'spotify' ? setSpotifyUrl(e.target.value) : setSearchQuery(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading || (mode === 'spotify' ? !spotifyUrl : !searchQuery)}
                style={{
                  backgroundColor: loading || (mode === 'spotify' ? !spotifyUrl : !searchQuery) ? 'transparent' : 'white',
                  color: 'black', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: loading ? 0.5 : 1, transition: 'background-color 0.2s'
                }}
              >
                {loading ? <Loader2 className="animate-spin" size={20} color="var(--text-secondary)" /> : <Search size={20} />}
              </button>
            </form>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '12px' }}>
            Unlimited high-quality downloads. Spotify is capped at 100 songs. Use YouTube Playlists for unlimited tracks.
          </p>
        </div>

        {/* Global YouTube Player */}
        {currentTrack && (
          <div className="player-bar" style={{ position: 'absolute', bottom: 'auto', top: '16px', zIndex: 100 }}>
            <div style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ fontWeight: '600', fontSize: '0.9rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {currentTrack.title}
                  </h4>
                </div>
                <button onClick={closePlayer} style={{ color: 'var(--text-secondary)' }}><X size={20} /></button>
              </div>
              <div className="iframe-container">
                {currentTrack.id === 'loading' ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', position: 'absolute', top: 0, left: 0, width: '100%', background: 'black' }}>
                    <Loader2 className="animate-spin" size={32} color="white" />
                  </div>
                ) : (
                  <iframe src={`https://www.youtube-nocookie.com/embed/${currentTrack.id}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                )}
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
                  <Loader2 className="animate-spin" size={32} color="white" />
                  <p>Extracting High Quality Link...</p>
                </div>
              )}
              {dlPopup.error && (<div style={{ color: '#ff6b6b' }}><p>{dlPopup.error}</p></div>)}
              {dlPopup.url && (
                <a href={dlPopup.url} target="_blank" rel="noopener noreferrer" download onClick={() => setTimeout(() => setDlPopup(prev => ({ ...prev, show: false })), 500)} style={{ display: 'inline-flex', backgroundColor: 'white', color: 'black', padding: '12px 32px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '600', alignItems: 'center', gap: '10px' }}>
                  <Download size={20} /> Download Now
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
