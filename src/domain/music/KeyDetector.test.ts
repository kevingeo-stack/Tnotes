import { describe, test, expect } from 'vitest';
import { KeyDetector } from './KeyDetector';

describe('KeyDetector Deterministic Suite', () => {
  test('Caso 1: {F#, A, B, C#, D, E} con reposo en F# debe ser F# Menor (NO D Mayor ni A Mayor)', () => {
    const notes = ['F#', 'A', 'B', 'C#', 'D', 'E', 'F#'];
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('F# Menor');
  });

  test('Caso 2: {D, E, F, G, A, A#, C#} con reposo en D debe ser D Menor (NO A Mayor ni F Mayor)', () => {
    // Escala menor armónica con sensible C#
    const notes = 'D D A A G A C# C# D E F E D';
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('D Menor');
  });

  test('Caso 3: Canción "Fiesta" con notas F, D, E, A, A# reposando en centro D debe ser D Menor (NO A Menor)', () => {
    const notes = 'F F D F D F F E E E D E E E D E A A# A A# A A';
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('D Menor');
  });

  test('Caso 4: Canción "Cómo hizo David" (A D D E D C A A E D) debe ser D Menor', () => {
    const notes = 'A D D E D C A A A C A C E D';
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('D Menor');
  });

  test('Caso 5: Escala de C Mayor estándar {C, D, E, F, G, A, B, C} debe ser C Mayor', () => {
    const notes = 'C D E F G A B C';
    const result = KeyDetector.detectKey(notes);
    expect(result.formatted).toBe('C Mayor');
  });
});
