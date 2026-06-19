import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const usePlayerStore = create(
  persist(
    (set, get) => ({
  currentTrack: null,
  queue: [],
  originalQueue: null,
  queueName: null,
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

  playTrack: (track, newQueue = null, queueName = null) => {
    set((state) => {
      let queue = newQueue || state.queue;
      let originalQueue = newQueue ? [...newQueue] : (state.originalQueue || [...state.queue]);
      let queueIndex = queue.findIndex(t => t.id === track.id);

      if (state.shuffle && newQueue) {
        let shuff = [...newQueue];
        const currIdx = shuff.findIndex(t => t.id === track.id);
        let current = null;
        if (currIdx !== -1) {
          current = shuff.splice(currIdx, 1)[0];
        }
        for (let i = shuff.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuff[i], shuff[j]] = [shuff[j], shuff[i]];
        }
        if (current) shuff.unshift(current);
        queue = shuff;
        queueIndex = 0;
      }

      return {
        currentTrack: track,
        queue,
        originalQueue,
        queueName: queueName !== null ? queueName : state.queueName,
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
        // If the user scrubbed to the end and clicks play, go to the next song instead of restarting
        if (state.audioRef.duration && state.audioRef.currentTime >= state.audioRef.duration - 0.5) {
          get().playNext();
          return;
        }
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

    if (nextIndex >= state.queue.length) {
      if (state.repeat === 'all') {
        if (state.shuffle) {
          // Generate a new shuffle when repeat all hits the end
          let newQueue = [...(state.originalQueue || state.queue)];
          for (let i = newQueue.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [newQueue[i], newQueue[j]] = [newQueue[j], newQueue[i]];
          }
          set({
            queue: newQueue,
            queueIndex: 0,
            currentTrack: newQueue[0],
            isPlaying: true,
            progress: 0
          });
          return;
        } else {
          nextIndex = 0;
        }
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

    if (prevIndex < 0) {
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

  toggleShuffle: () => set((state) => {
    if (!state.shuffle) {
      // Turning ON
      const originalQueue = state.originalQueue || [...state.queue];
      let newQueue = [...originalQueue];
      
      let current = null;
      if (state.currentTrack) {
        const currIdx = newQueue.findIndex(t => t.id === state.currentTrack.id);
        if (currIdx !== -1) {
          current = newQueue.splice(currIdx, 1)[0];
        }
      }
      
      for (let i = newQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newQueue[i], newQueue[j]] = [newQueue[j], newQueue[i]];
      }
      
      if (current) {
        newQueue.unshift(current);
      }
      
      return { shuffle: true, queue: newQueue, originalQueue, queueIndex: 0 };
    } else {
      // Turning OFF
      const queue = state.originalQueue || state.queue;
      const queueIndex = state.currentTrack ? queue.findIndex(t => t.id === state.currentTrack.id) : 0;
      return { shuffle: false, queue, originalQueue: null, queueIndex: queueIndex !== -1 ? queueIndex : 0 };
    }
  }),
  
  toggleRepeat: () => set((state) => {
    const modes = ['off', 'all', 'one'];
    const currentIndex = modes.indexOf(state.repeat);
    const nextIndex = (currentIndex + 1) % modes.length;
    return { repeat: modes[nextIndex] };
  }),
}),
{
  name: 'beatzy-player-storage',
  partialize: (state) => ({
    currentTrack: state.currentTrack,
    queue: state.queue,
    queueName: state.queueName,
    queueIndex: state.queueIndex,
    progress: state.progress,
    volume: state.volume,
    isMuted: state.isMuted,
    shuffle: state.shuffle,
    repeat: state.repeat
  }),
}
));

export default usePlayerStore;
