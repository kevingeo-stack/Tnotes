import { describe, it, expect, beforeEach } from 'vitest';
import { NoteStorageService } from '../NoteStorageService';
import { getAllSetlists, saveSetlist, saveAllSetlists } from '../SetlistStorageService';
import { SongNote, Setlist, SetlistItem } from '../../../types/note';

const store: Record<string, string> = {};
const defaultSetItem = (k: string, v: string) => {
  store[k] = v.toString();
};

const mockStorage = {
  getItem: (k: string) => store[k] || null,
  setItem: defaultSetItem,
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    Object.keys(store).forEach(k => delete store[k]);
  },
};

// @ts-ignore
globalThis.localStorage = mockStorage;

describe('NoteStorageService - Eliminación con Integridad Referencial en Listas', () => {
  beforeEach(() => {
    mockStorage.setItem = defaultSetItem;
    mockStorage.clear();
  });

  // =========================================================================
  // 1. Eliminar una canción que no pertenece a ninguna lista
  // =========================================================================
  it('1. elimina una canción que no pertenece a ninguna lista sin alterar listas existentes', () => {
    const song1: SongNote = {
      id: 'song-alone',
      title: 'Canción Sin Lista',
      content: 'C D E',
      activeInstrument: 'trumpet',
      detectedKey: 'C Mayor',
      updatedAt: 1000,
    };
    const song2: SongNote = {
      id: 'song-other',
      title: 'Otra Canción',
      content: 'G A B',
      activeInstrument: 'keyboard',
      detectedKey: 'G Mayor',
      updatedAt: 2000,
    };
    const setlist: Setlist = {
      id: 'list-1',
      name: 'Culto de Adoración',
      songIds: ['song-other'],
      updatedAt: 3000,
    };

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([song1, song2]));
    mockStorage.setItem('trumpet_setlists_data', JSON.stringify([setlist]));

    NoteStorageService.delete('song-alone');

    const remainingNotes = NoteStorageService.getAll();
    expect(remainingNotes.length).toBe(1);
    expect(remainingNotes[0].id).toBe('song-other');

    const currentSetlists = getAllSetlists();
    expect(currentSetlists.length).toBe(1);
    expect(currentSetlists[0].songIds).toEqual(['song-other']);
  });

  // =========================================================================
  // 2. Eliminar una canción presente en una sola lista
  // =========================================================================
  it('2. elimina una canción presente en una sola lista purgando su ID de la lista', () => {
    const songTarget: SongNote = {
      id: 'target-song',
      title: 'Canción a Purgar',
      content: 'A B C#',
      activeInstrument: 'trumpet',
      detectedKey: 'A Mayor',
      updatedAt: 1000,
    };
    const songKeep: SongNote = {
      id: 'keep-song',
      title: 'Canción a Conservar',
      content: 'D E F#',
      activeInstrument: 'trumpet',
      detectedKey: 'D Mayor',
      updatedAt: 2000,
    };
    const setlist: Setlist = {
      id: 'list-target',
      name: 'Servicio Especial',
      songIds: ['keep-song', 'target-song'],
      updatedAt: 3000,
    };

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([songTarget, songKeep]));
    mockStorage.setItem('trumpet_setlists_data', JSON.stringify([setlist]));

    NoteStorageService.delete('target-song');

    const remainingNotes = NoteStorageService.getAll();
    expect(remainingNotes.length).toBe(1);
    expect(remainingNotes[0].id).toBe('keep-song');

    const currentSetlists = getAllSetlists();
    expect(currentSetlists.length).toBe(1);
    expect(currentSetlists[0].songIds).toEqual(['keep-song']);
    expect(currentSetlists[0].songIds.includes('target-song')).toBe(false);
  });

  // =========================================================================
  // 3. Eliminar una canción presente en varias listas
  // =========================================================================
  it('3. purga las referencias de una canción presente en múltiples listas sin tocar listas no relacionadas', () => {
    const sharedSong: SongNote = {
      id: 'shared-id',
      title: 'Himno Popular',
      content: 'Do Mi Sol',
      activeInstrument: 'trumpet',
      detectedKey: 'Do Mayor',
      updatedAt: 1000,
    };
    const other1: SongNote = { id: 's1', title: 'S1', content: 'C', activeInstrument: 'trumpet', detectedKey: 'C Mayor', updatedAt: 1 };
    const other2: SongNote = { id: 's2', title: 'S2', content: 'D', activeInstrument: 'trumpet', detectedKey: 'D Mayor', updatedAt: 2 };
    const other3: SongNote = { id: 's3', title: 'S3', content: 'E', activeInstrument: 'trumpet', detectedKey: 'E Mayor', updatedAt: 3 };

    const list1: Setlist = {
      id: 'l1',
      name: 'Lista Matutina',
      songIds: ['shared-id', 's1'],
      updatedAt: 100,
    };
    const list2: Setlist = {
      id: 'l2',
      name: 'Lista Vespertina',
      songIds: ['s2', 'shared-id', 's3'],
      updatedAt: 200,
    };
    const list3: Setlist = {
      id: 'l3',
      name: 'Lista No Relacionada',
      songIds: ['s1', 's2'],
      updatedAt: 300,
    };

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([sharedSong, other1, other2, other3]));
    mockStorage.setItem('trumpet_setlists_data', JSON.stringify([list1, list2, list3]));

    NoteStorageService.delete('shared-id');

    const setlists = getAllSetlists();
    const l1 = setlists.find(l => l.id === 'l1');
    const l2 = setlists.find(l => l.id === 'l2');
    const l3 = setlists.find(l => l.id === 'l3');

    expect(l1?.songIds).toEqual(['s1']);
    expect(l2?.songIds).toEqual(['s2', 's3']);
    expect(l3?.songIds).toEqual(['s1', 's2']);
  });

  // =========================================================================
  // 4. Conservar el orden de las canciones restantes
  // =========================================================================
  it('4. conserva estrictamente el orden secuencial relativo de las canciones restantes en cada lista', () => {
    const songToDelete: SongNote = { id: 'to-delete', title: 'Borrar', content: 'F', activeInstrument: 'trumpet', detectedKey: 'F Mayor', updatedAt: 1 };
    const sA: SongNote = { id: 'a', title: 'A', content: 'A', activeInstrument: 'trumpet', detectedKey: 'A Mayor', updatedAt: 2 };
    const sB: SongNote = { id: 'b', title: 'B', content: 'B', activeInstrument: 'trumpet', detectedKey: 'B Mayor', updatedAt: 3 };
    const sC: SongNote = { id: 'c', title: 'C', content: 'C', activeInstrument: 'trumpet', detectedKey: 'C Mayor', updatedAt: 4 };

    const setlist: Setlist = {
      id: 'ordered-list',
      name: 'Orden Fiel',
      songIds: ['a', 'to-delete', 'b', 'c'],
      updatedAt: 500,
    };

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([songToDelete, sA, sB, sC]));
    mockStorage.setItem('trumpet_setlists_data', JSON.stringify([setlist]));

    NoteStorageService.delete('to-delete');

    const updated = getAllSetlists().find(l => l.id === 'ordered-list');
    expect(updated?.songIds).toEqual(['a', 'b', 'c']);
  });

  // =========================================================================
  // 5. Conservar listas vacías y todos sus metadatos
  // =========================================================================
  it('5. conserva listas vacías y todos sus metadatos cuando se elimina su única canción', () => {
    const onlySong: SongNote = { id: 'only-one', title: 'Única', content: 'C E G', activeInstrument: 'trumpet', detectedKey: 'C Mayor', updatedAt: 1 };

    const setlistWithOne: Setlist = {
      id: 'solitary-list',
      name: 'Repertorio Solo',
      songIds: ['only-one'],
      updatedAt: 12345678,
    };

    const alreadyEmptyList: Setlist = {
      id: 'already-empty',
      name: 'Lista Vacía Previa',
      songIds: [],
      updatedAt: 87654321,
    };

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([onlySong]));
    mockStorage.setItem('trumpet_setlists_data', JSON.stringify([setlistWithOne, alreadyEmptyList]));

    NoteStorageService.delete('only-one');

    const setlists = getAllSetlists();
    expect(setlists.length).toBe(2);

    const solitary = setlists.find(l => l.id === 'solitary-list');
    expect(solitary).toBeDefined();
    expect(solitary?.songIds).toEqual([]);
    expect(solitary?.name).toBe('Repertorio Solo');
    expect(solitary?.updatedAt).toBe(12345678);

    const empty = setlists.find(l => l.id === 'already-empty');
    expect(empty).toBeDefined();
    expect(empty?.songIds).toEqual([]);
    expect(empty?.name).toBe('Lista Vacía Previa');
  });

  // =========================================================================
  // 6. No modificar canciones distintas de la eliminada
  // =========================================================================
  it('6. no modifica el contenido, título ni campos musicales de canciones distintas de la eliminada', () => {
    const songUntouched: SongNote = {
      id: 'song-untouched',
      title: 'Grande y Fuerte',
      content: 'C D E F G',
      activeInstrument: 'trumpet',
      baseContent: 'A# C D D# F',
      baseInstrument: 'keyboard',
      detectedKey: 'C Mayor',
      concertKey: 'A# Mayor',
      updatedAt: 9999,
    };
    const songToDelete: SongNote = {
      id: 'song-remove',
      title: 'Eliminar',
      content: 'G A B',
      activeInstrument: 'keyboard',
      detectedKey: 'G Mayor',
      updatedAt: 1111,
    };

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([songUntouched, songToDelete]));

    NoteStorageService.delete('song-remove');

    const notes = NoteStorageService.getAll();
    expect(notes.length).toBe(1);
    const survivor = notes[0];
    expect(survivor.id).toBe('song-untouched');
    expect(survivor.title).toBe('Grande y Fuerte');
    expect(survivor.content).toBe('C D E F G');
    expect(survivor.baseContent).toBe('A# C D D# F');
    expect(survivor.baseInstrument).toBe('keyboard');
    expect(survivor.activeInstrument).toBe('trumpet');
    expect(survivor.detectedKey).toBe('C Mayor');
    expect(survivor.concertKey).toBe('A# Mayor');
  });

  // =========================================================================
  // 7. Mantener el comportamiento del almacenamiento heredado
  // =========================================================================
  it('7. mantiene la sincronización con los almacenes heredados (tnotes_songs_v1, trumpet_setlists_data_v1 y tnotes_setlist_v1)', () => {
    const legacySong: SongNote = {
      id: 'legacy-target',
      title: 'Canción Legacy',
      content: 'E F# G#',
      activeInstrument: 'trumpet',
      detectedKey: 'E Mayor',
      updatedAt: 100,
    };
    const otherSong: SongNote = {
      id: 'other-song',
      title: 'Otra',
      content: 'C',
      activeInstrument: 'trumpet',
      detectedKey: 'C Mayor',
      updatedAt: 200,
    };

    const modernSetlist: Setlist = {
      id: 'mod-list',
      name: 'Lista Moderna',
      songIds: ['legacy-target', 'other-song'],
      updatedAt: 300,
    };

    const legacySingleSetlist: SetlistItem[] = [
      { noteId: 'legacy-target', order: 0 },
      { noteId: 'other-song', order: 1 },
    ];

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([legacySong, otherSong]));
    mockStorage.setItem('tnotes_songs_v1', JSON.stringify([legacySong, otherSong]));
    mockStorage.setItem('trumpet_setlists_data', JSON.stringify([modernSetlist]));
    mockStorage.setItem('trumpet_setlists_data_v1', JSON.stringify([modernSetlist]));
    mockStorage.setItem('tnotes_setlist_v1', JSON.stringify(legacySingleSetlist));

    NoteStorageService.delete('legacy-target');

    // 1. Primaria y legacy de canciones
    const primaryNotes = JSON.parse(mockStorage.getItem('trumpet_notes_data') || '[]');
    const legacyNotes = JSON.parse(mockStorage.getItem('tnotes_songs_v1') || '[]');
    expect(primaryNotes.length).toBe(1);
    expect(legacyNotes.length).toBe(1);
    expect(primaryNotes[0].id).toBe('other-song');
    expect(legacyNotes[0].id).toBe('other-song');

    // 2. Primaria y legacy de listas
    const primarySetlists = JSON.parse(mockStorage.getItem('trumpet_setlists_data') || '[]');
    const legacySetlists = JSON.parse(mockStorage.getItem('trumpet_setlists_data_v1') || '[]');
    expect(primarySetlists[0].songIds).toEqual(['other-song']);
    expect(legacySetlists[0].songIds).toEqual(['other-song']);

    // 3. Setlist único heredado (tnotes_setlist_v1)
    const legacySingle = JSON.parse(mockStorage.getItem('tnotes_setlist_v1') || '[]');
    expect(legacySingle.length).toBe(1);
    expect(legacySingle[0].noteId).toBe('other-song');
  });

  // =========================================================================
  // 8. Reversión atómica ante fallo de almacenamiento
  // =========================================================================
  it('8. realiza una reversión atómica completa si la escritura de listas falla, evitando estados parciales', () => {
    const song1: SongNote = { id: 's1', title: 'S1', content: 'C', activeInstrument: 'trumpet', detectedKey: 'C Mayor', updatedAt: 1 };
    const song2: SongNote = { id: 's2', title: 'S2', content: 'D', activeInstrument: 'trumpet', detectedKey: 'D Mayor', updatedAt: 2 };
    const initialSetlist: Setlist = { id: 'list-1', name: 'Lista', songIds: ['s1', 's2'], updatedAt: 10 };
    const initialLegacySetlist: SetlistItem[] = [{ noteId: 's1', order: 0 }, { noteId: 's2', order: 1 }];

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([song1, song2]));
    mockStorage.setItem('tnotes_songs_v1', JSON.stringify([song1, song2]));
    mockStorage.setItem('trumpet_setlists_data', JSON.stringify([initialSetlist]));
    mockStorage.setItem('trumpet_setlists_data_v1', JSON.stringify([initialSetlist]));
    mockStorage.setItem('tnotes_setlist_v1', JSON.stringify(initialLegacySetlist));

    // Simular que setItem falla cuando se intenta escribir en trumpet_setlists_data
    const originalSetItem = mockStorage.setItem;
    let failOnSetlists = true;
    mockStorage.setItem = (k: string, v: string) => {
      if (k === 'trumpet_setlists_data' && failOnSetlists) {
        failOnSetlists = false;
        const err = new Error('QuotaExceededError');
        err.name = 'QuotaExceededError';
        throw err;
      }
      originalSetItem(k, v);
    };

    try {
      expect(() => NoteStorageService.delete('s1')).toThrow('QuotaExceededError');

      // Restaurar setItem para comprobar el estado final persistido
      mockStorage.setItem = originalSetItem;

      // Ningún almacén debe haber quedado modificado parcialmente
      const storedNotes = JSON.parse(mockStorage.getItem('trumpet_notes_data') || '[]');
      expect(storedNotes.length).toBe(2);
      expect(storedNotes.map((n: any) => n.id)).toEqual(['s1', 's2']);

      const storedSetlists = JSON.parse(mockStorage.getItem('trumpet_setlists_data') || '[]');
      expect(storedSetlists[0].songIds).toEqual(['s1', 's2']);

      const storedLegacy = JSON.parse(mockStorage.getItem('tnotes_setlist_v1') || '[]');
      expect(storedLegacy.length).toBe(2);
    } finally {
      mockStorage.setItem = originalSetItem;
    }
  });
});
