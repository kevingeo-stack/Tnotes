import { SongNote, SetlistItem } from '../../types/note';
import { KeyDetector } from '../../domain/music/KeyDetector';
import { NotationTranslator, NotationStyle } from '../../domain/music/NotationTranslator';
import { normalizeKeyName } from '../../domain/music/PitchClass';
import { getAllSetlists, saveAllSetlists } from './SetlistStorageService';

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
      let updatedNote = note;
      if (!note.activeInstrument) {
        modified = true;
        updatedNote = { ...updatedNote, activeInstrument: 'keyboard' as const };
      }
      if (!updatedNote.baseContent && updatedNote.content) {
        modified = true;
        updatedNote = {
          ...updatedNote,
          baseContent: updatedNote.content,
          baseInstrument: updatedNote.activeInstrument || 'keyboard'
        };
      }
      return updatedNote;
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

/**
 * Sanitizes and purges residual notes whose content and title are empty.
 */
export const sanitizeEmptyNotes = (): void => {
  const storage = getStorage();
  if (!storage) return;
  const raw = storage.getItem(PRIMARY_STORAGE_KEY) || storage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return;
  try {
    const notes: SongNote[] = JSON.parse(raw);
    if (!Array.isArray(notes)) return;
    const cleaned = notes.filter(n => 
      (n.content && n.content.trim() !== '') || 
      (n.title && n.title.trim() !== '' && n.title !== 'Canción sin título')
    );
    if (cleaned.length !== notes.length) {
      storage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(cleaned));
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(cleaned));
    }
  } catch (e) {
    console.warn("Error sanitizing empty notes", e);
  }
};

// Auto-execute immediately on module load in browser/runtime environments
try {
  sanitizeLegacyNotes();
  sanitizeEmptyNotes();
} catch {
  // Ignore in environments where storage is restricted
}

/**
 * Traduce retroactivamente todo el repertorio en almacenamiento al presionar
 * el botón global de notación (Inglés <-> Solfeo).
 */
export const translateAllNotesInStorage = (targetStyle: NotationStyle): SongNote[] => {
  try {
    const storage = getStorage();
    const raw = storage
      ? (storage.getItem(PRIMARY_STORAGE_KEY) || storage.getItem(LEGACY_STORAGE_KEY))
      : (typeof window !== 'undefined' ? localStorage.getItem(PRIMARY_STORAGE_KEY) : null);
    if (!raw) return [];
    const notes: SongNote[] = JSON.parse(raw);
    if (!Array.isArray(notes)) return [];

    const updatedNotes = notes.map(note => {
      if (!note || typeof note !== 'object') return note;

      const inst = note.activeInstrument || 'keyboard';
      // 1. Traducir el cuerpo completo de la canción
      const translatedContent = NotationTranslator.translateFullContent(note.content || '', targetStyle);
      const translatedBase = note.baseContent
        ? NotationTranslator.translateFullContent(note.baseContent, targetStyle)
        : translatedContent;

      // 2. Re-calcular las tonalidades de Trompeta y Teclado en el nuevo idioma de notación
      const keyResult = KeyDetector.detectKey(translatedContent, targetStyle, inst);

      return {
        ...note,
        content: translatedContent,
        baseContent: translatedBase,
        baseInstrument: note.baseInstrument || inst,
        activeInstrument: inst,
        detectedKey: keyResult.trumpetKey,
        concertKey: keyResult.concertKey
      };
    });

    if (storage) {
      storage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(updatedNotes));
      storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(updatedNotes));
    } else if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(updatedNotes));
    }

    return updatedNotes;
  } catch (err) {
    console.error("Error translating all notes in storage:", err);
    return [];
  }
};

export const getAllNotes = (): SongNote[] => {
  try {
    sanitizeLegacyNotes();
    sanitizeEmptyNotes();
    const storage = getStorage();
    const raw = storage
      ? (storage.getItem(PRIMARY_STORAGE_KEY) || storage.getItem(LEGACY_STORAGE_KEY))
      : (typeof window !== 'undefined' ? localStorage.getItem(PRIMARY_STORAGE_KEY) : null);
    if (!raw) return [];
    const notes: SongNote[] = JSON.parse(raw);
    if (!Array.isArray(notes)) return [];

    const savedNotation = storage 
      ? storage.getItem('notation') 
      : (typeof window !== 'undefined' ? localStorage.getItem('notation') : null);
    const notationStyle: NotationStyle = savedNotation === 'natural' ? 'LATIN' : 'ENGLISH';

    let hasChanges = false;
    const reevaluatedNotes = notes.map(note => {
      if (!note || typeof note !== 'object') return note;

      const inst = note.activeInstrument || 'keyboard';

      if (!note.detectedKey || note.detectedKey === 'Sin tono' || note.detectedKey === 'Tono desconocido' || note.detectedKey === 'Desconocido' || !note.concertKey) {
        hasChanges = true;
        // Evaluar con el instrumento que corresponde a la canción.
        // Las canciones históricas legadas del repertorio de trompeta que carecen de concertKey
        // fueron escritas originalmente en tono de trompeta en Sib.
        const isLegacyTrumpetSong = !note.concertKey && (
          note.activeInstrument === 'trumpet' ||
          note.title === 'Al poderoso' ||
          note.title === 'Cómo hizo David' ||
          note.title === 'Fuego' ||
          note.title === 'Fiesta'
        );
        const evalInstrument = isLegacyTrumpetSong ? 'trumpet' : inst;
        const keyResult = KeyDetector.detectKey(note.content || '', notationStyle, evalInstrument);
        const freshKey = keyResult.trumpetKey; // Guardar clave de trompeta estandarizada
        return {
          ...note,
          activeInstrument: inst,
          detectedKey: normalizeKeyName(freshKey),
          concertKey: normalizeKeyName(keyResult.concertKey),
          baseContent: note.baseContent ?? note.content,
          baseInstrument: note.baseInstrument ?? inst
        };
      }
      return {
        ...note,
        detectedKey: note.detectedKey ? normalizeKeyName(note.detectedKey) : 'Sin tono',
        concertKey: note.concertKey ? normalizeKeyName(note.concertKey) : 'Sin tono',
        baseContent: note.baseContent ?? note.content,
        baseInstrument: note.baseInstrument ?? inst
      };
    });

    if (hasChanges) {
      if (storage) {
        storage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(reevaluatedNotes));
        storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(reevaluatedNotes));
      } else if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(reevaluatedNotes));
      }
    }

    return reevaluatedNotes;
  } catch (err) {
    console.error("Error reading notes:", err);
    return [];
  }
};

