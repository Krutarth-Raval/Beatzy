import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const usePlayerStore = create(
  persist(
    (set, get) => ({
  currentTrack: null,
  queue: [],
  originalQueue: null,
  queueName: null,
  queuePlaylistId: null,
  queueIndex: -1,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  shuffle: 'off', // 'off', 'on', 'smart'
  repeat: 'off', // 'off', 'all', 'one'
  isFetchingRelated: false,
  playbackRequested: false,

  // Ref to the HTMLAudioElement for direct control
  audioRef: null,

  setAudioRef: (ref) => set({ audioRef: ref }),
  setPlaybackRequested: (playbackRequested) => set({ playbackRequested }),

  updateCurrentTrack: (updater) => set((state) => ({ 
    currentTrack: state.currentTrack ? { ...state.currentTrack, ...updater(state.currentTrack) } : null 
  })),

  playTrack: (track, newQueue = null, queueName = null, queuePlaylistId = null) => {
    // iOS Safari Hack: Trigger a play request synchronously during the user-interaction event loop to unlock audio
    const currentState = get();
    if (currentState.audioRef && currentState.audioRef.play) {
      try { currentState.audioRef.play().catch(() => {}); } catch(e) {}
    }

    set((state) => {
      let queue = newQueue || state.queue;
      let originalQueue = newQueue ? [...newQueue] : (state.originalQueue || [...state.queue]);
      let queueIndex = queue.findIndex(t => t.id === track.id);

      if (state.shuffle !== 'off' && newQueue) {
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
        queuePlaylistId: queuePlaylistId !== null ? queuePlaylistId : state.queuePlaylistId,
        queueIndex: queueIndex !== -1 ? queueIndex : 0,
        isPlaying: true,
        progress: 0,
        playbackRequested: true,
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
    
    set({ isPlaying: newIsPlaying, playbackRequested: newIsPlaying });
  },

  playNext: async () => {
    const state = get();
    if (state.queue.length === 0) return;

    if (state.audioRef && state.audioRef.play) {
      try { state.audioRef.play().catch(() => {}); } catch(e) {}
    }

    let nextIndex = state.queueIndex + 1;

    if (nextIndex >= state.queue.length) {
      // Prioritize Smart Shuffle Autoplay over Repeat All
      if (state.shuffle === 'smart') {
        const currentTrack = state.currentTrack;
        if (currentTrack && currentTrack.id) {
          set({ isFetchingRelated: true, isPlaying: false });
          if (state.audioRef) state.audioRef.pause();
          try {
            const q = currentTrack.artist ? `${currentTrack.title} ${currentTrack.artist}` : currentTrack.title;
            const res = await fetch(`/api/related?id=${currentTrack.id}&q=${encodeURIComponent(q)}`);
            if (res.ok) {
              const relatedTracks = await res.json();
              if (relatedTracks && relatedTracks.length > 0) {
                const existingIds = new Set(state.queue.map(t => t.id));
                const newTracks = relatedTracks.filter(t => !existingIds.has(t.id));
                
                if (newTracks.length > 0) {
                  const newQueue = [...state.queue, ...newTracks];
                  const newOriginalQueue = state.originalQueue ? [...state.originalQueue, ...newTracks] : null;

                  set({
                    queue: newQueue,
                    originalQueue: newOriginalQueue,
                    queueIndex: nextIndex,
                    currentTrack: newTracks[0],
                    isPlaying: true,
                    progress: 0,
                    isFetchingRelated: false,
                    playbackRequested: true
                  });
                  return;
                }
              }
            }
          } catch (e) {
            console.error("Autoplay fetch failed", e);
          }
          set({ isFetchingRelated: false });
        }
        // If fetch fails or no tracks, fall through
      }
      
      if (state.repeat === 'all') {
        if (state.shuffle !== 'off') {
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
        // End of queue, don't repeat, no autoplay found
        set({ isPlaying: false, progress: 0 });
        if (state.audioRef) {
          state.audioRef.currentTime = 0;
          state.audioRef.pause();
        }
        set({ playbackRequested: false });
        return;
      }
    }

    const nextTrack = state.queue[nextIndex];
    if (nextTrack) {
      set({
        currentTrack: nextTrack,
        queueIndex: nextIndex,
        isPlaying: true,
        progress: 0,
        playbackRequested: true
      });
    }
  },

  playPrevious: () => {
    const state = get();
    if (state.queue.length === 0) return;

    if (state.audioRef && state.audioRef.play) {
      try { state.audioRef.play().catch(() => {}); } catch(e) {}
    }

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
        progress: 0,
        playbackRequested: true
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

  toggleShuffle: async () => {
    const state = get();
    if (state.shuffle === 'off') {
      // Turning ON (regular shuffle)
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
      
      set({ shuffle: 'on', queue: newQueue, originalQueue, queueIndex: 0 });
    } else if (state.shuffle === 'on') {
      // Turning SMART
      set({ shuffle: 'smart', isFetchingRelated: true });
      try {
        const currentTrack = state.currentTrack;
        if (currentTrack && currentTrack.id) {
          const q = currentTrack.artist ? `${currentTrack.title} ${currentTrack.artist}` : currentTrack.title;
          const res = await fetch(`/api/related?id=${currentTrack.id}&q=${encodeURIComponent(q)}`);
          if (res.ok) {
            const relatedTracks = await res.json();
            if (relatedTracks && relatedTracks.length > 0) {
              const currentState = get();
              if (currentState.shuffle === 'smart') {
                const existingIds = new Set(currentState.queue.map(t => t.id));
                const newTracks = relatedTracks.filter(t => !existingIds.has(t.id));
                
                if (newTracks.length > 0) {
                  let newQueue = [...currentState.queue];
                  let newOriginalQueue = currentState.originalQueue ? [...currentState.originalQueue] : null;
                  
                  // Interleave new tracks into upcoming queue (1 recommended per 2 regular tracks)
                  let insertIndex = currentState.queueIndex + 2;
                  let trackIdx = 0;
                  
                  while (trackIdx < newTracks.length && insertIndex < newQueue.length) {
                    const trackToAdd = { ...newTracks[trackIdx], isSmartTrack: true };
                    newQueue.splice(insertIndex, 0, trackToAdd);
                    if (newOriginalQueue) newOriginalQueue.push(trackToAdd); // just append to original
                    insertIndex += 3;
                    trackIdx++;
                  }
                  
                  // Append any remaining to the end
                  while (trackIdx < newTracks.length) {
                    const trackToAdd = { ...newTracks[trackIdx], isSmartTrack: true };
                    newQueue.push(trackToAdd);
                    if (newOriginalQueue) newOriginalQueue.push(trackToAdd);
                    trackIdx++;
                  }
                  
                  set({ queue: newQueue, originalQueue: newOriginalQueue });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Smart shuffle inject failed", e);
      }
      set({ isFetchingRelated: false });
    } else {
      // Turning OFF
      const originalQueue = state.originalQueue || state.queue;
      // Remove any injected smart tracks
      const cleanQueue = originalQueue.filter(t => !t.isSmartTrack);
      const queueIndex = state.currentTrack ? cleanQueue.findIndex(t => t.id === state.currentTrack.id) : 0;
      set({ shuffle: 'off', queue: cleanQueue, originalQueue: null, queueIndex: queueIndex !== -1 ? queueIndex : 0 });
    }
  },
  
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
    queuePlaylistId: state.queuePlaylistId,
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
