import { describe, it, expect } from 'vitest';
import { transposeText, TranspositionEngine } from '../TranspositionEngine';

describe('TranspositionEngine: Preservación de Octavas y Preposición «a»', () => {
  describe('Objetivo 1: Preservar octavas numéricas explícitas', () => {
    it('transpone notas inglesas con octava de teclado a trompeta (+2 semitonos)', () => {
      const input = 'C4 E4 G4 C5';
      const output = transposeText(input, 'KEYBOARD_TO_TRUMPET');
      expect(output).toBe('D4 F#4 A4 D5');
    });

    it('transpone notas inglesas con octava de trompeta a teclado (-2 semitonos) (inversa)', () => {
      const input = 'D4 F#4 A4 D5';
      const output = transposeText(input, 'TRUMPET_TO_KEYBOARD');
      expect(output).toBe('C4 E4 G4 C5');
    });

    it('transpone notas latinas con octava de teclado a trompeta (+2 semitonos)', () => {
      const input = 'Do4 Mi4 Sol4 Do5';
      const output = transposeText(input, 'KEYBOARD_TO_TRUMPET');
      expect(output).toBe('Re4 Fa#4 La4 Re5');
    });

    it('transpone notas latinas con octava de trompeta a teclado (-2 semitonos) (inversa)', () => {
      const input = 'Re4 Fa#4 La4 Re5';
      const output = transposeText(input, 'TRUMPET_TO_KEYBOARD');
      expect(output).toBe('Do4 Mi4 Sol4 Do5');
    });

    it('realiza viaje redondo (round-trip) sin pérdida de información de octavas', () => {
      const originalEnglish = 'C4 E4 G4 C5';
      const toTrumpet = transposeText(originalEnglish, 'KEYBOARD_TO_TRUMPET');
      const backToKeyboard = transposeText(toTrumpet, 'TRUMPET_TO_KEYBOARD');
      expect(backToKeyboard).toBe(originalEnglish);

      const originalLatin = 'Do4 Mi4 Sol4 Do5';
      const toTrumpetLat = transposeText(originalLatin, 'KEYBOARD_TO_TRUMPET');
      const backToKeyboardLat = transposeText(toTrumpetLat, 'TRUMPET_TO_KEYBOARD');
      expect(backToKeyboardLat).toBe(originalLatin);
    });

    it('no agrega octavas artificiales a notas que no tienen octava explícita', () => {
      const english = 'C E G C';
      expect(transposeText(english, 'KEYBOARD_TO_TRUMPET')).toBe('D F# A D');

      const latin = 'Do Mi Sol Do';
      expect(transposeText(latin, 'KEYBOARD_TO_TRUMPET')).toBe('Re Fa# La Re');

      const mixedSharps = 'F# A# Do#';
      expect(transposeText(mixedSharps, 'KEYBOARD_TO_TRUMPET')).toBe('G# C Re#');
    });

    it('preserva octavas junto con alteraciones (sostenidos y bemoles normalizados a Zero-Flats)', () => {
      // F#4 (+2) -> G#4
      expect(transposeText('F#4', 'KEYBOARD_TO_TRUMPET')).toBe('G#4');
      // Bb4 (+2) -> C4 (Zero-Flats sostenido/natural)
      expect(transposeText('Bb4', 'KEYBOARD_TO_TRUMPET')).toBe('C4');
      // Bb4 (-2) -> G#4
      expect(transposeText('Bb4', 'TRUMPET_TO_KEYBOARD')).toBe('G#4');
      // Do#5 (+2) -> Re#5
      expect(transposeText('Do#5', 'KEYBOARD_TO_TRUMPET')).toBe('Re#5');
      // Sol#3 (-2) -> Fa#3
      expect(transposeText('Sol#3', 'TRUMPET_TO_KEYBOARD')).toBe('Fa#3');
    });

    it('protege identificadores con números que no son octavas musicales de coincidencia parcial', () => {
      const text = 'Tomar vitamina B12 antes de jugar D20 en sala C100 con F16';
      // B12, D20, C100, F16 tienen múltiples dígitos y no deben transponerse parcialmente
      const output = transposeText(text, 'KEYBOARD_TO_TRUMPET');
      expect(output).toBe('Tomar vitamina B12 antes de jugar D20 en sala C100 con F16');
    });

    it('preserva puntuación y delimitadores alrededor de notas con octava', () => {
      const text = '(C4), [E4], {G4}, Do4; Re4: Mi4!';
      const output = transposeText(text, 'KEYBOARD_TO_TRUMPET');
      expect(output).toBe('(D4), [F#4], {A4}, Re4; Mi4: Fa#4!');
    });

    it('preserva notas con octava dentro de comentarios *...* sin modificarlas', () => {
      const text = 'C4 D4 *mantener C4 hasta compás 8* E4';
      const output = transposeText(text, 'KEYBOARD_TO_TRUMPET');
      expect(output).toBe('D4 E4 *mantener C4 hasta compás 8* F#4');
    });
  });

  describe('Objetivo 2: Desambiguar y proteger la preposición «a»', () => {
    it('no transpone la preposición «a» en frases como "luego cambia a Bb4"', () => {
      const text = 'luego cambia a Bb4';
      const toTrumpet = transposeText(text, 'KEYBOARD_TO_TRUMPET');
      expect(toTrumpet).toBe('luego cambia a C4');

      const toKeyboard = transposeText(text, 'TRUMPET_TO_KEYBOARD');
      expect(toKeyboard).toBe('luego cambia a G#4');
    });

    it('no transpone la preposición «a» en "vamos a cantar"', () => {
      const text = 'vamos a cantar';
      expect(transposeText(text, 'KEYBOARD_TO_TRUMPET')).toBe('vamos a cantar');
      expect(transposeText(text, 'TRUMPET_TO_KEYBOARD')).toBe('vamos a cantar');
    });

    it('no transpone la preposición «a» en "cambia a C4"', () => {
      const text = 'cambia a C4';
      expect(transposeText(text, 'KEYBOARD_TO_TRUMPET')).toBe('cambia a D4');
      expect(transposeText(text, 'TRUMPET_TO_KEYBOARD')).toBe('cambia a A#4');
    });

    it('no transpone la preposición «a» en construcciones "de X a Y"', () => {
      const text = 'de C a D';
      expect(transposeText(text, 'KEYBOARD_TO_TRUMPET')).toBe('de D a E');
      expect(transposeText(text, 'TRUMPET_TO_KEYBOARD')).toBe('de A# a C');

      const textLatin = 'de Do a Re';
      expect(transposeText(textLatin, 'KEYBOARD_TO_TRUMPET')).toBe('de Re a Mi');
    });

    it('no transpone la preposición «a» seguida de palabras comunes no musicales', () => {
      expect(transposeText('tocar a tiempo C4', 'KEYBOARD_TO_TRUMPET')).toBe('tocar a tiempo D4');
      expect(transposeText('pasar a coro', 'KEYBOARD_TO_TRUMPET')).toBe('pasar a coro');
      expect(transposeText('cantar a capella F#', 'KEYBOARD_TO_TRUMPET')).toBe('cantar a capella G#');
    });

    it('sigue reconociendo la nota musical «A» en mayúscula ("La canción está en A")', () => {
      const text = 'La canción está en A';
      // "La" es artículo (seguido de "canción"), "A" es nota
      const toTrumpet = transposeText(text, 'KEYBOARD_TO_TRUMPET');
      expect(toTrumpet).toBe('La canción está en B');

      const toKeyboard = transposeText(text, 'TRUMPET_TO_KEYBOARD');
      expect(toKeyboard).toBe('La canción está en G');
    });

    it('sigue reconociendo la nota «A4» con octava ("A4 C5 E5")', () => {
      const text = 'A4 C5 E5';
      expect(transposeText(text, 'KEYBOARD_TO_TRUMPET')).toBe('B4 D5 F#5');
      expect(transposeText(text, 'TRUMPET_TO_KEYBOARD')).toBe('G4 A#5 D5');
    });

    it('sigue reconociendo notas con alteración («A#», «Ab»)', () => {
      expect(transposeText('A# C D', 'KEYBOARD_TO_TRUMPET')).toBe('C D E');
      expect(transposeText('A#4 C5', 'KEYBOARD_TO_TRUMPET')).toBe('C4 D5');
    });

    it('preserva secuencias con acordes y texto mezclado ("Am F C G")', () => {
      const text = 'Am F C G';
      // F, C, G son notas transpuestas; Am no es modificado destructivamente por la regla de 'a'
      const output = transposeText(text, 'KEYBOARD_TO_TRUMPET');
      expect(output).toBe('Am G D A');
    });

    it('transpone la nota «a» en minúscula cuando se encuentra en un contexto estrictamente musical', () => {
      // En una secuencia pura de notas en minúscula: g -> A, a -> B, b -> C#
      const notes = 'g a b';
      expect(transposeText(notes, 'KEYBOARD_TO_TRUMPET')).toBe('A B C#');
    });
  });

  describe('Objetivo 3: Protección integral del texto no musical y Zero-Flats', () => {
    it('no altera palabras en español que contienen letras musicales', () => {
      const prose = 'CASA FACIL SOLO DADO LUEGO FIN';
      expect(transposeText(prose, 'KEYBOARD_TO_TRUMPET')).toBe('CASA FACIL SOLO DADO LUEGO FIN');
    });

    it('respeta saltos de línea, tabulaciones y espaciado exacto', () => {
      const multiline = 'Intro:\n  C4   E4\nVerso:\n  cambia a Bb4\n';
      const expected = 'Intro:\n  D4   F#4\nVerso:\n  cambia a C4\n';
      expect(transposeText(multiline, 'KEYBOARD_TO_TRUMPET')).toBe(expected);
    });

    it('mantiene estricto cumplimiento con la convención Zero-Flats (sin bemoles en salida)', () => {
      const flatsInput = 'Db4 Eb4 Gb4 Ab4 Bb4';
      const output = transposeText(flatsInput, 'KEYBOARD_TO_TRUMPET');
      expect(output).not.toMatch(/[b♭]/);
      expect(output).toBe('D#4 F4 G#4 A#4 C4');
    });
  });
});