export const NoteStorageService = {
  getAll(): SongNote[] {
    const notes = getAllNotes();
    return Array.isArray(notes) ? notes : [];
  },

  translateAll(targetStyle: NotationStyle): SongNote[] {
    return translateAllNotesInStorage(targetStyle);
  },

  save(note: SongNote): void {
    try {
      const storage = getStorage();
      if (!storage) return;

      const notes = this.getAll();
      const existingIndex = notes.findIndex(n => n.id === note.id);
      
      const savedNotation = storage 
        ? storage.getItem('notation') 
        : (typeof window !== 'undefined' ? localStorage.getItem('notation') : null);
      const notationStyle: NotationStyle = savedNotation === 'natural' ? 'LATIN' : 'ENGLISH';
      const inst = note.activeInstrument || 'keyboard';
      const keyResult = KeyDetector.detectKey(note.content || '', notationStyle, inst);
      const freshKey = normalizeKeyName(keyResult.trumpetKey !== 'Sin tono' ? keyResult.trumpetKey : (note.detectedKey || 'Sin tono'));
      const concertKey = normalizeKeyName(keyResult.concertKey !== 'Sin tono' ? keyResult.concertKey : (note.concertKey || 'Sin tono'));

      const noteToSave: SongNote = {
        ...note,
        detectedKey: freshKey,
        concertKey: concertKey,
        activeInstrument: inst,
        baseContent: note.baseContent !== undefined ? note.baseContent : (note.content || ''),
        baseInstrument: note.baseInstrument || inst
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
      throw e;
    }
  },

  saveAll(notes: SongNote[]): void {
    const storage = getStorage();
    if (!storage) throw new Error("Storage not available");
    const json = JSON.stringify(notes);
    storage.setItem(PRIMARY_STORAGE_KEY, json);
    storage.setItem(LEGACY_STORAGE_KEY, json);
  },

  delete(id: string): void {
    const storage = getStorage();
    if (!storage) return;

    // Snapshot previo de todas las claves para garantizar atomicidad y reversión ante fallos
    const prevNotesPrimary = storage.getItem(PRIMARY_STORAGE_KEY);
    const prevNotesLegacy = storage.getItem(LEGACY_STORAGE_KEY);
    const prevSetlistsPrimary = storage.getItem('trumpet_setlists_data');
    const prevSetlistsLegacy = storage.getItem('trumpet_setlists_data_v1');
    const prevLegacySetlist = storage.getItem(SETLIST_STORAGE_KEY);

    try {
      const notes = this.getAll().filter(n => n.id !== id);
      const notesJson = JSON.stringify(notes);
      storage.setItem(PRIMARY_STORAGE_KEY, notesJson);
      storage.setItem(LEGACY_STORAGE_KEY, notesJson);

      // Purgar referencias del ID en todas las listas activas que lo contengan
      const currentSetlists = getAllSetlists();
      let setlistsModified = false;
      const updatedSetlists = currentSetlists.map(list => {
        if (list.songIds && list.songIds.includes(id)) {
          setlistsModified = true;
          return {
            ...list,
            songIds: list.songIds.filter(sId => sId !== id)
          };
        }
        return list;
      });

      if (setlistsModified) {
        saveAllSetlists(updatedSetlists);
      }

      // Mantener compatibilidad eliminando del almacenamiento heredado de lista única
      const currentLegacySetlist = this.getSetlist();
      const updatedLegacySetlist = currentLegacySetlist.filter(item => item.noteId !== id);
      if (updatedLegacySetlist.length !== currentLegacySetlist.length) {
        this.saveSetlist(updatedLegacySetlist);
      }
    } catch (e) {
      console.warn("Storage delete error on mobile device", e);
      // Reversión atómica si ocurre un fallo en cualquiera de las escrituras
      const restore = (key: string, val: string | null) => {
        try {
          if (val !== null) storage.setItem(key, val);
          else storage.removeItem(key);
        } catch {}
      };
      restore(PRIMARY_STORAGE_KEY, prevNotesPrimary);
      restore(LEGACY_STORAGE_KEY, prevNotesLegacy);
      restore('trumpet_setlists_data', prevSetlistsPrimary);
      restore('trumpet_setlists_data_v1', prevSetlistsLegacy);
      restore(SETLIST_STORAGE_KEY, prevLegacySetlist);
      throw e;
    }
  },

  groupByKey(): Record<string, SongNote[]> {
    try {
      const notes = this.getAll();
      if (!Array.isArray(notes)) return {};
      return notes.reduce((acc, note) => {
        const key = note.detectedKey || 'Sin tono';
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
