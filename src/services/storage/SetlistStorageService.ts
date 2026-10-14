import { Setlist } from '../../types/note';

export type { Setlist };

const getStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
    return null;
  } catch {
    return null;
  }
};

export const getAllSetlists = (): Setlist[] => {
  try {
    const storage = getStorage();
    if (!storage) return [];

    let raw = storage.getItem('trumpet_setlists_data');
    if (!raw) {
      raw = storage.getItem('trumpet_setlists_data_v1');
    }
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        id: item.id || Date.now().toString(),
        name: (item.name || '').trim() || 'Lista sin título',
        songIds: Array.isArray(item.songIds) ? item.songIds : [],
        updatedAt: item.updatedAt || Date.now()
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (e) {
    console.error("Error reading setlists from localStorage:", e);
    return [];
  }
};

export const saveSetlist = (setlist: Setlist): void => {
  try {
    const storage = getStorage();
    if (!storage) return;

    const current = getAllSetlists();
    const safeSetlist: Setlist = {
      id: setlist.id || Date.now().toString(),
      name: (setlist.name || '').trim() || 'Lista sin título',
      songIds: Array.isArray(setlist.songIds) ? setlist.songIds : [],
      updatedAt: setlist.updatedAt || Date.now()
    };

    const idx = current.findIndex(s => s.id === safeSetlist.id);
    let updated: Setlist[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = safeSetlist;
    } else {
      updated = [safeSetlist, ...current];
    }

    updated.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const json = JSON.stringify(updated);
    storage.setItem('trumpet_setlists_data', json);
    storage.setItem('trumpet_setlists_data_v1', json);
  } catch (e) {
    console.error("Error saving setlist:", e);
  }
};

export const deleteSetlist = (id: string): void => {
  try {
    const storage = getStorage();
    if (!storage) return;

    const current = getAllSetlists();
    const updated = current.filter(s => s.id !== id);
    const json = JSON.stringify(updated);
    storage.setItem('trumpet_setlists_data', json);
    storage.setItem('trumpet_setlists_data_v1', json);
  } catch (e) {
    console.error("Error deleting setlist:", e);
  }
};

export const SetlistStorageService = {
  getAll: getAllSetlists,
  getById(id: string): Setlist | undefined {
    return getAllSetlists().find(s => s.id === id);
  },
  save: saveSetlist,
  delete: deleteSetlist
};

