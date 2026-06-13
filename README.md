# 🎵 Beatzy

Beatzy is an extraordinary, modern web application designed to seamlessly extract, stream, and download music from YouTube and Spotify. Built with Next.js and Prisma, Beatzy offers a sleek, dark-themed, "ChatGPT-style" interface that puts powerful music extraction right at your fingertips.

## 🚀 Live Demo
beatzy-muzic.vercel.app

## ✨ Features

- **Unlimited Music Extraction**: Bypass Spotify's strict API limitations by dynamically routing searches and playlist extractions through YouTube and `yt-dlp`.
- **High-Quality Downloads**: Instantly generate direct MP3 download links for your favorite tracks and albums in the highest quality available.
- **ChatGPT-Style Layout**: A fully responsive, modern interface featuring a persistent sidebar, a bottom-docked search bar, and sleek glassmorphic aesthetics.
- **Cloud History**: Powered by NextAuth and Neon PostgreSQL, Beatzy securely stores your search and extraction history in the cloud, syncing effortlessly across all your devices.
- **In-App Streaming**: Play any extracted track directly in your browser using the custom, floating YouTube mini-player.

## 🏗️ Architecture

Beatzy utilizes a robust, modern technology stack:
- **Frontend**: Next.js 14 App Router, React, and Vanilla CSS with custom design tokens.
- **Backend APIs**: Next.js API Routes.
- **Extraction Engine**: `yt-dlp` via child processes and `spotify-url-info` for metadata scraping.
- **Database**: Neon Serverless PostgreSQL managed via Prisma ORM.
- **Authentication**: NextAuth with Google Provider integration.

*Designed with ❤️ for music lovers.*
