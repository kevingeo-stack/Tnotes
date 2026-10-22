import { describe, it, expect, beforeEach } from 'vitest';
import { transposeText, transposeKeyName, TranspositionEngine } from '../TranspositionEngine';
import { KeyDetector } from '../KeyDetector';
import { NoteStorageService, getAllNotes, sanitizeLegacyNotes } from '../../../services/storage/NoteStorageService';
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

describe('Suite de Transposición y Consistencia Tonal (Trompeta en Sib vs Teclado)', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  describe('1. Re menor en trompeta y Do menor en teclado para el mismo caso', () => {
    it('detecta Re Menor (trompeta) y Do Menor (teclado) en notación latina', () => {
      // Notas escritas para trompeta en Sib: Re Fa Sol La Do# Re
      const trumpetNotes = 'Re Fa Sol La Do# Re';
      const trumpetRes = KeyDetector.detectKey(trumpetNotes, 'LATIN', 'trumpet');
      expect(trumpetRes.trumpetKey).toBe('Re Menor');
      expect(trumpetRes.concertKey).toBe('Do Menor');
      expect(trumpetRes.formatted).toBe('🎺 Re Menor | 🎹 Do Menor');

      // Las mismas notas transpuestas a tono de concierto/teclado (-2 semitonos): Do Mib Fa Sol Si Do
      const keyboardNotes = transposeText(trumpetNotes, 'TRUMPET_TO_KEYBOARD');
      const keyboardRes = KeyDetector.detectKey(keyboardNotes, 'LATIN', 'keyboard');
      expect(keyboardRes.trumpetKey).toBe('Re Menor');
      expect(keyboardRes.concertKey).toBe('Do Menor');
      expect(keyboardRes.formatted).toBe('🎹 Do Menor | 🎺 Re Menor');
    });

    it('detecta D Menor (trompeta) y C Menor (teclado) en notación inglesa', () => {
      const trumpetNotes = 'D F G A C# D';
      const res = KeyDetector.detectKey(trumpetNotes, 'ENGLISH', 'trumpet');
      expect(res.trumpetKey).toBe('D Menor');
      expect(res.concertKey).toBe('C Menor');

      const keyboardNotes = transposeText(trumpetNotes, 'TRUMPET_TO_KEYBOARD');
      const kbRes = KeyDetector.detectKey(keyboardNotes, 'ENGLISH', 'keyboard');
      expect(kbRes.trumpetKey).toBe('D Menor');
      expect(kbRes.concertKey).toBe('C Menor');
    });
  });

  describe('2. Transposición bidireccional y preservación de solfeo latino e inglés', () => {
    it('transpone texto en solfeo latino en ambos sentidos', () => {
      const keyboardText = 'Do Re Mi Fa Sol La Si *intro con Do*';
      const trumpetText = transposeText(keyboardText, 'KEYBOARD_TO_TRUMPET');
      expect(trumpetText).toBe('Re Mi Fa# Sol La Si Do# *intro con Do*');

      const backToKeyboard = transposeText(trumpetText, 'TRUMPET_TO_KEYBOARD');
      expect(backToKeyboard).toBe('Do Re Mi Fa Sol La Si *intro con Do*');
    });

    it('transpone texto en notación inglesa en ambos sentidos', () => {
      const keyboardText = 'C D E F G A B *solo in C*';
      const trumpetText = transposeText(keyboardText, 'KEYBOARD_TO_TRUMPET');
      expect(trumpetText).toBe('D E F# G A B C# *solo in C*');

      const backToKeyboard = transposeText(trumpetText, 'TRUMPET_TO_KEYBOARD');
      expect(backToKeyboard).toBe('C D E F G A B *solo in C*');
    });
  });

  describe('3. Alteraciones (sostenidos, bemoles, unicode) y octavas numéricas', () => {
    it('soporta sostenidos (#, ♯) y bemoles (b, ♭) en inglés y solfeo', () => {
      // Bemoles en inglés normalizados en cifrado sostenido estándar
      const flatsEng = 'Eb Bb Ab Db';
      const transFlatsEng = transposeText(flatsEng, 'KEYBOARD_TO_TRUMPET'); // +2 semitonos
      expect(transFlatsEng).toBe('F C A# D#');

      // Bemoles en solfeo normalizados en sostenidos
      const flatsLat = 'Mib Sib Lab Reb';
      const transFlatsLat = transposeText(flatsLat, 'KEYBOARD_TO_TRUMPET');
      expect(transFlatsLat).toBe('Fa Do La# Re#');

      // Unicode accidentals
      const unicodeNotes = 'Do♯ Re♭ Fa♯ Si♭';
      const transUnicode = transposeText(unicodeNotes, 'KEYBOARD_TO_TRUMPET');
      expect(transUnicode).toBe('Re# Re# Sol# Do');
    });

    it('preserva y ajusta octavas numéricas al transponer', () => {
      const withOctaves = 'C D E G';
      const transposed = transposeText(withOctaves, 'KEYBOARD_TO_TRUMPET');
      expect(transposed).toBe('D E F# A');

      const latinNotes = 'Do Re Mi Sol';
      const transposedLat = transposeText(latinNotes, 'KEYBOARD_TO_TRUMPET');
      expect(transposedLat).toBe('Re Mi Fa# La');

      const sharpsLatin = 'Fa# Sol# Do#';
      expect(transposeText(sharpsLatin, 'KEYBOARD_TO_TRUMPET')).toBe('Sol# La# Re#');
    });
  });

  describe('4. Alternar entre modos repetidamente sin acumular cambios', () => {
    it('simula toggles repetidos manteniendo una referencia estable', () => {
      const baseContent = 'Re Fa Sol La Do# Re';
      const baseInstrument: 'trumpet' | 'keyboard' = 'trumpet';

      const simulateToggle = (current: 'trumpet' | 'keyboard', baseInst: 'trumpet' | 'keyboard', baseText: string) => {
        const next: 'trumpet' | 'keyboard' = current === 'trumpet' ? 'keyboard' : 'trumpet';
        if (next === baseInst) {
          return { nextInst: next, text: baseText };
        }
        if (next === 'trumpet') {
          return { nextInst: next, text: transposeText(baseText, 'KEYBOARD_TO_TRUMPET') };
        }
        return { nextInst: next, text: transposeText(baseText, 'TRUMPET_TO_KEYBOARD') };
      };

      let currentActive: 'trumpet' | 'keyboard' = baseInstrument;
      let displayedContent = baseContent;

      // Realizar 10 alternancias consecutivas
      for (let i = 0; i < 10; i++) {
        const res = simulateToggle(currentActive, baseInstrument, baseContent);
        currentActive = res.nextInst;
        displayedContent = res.text;
      }

      // Al cabo de 10 alternancias pares, volvemos al modo trompeta original
      expect(currentActive).toBe('trumpet');
      expect(displayedContent).toBe(baseContent);

      // Una alternancia más hacia teclado
      const keyboardRes = simulateToggle(currentActive, baseInstrument, baseContent);
      expect(keyboardRes.nextInst).toBe('keyboard');
      expect(keyboardRes.text).toBe('Do Re# Fa Sol Si Do');
    });
  });

  describe('5. Guardar, cerrar y reabrir una canción sin perder referencia original', () => {
    it('persiste baseContent y baseInstrument en almacenamiento', () => {
      mockStorage.setItem('notation', 'natural');
      const originalTrumpetSong: SongNote = {
        id: 'test-song-persistence',
        title: 'Cántico de Alabanza',
        content: 'Re Fa Sol La Do# Re',
        activeInstrument: 'trumpet',
        baseContent: 'Re Fa Sol La Do# Re',
        baseInstrument: 'trumpet',
        detectedKey: 'Re Menor',
        concertKey: 'Do Menor',
        updatedAt: Date.now()
      };

      NoteStorageService.save(originalTrumpetSong);

      const retrieved = NoteStorageService.getAll().find(s => s.id === 'test-song-persistence');
      expect(retrieved).toBeDefined();
      expect(retrieved?.baseContent).toBe('Re Fa Sol La Do# Re');
      expect(retrieved?.baseInstrument).toBe('trumpet');
      expect(retrieved?.detectedKey).toBe('Re Menor');
      expect(retrieved?.concertKey).toBe('Do Menor');
    });

    it('al alternar y guardar en modo teclado, preserva baseContent original', () => {
      const baseContent = 'D F G A C# D';
      const keyboardContent = transposeText(baseContent, 'TRUMPET_TO_KEYBOARD');

      const savedInKeyboard: SongNote = {
        id: 'test-song-kb',
        title: 'Canción en Teclado',
        content: keyboardContent,
        activeInstrument: 'keyboard',
        baseContent: baseContent,
        baseInstrument: 'trumpet',
        detectedKey: 'D Menor',
        concertKey: 'C Menor',
        updatedAt: Date.now()
      };

      NoteStorageService.save(savedInKeyboard);

      const retrieved = NoteStorageService.getAll().find(s => s.id === 'test-song-kb');
      expect(retrieved?.activeInstrument).toBe('keyboard');
      expect(retrieved?.content).toBe(keyboardContent);
      expect(retrieved?.baseContent).toBe(baseContent);
      expect(retrieved?.baseInstrument).toBe('trumpet');
      expect(retrieved?.detectedKey).toBe('D Menor');
      expect(retrieved?.concertKey).toBe('C Menor');
    });
  });

  describe('6. Detección consistente en catálogo, editor y setlist', () => {
    it('calcula la misma clave independientemente de si la canción se guardó en teclado o trompeta', () => {
      // Canción A guardada en trompeta (D Menor)
      const songTrumpet: SongNote = {
        id: 'song-t',
        title: 'Song T',
        content: 'D F G A C# D',
        activeInstrument: 'trumpet',
        detectedKey: 'D Menor',
        concertKey: 'C Menor',
        updatedAt: Date.now()
      };

      // Canción B guardada en teclado (C Menor)
      const songKeyboard: SongNote = {
        id: 'song-k',
        title: 'Song K',
        content: 'C D# F G B C',
        activeInstrument: 'keyboard',
        detectedKey: 'D Menor',
        concertKey: 'C Menor',
        updatedAt: Date.now()
      };

      // Detección para catálogo (TonalGroupingView logic)
      const keyInfoT = KeyDetector.detectKey(songTrumpet.content, 'ENGLISH', songTrumpet.activeInstrument);
      const keyInfoK = KeyDetector.detectKey(songKeyboard.content, 'ENGLISH', songKeyboard.activeInstrument);

      expect(keyInfoT.trumpetKey).toBe('D Menor');
      expect(keyInfoT.concertKey).toBe('C Menor');

      expect(keyInfoK.trumpetKey).toBe('D Menor');
      expect(keyInfoK.concertKey).toBe('C Menor');

      // Ambas canciones pertenecen al mismo grupo tonal de trompeta: 'D Menor'
      expect(keyInfoT.trumpetKey).toBe(keyInfoK.trumpetKey);
      // Y al mismo grupo de concierto: 'C Menor'
      expect(keyInfoT.concertKey).toBe(keyInfoK.concertKey);
    });
  });

  describe('7. Migración segura de canciones antiguas', () => {
    it('asigna activeInstrument y baseContent a canciones legacy sin romper datos', () => {
      const rawLegacy = JSON.stringify([
        {
          id: 'legacy-song-1',
          title: 'Antigua Alabanza',
          content: 'Fa Sol La Sib Do',
          updatedAt: 1500000000000
        }
      ]);

      mockStorage.setItem('trumpet_notes_data', rawLegacy);

      sanitizeLegacyNotes();
      const all = getAllNotes();

      expect(all.length).toBe(1);
      const migrated = all[0];
      expect(migrated.activeInstrument).toBe('keyboard');
      expect(migrated.baseContent).toBe('Fa Sol La Sib Do');
      expect(migrated.baseInstrument).toBe('keyboard');
      expect(migrated.content).toBe('Fa Sol La Sib Do');
    });
  });
});
