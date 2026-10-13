import { SongNote, SetlistItem } from '../../types/note';

export type { SetlistItem };

const PRIMARY_STORAGE_KEY = 'trumpet_notes_data';
const LEGACY_STORAGE_KEY = 'tnotes_songs_v1';
const SETLIST_STORAGE_KEY = 'tnotes_setlist_v1';

export const getAllNotes = (): SongNote[] => {
  try {
    let raw = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (!raw) {
      raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    }
    if (!raw) return [];
    const notes: SongNote[] = JSON.parse(raw);

    let needsSave = false;
    const migratedNotes = notes.map(note => {
      if (!note.activeInstrument) {
        needsSave = true;
        return { ...note, activeInstrument: 'keyboard' as const };
      }
      return note;
    });

    if (needsSave || !localStorage.getItem(PRIMARY_STORAGE_KEY)) {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(migratedNotes));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(migratedNotes));
    }
    return migratedNotes;
  } catch (e) {
    console.error('Failed to load notes from storage', e);
    return [];
  }
};

export const NoteStorageService = {
  getAll(): SongNote[] {
    return getAllNotes();
  },

  save(note: SongNote): void {
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
    
    localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(notes));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(notes));
  },

  delete(id: string): void {
    const notes = this.getAll().filter(n => n.id !== id);
    localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(notes));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(notes));

    // Also remove from legacy setlist if present
    const currentSetlist = this.getSetlist().filter(item => item.noteId !== id);
    this.saveSetlist(currentSetlist);
  },

  groupByKey(): Record<string, SongNote[]> {
    const notes = this.getAll();
    return notes.reduce((acc, note) => {
      const key = note.detectedKey || 'Indeterminada';
      if (!acc[key]) acc[key] = [];
      acc[key].push(note);
      return acc;
    }, {} as Record<string, SongNote[]>);
  },

  getSetlist(): SetlistItem[] {
    try {
      const data = localStorage.getItem(SETLIST_STORAGE_KEY);
      if (!data) return [];
      const items = JSON.parse(data) as SetlistItem[];
      return items.sort((a, b) => a.order - b.order);
    } catch (e) {
      console.error('Failed to load setlist from storage', e);
      return [];
    }
  },

  saveSetlist(items: SetlistItem[]): void {
    try {
      const sorted = [...items].sort((a, b) => a.order - b.order);
      localStorage.setItem(SETLIST_STORAGE_KEY, JSON.stringify(sorted));
    } catch (e) {
      console.error('Failed to save setlist to storage', e);
    }
  }
};
