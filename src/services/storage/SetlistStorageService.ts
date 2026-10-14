import { Setlist } from '../../types/note';

export type { Setlist };

const SETLISTS_STORAGE_KEY = 'trumpet_setlists_data_v1';
const LEGACY_SETLIST_KEY = 'tnotes_setlist_v1';

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

export const SetlistStorageService = {
  getAll(): Setlist[] {
    try {
      const storage = getStorage();
      if (!storage) return [];

      const data = storage.getItem(SETLISTS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return (parsed as Setlist[]).sort((a, b) => b.updatedAt - a.updatedAt);
        }
      }

      // Check if legacy single-setlist exists to auto-migrate into first list
      const legacyRaw = storage.getItem(LEGACY_SETLIST_KEY);
      if (legacyRaw) {
        try {
          const legacyItems = JSON.parse(legacyRaw) as { noteId: string; order: number }[];
          if (Array.isArray(legacyItems) && legacyItems.length > 0) {
            const initialList: Setlist = {
              id: 'setlist-default',
              name: 'Lista de Alabanzas Principal',
              songIds: legacyItems.sort((a, b) => a.order - b.order).map(i => i.noteId),
              updatedAt: Date.now()
            };
            this.save(initialList);
            return [initialList];
          }
        } catch {
          // Ignore legacy format parsing error
        }
      }

      return [];
    } catch (e) {
      console.warn('Storage read error for setlists on mobile device, using empty fallback', e);
      return [];
    }
  },

  getById(id: string): Setlist | undefined {
    try {
      const all = this.getAll();
      return all.find(s => s.id === id);
    } catch (e) {
      console.warn('Error finding setlist by id on mobile device', e);
      return undefined;
    }
  },

  save(setlist: Setlist): void {
    try {
      const storage = getStorage();
      if (!storage) return;

      const all = this.getAll();
      const existingIndex = all.findIndex(s => s.id === setlist.id);
      
      const toSave: Setlist = {
        ...setlist,
        updatedAt: Date.now()
      };

      if (existingIndex >= 0) {
        all[existingIndex] = toSave;
      } else {
        all.unshift(toSave);
      }

      all.sort((a, b) => b.updatedAt - a.updatedAt);
      storage.setItem(SETLISTS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save setlist to storage on mobile device', e);
    }
  },

  delete(id: string): void {
    try {
      const storage = getStorage();
      if (!storage) return;

      const all = this.getAll().filter(s => s.id !== id);
      storage.setItem(SETLISTS_STORAGE_KEY, JSON.stringify(all));

      const raw = storage.getItem('trumpet_setlists_data');
      if (raw) {
        const lists = JSON.parse(raw);
        if (Array.isArray(lists)) {
          const filtered = lists.filter((item: any) => item.id !== id);
          storage.setItem('trumpet_setlists_data', JSON.stringify(filtered));
        }
      }
    } catch (e) {
      console.warn('Failed to delete setlist from storage on mobile device', e);
    }
  }
};

export const deleteSetlist = (id: string): void => {
  try {
    SetlistStorageService.delete(id);
    const storage = getStorage();
    if (!storage) return;
    const raw = storage.getItem('trumpet_setlists_data');
    if (raw) {
      const lists = JSON.parse(raw);
      if (Array.isArray(lists)) {
        const filtered = lists.filter((item: any) => item.id !== id);
        storage.setItem('trumpet_setlists_data', JSON.stringify(filtered));
      }
    }
  } catch (err) {
    console.error("Error al eliminar la lista:", err);
  }
};

