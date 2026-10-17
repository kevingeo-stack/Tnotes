import { describe, it, expect, beforeEach } from 'vitest';
import { NotationTranslator } from '../NotationTranslator';
import { TranspositionEngine } from '../TranspositionEngine';
import { KeyDetector, ALL_SHARP_ROOTS } from '../KeyDetector';
import { getAllNotes, translateAllNotesInStorage } from '../../../services/storage/NoteStorageService';
import { SongNote } from '../../../types/note';

describe('NotationTranslator & Dual Key Detection Suite', () => {
  describe('NotationTranslator Retroactive Translation', () => {
    it('translates English notes including E# to Latin (Solfege) without modifying comments', () => {
      const original = 'C D E# F *intro con C D* G A B';
      const translated = NotationTranslator.translateFullContent(original, 'LATIN');
      expect(translated).toBe('Do Re Mi# Fa *intro con C D* Sol La Si');
    });

    it('translates Latin notes including Mi# back to English without modifying comments', () => {
      const latinText = 'Do Re Mi# Fa *solo Do Re* Sol La Si';
      const translated = NotationTranslator.translateFullContent(latinText, 'ENGLISH');
      expect(translated).toBe('C D E# F *solo Do Re* G A B');
    });

    it('handles sharps and flats correctly in both directions', () => {
      const eng = 'C# Db D# Eb F# Gb G# Ab A# Bb';
      const lat = NotationTranslator.translateFullContent(eng, 'LATIN');
      expect(lat).toBe('Do# Reb Re# Mib Fa# Solb Sol# Lab La# Sib');

      const backToEng = NotationTranslator.translateFullContent(lat, 'ENGLISH');
      expect(backToEng).toBe('C# Db D# Eb F# Gb G# Ab A# Bb');
    });

    it('preserves empty or falsy strings', () => {
      expect(NotationTranslator.translateFullContent('', 'LATIN')).toBe('');
    });
  });

  describe('KeyDetector Dual Key (Trumpet / Keyboard)', () => {
    it('contains all 12 sharp roots in ALL_SHARP_ROOTS', () => {
      expect(ALL_SHARP_ROOTS).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
    });

    it('returns trumpetKey and concertKey 2 semitones down', () => {
      const result = KeyDetector.detectKey('D E F G A C# D');
      expect(result.trumpetKey).toBe('D Menor');
      expect(result.concertKey).toBe('C Menor');
      expect(result.formatted).toBe('🎺 D Menor | 🎹 C Menor');
    });

    it('detects sharp minor and major keys correctly in both instruments', () => {
      const resFSharp = KeyDetector.detectKey('F# A B C# F#');
      expect(resFSharp.trumpetKey).toBe('F# Menor');
      expect(resFSharp.concertKey).toBe('E Menor');

      const resCSharp = KeyDetector.detectKey('C# E F# G# C#');
      expect(resCSharp.trumpetKey).toBe('C# Menor');
      expect(resCSharp.concertKey).toBe('B Menor');
    });

    it('detects keys from Solfege input and formats in Solfege when requested', () => {
      const solfege = '*intro* Do# Mi Fa# Sol# *fin* Do#';
      const resLat = KeyDetector.detectKey(solfege, 'LATIN');
      expect(resLat.trumpetKey).toBe('Do# Menor');
      expect(resLat.concertKey).toBe('Si Menor');
    });

    it('does not show "Sin tono" on written songs', () => {
      const song = 'Intro: C G Am F\nVerso: C G F';
      const result = KeyDetector.detectKey(song);
      expect(result.trumpetKey).not.toBe('Sin tono');
      expect(result.concertKey).not.toBe('Sin tono');
    });
  });

  describe('Auto-Recalculation in Storage', () => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => { store[k] = v.toString(); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };

    beforeEach(() => {
      mockStorage.clear();
      // @ts-ignore
      globalThis.localStorage = mockStorage;
    });

    it('automatically re-detects notes with "Sin tono" or "Tono desconocido"', () => {
      const legacyNotes: SongNote[] = [
        {
          id: 'test-1',
          title: 'Alabanza 1',
          content: 'D E F G A C# D',
          activeInstrument: 'trumpet',
          detectedKey: 'Tono desconocido',
          updatedAt: Date.now()
        },
        {
          id: 'test-2',
          title: 'Alabanza 2',
          content: 'F# A B C# F#',
          activeInstrument: 'trumpet',
          detectedKey: 'Sin tono',
          updatedAt: Date.now()
        }
      ];

      mockStorage.setItem('trumpet_notes_data', JSON.stringify(legacyNotes));

      const reevaluated = getAllNotes();
      expect(reevaluated[0].detectedKey).toBe('D Menor');
      expect(reevaluated[0].concertKey).toBe('C Menor');

      expect(reevaluated[1].detectedKey).toBe('F# Menor');
      expect(reevaluated[1].concertKey).toBe('E Menor');
    });

    it('translates all stored notes retroactively when notation style is toggled', () => {
      const initialNotes: SongNote[] = [
        {
          id: 'song-1',
          title: 'Grande y Fuerte',
          content: 'D E F G A *coro* C# D',
          activeInstrument: 'trumpet',
          detectedKey: 'D Menor',
          concertKey: 'C Menor',
          updatedAt: Date.now()
        },
        {
          id: 'song-2',
          title: 'Fuego de Dios',
          content: 'F# A B F#',
          activeInstrument: 'trumpet',
          detectedKey: 'F# Menor',
          concertKey: 'E Menor',
          updatedAt: Date.now()
        }
      ];

      mockStorage.setItem('trumpet_notes_data', JSON.stringify(initialNotes));

      // Traducir todo a Solfeo Latino
      const latinNotes = translateAllNotesInStorage('LATIN');
      expect(latinNotes[0].content).toBe('Re Mi Fa Sol La *coro* Do# Re');
      expect(latinNotes[0].detectedKey).toBe('Re Menor');
      expect(latinNotes[0].concertKey).toBe('Do Menor');

      expect(latinNotes[1].content).toBe('Fa# La Si Fa#');
      expect(latinNotes[1].detectedKey).toBe('Fa# Menor');
      expect(latinNotes[1].concertKey).toBe('Mi Menor');

      // Traducir todo de regreso a Cifrado Inglés
      const engNotes = translateAllNotesInStorage('ENGLISH');
      expect(engNotes[0].content).toBe('D E F G A *coro* C# D');
      expect(engNotes[0].detectedKey).toBe('D Menor');
      expect(engNotes[0].concertKey).toBe('C Menor');

      expect(engNotes[1].content).toBe('F# A B F#');
      expect(engNotes[1].detectedKey).toBe('F# Menor');
      expect(engNotes[1].concertKey).toBe('E Menor');
    });

    it('processes notes with slashes (compases), line breaks and punctuation cleanly', () => {
      const songWithSlashes = "D E F / G A / C# D \n *nota de reposo* \n D";
      const result = KeyDetector.detectKey(songWithSlashes, 'ENGLISH');
      expect(result.trumpetKey).toBe('D Menor');
      expect(result.concertKey).toBe('C Menor');
    });
  });

  describe('TranspositionEngine Shift & Semitone Transposition', () => {
    it('calculates shortest semitone distance correctly', () => {
      expect(TranspositionEngine.calculateShift('C Mayor', 'D Mayor')).toBe(2);
      expect(TranspositionEngine.calculateShift('F# Menor', 'A Menor')).toBe(3);
      expect(TranspositionEngine.calculateShift('A Menor', 'B Menor')).toBe(2);
      expect(TranspositionEngine.calculateShift('La Menor', 'Si Menor')).toBe(2);
      expect(TranspositionEngine.calculateShift('B Mayor', 'C Mayor')).toBe(1);
      expect(TranspositionEngine.calculateShift('C Mayor', 'B Mayor')).toBe(-1);
    });

    it('transposes note tokens while strictly respecting asterisks comments', () => {
      const input = 'E F G *nota: mantener ritmo con D* A B';
      const transposed = TranspositionEngine.transposeBySemitones(input, 2);
      expect(transposed).toBe('F# G A *nota: mantener ritmo con D* B C#');
    });

    it('transposes Latin notes and preserves Solfege style', () => {
      const input = 'Mi Fa Sol *comentario: Do* La Si';
      const transposed = TranspositionEngine.transposeBySemitones(input, 2);
      expect(transposed).toBe('Fa# Sol La *comentario: Do* Si Do#');
    });

    it('returns original text if semitones is 0 or empty', () => {
      expect(TranspositionEngine.transposeBySemitones('C D E', 0)).toBe('C D E');
      expect(TranspositionEngine.transposeBySemitones('', 2)).toBe('');
    });
  });
});
