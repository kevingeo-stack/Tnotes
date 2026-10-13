import { Setlist } from '../../types/note';

export type { Setlist };

const SETLISTS_STORAGE_KEY = 'trumpet_setlists_data_v1';
const LEGACY_SETLIST_KEY = 'tnotes_setlist_v1';

export const SetlistStorageService = {
  getAll(): Setlist[] {
    try {
      const data = localStorage.getItem(SETLISTS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as Setlist[];
        return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
      }

      // Check if legacy single-setlist exists to auto-migrate into first list
      const legacyRaw = localStorage.getItem(LEGACY_SETLIST_KEY);
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
      console.error('Failed to load setlists from storage', e);
      return [];
    }
  },

  getById(id: string): Setlist | undefined {
    const all = this.getAll();
    return all.find(s => s.id === id);
  },

  save(setlist: Setlist): void {
    try {
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
      localStorage.setItem(SETLISTS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to save setlist to storage', e);
    }
  },

  delete(id: string): void {
    try {
      const all = this.getAll().filter(s => s.id !== id);
      localStorage.setItem(SETLISTS_STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error('Failed to delete setlist from storage', e);
    }
  }
};
