import { describe, test, expect } from 'vitest';
import { KeyDetector, detectKey } from './KeyDetector';

describe('KeyDetector Deterministic Suite', () => {
  test('Requisito indispensable 1: {F#, A, B, F#} con reposo en F# DEBE arrojar F# Menor (Fuego y Fuego reggae)', () => {
    const notes = 'F# A B F#';
    const result = detectKey(notes);
    expect(result.key).toBe('F# Menor');
    expect(result.root).toBe('F#');
    expect(result.mode).toBe('Menor');
    expect(KeyDetector.detectKey(notes).formatted).toBe('F# Menor');
  });

  test('Requisito indispensable 2: D E F G A C# con reposo en D DEBE arrojar D Menor (por 3ª menor F y reposo en D)', () => {
    const notes = 'D E F G A C# D';
    const result = detectKey(notes);
    expect(result.key).toBe('D Menor');
    expect(result.root).toBe('D');
    expect(result.mode).toBe('Menor');
    expect(KeyDetector.detectKey(notes).formatted).toBe('D Menor');
  });

  test('Caso 3: Escala {F#, A, B, C#, D, E, F#} con reposo en F# debe ser F# Menor (NO D Mayor)', () => {
    const notes = ['F#', 'A', 'B', 'C#', 'D', 'E', 'F#'];
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('F# Menor');
    expect(result.key).toBe('F# Menor');
  });

  test('Caso 4: Al poderoso {D, E, F, G, A, C#} con reposo en D debe ser D Menor (NO A Mayor)', () => {
    const notes = 'D D A A G A C# C# D E F E D';
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('D Menor');
    expect(result.key).toBe('D Menor');
  });

  test('Caso 5: Canción "Cómo hizo David" con reposo en D debe ser D Menor', () => {
    const notes = 'A D D E D C A A A C A C E D';
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('D Menor');
    expect(result.key).toBe('D Menor');
  });

  test('Caso 6: Escala de C Mayor estándar {C, D, E, F, G, A, B, C} debe ser C Mayor', () => {
    const notes = 'C D E F G A B C';
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('C Mayor');
    expect(result.key).toBe('C Mayor');
  });

  test('Caso 7: Manejo de texto vacío o sin notas', () => {
    const result = detectKey('');
    expect(result.key).toBe('Desconocido');
    expect(result.root).toBe('');
    expect(result.mode).toBe('Mayor');
    expect(result.formatted).toBe('Sin tono');
  });
});
