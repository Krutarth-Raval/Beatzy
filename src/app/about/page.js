'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Disc3, Mail, Sparkles, Code2, Headphones, Mic } from 'lucide-react';
import Link from 'next/link';

// Inline SVGs for brand icons
const GithubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 8 18v4"></path>
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
  </svg>
);

export default function AboutPage() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') document.body.classList.add('light-theme');
  }, []);

  return (
    <div className="app-layout" style={{ overflowY: 'auto', display: 'block', backgroundColor: 'var(--bg-main)' }}>

      {/* Header */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-sidebar)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto' }}>
          <Disc3 size={24} color="var(--primary-color)" className="animate-spin" />
          <span style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '0.5px' }}>Beatzy</span>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px', paddingBottom: '100px' }} className="animate-fade-in-up">

        {/* Back Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
          <Link href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s', fontWeight: '500', fontSize: '0.95rem' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </Link>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', fontSize: 'clamp(2rem, 6vw, 2.8rem)', fontWeight: '800', marginBottom: '16px', color: 'var(--text-primary)', lineHeight: '1.2' }}>
            About
            <Disc3 size={40} color="var(--primary-color)" className="animate-spin" style={{ flexShrink: 0 }} />
            Beatzy
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Your ultimate hub for searching, streaming, and extracting high-quality audio seamlessly.
          </p>
        </div>

        {/* What's New Section */}
        <section style={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '16px', padding: '32px', marginBottom: '32px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Sparkles size={24} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>What's New</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Headphones size={20} color="var(--text-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Spotify Playlist Extraction</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>You can now paste any Spotify playlist or album link directly into the search bar to extract and download all the tracks in high quality.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mic size={20} color="var(--text-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Voice Search</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>Just click the mic icon and say what you want to hear! The intelligent voice recognition will search for your favorite tracks hands-free.</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Disc3 size={20} color="var(--text-primary)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>Infinite Scrolling History</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>Your entire search history is now elegantly saved and can be scrolled infinitely from the sidebar, with a sleek collapsible design.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Info Section */}
        <section style={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '16px', padding: '32px', marginBottom: '32px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Code2 size={24} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)' }}>Developer Info</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '24px' }}>
            Beatzy is proudly developed by <strong>Krutarth Raval</strong>. It was built with a passion for creating seamless, beautiful, and accessible music experiences for everyone. Constantly evolving and improving, Beatzy is designed to be the only music hub you need.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <a href="https://github.com/Krutarth-Raval" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '500', border: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}>
              <GithubIcon />
              GitHub
            </a>

            <a href="https://instagram.com/raval_krutarth" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: 'var(--bg-input)', borderRadius: '8px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '500', border: '1px solid var(--border-color)', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}>
              <InstagramIcon />
              Instagram
            </a>
          </div>
        </section>

        {/* Contact Support Section */}
        <section style={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <Mail size={24} color="#000" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Contact Support</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '24px' }}>
            Have a question, found a bug, or want to request a new feature? I'd love to hear from you.
          </p>

          <a href="mailto:ravalkrutarth95@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', backgroundColor: 'var(--text-primary)', color: 'var(--bg-main)', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', fontSize: '1rem' }}>
            <Mail size={18} />
            ravalkrutarth95@gmail.com
          </a>
        </section>

      </div>
    </div>
  );
}
