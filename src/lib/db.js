import { openDB } from 'idb';

const DB_NAME = 'beatzy_offline_db';
const DB_VERSION = 1;

export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Playlists Store
      if (!db.objectStoreNames.contains('playlists')) {
        const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
        playlistStore.createIndex('createdAt', 'createdAt');
      }

      // Tracks Store (Metadata)
      if (!db.objectStoreNames.contains('tracks')) {
        const trackStore = db.createObjectStore('tracks', { keyPath: 'id' });
        trackStore.createIndex('playlistId', 'playlistId');
        trackStore.createIndex('orderIndex', 'orderIndex');
      }

      // Audio Blobs Store (Separated so we don't load huge blobs when just listing tracks)
      if (!db.objectStoreNames.contains('audio_blobs')) {
        db.createObjectStore('audio_blobs', { keyPath: 'id' });
      }
    },
  });
}

// === PLAYLIST OPERATIONS ===

export async function createPlaylist(name) {
  const db = await initDB();
  const id = crypto.randomUUID();
  const newPlaylist = {
    id,
    name,
    coverArt: null,
    createdAt: Date.now(),
  };
  await db.put('playlists', newPlaylist);
  return newPlaylist;
}

export async function getPlaylists() {
  const db = await initDB();
  const tx = db.transaction('playlists', 'readonly');
  const index = tx.store.index('createdAt');
  return index.getAll();
}

export async function deletePlaylist(id) {
  const db = await initDB();
  // 1. Get all tracks for this playlist to delete their blobs
  const tracks = await getTracksForPlaylist(id);
  
  const tx = db.transaction(['playlists', 'tracks', 'audio_blobs'], 'readwrite');
  
  // 2. Delete playlist
  tx.objectStore('playlists').delete(id);
  
  // 3. Delete tracks & blobs
  const trackStore = tx.objectStore('tracks');
  const blobStore = tx.objectStore('audio_blobs');
  
  for (const track of tracks) {
    trackStore.delete(track.id);
    blobStore.delete(track.id);
  }
  
  await tx.done;
}

// === TRACK & BLOB OPERATIONS ===

export async function addTrackToPlaylist(playlistId, trackData, audioBlob) {
  const db = await initDB();
  
  // Track metadata
  const trackInfo = {
    id: trackData.id, // e.g. YT id
    playlistId,
    title: trackData.title || trackData.name,
    artists: trackData.artists || trackData.artist || 'Unknown',
    duration: trackData.duration || '0:00',
    coverArt: trackData.coverArt || trackData.thumbnail || null,
    orderIndex: Date.now(), // default to adding at the end
    addedAt: Date.now(),
  };

  const tx = db.transaction(['tracks', 'audio_blobs', 'playlists'], 'readwrite');
  
  // Save blob
  await tx.objectStore('audio_blobs').put({
    id: trackInfo.id,
    blob: audioBlob,
  });
  
  // Save track metadata
  await tx.objectStore('tracks').put(trackInfo);
  
  // Update playlist cover art if it's empty
  const playlistStore = tx.objectStore('playlists');
  const playlist = await playlistStore.get(playlistId);
  if (playlist && !playlist.coverArt && trackInfo.coverArt) {
    playlist.coverArt = trackInfo.coverArt;
    await playlistStore.put(playlist);
  }
  
  await tx.done;
  return trackInfo;
}

export async function getTracksForPlaylist(playlistId) {
  const db = await initDB();
  const tx = db.transaction('tracks', 'readonly');
  const index = tx.store.index('playlistId');
  const tracks = await index.getAll(playlistId);
  // Sort by orderIndex
  return tracks.sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function getAudioBlob(trackId) {
  const db = await initDB();
  const record = await db.get('audio_blobs', trackId);
  return record ? record.blob : null;
}

export async function removeTrack(trackId) {
  const db = await initDB();
  const tx = db.transaction(['tracks', 'audio_blobs'], 'readwrite');
  tx.objectStore('tracks').delete(trackId);
  tx.objectStore('audio_blobs').delete(trackId);
  await tx.done;
}

export async function reorderTracks(playlistId, orderedTrackIds) {
  const db = await initDB();
  const tx = db.transaction('tracks', 'readwrite');
  const store = tx.objectStore('tracks');
  
  // Just update the orderIndex for each track
  for (let i = 0; i < orderedTrackIds.length; i++) {
    const track = await store.get(orderedTrackIds[i]);
    if (track && track.playlistId === playlistId) {
      track.orderIndex = i;
      await store.put(track);
    }
  }
  await tx.done;
}

export async function updatePlaylist(id, updates) {
  const db = await initDB();
  const tx = db.transaction('playlists', 'readwrite');
  const store = tx.objectStore('playlists');
  const playlist = await store.get(id);
  
  if (playlist) {
    const updatedPlaylist = { ...playlist, ...updates };
    await store.put(updatedPlaylist);
    await tx.done;
    return updatedPlaylist;
  }
  
  await tx.done;
  throw new Error('Playlist not found');
}

export async function moveTrackToPlaylist(trackId, newPlaylistId) {
  const db = await initDB();
  const tx = db.transaction('tracks', 'readwrite');
  const store = tx.objectStore('tracks');
  const track = await store.get(trackId);
  
  if (track) {
    track.playlistId = newPlaylistId;
    track.orderIndex = Date.now(); // Put at end of new playlist
    track.addedAt = Date.now();
    await store.put(track);
  }
  await tx.done;
}

export async function copyTrackToPlaylist(trackId, newPlaylistId) {
  const db = await initDB();
  const tx = db.transaction(['tracks', 'audio_blobs'], 'readwrite');
  const trackStore = tx.objectStore('tracks');
  const blobStore = tx.objectStore('audio_blobs');
  
  const track = await trackStore.get(trackId);
  const blobRecord = await blobStore.get(trackId);
  
  if (track && blobRecord) {
    const newTrackId = crypto.randomUUID();
    const newTrack = { ...track, id: newTrackId, playlistId: newPlaylistId, orderIndex: Date.now(), addedAt: Date.now() };
    await trackStore.put(newTrack);
    await blobStore.put({ id: newTrackId, blob: blobRecord.blob });
  }
  await tx.done;
}
