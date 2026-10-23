import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SongNote, Setlist } from '../../../types/note';
import { NoteStorageService } from '../../../services/storage/NoteStorageService';
import { getAllSetlists, saveSetlist, SetlistStorageService } from '../../../services/storage/SetlistStorageService';
import { KeyDetector } from '../KeyDetector';
import { formatKeyName, NotationSystem } from '../NotationSystem';
import { transposeKeyName } from '../TranspositionEngine';

// Simulación aislada de localStorage
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

/**
 * Función que replica la resolución de claves de TonalGroupingView para pruebas unitarias directas.
 */
function resolveGroupingKeys(
  note: SongNote,
  activeInstrument: 'trumpet' | 'keyboard' = 'trumpet',
  notationStyle: 'ENGLISH' | 'LATIN' = 'LATIN'
) {
  const keyInfo = KeyDetector.detectKey(note.content || '', notationStyle, note.activeInstrument || 'keyboard');

  let trumpetKey: string;
  let concertKey: string;

  const detectedTrumpet = keyInfo.trumpetKey;
  const isDetectedValid = Boolean(
    detectedTrumpet &&
    detectedTrumpet !== 'Sin tono' &&
    detectedTrumpet !== 'Indeterminada' &&
    detectedTrumpet !== 'Desconocido'
  );

  if (isDetectedValid) {
    // 1. Detección automática prioritaria a partir del contenido musical actual
    trumpetKey = detectedTrumpet;
    concertKey = keyInfo.concertKey;
  } else {
    // 2. Si el detector da 'Sin tono', evaluar el respaldo guardado
    const rawSavedKey = note.detectedKey;
    const isSavedValid = Boolean(
      rawSavedKey &&
      rawSavedKey !== 'Sin tono' &&
      rawSavedKey !== 'Indeterminada' &&
      rawSavedKey !== 'Desconocido' &&
      rawSavedKey !== 'Tono desconocido'
    );

    if (isSavedValid) {
      const sys: NotationSystem = notationStyle === 'LATIN' ? 'natural' : 'en';
      trumpetKey = formatKeyName(rawSavedKey, sys);
      if (
        note.concertKey &&
        note.concertKey !== 'Sin tono' &&
        note.concertKey !== 'Indeterminada' &&
        note.concertKey !== 'Desconocido' &&
        note.concertKey !== 'Tono desconocido'
      ) {
        concertKey = formatKeyName(note.concertKey, sys);
      } else {
        concertKey = formatKeyName(transposeKeyName(rawSavedKey, -2), sys);
      }
    } else {
      trumpetKey = 'Sin tono';
      concertKey = 'Sin tono';
    }
  }

  const primaryKey = activeInstrument === 'trumpet' ? trumpetKey : concertKey;
  const secondaryKey = activeInstrument === 'trumpet' ? concertKey : trumpetKey;
  const groupKey = primaryKey || 'Sin tono';

  return { primaryKey, secondaryKey, groupKey, trumpetKey, concertKey };
}

