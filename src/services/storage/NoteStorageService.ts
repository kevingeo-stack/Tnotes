import { SongNote, SetlistItem } from '../../types/note';

export type { SetlistItem };

const PRIMARY_STORAGE_KEY = 'trumpet_notes_data';
const LEGACY_STORAGE_KEY = 'tnotes_songs_v1';
const SETLIST_STORAGE_KEY = 'tnotes_setlist_v1';

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

/**
 * Sanitizes existing notes in localStorage by ensuring that any legacy note
 * without an activeInstrument is permanently updated to 'keyboard'.
 */
export const sanitizeLegacyNotes = (): void => {
  try {
    const storage = getStorage();
    if (!storage) return;

    // If primary key is not present but legacy key exists, copy over
    let raw = storage.getItem(PRIMARY_STORAGE_KEY);
    if (!raw) {
      const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
      if (legacyRaw) {
        raw = legacyRaw;
        try {
          storage.setItem(PRIMARY_STORAGE_KEY, legacyRaw);
        } catch {
          // Ignore quota/private mode errors
        }
      }
    }
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    let modified = false;
    const cleanNotes = parsed.map((note: SongNote) => {
      if (!note.activeInstrument) {
        modified = true;
        return { ...note, activeInstrument: 'keyboard' as const };
      }
      return note;
    });

    if (modified || !storage.getItem(PRIMARY_STORAGE_KEY)) {
      try {
        storage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(cleanNotes));
        storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(cleanNotes));
      } catch {
        // Ignore quota/private mode errors
      }
    }
  } catch (e) {
    console.warn("Storage sanitizing warning on mobile device", e);
  }
};

// Auto-execute immediately on module load in browser/runtime environments
try {
  sanitizeLegacyNotes();
} catch {
  // Ignore in environments where storage is restricted
}

export const getAllNotes = (): SongNote[] => {
  try {
    sanitizeLegacyNotes();
    const storage = getStorage();
    const raw = storage
      ? (storage.getItem(PRIMARY_STORAGE_KEY) || storage.getItem(LEGACY_STORAGE_KEY))
      : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((note: SongNote) => ({
      ...note,
      activeInstrument: note.activeInstrument || 'keyboard'
    }));
  } catch (err) {
    console.warn("Storage read error on mobile device, using empty fallback", err);
    return [];
  }
};

export const NoteStorageService = {
  getAll(): SongNote[] {
    const notes = getAllNotes();
    return Array.isArray(notes) ? notes : [];
  },

  save(note: SongNote): void {
    try {
      const storage = getStorage();
      if (!storage) return;

      const notes = this.getAll();
      const existingIndex = notes.findIndex(n => n.id === note.id);
      
      const noteToSave: SongNote = {
        ...note,
        activeInstrument: note.activeInstrument || 'keyboard'
      };

      if (existingIndex >= 0) {
        notes[existingIndex] = noteToSave;
      } else {
        notes.push(noteToSave);
      }
      
      // Sort by most recently updated
      notes.sort((a, b) => b.updatedAt - a.updatedAt);
      
      storage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(notes));
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.warn("Storage write error on mobile device", e);
    }
  },

  delete(id: string): void {
    try {
      const storage = getStorage();
      if (!storage) return;

      const notes = this.getAll().filter(n => n.id !== id);
      storage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(notes));
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(notes));

      // Also remove from legacy setlist if present
      const currentSetlist = this.getSetlist().filter(item => item.noteId !== id);
      this.saveSetlist(currentSetlist);
    } catch (e) {
      console.warn("Storage delete error on mobile device", e);
    }
  },

  groupByKey(): Record<string, SongNote[]> {
    try {
      const notes = this.getAll();
      if (!Array.isArray(notes)) return {};
      return notes.reduce((acc, note) => {
        const key = note.detectedKey || 'Indeterminada';
        if (!acc[key]) acc[key] = [];
        acc[key].push(note);
        return acc;
      }, {} as Record<string, SongNote[]>);
    } catch (e) {
      console.warn("Error grouping notes by key", e);
      return {};
    }
  },

  getSetlist(): SetlistItem[] {
    try {
      const storage = getStorage();
      if (!storage) return [];
      const data = storage.getItem(SETLIST_STORAGE_KEY);
      if (!data) return [];
      const items = JSON.parse(data);
      if (!Array.isArray(items)) return [];
      return (items as SetlistItem[]).sort((a, b) => a.order - b.order);
    } catch (e) {
      console.warn('Failed to load setlist from storage on mobile', e);
      return [];
    }
  },

  saveSetlist(items: SetlistItem[]): void {
    try {
      const storage = getStorage();
      if (!storage) return;
      const sorted = [...items].sort((a, b) => a.order - b.order);
      storage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(sorted));
    } catch (e) {
      console.warn('Failed to save setlist to storage on mobile', e);
    }
  }
};
