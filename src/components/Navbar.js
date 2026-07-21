'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Search, User, Library } from 'lucide-react';
import PwaInstallButton from './PwaInstallButton';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Find the main scrolling element regardless of what triggered the event
      const scrollContainer = document.querySelector('.content-scroll') || window;
      const scrollTop = scrollContainer.scrollY !== undefined ? scrollContainer.scrollY : scrollContainer.scrollTop;
      setIsScrolled(scrollTop > 10);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  if (!session?.user) return null;

  const NavLink = ({ href, icon: Icon, label, mobileBottom = false }) => {
    const isActive = pathname === href || (href === '/account' && pathname.startsWith('/account'));
    
    return (
      <Link href={href} style={{ textDecoration: 'none' }} className={`nav-link ${isActive ? 'active' : ''} ${mobileBottom ? 'mobile-bottom-link' : ''}`}>
        <div className="nav-link-content">
          <Icon size={mobileBottom ? 24 : 18} className="nav-icon" />
          <span className="nav-label">{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* Desktop Full-width Navbar */
        .desktop-navbar {
          display: none;
        }
        @media (min-width: 769px) {
          .desktop-navbar {
            display: flex;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 72px;
            background: rgba(15, 15, 15, 0.85);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border-bottom: 1px solid var(--border-color);
            z-index: 1000;
            align-items: center;
            justify-content: space-between;
            padding: 0 32px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .desktop-navbar.scrolled {
            background: rgba(10, 10, 10, 0.95);
          }
        }

        .nav-links-center {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-link {
          padding: 8px 16px;
          border-radius: 24px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }
        .nav-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-link.active {
          background: var(--text-primary);
          color: var(--bg-main);
          font-weight: 600;
        }
        .nav-link-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Mobile Top Navbar */
        .mobile-top-navbar {
          display: flex;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100%;
          height: 72px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid var(--border-color);
          z-index: 900;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
        }
        @media (min-width: 769px) {
          .mobile-top-navbar {
            display: none;
          }
        }

        /* Mobile Bottom Navbar */
        .mobile-bottom-navbar {
          display: flex;
          position: fixed;
          bottom: 0;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          left: 0;
          right: 0;
          width: 100%;
          height: 72px;
          background: rgba(20, 20, 20, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-top: 1px solid var(--border-color);
          z-index: 990;
          align-items: center;
          justify-content: space-around;
          padding: 0 16px;
          gap: 4px;
        }
        @media (min-width: 769px) {
          .mobile-bottom-navbar {
            display: none;
          }
        }

        .mobile-bottom-link {
          flex: none;
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
          border-radius: 999px;
          color: var(--text-secondary);
          transition: all 0.2s ease;
        }
        .mobile-bottom-link .nav-link-content {
          flex-direction: row;
          gap: 6px;
          align-items: center;
        }
        .mobile-bottom-link .nav-label {
          font-size: 0.9rem;
          font-weight: 500;
        }
        .mobile-bottom-link.active {
          background: var(--text-primary);
          color: var(--bg-main);
          font-weight: 600;
        }
        .mobile-bottom-link:hover {
          color: var(--text-primary);
        }

        /* User Avatar */
        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: var(--bg-hover);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-primary);
          font-weight: bold;
          border: 2px solid var(--text-secondary);
          cursor: pointer;
          transition: transform 0.2s;
        }
        .user-avatar:hover {
          transform: scale(1.05);
          border-color: var(--text-primary);
        }
      `}} />

      {/* Desktop Navbar */}
      <div className={`desktop-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/white.png" width={40} height={40} className="logo-img animate-spin" alt="Beatzy Logo" />
            <span style={{ color: 'var(--text-primary)', fontWeight: '800', fontSize: '1.8rem', letterSpacing: '0.5px' }}>Beatzy</span>
          </Link>
        </div>

        <div className="nav-links-center" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <NavLink href="/" icon={Home} label="Home" />
          <NavLink href="/search" icon={Search} label="Search" />
          <NavLink href="/my-playlists" icon={Library} label="My Playlists" />
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
          <PwaInstallButton />
          <Link href="/account" style={{ textDecoration: 'none' }}>
            <div className="user-avatar" style={{ fontSize: '1.2rem' }}>
              {session.user?.name?.charAt(0) || 'U'}
            </div>
          </Link>
        </div>
      </div>

      {/* Mobile Top Navbar */}
      <div className="mobile-top-navbar">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/white.png" width={36} height={36} className="logo-img animate-spin" alt="Beatzy Logo" />
          <span style={{ color: 'var(--text-primary)', fontWeight: '800', fontSize: '1.6rem', letterSpacing: '0.5px' }}>Beatzy</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <PwaInstallButton />
          <Link href="/account" style={{ textDecoration: 'none' }}>
            <div className="user-avatar" style={{ width: '42px', height: '42px', fontSize: '1.1rem' }}>
              {session.user?.name?.charAt(0) || 'U'}
            </div>
          </Link>
        </div>
      </div>

      {/* Mobile Bottom Navbar */}
      <div className="mobile-bottom-navbar">
        <NavLink href="/" icon={Home} label="Home" mobileBottom={true} />
        <NavLink href="/search" icon={Search} label="Search" mobileBottom={true} />
        <NavLink href="/my-playlists" icon={Library} label="Playlists" mobileBottom={true} />
      </div>
    </>
  );
}
