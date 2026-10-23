import { describe, it, expect, beforeEach } from 'vitest';
import { BackupService } from '../BackupService';
import { NoteStorageService } from '../NoteStorageService';
import { SetlistStorageService } from '../SetlistStorageService';
import { SongNote, Setlist } from '../../../types/note';
import { TNotesBackupPayload } from '../../../types/backup';

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

describe('BackupService - Sistema Local de Respaldo y Recuperación (.tnotes)', () => {
  beforeEach(() => {
    mockStorage.setItem = defaultSetItem;
    mockStorage.clear();
  });

  // =========================================================================
  // 1. Exportación completa y conservación de campos
  // =========================================================================
  it('1. exportación completa genera payload con todos los campos musicales y metadatos', () => {
    const song: SongNote = {
      id: 'song-1',
      title: 'Grande y Maravilloso',
      content: 'C D E F G',
      activeInstrument: 'trumpet',
      baseContent: 'A# C D D# F',
      baseInstrument: 'keyboard',
      detectedKey: 'C Mayor',
      concertKey: 'A# Mayor',
      updatedAt: 1740000000000,
    };
    const setlist: Setlist = {
      id: 'list-1',
      name: 'Culto de Adoración',
      songIds: ['song-1'],
      updatedAt: 1740000001000,
    };

    mockStorage.setItem('trumpet_notes_data', JSON.stringify([song]));
    mockStorage.setItem('trumpet_setlists_data', JSON.stringify([setlist]));
    mockStorage.setItem('notation', 'natural');
    mockStorage.setItem('theme', 'dark');

    const payload = BackupService.createBackupPayload();

    expect(payload.format).toBe('tnotes-backup');
    expect(payload.schemaVersion).toBe(1);
    expect(payload.exportedAt).toBeGreaterThan(0);
    expect(payload.exportedAtISO).toBeDefined();
    expect(payload.app?.name).toBe('TNotes');
    expect(payload.settings?.notation).toBe('natural');
    expect(payload.settings?.theme).toBe('dark');

    expect(payload.data.songs.length).toBe(1);
    expect(payload.data.songs[0]).toEqual(song);
    expect(payload.data.setlists.length).toBe(1);
    expect(payload.data.setlists[0]).toEqual(setlist);
  });

  // =========================================================================
  // 2. Importación de un respaldo válido
  // =========================================================================
  it('2. valida y ejecuta la importación de un respaldo válido correctamente', () => {
    const validBackup: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: Date.now(),
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [
          {
            id: 'import-song-1',
            title: 'Alabanza 1',
            content: 'D E F# G',
            activeInstrument: 'trumpet',
            detectedKey: 'D Mayor',
            updatedAt: Date.now(),
          },
        ],
        setlists: [
          {
            id: 'import-list-1',
            name: 'Servicio Especial',
            songIds: ['import-song-1'],
            updatedAt: Date.now(),
          },
        ],
      },
    };

    const text = JSON.stringify(validBackup);
    const validation = BackupService.validateBackupText(text);

    expect(validation.isValid).toBe(true);
    expect(validation.errors.length).toBe(0);

    const plan = BackupService.buildImportPlan(validation.payload!);
    expect(plan.songsToAdd.length).toBe(1);
    expect(plan.setlistsToAdd.length).toBe(1);

    const result = BackupService.executeImportPlan(plan);
    expect(result.success).toBe(true);
    expect(result.songsAddedCount).toBe(1);
    expect(result.setlistsAddedCount).toBe(1);

    const storedSongs = NoteStorageService.getAll();
    expect(storedSongs.length).toBe(1);
    expect(storedSongs[0].title).toBe('Alabanza 1');
  });

  // =========================================================================
  // 3. JSON malformado
  // =========================================================================
  it('3. rechaza texto con JSON malformado sin alterar almacenamiento', () => {
    const malformed = '{ format: "tnotes-backup", broken...';
    const validation = BackupService.validateBackupText(malformed);

    expect(validation.isValid).toBe(false);
    expect(validation.errors[0]).toContain('formato JSON válido');
  });

  // =========================================================================
  // 4. Formato incorrecto
  // =========================================================================
  it('4. rechaza archivos con formato diferente a tnotes-backup', () => {
    const wrongFormat = JSON.stringify({
      format: 'other-app-backup',
      schemaVersion: 1,
      data: { songs: [], setlists: [] },
    });
    const validation = BackupService.validateBackupText(wrongFormat);

    expect(validation.isValid).toBe(false);
    expect(validation.errors[0]).toContain('Identificador de formato no reconocido');
  });

  // =========================================================================
  // 5. Versión de esquema incompatible
  // =========================================================================
  it('5. rechaza versiones de esquema superiores o incompatibles', () => {
    const futureSchema = JSON.stringify({
      format: 'tnotes-backup',
      schemaVersion: 99,
      data: { songs: [], setlists: [] },
    });
    const validation = BackupService.validateBackupText(futureSchema);

    expect(validation.isValid).toBe(false);
    expect(validation.errors[0]).toContain('Versión de esquema 99 no soportada');
  });

  // =========================================================================
  // 6. Canciones idénticas y duplicados
  // =========================================================================
  it('6. omite duplicados si el ID y el contenido musical son idénticos', () => {
    const existing: SongNote = {
      id: 'song-dup',
      title: 'Canción Idéntica',
      content: 'C D E',
      activeInstrument: 'trumpet',
      detectedKey: 'C Mayor',
      updatedAt: 1000,
    };
    mockStorage.setItem('trumpet_notes_data', JSON.stringify([existing]));

    const backupPayload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 2000,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [existing],
        setlists: [],
      },
    };

    const plan = BackupService.buildImportPlan(backupPayload);
    expect(plan.songsToAdd.length).toBe(0);
    expect(plan.songsToSkipIdentical.length).toBe(1);
    expect(plan.songConflicts.length).toBe(0);

    const exec = BackupService.executeImportPlan(plan);
    expect(exec.songsAddedCount).toBe(0);
    expect(exec.songsSkippedCount).toBe(1);

    const finalNotes = NoteStorageService.getAll();
    expect(finalNotes.length).toBe(1);
  });

  // =========================================================================
  // 7. Colisión de ID con contenido diferente
  // =========================================================================
  it('7. conserva ambas canciones y reasigna ID si coincide ID pero difiere el contenido', () => {
    const localSong: SongNote = {
      id: 'collision-id',
      title: 'Versión Local',
      content: 'C E G',
      activeInstrument: 'trumpet',
      detectedKey: 'C Mayor',
      updatedAt: 1000,
    };
    mockStorage.setItem('trumpet_notes_data', JSON.stringify([localSong]));

    const incomingSong: SongNote = {
      id: 'collision-id',
      title: 'Versión Remota',
      content: 'D F# A',
      activeInstrument: 'trumpet',
      detectedKey: 'D Mayor',
      updatedAt: 2000,
    };

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 3000,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [incomingSong],
        setlists: [],
      },
    };

    const plan = BackupService.buildImportPlan(payload);
    expect(plan.songConflicts.length).toBe(1);
    expect(plan.songsToAdd.length).toBe(1);
    // El ID asignado debe ser distinto a collision-id
    expect(plan.songsToAdd[0].id).not.toBe('collision-id');
    expect(plan.idMap['collision-id']).toBe(plan.songsToAdd[0].id);

    BackupService.executeImportPlan(plan);

    const all = NoteStorageService.getAll();
    expect(all.length).toBe(2);
    expect(all.some(s => s.id === 'collision-id' && s.title === 'Versión Local')).toBe(true);
    expect(all.some(s => s.title === 'Versión Remota')).toBe(true);
  });

  // =========================================================================
  // 8. Canciones con el mismo título y distintos IDs
  // =========================================================================
  it('8. conserva canciones con el mismo título si tienen diferentes IDs', () => {
    const song1: SongNote = {
      id: 'song-id-1',
      title: 'Alabaré',
      content: 'C D E',
      activeInstrument: 'trumpet',
      detectedKey: 'C Mayor',
      updatedAt: 1000,
    };
    mockStorage.setItem('trumpet_notes_data', JSON.stringify([song1]));

    const song2: SongNote = {
      id: 'song-id-2',
      title: 'Alabaré',
      content: 'G A B',
      activeInstrument: 'trumpet',
      detectedKey: 'G Mayor',
      updatedAt: 2000,
    };

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 3000,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [song2],
        setlists: [],
      },
    };

    const plan = BackupService.buildImportPlan(payload);
    expect(plan.songsToAdd.length).toBe(1);
    expect(plan.songsToSkipIdentical.length).toBe(0);

    BackupService.executeImportPlan(plan);

    const all = NoteStorageService.getAll();
    expect(all.length).toBe(2);
    expect(all.filter(s => s.title === 'Alabaré').length).toBe(2);
  });

  // =========================================================================
  // 9. Remapeo de IDs y referencias en listas
  // =========================================================================
  it('9. remapea correctamente las referencias en listas si una canción cambia de ID por colisión', () => {
    const existingSong: SongNote = {
      id: 'shared-id',
      title: 'Canción Local Existente',
      content: 'Do Mi Sol',
      activeInstrument: 'trumpet',
      detectedKey: 'Do Mayor',
      updatedAt: 1000,
    };
    mockStorage.setItem('trumpet_notes_data', JSON.stringify([existingSong]));

    const incomingSongDifferent: SongNote = {
      id: 'shared-id',
      title: 'Canción Entrante Modificada',
      content: 'Re Fa La',
      activeInstrument: 'trumpet',
      detectedKey: 'Re Menor',
      updatedAt: 2000,
    };

    const incomingSetlist: Setlist = {
      id: 'setlist-1',
      name: 'Lista de Alabanzas',
      songIds: ['shared-id'],
      updatedAt: 2000,
    };

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 3000,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [incomingSongDifferent],
        setlists: [incomingSetlist],
      },
    };

    const plan = BackupService.buildImportPlan(payload);
    const newAssignedId = plan.idMap['shared-id'];
    expect(newAssignedId).not.toBe('shared-id');

    // La lista agregada debe apuntar al nuevo ID asignado
    expect(plan.setlistsToAdd[0].songIds).toEqual([newAssignedId]);

    BackupService.executeImportPlan(plan);

    const storedSetlists = SetlistStorageService.getAll();
    expect(storedSetlists[0].songIds).toEqual([newAssignedId]);
  });

  // =========================================================================
  // 10. Conservación del orden de las listas
  // =========================================================================
  it('10. conserva el orden exacto de las canciones dentro de cada lista importada', () => {
    const songs: SongNote[] = [
      { id: 's-1', title: 'Song 1', content: 'C', activeInstrument: 'trumpet', detectedKey: 'C', updatedAt: 1 },
      { id: 's-2', title: 'Song 2', content: 'D', activeInstrument: 'trumpet', detectedKey: 'D', updatedAt: 2 },
      { id: 's-3', title: 'Song 3', content: 'E', activeInstrument: 'trumpet', detectedKey: 'E', updatedAt: 3 },
    ];
    const orderedIds = ['s-3', 's-1', 's-2'];
    const setlist: Setlist = {
      id: 'ordered-list',
      name: 'Orden Específico',
      songIds: orderedIds,
      updatedAt: 100,
    };

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 200,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs,
        setlists: [setlist],
      },
    };

    const plan = BackupService.buildImportPlan(payload);
    expect(plan.setlistsToAdd[0].songIds).toEqual(['s-3', 's-1', 's-2']);

    BackupService.executeImportPlan(plan);

    const retrieved = SetlistStorageService.getById('ordered-list');
    expect(retrieved?.songIds).toEqual(['s-3', 's-1', 's-2']);
  });

  // =========================================================================
  // 11. Referencias a canciones inexistentes
  // =========================================================================
  it('11. detecta y reporta referencias a canciones inexistentes sin inventar datos', () => {
    const setlist: Setlist = {
      id: 'orphan-list',
      name: 'Lista con Huérfanos',
      songIds: ['valid-song', 'ghost-song-404'],
      updatedAt: 100,
    };
    const validSong: SongNote = {
      id: 'valid-song',
      title: 'Canción Existente',
      content: 'G A B',
      activeInstrument: 'trumpet',
      detectedKey: 'G',
      updatedAt: 100,
    };

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 200,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [validSong],
        setlists: [setlist],
      },
    };

    const plan = BackupService.buildImportPlan(payload);
    expect(plan.unresolvedReferences.length).toBe(1);
    expect(plan.unresolvedReferences[0].missingSongId).toBe('ghost-song-404');
    // La lista importada solo contiene la canción válida (no se inventan canciones)
    expect(plan.setlistsToAdd[0].songIds).toEqual(['valid-song']);
  });

  // =========================================================================
  // 12. Preservación de baseContent, baseInstrument y demás campos musicales
  // =========================================================================
  it('12. preserva baseContent, baseInstrument, concertKey y detectedKey intactos', () => {
    const song: SongNote = {
      id: 'musical-meta-1',
      title: 'Estudio Técnico',
      content: 'D E F# G',
      activeInstrument: 'trumpet',
      baseContent: 'C D E F',
      baseInstrument: 'keyboard',
      detectedKey: 'D Mayor',
      concertKey: 'C Mayor',
      updatedAt: 12345,
    };

    const payload = BackupService.createBackupPayload([song], []);
    const plan = BackupService.buildImportPlan(payload, [], []);
    BackupService.executeImportPlan(plan);

    const loaded = NoteStorageService.getAll();
    expect(loaded[0].baseContent).toBe('C D E F');
    expect(loaded[0].baseInstrument).toBe('keyboard');
    expect(loaded[0].detectedKey).toBe('D Mayor');
    expect(loaded[0].concertKey).toBe('C Mayor');
  });

  // =========================================================================
  // 13. Conservación de bemoles originales en datos del teclado
  // =========================================================================
  it('13. conserva los bemoles originales en canciones de teclado sin normalizarlos', () => {
    const keyboardSong: SongNote = {
      id: 'kb-flats',
      title: 'Partitura Teclado en Mib',
      content: 'Eb Bb Ab Db Mib Sib',
      activeInstrument: 'keyboard',
      baseContent: 'Eb Bb Ab Db Mib Sib',
      baseInstrument: 'keyboard',
      detectedKey: 'F Mayor',
      concertKey: 'Eb Mayor',
      updatedAt: 55555,
    };

    const payload = BackupService.createBackupPayload([keyboardSong], []);
    expect(payload.data.songs[0].content).toContain('Eb');
    expect(payload.data.songs[0].content).toContain('Bb');

    const plan = BackupService.buildImportPlan(payload, [], []);
    BackupService.executeImportPlan(plan);

    const loaded = NoteStorageService.getAll();
    expect(loaded[0].content).toBe('Eb Bb Ab Db Mib Sib');
    expect(loaded[0].content).toContain('Eb');
  });

  // =========================================================================
  // 14. Compatibilidad con canciones antiguas
  // =========================================================================
  it('14. admite canciones antiguas con campos opcionales ausentes', () => {
    const legacyRawJson = JSON.stringify({
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 100,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [
          {
            id: 'legacy-raw',
            title: 'Canción Antigua',
            content: 'C D E',
            detectedKey: 'C Mayor',
            // activeInstrument ausente
            // baseContent ausente
            updatedAt: 100,
          },
        ],
        setlists: [],
      },
    });

    const val = BackupService.validateBackupText(legacyRawJson);
    expect(val.isValid).toBe(true);

    const plan = BackupService.buildImportPlan(val.payload!, [], []);
    expect(plan.songsToAdd.length).toBe(1);

    BackupService.executeImportPlan(plan);
    const loaded = NoteStorageService.getAll();
    expect(loaded[0].id).toBe('legacy-raw');
    expect(loaded[0].activeInstrument).toBe('keyboard'); // Asignado por sanitizeLegacyNotes
  });

  // =========================================================================
  // 15. Error de almacenamiento durante la importación (Rollback atómico)
  // =========================================================================
  it('15. ejecuta reversión completa e inmediata si se produce un fallo de almacenamiento', () => {
    const initialSong: SongNote = {
      id: 'initial-1',
      title: 'Nota Previa Intacta',
      content: 'A B C',
      activeInstrument: 'trumpet',
      detectedKey: 'A',
      updatedAt: 1,
    };
    mockStorage.setItem('trumpet_notes_data', JSON.stringify([initialSong]));

    const incoming: SongNote = {
      id: 'incoming-new',
      title: 'Nueva',
      content: 'D E F',
      activeInstrument: 'trumpet',
      detectedKey: 'D',
      updatedAt: 2,
    };

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 3,
      exportedAtISO: new Date().toISOString(),
      data: { songs: [incoming], setlists: [] },
    };

    const plan = BackupService.buildImportPlan(payload);

    // Simular QuotaExceededError en setItem en la primera escritura
    const originalSetItem = mockStorage.setItem;
    let failOnce = true;
    mockStorage.setItem = (k: string, v: string) => {
      if (k === 'trumpet_notes_data' && failOnce) {
        failOnce = false;
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      originalSetItem(k, v);
    };

    try {
      const result = BackupService.executeImportPlan(plan);
      expect(result.success).toBe(false);
      expect(result.error).toContain('cuota de almacenamiento');

      // Restaurar función setItem y verificar que los datos previos quedaron intactos
      mockStorage.setItem = originalSetItem;
      const finalStored = NoteStorageService.getAll();
      expect(finalStored.length).toBe(1);
      expect(finalStored[0].id).toBe('initial-1');
    } finally {
      mockStorage.setItem = originalSetItem;
    }
  });

  // =========================================================================
  // 16. Cancelación sin modificar datos
  // =========================================================================
  it('16. validar y construir planes de importación no altera los datos almacenados', () => {
    const initial: SongNote = {
      id: 'clean-1',
      title: 'Canción Inicial',
      content: 'C D E',
      activeInstrument: 'trumpet',
      detectedKey: 'C',
      updatedAt: 1,
    };
    mockStorage.setItem('trumpet_notes_data', JSON.stringify([initial]));

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 10,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [{ id: 'other', title: 'Otra', content: 'G', activeInstrument: 'trumpet', detectedKey: 'G', updatedAt: 2 }],
        setlists: [],
      },
    };

    // Validar y planificar sin ejecutar
    BackupService.validateBackupText(JSON.stringify(payload));
    BackupService.buildImportPlan(payload);

    const stored = NoteStorageService.getAll();
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe('clean-1');
  });

  // =========================================================================
  // 17. Preferencias actuales intactas si el usuario no acepta importarlas
  // =========================================================================
  it('17. conserva las preferencias de usuario intactas si importSettings es falso', () => {
    mockStorage.setItem('notation', 'natural');
    mockStorage.setItem('theme', 'dark');

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 10,
      exportedAtISO: new Date().toISOString(),
      settings: {
        notation: 'en',
        theme: 'light',
      },
      data: { songs: [], setlists: [] },
    };

    const plan = BackupService.buildImportPlan(payload);
    // Ejecutar con importSettings = false
    BackupService.executeImportPlan(plan, { importSettings: false });

    expect(mockStorage.getItem('notation')).toBe('natural');
    expect(mockStorage.getItem('theme')).toBe('dark');

    // Ejecutar con importSettings = true
    BackupService.executeImportPlan(plan, { importSettings: true });
    expect(mockStorage.getItem('notation')).toBe('en');
    expect(mockStorage.getItem('theme')).toBe('light');
  });

  // =========================================================================
  // 18. Repetir una importación idéntica sin generar duplicados
  // =========================================================================
  it('18. repetir una importación idéntica múltiples veces no genera duplicados', () => {
    const song: SongNote = {
      id: 'stable-id',
      title: 'Canción Fiel',
      content: 'Do Re Mi',
      activeInstrument: 'trumpet',
      detectedKey: 'Do Mayor',
      updatedAt: 100,
    };
    const setlist: Setlist = {
      id: 'stable-list',
      name: 'Lista Fiel',
      songIds: ['stable-id'],
      updatedAt: 100,
    };

    const payload: TNotesBackupPayload = {
      format: 'tnotes-backup',
      schemaVersion: 1,
      exportedAt: 100,
      exportedAtISO: new Date().toISOString(),
      data: {
        songs: [song],
        setlists: [setlist],
      },
    };

    // Primera importación
    const plan1 = BackupService.buildImportPlan(payload);
    const res1 = BackupService.executeImportPlan(plan1);
    expect(res1.songsAddedCount).toBe(1);
    expect(res1.setlistsAddedCount).toBe(1);

    // Segunda importación del mismo archivo
    const plan2 = BackupService.buildImportPlan(payload);
    expect(plan2.songsToAdd.length).toBe(0);
    expect(plan2.songsToSkipIdentical.length).toBe(1);
    expect(plan2.setlistsToAdd.length).toBe(0);
    expect(plan2.setlistsToSkipIdentical.length).toBe(1);

    const res2 = BackupService.executeImportPlan(plan2);
    expect(res2.songsAddedCount).toBe(0);
    expect(res2.songsSkippedCount).toBe(1);

    // El inventario final no se duplicó
    expect(NoteStorageService.getAll().length).toBe(1);
    expect(SetlistStorageService.getAll().length).toBe(1);
  });
});
