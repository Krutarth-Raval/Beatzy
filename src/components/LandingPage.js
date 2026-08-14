'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Disc, Search, Download, Play, Music, ArrowRight, Zap, Layers, Headphones } from 'lucide-react';

export default function LandingPage({ signIn }) {
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    container: containerRef
  });

  // Hero Animations
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.8]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, 100]);

  // Showcase Animations
  const showcaseScale = useTransform(scrollYProgress, [0.3, 0.5], [0.8, 1]);
  const showcaseRotateX = useTransform(scrollYProgress, [0.3, 0.5], [20, 0]);
  const showcaseOpacity = useTransform(scrollYProgress, [0.2, 0.4], [0, 1]);

  return (
    <div 
      ref={containerRef}
      style={{
        backgroundColor: '#050505', // Deep rich black
        color: '#ffffff',
        fontFamily: 'var(--font-outfit), sans-serif',
        overflowX: 'hidden',
        overflowY: 'auto',
        height: '100dvh'
      }}
    >
      {/* --- HERO SECTION --- */}
      <section style={{
        minHeight: '90vh',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 2rem'
      }}>
        {/* Abstract animated gradient background */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80vw',
          height: '80vw',
          maxHeight: '800px',
          maxWidth: '800px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 60%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <motion.div 
          style={{
            opacity: heroOpacity,
            scale: heroScale,
            y: heroY,
            zIndex: 10,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '100px',
              marginBottom: '2rem',
              backdropFilter: 'blur(10px)'
            }}
          >
            <img src="/white.png" width={24} height={24} alt="Beatzy Logo" className="animate-spin" style={{ animationDuration: '4s' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: '500', letterSpacing: '1px' }}>BEATZY IS HERE</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontSize: 'clamp(3rem, 10vw, 7rem)',
              fontWeight: '700',
              lineHeight: '1.1',
              letterSpacing: '-0.03em',
              marginBottom: '1.5rem',
              maxWidth: '1000px',
              background: 'linear-gradient(180deg, #FFFFFF 0%, rgba(255, 255, 255, 0.5) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            Music without <br /> limitations.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
              color: '#888',
              maxWidth: '600px',
              marginBottom: '3rem',
              lineHeight: '1.6'
            }}
          >
            Extract full albums, discover rare tracks, and curate your collections effortlessly. The ultimate audio companion.
          </motion.p>
        </motion.div>
        
        {/* Scroll indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          style={{ position: 'absolute', bottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
        >
          <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '2px' }}>Scroll</span>
          <motion.div 
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, #444, transparent)' }}
          />
        </motion.div>
      </section>

      {/* --- SHOWCASE SECTION (Parallax) --- */}
      <section style={{ 
        position: 'relative', 
        minHeight: '100vh', 
        padding: '5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px' // for 3D effect
      }}>
        <motion.div
          style={{
            scale: showcaseScale,
            rotateX: showcaseRotateX,
            opacity: showcaseOpacity,
            width: '100%',
            maxWidth: '1100px',
            background: 'linear-gradient(145deg, rgba(20,20,22,0.9) 0%, rgba(10,10,12,0.9) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            boxShadow: '0 30px 60px -15px rgba(0,0,0,0.8), 0 0 120px rgba(255,255,255,0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transformOrigin: 'bottom center'
          }}
        >
          {/* Abstract Player UI Top Bar */}
          <div style={{ height: '60px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f56' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#27c93f' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '40%', height: '28px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div style={{ width: '30%', height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
          
          {/* Abstract Player UI Body */}
          <div style={{ display: 'flex', height: '600px' }}>
            {/* Sidebar */}
            <div style={{ width: '240px', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF0080, #7928CA)' }} />
                <div style={{ width: '100px', height: '14px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '4px' }} />
              </div>
              <div style={{ width: '80%', height: '12px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px' }} />
              <div style={{ width: '60%', height: '12px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px' }} />
              <div style={{ width: '70%', height: '12px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px' }} />
              <div style={{ width: '50%', height: '12px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px', marginTop: '32px' }} />
              <div style={{ width: '60%', height: '12px', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '4px' }} />
            </div>
            
            {/* Main View */}
            <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '40px', background: 'radial-gradient(circle at top left, rgba(121,40,202,0.1) 0%, transparent 40%)' }}>
              <div style={{ display: 'flex', gap: '32px' }}>
                {/* Album Cover Mock */}
                <div style={{ 
                  width: '220px', 
                  height: '220px', 
                  background: 'linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)', 
                  borderRadius: '16px', 
                  boxShadow: '0 20px 40px rgba(0,201,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.8)' }} />
                  </div>
                </div>
                
                {/* Album Info Mock */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'flex-end', paddingBottom: '16px' }}>
                  <div style={{ width: '80px', height: '14px', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '4px' }} />
                  <div style={{ width: '350px', height: '60px', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(255,255,255,0.1)' }} />
                  <div style={{ width: '200px', height: '16px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px' }} />
                  
                  {/* Action Buttons Mock */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #1DB954, #1ed760)', boxShadow: '0 8px 20px rgba(29,185,84,0.4)' }} />
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', alignSelf: 'center' }} />
                  </div>
                </div>
              </div>
              
              {/* List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { w1: '40%', w2: '20%', c: '#FF0080' },
                  { w1: '30%', w2: '15%', c: '#7928CA' },
                  { w1: '45%', w2: '25%', c: '#00C9FF' },
                  { w1: '35%', w2: '15%', c: '#FF4D4D' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 20px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.3)', width: '20px' }}>{i + 1}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <div style={{ width: item.w1, height: '14px', backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '4px' }} />
                      <div style={{ width: item.w2, height: '10px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '4px' }} />
                    </div>
                    <div style={{ width: '80px', height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                       <div style={{ width: '60%', height: '100%', backgroundColor: item.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* --- BENTO GRID FEATURES --- */}
      <section style={{ padding: '8rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          style={{ textAlign: 'center', marginBottom: '5rem' }}
        >
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '700', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Everything you need. <br/><span style={{ color: '#888' }}>Nothing you don&apos;t.</span>
          </h2>
        </motion.div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '24px',
          gridAutoRows: 'minmax(300px, auto)'
        }}>
          {/* Card 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            style={{ 
              backgroundColor: '#0d0d0d', 
              border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: '24px',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gridColumn: 'span 1'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Zap size={24} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '12px' }}>Instant Extraction</h3>
            <p style={{ color: '#888', lineHeight: '1.6', fontSize: '1.05rem' }}>Paste any Spotify or YouTube URL and watch as Beatzy instantly analyzes and extracts the entire playlist or album data.</p>
          </motion.div>

          {/* Card 2 (Large) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ 
              backgroundColor: '#0d0d0d', 
              border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: '24px',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gridColumn: 'span 2',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Search size={24} color="#fff" />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '12px' }}>Deep Search Algorithm</h3>
              <p style={{ color: '#888', lineHeight: '1.6', fontSize: '1.05rem', maxWidth: '400px' }}>Powered by advanced search algorithms, Beatzy finds the exact high-quality audio match for any track on the internet.</p>
            </div>
            
            {/* Abstract decorative element */}
            <div style={{ position: 'absolute', right: '-50px', bottom: '-50px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%)' }} />
          </motion.div>

          {/* Card 3 (Large) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{ 
              backgroundColor: '#0d0d0d', 
              border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: '24px',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gridColumn: 'span 2',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <Layers size={24} color="#fff" />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '12px' }}>Curate Collections</h3>
              <p style={{ color: '#888', lineHeight: '1.6', fontSize: '1.05rem', maxWidth: '400px' }}>Organize your favorite tracks into custom playlists and access them from anywhere. Your library, your way.</p>
            </div>
          </motion.div>

          {/* Card 4 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{ 
              backgroundColor: '#0d0d0d', 
              border: '1px solid rgba(255,255,255,0.06)', 
              borderRadius: '24px',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gridColumn: 'span 1'
            }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Headphones size={24} color="#fff" />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '12px' }}>Built-in Player</h3>
            <p style={{ color: '#888', lineHeight: '1.6', fontSize: '1.05rem' }}>Listen to your extracted tracks immediately with our sleek, built-in audio player featuring synced lyrics.</p>
          </motion.div>
        </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <section style={{ 
        padding: '10rem 2rem', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60vw',
          height: '60vw',
          background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 50%)',
          filter: 'blur(100px)',
          zIndex: 0
        }} />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <h2 style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: '700', letterSpacing: '-0.04em', marginBottom: '1.5rem' }}>
            Ready to listen?
          </h2>
          <p style={{ color: '#888', fontSize: '1.2rem', marginBottom: '3rem', maxWidth: '500px' }}>
            Join today and experience the easiest way to curate and download your favorite music.
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => signIn('google')}
            style={{
              backgroundColor: '#fff', 
              color: '#000',
              padding: '16px 40px',
              borderRadius: '100px',
              fontSize: '1.2rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 10px 30px -10px rgba(255,255,255,0.4)',
              transition: 'box-shadow 0.3s ease'
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              <path d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Continue with Google
          </motion.button>
        </motion.div>
      </section>

      {/* Very bottom footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', color: '#555', fontSize: '0.9rem' }}>
        © {new Date().getFullYear()} Beatzy. All rights reserved.
      </footer>
    </div>
  );
}
