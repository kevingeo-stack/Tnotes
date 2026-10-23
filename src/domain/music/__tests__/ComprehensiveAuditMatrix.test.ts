import { describe, it, expect, beforeEach } from 'vitest';
import { KeyDetector, detectKey } from '../KeyDetector';
import { TranspositionEngine, transposeText, transposeKeyName } from '../TranspositionEngine';
import { NotationTranslator } from '../NotationTranslator';
import { normalizeFlatsToSharps, normalizeKeyName, PITCH_CLASSES } from '../PitchClass';
import { formatDualKeyDisplay } from '../NotationSystem';
import { getKeyForSetlist } from '../../../components/views/SetlistView';
import { NoteStorageService, getAllNotes } from '../../../services/storage/NoteStorageService';
import { SetlistStorageService, getAllSetlists } from '../../../services/storage/SetlistStorageService';
import { BackupService } from '../../../services/storage/BackupService';
import { SongNote, Setlist } from '../../../types/note';

// Mock storage aislado para pruebas sin tocar el navegador real
const mockStore: Record<string, string> = {};
const testLocalStorage = {
  getItem: (key: string) => mockStore[key] || null,
  setItem: (key: string, value: string) => { mockStore[key] = value.toString(); },
  removeItem: (key: string) => { delete mockStore[key]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};

// @ts-ignore
globalThis.localStorage = testLocalStorage;

describe('TNotes Comprehensive Quality & Musical Logic Audit', () => {
  beforeEach(() => {
    testLocalStorage.clear();
  });

  // =========================================================================
  // 1. MATRIZ DE DETECCIÓN TONAL: LAS 12 CLASES DE ALTURA (MAYORES Y MENORES)
  // =========================================================================
  describe('1. Matriz de Detección Tonal (12 Clases de Altura)', () => {
    // Definición de tríadas y secuencias melódicas con reposo cadencial para las 12 tonalidades
    const majorCases = [
      { root: 'C',  latinRoot: 'Do',  notesEng: 'C E G C',       notesLat: 'Do Mi Sol Do' },
      { root: 'C#', latinRoot: 'Do#', notesEng: 'C# F G# C#',    notesLat: 'Do# Fa Sol# Do#' },
      { root: 'D',  latinRoot: 'Re',  notesEng: 'D F# A D',      notesLat: 'Re Fa# La Re' },
      { root: 'D#', latinRoot: 'Re#', notesEng: 'D# G A# D#',    notesLat: 'Re# Sol La# Re#' },
      { root: 'E',  latinRoot: 'Mi',  notesEng: 'E G# B E',      notesLat: 'Mi Sol# Si Mi' },
      { root: 'F',  latinRoot: 'Fa',  notesEng: 'F A C F',       notesLat: 'Fa La Do Fa' },
      { root: 'F#', latinRoot: 'Fa#', notesEng: 'F# A# C# F#',   notesLat: 'Fa# La# Do# Fa#' },
      { root: 'G',  latinRoot: 'Sol', notesEng: 'G B D G',       notesLat: 'Sol Si Re Sol' },
      { root: 'G#', latinRoot: 'Sol#', notesEng: 'G# C D# G#',   notesLat: 'Sol# Do Re# Sol#' },
      { root: 'A',  latinRoot: 'La',  notesEng: 'A C# E A',      notesLat: 'La Do# Mi La' },
      { root: 'A#', latinRoot: 'La#', notesEng: 'A# D F A#',     notesLat: 'La# Re Fa La#' },
      { root: 'B',  latinRoot: 'Si',  notesEng: 'B D# F# B',     notesLat: 'Si Re# Fa# Si' }
    ];

    const minorCases = [
      { root: 'C',  latinRoot: 'Do',  notesEng: 'C D# G C',      notesLat: 'Do Re# Sol Do' },
      { root: 'C#', latinRoot: 'Do#', notesEng: 'C# E G# C#',    notesLat: 'Do# Mi Sol# Do#' },
      { root: 'D',  latinRoot: 'Re',  notesEng: 'D F A D',       notesLat: 'Re Fa La Re' },
      { root: 'D#', latinRoot: 'Re#', notesEng: 'D# F# A# D#',   notesLat: 'Re# Fa# La# Re#' },
      { root: 'E',  latinRoot: 'Mi',  notesEng: 'E G B E',       notesLat: 'Mi Sol Si Mi' },
      { root: 'F',  latinRoot: 'Fa',  notesEng: 'F G# C F',      notesLat: 'Fa Sol# Do Fa' },
      { root: 'F#', latinRoot: 'Fa#', notesEng: 'F# A C# F#',    notesLat: 'Fa# La Do# Fa#' },
      { root: 'G',  latinRoot: 'Sol', notesEng: 'G A# D G',      notesLat: 'Sol La# Re Sol' },
      { root: 'G#', latinRoot: 'Sol#', notesEng: 'G# B D# G#',   notesLat: 'Sol# Si Re# Sol#' },
      { root: 'A',  latinRoot: 'La',  notesEng: 'A C E A',       notesLat: 'La Do Mi La' },
      { root: 'A#', latinRoot: 'La#', notesEng: 'A# C# F A#',    notesLat: 'La# Do# Fa La#' },
      { root: 'B',  latinRoot: 'Si',  notesEng: 'B D F# B',      notesLat: 'Si Re Fa# Si' }
    ];

    it('identifica correctamente las 12 tonalidades mayores en notación inglesa', () => {
      for (const item of majorCases) {
        const res = KeyDetector.detectKey(item.notesEng, 'ENGLISH', 'trumpet');
        expect(res.trumpetKey).toBe(`${item.root} Mayor`);
        expect(res.mode).toBe('Mayor');
      }
    });

    it('identifica correctamente las 12 tonalidades mayores en notación latina', () => {
      for (const item of majorCases) {
        const res = KeyDetector.detectKey(item.notesLat, 'LATIN', 'trumpet');
        expect(res.trumpetKey).toBe(`${item.latinRoot} Mayor`);
        expect(res.mode).toBe('Mayor');
      }
    });

    it('identifica correctamente las 12 tonalidades menores en notación inglesa', () => {
      for (const item of minorCases) {
        const res = KeyDetector.detectKey(item.notesEng, 'ENGLISH', 'trumpet');
        expect(res.trumpetKey).toBe(`${item.root} Menor`);
        expect(res.mode).toBe('Menor');
      }
    });

    it('identifica correctamente las 12 tonalidades menores en notación latina', () => {
      for (const item of minorCases) {
        const res = KeyDetector.detectKey(item.notesLat, 'LATIN', 'trumpet');
        expect(res.trumpetKey).toBe(`${item.latinRoot} Menor`);
        expect(res.mode).toBe('Menor');
      }
    });

    it('discrimina de forma contundente una tonalidad menor de su relativo mayor', () => {
      // La Menor vs Do Mayor: ambas comparten notas naturales, pero la cadencia y tercera definen la tonalidad
      const aMinorMelody = 'A C D E A B C B A';
      const cMajorMelody = 'C E F G C D E D C';

      const resAMin = KeyDetector.detectKey(aMinorMelody, 'ENGLISH', 'trumpet');
      const resCMaj = KeyDetector.detectKey(cMajorMelody, 'ENGLISH', 'trumpet');

      expect(resAMin.trumpetKey).toBe('A Menor');
      expect(resAMin.mode).toBe('Menor');

      expect(resCMaj.trumpetKey).toBe('C Mayor');
      expect(resCMaj.mode).toBe('Mayor');
    });

    it('respeta la convención Zero-Flats para trompeta en todas las salidas', () => {
      // Entradas con bemoles deben normalizarse inmediatamente a sostenidos
      const flatInputs = [
        'Bb D F Bb',
        'Eb G Bb Eb',
        'Ab C Eb Ab',
        'Db F Ab Db',
        'Gb Bb Db Gb',
        'Sib Re Fa Sib',
        'Mib Sol Sib Mib',
        'Lab Do Mib Lab'
      ];

      for (const input of flatInputs) {
        const resEng = KeyDetector.detectKey(input, 'ENGLISH', 'trumpet');
        const resLat = KeyDetector.detectKey(input, 'LATIN', 'trumpet');

        expect(resEng.trumpetKey).not.toMatch(/[b♭]/);
        expect(resLat.trumpetKey).not.toMatch(/[b♭]/);
      }
    });

    it('gestiona con precisión matemática los casos ambiguos o con notas insuficientes', () => {
      // 1. Cadena vacía
      const emptyRes = KeyDetector.detectKey('', 'ENGLISH', 'trumpet');
      expect(emptyRes.trumpetKey).toBe('Sin tono');
      expect(emptyRes.confidence).toBe(0);
      expect(emptyRes.isAmbiguous).toBe(false);
      expect(emptyRes.ambiguityReason).toBe('NO_PITCHES');

      // 2. Nota única aislada
      const singleRes = KeyDetector.detectKey('Sol', 'LATIN', 'trumpet');
      expect(singleRes.isAmbiguous).toBe(true);
      expect(singleRes.ambiguityReason).toBe('INSUFFICIENT_NOTES');
      expect(singleRes.confidence).toBeLessThanOrEqual(0.2);
      expect(singleRes.candidateKeys).toContain('Sol Mayor');
      expect(singleRes.candidateKeys).toContain('Sol Menor');

      // 3. Quinta vacía (sin tercera modal)
      const openFifth = KeyDetector.detectKey('G D G D G', 'ENGLISH', 'trumpet');
      expect(openFifth.isAmbiguous).toBe(true);
      expect(openFifth.ambiguityReason).toBe('NO_THIRD');
      expect(openFifth.confidence).toBeLessThanOrEqual(0.4);
    });
  });

  // =========================================================================
  // 2. TROMPETA Y TECLADO: ESCRITA VS CONCIERTO
  // =========================================================================
  describe('2. Trompeta y Teclado: Tonalidad Escrita vs Concierto', () => {
    it('comprueba la transposición de -2 semitonos entre trompeta escrita y tono de concierto', () => {
      const trumpetCases = [
        { written: 'C Mayor',  expectedConcert: 'A# Mayor' },
        { written: 'C# Mayor', expectedConcert: 'B Mayor' },
        { written: 'D Mayor',  expectedConcert: 'C Mayor' },
        { written: 'D# Mayor', expectedConcert: 'C# Mayor' },
        { written: 'E Mayor',  expectedConcert: 'D Mayor' },
        { written: 'F Mayor',  expectedConcert: 'D# Mayor' },
        { written: 'F# Mayor', expectedConcert: 'E Mayor' },
        { written: 'G Mayor',  expectedConcert: 'F Mayor' },
        { written: 'G# Mayor', expectedConcert: 'F# Mayor' },
        { written: 'A Mayor',  expectedConcert: 'G Mayor' },
        { written: 'A# Mayor', expectedConcert: 'G# Mayor' },
        { written: 'B Mayor',  expectedConcert: 'A Mayor' },
        // Modos Menores
        { written: 'D Menor',  expectedConcert: 'C Menor' },
        { written: 'A Menor',  expectedConcert: 'G Menor' },
        { written: 'F# Menor', expectedConcert: 'E Menor' }
      ];

      for (const item of trumpetCases) {
        const root = item.written.split(' ')[0];
        const mode = item.written.split(' ')[1];
        const transposed = transposeKeyName(item.written, -2);
        expect(transposed).toBe(item.expectedConcert);
      }
    });

    it('establece correctamente las tonalidades en KeyDetector según el instrumento activo', () => {
      // 1. Entrada de trompeta: D F# A D -> Trompeta es D Mayor, concierto es C Mayor
      const trumpetInput = KeyDetector.detectKey('D F# A D', 'ENGLISH', 'trumpet');
      expect(trumpetInput.trumpetKey).toBe('D Mayor');
      expect(trumpetInput.concertKey).toBe('C Mayor');

      // 2. Entrada de teclado: D F# A D -> Teclado (concierto) es D Mayor, trompeta es E Mayor (+2 semitonos)
      const keyboardInput = KeyDetector.detectKey('D F# A D', 'ENGLISH', 'keyboard');
      expect(keyboardInput.concertKey).toBe('D Mayor');
      expect(keyboardInput.trumpetKey).toBe('E Mayor');
    });
  });

  // =========================================================================
  // 3. COHERENCIA ENTRE VISTAS (BIBLIOTECA, TONALIDADES Y MODO LISTA)
  // =========================================================================
  describe('3. Coherencia Entre Vistas (Tonalidades vs Modo Lista)', () => {
    it('garantiza que canciones en diversas tonalidades coincidan exactamente entre Tonalidades y Modo Lista', () => {
      const sampleSongs: Partial<SongNote>[] = [
        { id: 's1', title: 'Adoración en Sol', content: 'Sol Si Re Sol', activeInstrument: 'trumpet' },
        { id: 's2', title: 'Júbilo en Re Menor', content: 'Re Fa La Re', activeInstrument: 'trumpet' },
        { id: 's3', title: 'Alabanza en La', content: 'La Do# Mi La', activeInstrument: 'trumpet' },
        { id: 's4', title: 'Piano en Do', content: 'Do Mi Sol Do', activeInstrument: 'keyboard' },
        { id: 's5', title: 'Himno en Fa# Menor', content: 'Fa# La Do# Fa#', activeInstrument: 'trumpet' }
      ];

      for (const raw of sampleSongs) {
        const note: SongNote = {
          id: raw.id!,
          title: raw.title!,
          content: raw.content!,
          detectedKey: 'Sin tono',
          activeInstrument: raw.activeInstrument as any,
          updatedAt: Date.now()
        };

        // Guardar a través del servicio
        NoteStorageService.save(note);
        const stored = NoteStorageService.getAll().find(n => n.id === note.id)!;

        // 1. Simulación de Tonalidades (TonalGroupingView, donde activeInstrument="trumpet"):
        const keyInfo = KeyDetector.detectKey(stored.content || '', 'LATIN', stored.activeInstrument || 'keyboard');
        const viewInstrument = 'trumpet';
        const primaryKeyInTonalidades = viewInstrument === 'trumpet' ? keyInfo.trumpetKey : keyInfo.concertKey;

        // 2. Modo Lista (SetlistView):
        const keyInSetlist = getKeyForSetlist(stored, 'natural');

        // AMBAS VISTAS DEBEN MOSTRAR EXACTAMENTE LA MISMA TONALIDAD DE ATRIL
        expect(keyInSetlist).toBe(primaryKeyInTonalidades);
      }
    });
  });

  // =========================================================================
  // 4. TRANSPOSICIÓN Y CONSERVACIÓN DE DATOS (NO-DERIVA Y ROUNDTRIPS)
  // =========================================================================
  describe('4. Transposición y Conservación de Datos', () => {
    it('no genera deriva acumulativa tras múltiples transposiciones cíclicas', () => {
      const original = 'C E G C\n*Intro suave*\nD F# A D';
      
      // Ciclo: +2 -> +2 -> +1 -> +2 -> +2 -> +3 (total +12 semitonos = 1 octava completa)
      let text = original;
      text = TranspositionEngine.transposeBySemitones(text, 2); // D, E
      text = TranspositionEngine.transposeBySemitones(text, 2); // E, F#
      text = TranspositionEngine.transposeBySemitones(text, 1); // F, G
      text = TranspositionEngine.transposeBySemitones(text, 2); // G, A
      text = TranspositionEngine.transposeBySemitones(text, 2); // A, B
      text = TranspositionEngine.transposeBySemitones(text, 3); // C, D

      // Los nombres de notas deben haber regresado exactamente a los originales
      expect(text).toBe('C E G C\n*Intro suave*\nD F# A D');
    });

    it('preserva baseContent y baseInstrument al cambiar y guardar transposiciones', () => {
      const song: SongNote = {
        id: 'stable-test-1',
        title: 'Canción Estable',
        content: 'C E G',
        detectedKey: 'C Mayor',
        baseContent: 'C E G',
        baseInstrument: 'trumpet',
        activeInstrument: 'trumpet',
        updatedAt: 1000
      };

      NoteStorageService.save(song);

      // Transponer a teclado para tocar en piano
      const transposedContent = transposeText(song.content, 'TRUMPET_TO_KEYBOARD'); // C E G -> A# D F
      const updatedNote: SongNote = {
        ...song,
        content: transposedContent,
        activeInstrument: 'keyboard',
        updatedAt: 2000
      };

      NoteStorageService.save(updatedNote);

      const reloaded = NoteStorageService.getAll().find(n => n.id === 'stable-test-1')!;
      expect(reloaded.content).toBe('A# D F');
      expect(reloaded.baseContent).toBe('C E G'); // El contenido original de referencia jamás se destruye
      expect(reloaded.baseInstrument).toBe('trumpet');
    });

    it('permite traducir entre notación inglesa y latina sin alterar las notas ni corromper anotaciones', () => {
      const input = 'Do Mi Sol *Coro* Fa# La Do#';
      const toEng = NotationTranslator.translateFullContent(input, 'ENGLISH');
      expect(toEng).toBe('C E G *Coro* F# A C#');

      const backToLat = NotationTranslator.translateFullContent(toEng, 'LATIN');
      expect(backToLat).toBe('Do Mi Sol *Coro* Fa# La Do#');
    });
  });

  // =========================================================================
  // 5. ALMACENAMIENTO, LISTAS Y RESPALDOS .TNOTES
  // =========================================================================
  describe('5. Almacenamiento, Listas e Integridad Referencial', () => {
    it('elimina una canción y purga automáticamente sus referencias de todas las listas activas', () => {
      const song1: SongNote = { id: 's1', title: 'Canción 1', content: 'C E G', detectedKey: 'C Mayor', activeInstrument: 'trumpet', updatedAt: 100 };
      const song2: SongNote = { id: 's2', title: 'Canción 2', content: 'D F# A', detectedKey: 'D Mayor', activeInstrument: 'trumpet', updatedAt: 200 };
      const song3: SongNote = { id: 's3', title: 'Canción 3', content: 'E G# B', detectedKey: 'E Mayor', activeInstrument: 'trumpet', updatedAt: 300 };

      NoteStorageService.save(song1);
      NoteStorageService.save(song2);
      NoteStorageService.save(song3);

      const list1: Setlist = { id: 'l1', name: 'Lista 1', songIds: ['s1', 's2', 's3'], updatedAt: 500 };
      const list2: Setlist = { id: 'l2', name: 'Lista 2', songIds: ['s2'], updatedAt: 600 };

      SetlistStorageService.save(list1);
      SetlistStorageService.save(list2);

      // Eliminar canción 2
      NoteStorageService.delete('s2');

      // Verificar que la canción fue eliminada del catálogo
      const remainingNotes = NoteStorageService.getAll();
      expect(remainingNotes.map(n => n.id)).toEqual(['s3', 's1']);

      // Verificar que las listas purgaron s2 conservando el orden de las demás canciones
      const updatedLists = getAllSetlists();
      const updatedL1 = updatedLists.find(l => l.id === 'l1')!;
      const updatedL2 = updatedLists.find(l => l.id === 'l2')!;

      expect(updatedL1.songIds).toEqual(['s1', 's3']);
      expect(updatedL2.songIds).toEqual([]);
    });

    it('exporta e importa un respaldo .tnotes íntegramente preservando relaciones', () => {
      const song: SongNote = { id: 'exp-s1', title: 'Canción Exportable', content: 'G B D', detectedKey: 'G Mayor', activeInstrument: 'trumpet', updatedAt: 1000 };
      NoteStorageService.save(song);

      const list: Setlist = { id: 'exp-l1', name: 'Lista Exportable', songIds: ['exp-s1'], updatedAt: 2000 };
      SetlistStorageService.save(list);

      // Exportar
      const payload = BackupService.createBackupPayload();
      const jsonStr = JSON.stringify(payload);

      expect(payload.format).toBe('tnotes-backup');
      expect(payload.data.songs.length).toBe(1);
      expect(payload.data.setlists.length).toBe(1);

      // Limpiar almacenamiento para simular restauración en nuevo dispositivo
      testLocalStorage.clear();
      expect(NoteStorageService.getAll().length).toBe(0);
      expect(getAllSetlists().length).toBe(0);

      // Validar e importar
      const valResult = BackupService.validateBackupText(jsonStr);
      expect(valResult.isValid).toBe(true);
      expect(valResult.payload).toBeDefined();

      const plan = BackupService.buildImportPlan(valResult.payload!);
      const execResult = BackupService.executeImportPlan(plan);

      expect(execResult.success).toBe(true);
      expect(execResult.songsAddedCount).toBe(1);
      expect(execResult.setlistsAddedCount).toBe(1);

      // Verificar datos restaurados
      const restoredSongs = NoteStorageService.getAll();
      const restoredLists = getAllSetlists();

      expect(restoredSongs.length).toBe(1);
      expect(restoredSongs[0].title).toBe('Canción Exportable');
      expect(restoredLists.length).toBe(1);
      expect(restoredLists[0].songIds).toContain(restoredSongs[0].id);
    });

    it('rechaza archivos de respaldo inválidos o corruptos sin alterar los datos existentes', () => {
      const song: SongNote = { id: 'pre-existing', title: 'Canción Preexistente', content: 'C E G', detectedKey: 'C Mayor', activeInstrument: 'trumpet', updatedAt: 100 };
      NoteStorageService.save(song);

      const corruptFiles = [
        '{ "format": "other-app", "version": 1 }',
        '{ invalid json',
        JSON.stringify({ format: 'tnotes-backup', schemaVersion: 999, data: 'not-an-object' })
      ];

      for (const corrupt of corruptFiles) {
        const valResult = BackupService.validateBackupText(corrupt);
        expect(valResult.isValid).toBe(false);
      }

      // Los datos originales deben seguir intactos
      expect(NoteStorageService.getAll().length).toBe(1);
      expect(NoteStorageService.getAll()[0].id).toBe('pre-existing');
    });
  });
});
