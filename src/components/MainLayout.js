'use client';

import React from 'react';
import Navbar from './Navbar';

export default function MainLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="main-area">
        {children}
      </div>
    </div>
  );
}
