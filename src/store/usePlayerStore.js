import { create } from 'zustand';

const usePlayerStore = create((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  shuffle: false,
  repeat: 'off', // 'off', 'all', 'one'

  // Ref to the HTMLAudioElement for direct control
  audioRef: null,

  setAudioRef: (ref) => set({ audioRef: ref }),

  playTrack: (track, newQueue = null) => {
    set((state) => {
      const queue = newQueue || state.queue;
      const queueIndex = queue.findIndex(t => t.id === track.id);
      return {
        currentTrack: track,
        queue,
        queueIndex: queueIndex !== -1 ? queueIndex : 0,
        isPlaying: true,
        progress: 0,
      };
    });
  },

  togglePlay: () => {
    const state = get();
    if (!state.currentTrack) return;
    const newIsPlaying = !state.isPlaying;
    
    if (state.audioRef) {
      if (newIsPlaying) {
        state.audioRef.play().catch(e => console.error("Playback failed:", e));
      } else {
        state.audioRef.pause();
      }
    }
    
    set({ isPlaying: newIsPlaying });
  },

  playNext: () => {
    const state = get();
    if (state.queue.length === 0) return;

    let nextIndex = state.queueIndex + 1;

    if (state.shuffle) {
      nextIndex = Math.floor(Math.random() * state.queue.length);
    } else if (nextIndex >= state.queue.length) {
      if (state.repeat === 'all') {
        nextIndex = 0;
      } else {
        // End of queue, don't repeat
        set({ isPlaying: false, progress: 0 });
        if (state.audioRef) {
          state.audioRef.currentTime = 0;
          state.audioRef.pause();
        }
        return;
      }
    }

    const nextTrack = state.queue[nextIndex];
    if (nextTrack) {
      set({
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        isPlaying: true,
        progress: 0
      });
    }
  },

  playPrevious: () => {
    const state = get();
    if (state.queue.length === 0) return;

    // If progress > 3 seconds, just restart the song
    if (state.progress > 3 && state.audioRef) {
      state.audioRef.currentTime = 0;
      set({ progress: 0 });
      return;
    }

    let prevIndex = state.queueIndex - 1;

    if (state.shuffle) {
      prevIndex = Math.floor(Math.random() * state.queue.length);
    } else if (prevIndex < 0) {
      if (state.repeat === 'all') {
        prevIndex = state.queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    const prevTrack = state.queue[prevIndex];
    if (prevTrack) {
      set({
        currentTrack: prevTrack,
        queueIndex: prevIndex,
        isPlaying: true,
        progress: 0
      });
    }
  },

  setProgress: (time) => set({ progress: time }),
  setDuration: (time) => set({ duration: time }),
  
  seek: (time) => {
    const state = get();
    if (state.audioRef) {
      state.audioRef.currentTime = time;
    }
    set({ progress: time });
  },

  setVolume: (vol) => {
    const state = get();
    if (state.audioRef) {
      state.audioRef.volume = vol;
    }
    set({ volume: vol, isMuted: vol === 0 });
  },

  toggleMute: () => {
    const state = get();
    const newIsMuted = !state.isMuted;
    if (state.audioRef) {
      state.audioRef.muted = newIsMuted;
    }
    set({ isMuted: newIsMuted });
  },

  toggleShuffle: () => set((state) => ({ shuffle: !state.shuffle })),
  
  toggleRepeat: () => set((state) => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(state.repeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    return { repeat: modes[nextIndex] };
  }),
}));

export default usePlayerStore;
