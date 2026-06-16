import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from './Providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Beatzy',
  description: 'Download and stream Spotify and YouTube music effortlessly',
};

import AudioPlayer from '@/components/AudioPlayer';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Providers>
          {children}
          <AudioPlayer />
        </Providers>
      </body>
    </html>
  );
}
