import { describe, it, expect } from 'vitest';
import { NotationTranslator } from '../NotationTranslator';
import { TranspositionEngine } from '../TranspositionEngine';
import { KeyDetector, ALL_SHARP_ROOTS } from '../KeyDetector';

describe('NotationTranslator & Target Key Transposition Assistant', () => {
  describe('NotationTranslator', () => {
    it('translates English notes to Latin (Solfege) without modifying comments', () => {
      const original = 'E F G *intro con trompeta C D* A# B';
      const translated = NotationTranslator.translateFullContent(original, 'LATIN');
      expect(translated).toBe('Mi Fa Sol *intro con trompeta C D* La# Si');
    });

    it('translates Latin notes to English without modifying comments', () => {
      const latinText = 'Mi Fa Sol *solo Do Re* La# Si';
      const translated = NotationTranslator.translateFullContent(latinText, 'ENGLISH');
      expect(translated).toBe('E F G *solo Do Re* A# B');
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

  describe('KeyDetector Full Sharp Support & Robust Recognition', () => {
    it('contains all 12 sharp roots in ALL_SHARP_ROOTS', () => {
      expect(ALL_SHARP_ROOTS).toEqual(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
    });

    it('detects sharp minor and major keys correctly', () => {
      expect(KeyDetector.detectKey('F# A B C# F#').key).toBe('F# Menor');
      expect(KeyDetector.detectKey('C# E F# G# C#').key).toBe('C# Menor');
      expect(KeyDetector.detectKey('D# F# G# A# D#').key).toBe('D# Menor');
      expect(KeyDetector.detectKey('G# B C# D# G#').key).toBe('G# Menor');
    });

    it('detects keys from Solfege input and ignores comments', () => {
      const solfege = '*intro* Do# Mi Fa# Sol# *fin* Do#';
      expect(KeyDetector.detectKey(solfege).key).toBe('C# Menor');
    });

    it('does not show "Sin tono" on written songs', () => {
      const song = 'Intro: C G Am F\nVerso: C G F';
      const result = KeyDetector.detectKey(song);
      expect(result.key).not.toBe('Sin tono');
      expect(result.key).not.toBe('Desconocido');
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
