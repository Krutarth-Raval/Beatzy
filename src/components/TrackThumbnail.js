import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

export default function TrackThumbnail({ track, size = 40, showBackground = true, borderRadius, ...props }) {
  let isSpotify = track?.id?.includes('spotify:');
  let realYtId = !isSpotify && track?.id ? track.id.replace('youtube-', '') : null;

  if (isSpotify && track?.id) {
    const rawId = track.id.replace('spotify:track:', '');
    if (/^[0-9a-fA-F]{22}$/.test(rawId)) {
      try {
        let decoded = '';
        for (let i = 0; i < rawId.length; i += 2) {
          decoded += String.fromCharCode(parseInt(rawId.substr(i, 2), 16));
        }
        if (decoded.length === 11) {
          realYtId = decoded;
          isSpotify = false; 
        }
      } catch (e) {}
    }
  }

  const initialThumb = track?.coverArt || track?.thumbnail || (realYtId ? `https://i.ytimg.com/vi/${realYtId}/hqdefault.jpg` : '');
  const [thumb, setThumb] = useState(initialThumb);

  useEffect(() => {
    // Sync initial thumb if track changes
    setThumb(initialThumb);
  }, [initialThumb, track?.id]);

  useEffect(() => {
    if (!initialThumb && isSpotify && track?.id) {
      const id = track.id.replace('spotify:track:', '');
      const oembedUrl = `https://open.spotify.com/oembed?url=spotify:track:${id}`;
      fetch(`/api/proxy-audio?url=${encodeURIComponent(oembedUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (data.thumbnail_url) setThumb(data.thumbnail_url);
        })
        .catch(() => {});
    }
  }, [track?.id, isSpotify, initialThumb]);

  if (!thumb) {
    return (
      <div style={{ width: showBackground ? size : '100%', height: showBackground ? size : '100%', borderRadius: '6px', backgroundColor: showBackground ? 'var(--bg-input)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Music size={size * 0.6} color="var(--text-secondary)" />
      </div>
    );
  }

  let cover = thumb.includes('i.ytimg.com') ? thumb.split('?')[0] : thumb.replace(/=w\d+-h\d+.*/, '=w1200-h1200-l90-rj');
  if (cover.includes('i.ytimg.com')) {
    cover = cover.replace(/\/(default|mqdefault|hqdefault|sddefault)(\.[a-z]+)$/i, '/maxresdefault$2');
  }

  return (
    <>
      {showBackground && <div className="skeleton-bg" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, transition: 'opacity 0.3s' }}></div>}
      <img 
        src={cover} 
        alt="Cover" 
        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', position: 'relative', zIndex: 1, opacity: 0, transition: 'opacity 0.3s ease', borderRadius: borderRadius || 'inherit' }} 
        onLoad={(e) => { 
          e.currentTarget.style.opacity = 1; 
          if (showBackground && e.currentTarget.previousSibling) e.currentTarget.previousSibling.style.opacity = 0; 
        }} 
        onError={(e) => { 
          if (e.target.dataset.error === "2") {
            if (showBackground && e.currentTarget.previousSibling) e.currentTarget.previousSibling.style.opacity = 0; 
            e.currentTarget.style.opacity = 0;
            return;
          }
          if (e.target.dataset.error === "1") { 
            e.target.dataset.error = "2"; 
            if (realYtId) e.target.src = `https://i.ytimg.com/vi/${realYtId}/mqdefault.jpg`; 
            else if (!isSpotify && track?.id) e.target.src = `https://i.ytimg.com/vi/${track.id.replace('youtube-', '')}/mqdefault.jpg`; 
            else e.currentTarget.style.opacity = 0; 
          } else { 
            e.target.dataset.error = "1";
            if (cover.includes('googleusercontent')) {
              e.target.src = cover.split('=')[0]; // fallback to raw image
            } else if (realYtId) {
              e.target.src = `https://i.ytimg.com/vi/${realYtId}/hqdefault.jpg`; 
            } else if (!isSpotify && track?.id) {
              e.target.src = `https://i.ytimg.com/vi/${track.id.replace('youtube-', '')}/hqdefault.jpg`; 
            } else {
              e.currentTarget.style.opacity = 0;
            }
          } 
        }} 
        {...props}
      />
    </>
  );
}
