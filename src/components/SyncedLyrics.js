import React, { useState, useEffect, useRef } from 'react';

const SyncedLyrics = ({ lyricsStr, currentTime, onSeek, isDesktop = false }) => {
  const [parsed, setParsed] = useState([]);
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!lyricsStr || lyricsStr === "No lyrics found" || lyricsStr === "Error loading lyrics") {
      setParsed([]);
      return;
    }
    
    const lines = lyricsStr.split('\n');
    const result = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    lines.forEach(line => {
      const match = timeReg.exec(line);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const ms = parseInt(match[3].padEnd(3, '0'));
        const time = min * 60 + sec + ms / 1000;
        const text = line.replace(timeReg, '').trim();
        if (text) result.push({ time, text });
      } else if (line.trim() && result.length === 0 && !line.startsWith('[')) {
         result.push({ time: -1, text: line.trim() });
      }
    });
    
    setParsed(result);
  }, [lyricsStr]);
  
  useEffect(() => {
    if (containerRef.current) {
      const activeEl = containerRef.current.querySelector('.lyrics-active');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, parsed]);
  
  if (parsed.length === 0) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>{lyricsStr || "No lyrics available"}</div>;
  }
  
  const isPlain = parsed[0]?.time === -1;
  
  return (
    <div ref={containerRef} className="hide-scrollbar" style={{ width: '100%', boxSizing: 'border-box', height: '100%', overflowY: 'auto', padding: isDesktop ? '20vh 10vw' : '10vh 40px', textAlign: isDesktop ? 'center' : 'left', display: 'flex', flexDirection: 'column', gap: isDesktop ? '32px' : '24px', scrollBehavior: 'smooth' }}>
      {parsed.map((line, i) => {
        let isActive = false;
        if (!isPlain) {
          const nextTime = parsed[i+1]?.time || Infinity;
          isActive = currentTime >= line.time && currentTime < nextTime;
        }
        
        return (
          <div 
            key={i} 
            onClick={() => {
              if (onSeek && !isPlain) {
                onSeek(line.time);
              }
            }}
            className={isActive ? 'lyrics-active' : ''} 
            style={{ 
              fontSize: isDesktop ? '2.5rem' : '1.3rem',
              fontWeight: isActive ? '800' : '600',
              color: isActive ? 'var(--primary-color)' : (isPlain ? 'var(--text-primary)' : 'var(--text-secondary)'),
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isActive ? (isDesktop ? 'scale(1.05)' : 'scale(1.15)') : 'scale(1)',
              transformOrigin: isDesktop ? 'center center' : 'left center',
              opacity: isActive || isPlain ? 1 : 0.4,
              padding: '4px 0',
              lineHeight: '1.4',
              cursor: onSeek && !isPlain ? 'pointer' : 'default',
              willChange: 'transform, opacity'
            }}>
            {line.text}
          </div>
        );
      })}
    </div>
  );
};

export default SyncedLyrics;
