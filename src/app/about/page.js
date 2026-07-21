'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Disc3, Mail, Sparkles, Code2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import DynamicIcon from '@/components/DynamicIcon';

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
  </svg>
);

export default function AboutPage() {
  const [updates, setUpdates] = useState([]);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

  useEffect(() => {
    fetch('/api/updates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUpdates(data);
      })
      .catch(console.error)
      .finally(() => setLoadingUpdates(false));
  }, []);

  return (
    <div className="app-layout" style={{ overflowY: 'auto', display: 'block', backgroundColor: 'var(--bg-main)' }}>

      {/* Header */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-sidebar)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto' }}>
          <img src="/white.png" width={24} height={24} className="logo-img animate-spin" alt="Beatzy Logo" />
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
            <img src="/white.png" width={40} height={40} className="logo-img animate-spin" style={{ flexShrink: 0 }} alt="Beatzy Logo" />
            Beatzy
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto' }}>
            Your ultimate hub for searching, streaming, and extracting high-quality audio seamlessly.
          </p>
        </div>

        {/* What's New Section */}
        <section style={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '16px', padding: '24px', marginBottom: '32px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Sparkles size={24} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>What's New</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {loadingUpdates ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 className="animate-spin" size={24} color="var(--text-secondary)" />
              </div>
            ) : updates.length > 0 ? (
              updates.map((update) => (
                <div key={update.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border-color)' }}>
                      <DynamicIcon name={update.icon} size={18} color="var(--text-primary)" />
                    </div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.2' }}>{update.title}</h3>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6' }}>{update.description}</p>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>No new updates available yet.</p>
            )}
          </div>
        </section>

        {/* Developer Info Section */}
        <section style={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '16px', padding: '24px', marginBottom: '32px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Code2 size={28} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Developer Info</h2>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '24px' }}>
            Beatzy is developed by <strong>Krutarth Raval</strong>. It was built with a passion for creating seamless, beautiful, and accessible music experiences for everyone. Constantly evolving and improving, Beatzy is designed to be the only music hub you need.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>

            <a href="https://instagram.com/raval_krutarth" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: 'var(--bg-input)', borderRadius: '10px', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: '600', border: '1px solid var(--border-color)', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-input)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <InstagramIcon />
              Instagram
            </a>
          </div>
        </section>

        {/* Contact Support Section */}
        <section style={{ backgroundColor: 'var(--bg-sidebar)', borderRadius: '16px', padding: '32px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
            <Mail size={24} color="var(--bg-main)" />
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
