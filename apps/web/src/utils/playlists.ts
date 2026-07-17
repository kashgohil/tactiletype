/**
 * Personal playlists of custom paste texts (localStorage).
 */

const STORAGE_KEY = 'tactile-playlists';

export interface PlaylistItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  updatedAt: string;
}

function loadAll(): Playlist[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Playlist[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(playlists: Playlist[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
}

export function listPlaylists(): Playlist[] {
  return loadAll();
}

export function getOrCreateDefaultPlaylist(): Playlist {
  const all = loadAll();
  if (all[0]) return all[0];
  const created: Playlist = {
    id: `pl-${Date.now()}`,
    name: 'My pastes',
    items: [],
    updatedAt: new Date().toISOString(),
  };
  saveAll([created]);
  return created;
}

export function addPlaylistItem(
  content: string,
  title?: string
): PlaylistItem {
  const all = loadAll();
  let pl = all[0];
  if (!pl) {
    pl = {
      id: `pl-${Date.now()}`,
      name: 'My pastes',
      items: [],
      updatedAt: new Date().toISOString(),
    };
    all.unshift(pl);
  }
  const item: PlaylistItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: title?.trim() || `Paste ${pl.items.length + 1}`,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  pl.items = [item, ...pl.items].slice(0, 50);
  pl.updatedAt = new Date().toISOString();
  saveAll(all);
  return item;
}

export function removePlaylistItem(itemId: string) {
  const all = loadAll();
  for (const pl of all) {
    pl.items = pl.items.filter((i) => i.id !== itemId);
    pl.updatedAt = new Date().toISOString();
  }
  saveAll(all);
}

export function getPlaylistItem(itemId: string): PlaylistItem | null {
  for (const pl of loadAll()) {
    const found = pl.items.find((i) => i.id === itemId);
    if (found) return found;
  }
  return null;
}
