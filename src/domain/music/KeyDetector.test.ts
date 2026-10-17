import { describe, test, expect } from 'vitest';
import { KeyDetector, detectKey } from './KeyDetector';

describe('KeyDetector Deterministic Suite', () => {
  test('Requisito indispensable 1: {F#, A, B, F#} con reposo en F# DEBE arrojar F# Menor (Trompeta) y E Menor (Teclado)', () => {
    const notes = 'F# A B F#';
    const result = detectKey(notes);
    expect(result.trumpetKey).toBe('F# Menor');
    expect(result.concertKey).toBe('E Menor');
    expect(result.key).toBe('F# Menor');
    expect(result.root).toBe('F#');
    expect(result.mode).toBe('Menor');
    expect(KeyDetector.detectKey(notes).formatted).toBe('🎺 F# Menor | 🎹 E Menor');
  });

  test('Requisito indispensable 2: D E F G A C# con reposo en D DEBE arrojar D Menor (Trompeta) y C Menor (Teclado)', () => {
    const notes = 'D E F G A C# D';
    const result = detectKey(notes);
    expect(result.trumpetKey).toBe('D Menor');
    expect(result.concertKey).toBe('C Menor');
    expect(result.key).toBe('D Menor');
    expect(result.root).toBe('D');
    expect(result.mode).toBe('Menor');
    expect(KeyDetector.detectKey(notes).formatted).toBe('🎺 D Menor | 🎹 C Menor');
  });

  test('Caso 3: Escala {F#, A, B, C#, D, E, F#} con reposo en F# debe ser F# Menor', () => {
    const notes = ['F#', 'A', 'B', 'C#', 'D', 'E', 'F#'];
    const result = KeyDetector.detectKey(notes);
    expect(result.trumpetKey).toBe('F# Menor');
    expect(result.concertKey).toBe('E Menor');
    expect(result.key).toBe('F# Menor');
  });

  test('Caso 4: Al poderoso {D, E, F, G, A, C#} con reposo en D debe ser D Menor', () => {
    const notes = 'D D A A G A C# C# D E F E D';
    const result = KeyDetector.detectKey(notes);
    expect(result.trumpetKey).toBe('D Menor');
    expect(result.concertKey).toBe('C Menor');
    expect(result.key).toBe('D Menor');
  });

  test('Caso 5: Canción "Cómo hizo David" con reposo en D debe ser D Menor', () => {
    const notes = 'A D D E D C A A A C A C E D';
    const result = KeyDetector.detectKey(notes);
    expect(result.trumpetKey).toBe('D Menor');
    expect(result.concertKey).toBe('C Menor');
    expect(result.key).toBe('D Menor');
  });

  test('Caso 6: Escala de C Mayor estándar {C, D, E, F, G, A, B, C} debe ser C Mayor (Trompeta) y A# Mayor (Teclado)', () => {
    const notes = 'C D E F G A B C';
    const result = KeyDetector.detectKey(notes);
    expect(result.trumpetKey).toBe('C Mayor');
    expect(result.concertKey).toBe('A# Mayor');
    expect(result.key).toBe('C Mayor');
  });

  test('Caso 7: Manejo de texto vacío o sin notas', () => {
    const result = detectKey('');
    expect(result.key).toBe('Desconocido');
    expect(result.trumpetKey).toBe('Sin tono');
    expect(result.concertKey).toBe('Sin tono');
    expect(result.root).toBe('');
    expect(result.mode).toBe('Mayor');
    expect(result.formatted).toBe('Sin tono');
  });

  test('Caso 8: Detección responsiva según instrumento activo (Trompeta vs Teclado)', () => {
    // Trompeta lee A Menor
    const trumpetResult = KeyDetector.detectKey('A C E A', 'ENGLISH', 'trumpet');
    expect(trumpetResult.trumpetKey).toBe('A Menor');
    expect(trumpetResult.concertKey).toBe('G Menor');
    expect(trumpetResult.formatted).toBe('🎺 A Menor | 🎹 G Menor');

    // Teclado lee G Menor (notas desplazadas -2 semitonos: G, A#/Bb, D)
    const keyboardResult = KeyDetector.detectKey('G A# D G', 'ENGLISH', 'keyboard');
    expect(keyboardResult.trumpetKey).toBe('A Menor');
    expect(keyboardResult.concertKey).toBe('G Menor');
    expect(keyboardResult.formatted).toBe('🎹 G Menor | 🎺 A Menor');
  });
});
