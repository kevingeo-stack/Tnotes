import { describe, it, expect, beforeEach } from 'vitest';
import { KeyDetector } from '../KeyDetector';
import { NoteStorageService } from '../../../services/storage/NoteStorageService';
import { SongNote } from '../../../types/note';

const memoryStore: Record<string, string> = {};
const mockStorage = {
  getItem: (k: string) => memoryStore[k] || null,
  setItem: (k: string, v: string) => { memoryStore[k] = v.toString(); },
  removeItem: (k: string) => { delete memoryStore[k]; },
  clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); }
};
// @ts-ignore
globalThis.localStorage = mockStorage;

describe('Auditoría y Correcciones del Detector Tonal (TNotes)', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  // =========================================================================
  // DEFECTO 1 — EXTRACCIÓN FALSA DE NOTAS EN TEXTO NORMAL
  // =========================================================================
  describe('Defecto 1 — Extracción Falsa de Notas en Texto Normal', () => {
    const proseTexts = [
      'Dios es bueno',
      'Cantaré al Señor',
      'Grande y Fiel',
      'Estrofa 1',
      'Puente',
      'Final',
      'Dios es Bueno y Fiel',
      'Estrofa Coro Puente Final'
    ];

    proseTexts.forEach(text => {
      it(`debe producir cero alturas y 'Sin tono' para texto en prosa: "${text}"`, () => {
        const pitches = KeyDetector.parsePitches(text);
        expect(pitches).toEqual([]);

        const result = KeyDetector.detectKey(text);
        expect(result.formatted).toBe('Sin tono');
        expect(result.trumpetKey).toBe('Sin tono');
        expect(result.concertKey).toBe('Sin tono');
        expect(result.key).toBe('Desconocido');
        expect(result.root).toBe('');
        expect(result.confidence).toBe(0);
      });
    });

    it('continúa detectando correctamente notas naturales en notación inglesa: C D E F G A B', () => {
      const pitches = KeyDetector.parsePitches('C D E F G A B');
      expect(pitches).toEqual([0, 2, 4, 5, 7, 9, 11]);
      const res = KeyDetector.detectKey('C D E F G A B', 'ENGLISH', 'trumpet');
      expect(res.trumpetKey).toBe('C Mayor');
    });

    it('continúa detectando correctamente notas naturales en notación latina: Do Re Mi Fa Sol La Si', () => {
      const pitches = KeyDetector.parsePitches('Do Re Mi Fa Sol La Si');
      expect(pitches).toEqual([0, 2, 4, 5, 7, 9, 11]);
      const res = KeyDetector.detectKey('Do Re Mi Fa Sol La Si', 'LATIN', 'trumpet');
      expect(res.trumpetKey).toBe('Do Mayor');
    });

    it('continúa detectando alteraciones con sostenidos en notación inglesa: C# D# F# G# A#', () => {
      const pitches = KeyDetector.parsePitches('C# D# F# G# A#');
      expect(pitches).toEqual([1, 3, 6, 8, 10]);
    });

    it('continúa detectando alteraciones con sostenidos en notación latina: Do# Re# Fa# Sol# La#', () => {
      const pitches = KeyDetector.parsePitches('Do# Re# Fa# Sol# La#');
      expect(pitches).toEqual([1, 3, 6, 8, 10]);
    });

    it('soporta octavas numéricas como C3 E4 G4 C5', () => {
      const pitches = KeyDetector.parsePitches('C3 E4 G4 C5');
      expect(pitches).toEqual([0, 4, 7, 0]);
      const res = KeyDetector.detectKey('C3 E4 G4 C5', 'ENGLISH', 'trumpet');
      expect(res.trumpetKey).toBe('C Mayor');
    });

    it('soporta acordes con sufijos menores: Am F C G', () => {
      const pitches = KeyDetector.parsePitches('Am F C G');
      expect(pitches).toEqual([9, 5, 0, 7]);
    });

    it('soporta acordes con extensiones y tensiones: Cmaj7 F#7 Bm', () => {
      const pitches = KeyDetector.parsePitches('Cmaj7 F#7 Bm');
      expect(pitches).toEqual([0, 6, 11]);
    });

    it('ignora comentarios entre asteriscos: *Intro* D F A *Coro* D F A', () => {
      const pitches = KeyDetector.parsePitches('*Intro* D F A *Coro* D F A');
      expect(pitches).toEqual([2, 5, 9, 2, 5, 9]);
      const res = KeyDetector.detectKey('*Intro* D F A *Coro* D F A', 'ENGLISH', 'trumpet');
      expect(res.trumpetKey).toBe('D Menor');
    });
  });

  // =========================================================================
  // DEFECTO 2 — INSTRUMENTO INCORRECTO AL RECUPERAR CANCIONES
  // =========================================================================
  describe('Defecto 2 — Instrumento al Recuperar Canciones (NoteStorageService)', () => {
    it('almacena y recupera una canción de teclado con notas Do Mi Sol', () => {
      mockStorage.setItem('notation', 'natural');
      const kbSong: SongNote = {
        id: 'kb-test-1',
        title: 'Canción de Teclado',
        content: 'Do Mi Sol',
        activeInstrument: 'keyboard',
        detectedKey: 'Sin tono',
        updatedAt: 1000
      };

      NoteStorageService.save(kbSong);
      const retrieved = NoteStorageService.getAll().find(s => s.id === 'kb-test-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.activeInstrument).toBe('keyboard');
      // Sonando en concierto Do Mayor (Do Mi Sol)
      expect(retrieved?.concertKey).toBe('Do Mayor');
      // Escrito para trompeta en Sib Re Mayor (+2 semitonos)
      expect(retrieved?.detectedKey).toBe('Re Mayor');
    });

    it('almacena y recupera una canción de trompeta con notas Re Fa# La', () => {
      mockStorage.setItem('notation', 'natural');
      const tptSong: SongNote = {
        id: 'tpt-test-1',
        title: 'Canción de Trompeta',
        content: 'Re Fa# La',
        activeInstrument: 'trumpet',
        detectedKey: 'Sin tono',
        updatedAt: 2000
      };

      NoteStorageService.save(tptSong);
      const retrieved = NoteStorageService.getAll().find(s => s.id === 'tpt-test-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.activeInstrument).toBe('trumpet');
      // Trompeta lee Re Mayor
      expect(retrieved?.detectedKey).toBe('Re Mayor');
      // Concierto suena Do Mayor (-2 semitonos)
      expect(retrieved?.concertKey).toBe('Do Mayor');
    });

    it('garantiza coherencia entre activeInstrument, detectedKey y concertKey para teclado y trompeta', () => {
      mockStorage.setItem('notation', 'natural');
      const kbNote: SongNote = {
        id: 'c-kb',
        title: 'Piano Do',
        content: 'Do Mi Sol',
        activeInstrument: 'keyboard',
        detectedKey: 'Sin tono',
        updatedAt: 1000
      };
      const tptNote: SongNote = {
        id: 'c-tpt',
        title: 'Trompeta Re',
        content: 'Re Fa# La',
        activeInstrument: 'trumpet',
        detectedKey: 'Sin tono',
        updatedAt: 2000
      };

      NoteStorageService.save(kbNote);
      NoteStorageService.save(tptNote);

      const all = NoteStorageService.getAll();
      const loadedKb = all.find(n => n.id === 'c-kb')!;
      const loadedTpt = all.find(n => n.id === 'c-tpt')!;

      // Ambas canciones describen la misma realidad armónica
      expect(loadedKb.detectedKey).toBe(loadedTpt.detectedKey); // 'Re Mayor' (atril Sib)
      expect(loadedKb.concertKey).toBe(loadedTpt.concertKey);   // 'Do Mayor' (afinación concierto)
      expect(loadedKb.activeInstrument).toBe('keyboard');
      expect(loadedTpt.activeInstrument).toBe('trumpet');
    });

    it('no genera transposición adicional al recuperar repetidamente las canciones con getAll()', () => {
      mockStorage.setItem('notation', 'natural');
      const song: SongNote = {
        id: 'stable-1',
        title: 'Estabilidad de Recuperación',
        content: 'Do Mi Sol',
        activeInstrument: 'keyboard',
        detectedKey: 'Sin tono',
        updatedAt: 5000
      };
      NoteStorageService.save(song);

      const firstGet = NoteStorageService.getAll().find(s => s.id === 'stable-1')!;
      const expectedDetected = firstGet.detectedKey;
      const expectedConcert = firstGet.concertKey;

      // 5 llamadas consecutivas
      for (let i = 0; i < 5; i++) {
        const subsequent = NoteStorageService.getAll().find(s => s.id === 'stable-1')!;
        expect(subsequent.detectedKey).toBe(expectedDetected);
        expect(subsequent.concertKey).toBe(expectedConcert);
        expect(subsequent.activeInstrument).toBe('keyboard');
        expect(subsequent.content).toBe('Do Mi Sol');
      }
    });

    it('mantiene compatibilidad con registros antiguos que no tienen activeInstrument ni concertKey', () => {
      mockStorage.setItem('notation', 'natural');
      const rawLegacy = JSON.stringify([
        {
          id: 'old-song-99',
          title: 'Himno Tradicional Antiguo',
          content: 'Do Mi Sol',
          updatedAt: 50000
        }
      ]);
      mockStorage.setItem('trumpet_notes_data', rawLegacy);

      const retrieved = NoteStorageService.getAll();
      expect(retrieved.length).toBe(1);
      const migrated = retrieved[0];

      // Se migra a keyboard con instrumento activo seguro
      expect(migrated.activeInstrument).toBe('keyboard');
      // Coherencia tonal: Do Mi Sol en teclado suena Do Mayor y en atril de trompeta es Re Mayor
      expect(migrated.detectedKey).toBe('Re Mayor');
      expect(migrated.concertKey).toBe('Do Mayor');
    });
  });

  // =========================================================================
  // DEFECTO 3 — CONFIANZA INJUSTIFICADA EN PASAJES CROMÁTICOS
  // =========================================================================
  describe('Defecto 3 — Calibración de Confianza en Pasajes Cromáticos (KeyDetector)', () => {
    it('escala cromática uniforme sin centro tonal claro debe marcarse como ambigua y con baja confianza', () => {
      const chromaticScale = 'C C# D D# E F F# G G# A A# B C';
      const result = KeyDetector.detectKey(chromaticScale, 'ENGLISH', 'trumpet');

      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityReason).toBe('CHROMATIC_UNCERTAINTY');
      // La confianza debe ser baja y cautelosa (<= 0.35), nunca alta como 0.89
      expect(result.confidence).toBeLessThanOrEqual(0.35);
      expect(result.candidateKeys).toBeDefined();
      expect(result.candidateKeys!.length).toBeGreaterThanOrEqual(2);
    });

    it('melodía cromática con tónica y cadencia claramente establecidas debe diferenciarse de la escala uniforme', () => {
      // Melodía con notas cromáticas de paso pero con fuerte polarización en Re y tríada D-F-A
      const melodyWithChromaticism = 'D F A D D# E F F# G G# A C# D D';
      const result = KeyDetector.detectKey(melodyWithChromaticism, 'ENGLISH', 'trumpet');

      expect(result.trumpetKey).toBe('D Menor');
      expect(result.ambiguityReason).not.toBe('CHROMATIC_UNCERTAINTY');
      // Al tener cadencia clara y polarización de tónica, la confianza debe ser sólida
      expect(result.confidence).toBeGreaterThanOrEqual(0.60);
    });

    it('melodía diatónica inequívoca debe recibir alta confianza y cero ambigüedad', () => {
      const diatonicMajor = 'C D E F G A B C';
      const result = KeyDetector.detectKey(diatonicMajor, 'ENGLISH', 'trumpet');

      expect(result.trumpetKey).toBe('C Mayor');
      expect(result.isAmbiguous).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('fragmento demasiado corto para determinar la tonalidad: nota única', () => {
      const singleNote = 'C';
      const result = KeyDetector.detectKey(singleNote, 'ENGLISH', 'trumpet');

      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityReason).toBe('INSUFFICIENT_NOTES');
      expect(result.confidence).toBe(0.15);
      expect(result.candidateKeys).toContain('C Mayor');
      expect(result.candidateKeys).toContain('C Menor');
    });

    it('fragmento demasiado corto para determinar la tonalidad: quinta abierta sin tercera modal', () => {
      const openFifth = 'C G';
      const result = KeyDetector.detectKey(openFifth, 'ENGLISH', 'trumpet');

      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityReason).toBe('NO_THIRD');
      expect(result.confidence).toBe(0.35);
      // Con reposo en G, el ganador tonal modal presenta G Mayor / G Menor
      expect(result.candidateKeys).toContain('G Mayor');
      expect(result.candidateKeys).toContain('G Menor');
    });
  });
});