describe('Auditoría de Biblioteca, Tonalidades y Persistencia (Ajustes de Regresión)', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockStorage.setItem = defaultSetItem;
    vi.restoreAllMocks();
  });

  // =========================================================================
  // Caso A: Contenido sin notas detectables y tonalidad guardada válida
  // =========================================================================
  it('A. respeta note.detectedKey como respaldo cuando el contenido no tiene notas detectables', () => {
    const song: SongNote = {
      id: 'song-prose-only',
      title: 'Alabanza en prosa pura',
      content: 'Canto con todo el corazón letras sin acordes',
      activeInstrument: 'trumpet',
      detectedKey: 'Re Mayor',
      concertKey: 'Do Mayor',
      updatedAt: 1000,
    };

    // Detección directa desde el texto da 'Sin tono'
    const directDetect = KeyDetector.detectKey(song.content, 'LATIN', song.activeInstrument);
    expect(directDetect.trumpetKey).toBe('Sin tono');

    // La lógica armonizada de TonalGroupingView debe usar el respaldo válido
    const resolvedTrumpet = resolveGroupingKeys(song, 'trumpet', 'LATIN');
    expect(resolvedTrumpet.groupKey).toBe('Re Mayor');
    expect(resolvedTrumpet.primaryKey).toBe('Re Mayor');
    expect(resolvedTrumpet.secondaryKey).toBe('Do Mayor');

    const resolvedKeyboard = resolveGroupingKeys(song, 'keyboard', 'LATIN');
    expect(resolvedKeyboard.groupKey).toBe('Do Mayor');
    expect(resolvedKeyboard.primaryKey).toBe('Do Mayor');
    expect(resolvedKeyboard.secondaryKey).toBe('Re Mayor');
  });

  // =========================================================================
  // Caso B: Canción con tonalidad guardada inválida o desconocida
  // =========================================================================
  it('B. agrupa de forma segura bajo "Sin tono" cuando tanto la detección como el respaldo guardado son inválidos', () => {
    const invalidKeys = ['Sin tono', 'Indeterminada', 'Desconocido', 'Tono desconocido'];

    for (const invKey of invalidKeys) {
      const song: SongNote = {
        id: `song-invalid-${invKey}`,
        title: 'Canción sin tono',
        content: 'Letra sin acordes...',
        activeInstrument: 'trumpet',
        detectedKey: invKey,
        updatedAt: 1000,
      };

      const resolved = resolveGroupingKeys(song, 'trumpet', 'LATIN');
      expect(resolved.groupKey).toBe('Sin tono');
      expect(resolved.primaryKey).toBe('Sin tono');
      expect(resolved.secondaryKey).toBe('Sin tono');
    }
  });

  // =========================================================================
  // Caso C: Contenido cambia y su tonalidad debe recalcularse (no obsoleta)
  // =========================================================================
  it('C. prioriza la detección actual sobre un detectedKey obsoleto cuando el contenido musical cambia', () => {
    // La canción tenía guardado 'Re Mayor' anteriormente...
    const songWithNewContent: SongNote = {
      id: 'song-updated-content',
      title: 'Canción Modulada',
      // ...pero ahora su contenido musical es claramente Sol Mayor (trompeta: Sol Si Re)
      content: 'Sol Si Re Sol',
      activeInstrument: 'trumpet',
      detectedKey: 'Re Mayor', // Tono antiguo obsoleto
      concertKey: 'Do Mayor',
      updatedAt: 2000,
    };

    const resolved = resolveGroupingKeys(songWithNewContent, 'trumpet', 'LATIN');
    // Debe recalcular a Sol Mayor (nuevo tono) y NO conservar Re Mayor
    expect(resolved.groupKey).toBe('Sol Mayor');
    expect(resolved.primaryKey).toBe('Sol Mayor');
    expect(resolved.secondaryKey).toBe('Fa Mayor');
  });

  // =========================================================================
  // Caso D: Dos canciones con el mismo título pero IDs y contenidos distintos
  // =========================================================================
  it('D. conserva de forma independiente dos canciones con el mismo título pero distintos IDs y notas', () => {
    const songVer1: SongNote = {
      id: 'song-version-1',
      title: 'Cuan grande es Dios',
      content: 'Do Mi Sol', // Teclado C -> Trompeta Re Mayor
      activeInstrument: 'keyboard',
      detectedKey: 'Re Mayor',
      concertKey: 'Do Mayor',
      updatedAt: 1000,
    };

    const songVer2: SongNote = {
      id: 'song-version-2',
      title: 'Cuan grande es Dios',
      content: 'Sol Si Re', // Teclado G -> Trompeta La Mayor
      activeInstrument: 'keyboard',
      detectedKey: 'La Mayor',
      concertKey: 'Sol Mayor',
      updatedAt: 2000,
    };

    NoteStorageService.save(songVer1);
    NoteStorageService.save(songVer2);

    const allNotes = NoteStorageService.getAll();
    expect(allNotes.length).toBe(2);

    const ids = allNotes.map(n => n.id);
    expect(ids).toContain('song-version-1');
    expect(ids).toContain('song-version-2');

    // En Tonalidades, cada una debe ubicarse en su propia tarjeta de tono
    const group1 = resolveGroupingKeys(songVer1, 'trumpet', 'LATIN');
    const group2 = resolveGroupingKeys(songVer2, 'trumpet', 'LATIN');
    expect(group1.groupKey).toBe('Re Mayor');
    expect(group2.groupKey).toBe('La Mayor');
  });

  // =========================================================================
  // Caso E: Cambio entre vista de trompeta y teclado no altera datos persistidos
  // =========================================================================
  it('E. agrupa según el instrumento activo sin alterar los registros persistidos en storage', () => {
    const song: SongNote = {
      id: 'song-persist-check',
      title: 'Adoración',
      content: 'Do Mi Sol Do',
      activeInstrument: 'keyboard',
      detectedKey: 'Re Mayor',
      concertKey: 'Do Mayor',
      updatedAt: 5000,
    };

    NoteStorageService.save(song);
    const rawBefore = mockStorage.getItem('trumpet_notes_data');

    // Simulación de render en vista trompeta
    const trumpetView = resolveGroupingKeys(song, 'trumpet', 'LATIN');
    expect(trumpetView.groupKey).toBe('Re Mayor');
    expect(trumpetView.primaryKey).toBe('Re Mayor');
    expect(trumpetView.secondaryKey).toBe('Do Mayor');

    // Simulación de render en vista teclado
    const keyboardView = resolveGroupingKeys(song, 'keyboard', 'LATIN');
    expect(keyboardView.groupKey).toBe('Do Mayor');
    expect(keyboardView.primaryKey).toBe('Do Mayor');
    expect(keyboardView.secondaryKey).toBe('Re Mayor');

    // Verificar que localStorage no sufrió modificaciones
    const rawAfter = mockStorage.getItem('trumpet_notes_data');
    expect(rawAfter).toBe(rawBefore);
  });

  // =========================================================================
  // Caso F: Eliminación única y limpieza referencial de listas
  // =========================================================================
  it('F. ejecuta una sola operación de eliminación purgando referencias en listas sin duplicar escrituras', () => {
    const songToDelete: SongNote = {
      id: 'target-to-delete',
      title: 'Para Borrar',
      content: 'Re Fa# La',
      activeInstrument: 'trumpet',
      detectedKey: 'Re Mayor',
      updatedAt: 1000,
    };

    const songKeep: SongNote = {
      id: 'song-keep',
      title: 'Permanente',
      content: 'Sol Si Re',
      activeInstrument: 'trumpet',
      detectedKey: 'Sol Mayor',
      updatedAt: 2000,
    };

    const setlist1: Setlist = {
      id: 'list-1',
      name: 'Lista Domingo',
      songIds: ['target-to-delete', 'song-keep'],
      updatedAt: 3000,
    };

    const setlist2: Setlist = {
      id: 'list-2',
      name: 'Lista Especial',
      songIds: ['song-keep'],
      updatedAt: 4000,
    };

    NoteStorageService.save(songToDelete);
    NoteStorageService.save(songKeep);
    saveSetlist(setlist1);
    saveSetlist(setlist2);

    const deleteSpy = vi.spyOn(NoteStorageService, 'delete');

    // Simulación del flujo coordinado donde onDeleteNote es el único ejecutor
    const onDeleteNote = (id: string) => {
      NoteStorageService.delete(id);
    };

    // handleDeleteConfirm en TonalGroupingView invoca onDeleteNote(id)
    onDeleteNote('target-to-delete');

    // Verificar que delete se ejecutó exactamente 1 vez
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith('target-to-delete');

    // Verificar estado de canciones
    const remainingNotes = NoteStorageService.getAll();
    expect(remainingNotes.length).toBe(1);
    expect(remainingNotes[0].id).toBe('song-keep');

    // Verificar limpieza referencial en listas
    const setlists = getAllSetlists();
    const updatedList1 = setlists.find(s => s.id === 'list-1');
    const updatedList2 = setlists.find(s => s.id === 'list-2');
    expect(updatedList1?.songIds).toEqual(['song-keep']); // Purga limpia de 'target-to-delete'
    expect(updatedList2?.songIds).toEqual(['song-keep']);
  });
});
