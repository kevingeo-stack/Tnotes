import { describe, test, expect } from 'vitest';
import { KeyDetector, detectKey } from './KeyDetector';
import { Note } from './Note';

describe('KeyDetector Deterministic Suite & Tonal Analysis', () => {
  // -------------------------------------------------------------
  // REQUISITOS FUNDAMENTALES Y CANCIONES DE REFERENCIA
  // -------------------------------------------------------------
  test('Requisito 1: {F#, A, B, F#} con reposo en F# DEBE arrojar F# Menor (Trompeta) y E Menor (Teclado)', () => {
    const notes = 'F# A B F#';
    const result = detectKey(notes);
    expect(result.trumpetKey).toBe('F# Menor');
    expect(result.concertKey).toBe('E Menor');
    expect(result.key).toBe('F# Menor');
    expect(result.root).toBe('F#');
    expect(result.mode).toBe('Menor');
    expect(KeyDetector.detectKey(notes).formatted).toBe('🎺 F# Menor | 🎹 E Menor');
    expect(result.isAmbiguous).toBe(false);
  });

  test('Requisito 2: D E F G A C# con reposo en D DEBE arrojar D Menor (Trompeta) y C Menor (Teclado)', () => {
    const notes = 'D E F G A C# D';
    const result = detectKey(notes);
    expect(result.trumpetKey).toBe('D Menor');
    expect(result.concertKey).toBe('C Menor');
    expect(result.key).toBe('D Menor');
    expect(result.root).toBe('D');
    expect(result.mode).toBe('Menor');
    expect(KeyDetector.detectKey(notes).formatted).toBe('🎺 D Menor | 🎹 C Menor');
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  test('Caso 3: Escala menor natural {F#, A, B, C#, D, E, F#} con reposo en F# debe ser F# Menor', () => {
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
    expect(result.isAmbiguous).toBe(false);
    expect(result.confidence).toBe(0);
  });

  // -------------------------------------------------------------
  // PASO 2.1: LAS 12 TONALIDADES MAYORES Y 12 MENORES (INGLÉS)
  // -------------------------------------------------------------
  test('Validación Musical 2.1: Las 12 tonalidades mayores completas (Inglés)', () => {
    const scales = [
      { name: 'C Mayor', notes: 'C D E F G A B C' },
      { name: 'C# Mayor', notes: 'C# D# F F# G# A# C C#' },
      { name: 'D Mayor', notes: 'D E F# G A B C# D' },
      { name: 'D# Mayor', notes: 'D# F G G# A# C D D#' },
      { name: 'E Mayor', notes: 'E F# G# A B C# D# E' },
      { name: 'F Mayor', notes: 'F G A A# C D E F' },
      { name: 'F# Mayor', notes: 'F# G# A# B C# D# F F#' },
      { name: 'G Mayor', notes: 'G A B C D E F# G' },
      { name: 'G# Mayor', notes: 'G# A# C C# D# F G G#' },
      { name: 'A Mayor', notes: 'A B C# D E F# G# A' },
      { name: 'A# Mayor', notes: 'A# C D D# F G A A#' },
      { name: 'B Mayor', notes: 'B C# D# E F# G# A# B' }
    ];
    for (const s of scales) {
      const res = KeyDetector.detectKey(s.notes);
      expect(res.trumpetKey).toBe(s.name);
      expect(res.isAmbiguous).toBe(false);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  test('Validación Musical 2.1: Las 12 tonalidades menores completas (Inglés)', () => {
    const scales = [
      { name: 'C Menor', notes: 'C D D# F G G# A# C' },
      { name: 'C# Menor', notes: 'C# D# E F# G# A B C#' },
      { name: 'D Menor', notes: 'D E F G A A# C D' },
      { name: 'D# Menor', notes: 'D# F F# G# A# B C# D#' },
      { name: 'E Menor', notes: 'E F# G A B C D E' },
      { name: 'F Menor', notes: 'F G G# A# C C# D# F' },
      { name: 'F# Menor', notes: 'F# G# A B C# D E F#' },
      { name: 'G Menor', notes: 'G A A# C D D# F G' },
      { name: 'G# Menor', notes: 'G# A# B C# D# E F# G#' },
      { name: 'A Menor', notes: 'A B C D E F G A' },
      { name: 'A# Menor', notes: 'A# C C# D# F F# G# A#' },
      { name: 'B Menor', notes: 'B C# D E F# G A B' }
    ];
    for (const s of scales) {
      const res = KeyDetector.detectKey(s.notes);
      expect(res.trumpetKey).toBe(s.name);
      expect(res.isAmbiguous).toBe(false);
      expect(res.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  // -------------------------------------------------------------
  // PASO 2.2: NOTACIÓN INGLESA Y SOLFEO LATINO
  // -------------------------------------------------------------
  test('Validación Musical 2.2: Detección en Solfeo Latino de Mayores y Menores', () => {
    const doMayor = 'Do Re Mi Fa Sol La Si Do';
    const resDo = KeyDetector.detectKey(doMayor, 'LATIN');
    expect(resDo.trumpetKey).toBe('Do Mayor');
    expect(resDo.concertKey).toBe('La# Mayor');

    const reMenor = 'Re Mi Fa Sol La Sib Do Re';
    const resRe = KeyDetector.detectKey(reMenor, 'LATIN');
    expect(resRe.trumpetKey).toBe('Re Menor');
    expect(resRe.concertKey).toBe('Do Menor');

    const faSostenidoMenor = 'Fa# La Si Do# Re Mi Fa#';
    const resFaSharp = KeyDetector.detectKey(faSostenidoMenor, 'LATIN');
    expect(resFaSharp.trumpetKey).toBe('Fa# Menor');
    expect(resFaSharp.concertKey).toBe('Mi Menor');
  });

  // -------------------------------------------------------------
  // PASO 2.3: SOSTENIDOS, BEMOLES Y EQUIVALENCIAS ENARMÓNICAS
  // -------------------------------------------------------------
  test('Validación Musical 2.3: Sostenidos (#, ♯) y Bemoles (b, ♭) con enarmónicos', () => {
    // Escala con Unicode ♯
    const resUnicodeSharp = KeyDetector.detectKey('F♯ A B C♯ D E F♯');
    expect(resUnicodeSharp.trumpetKey).toBe('F# Menor');

    // Escala con Unicode ♭ (Sib Mayor / A# Mayor)
    const resUnicodeFlat = KeyDetector.detectKey('B♭ C D E♭ F G A B♭');
    expect(resUnicodeFlat.trumpetKey).toBe('A# Mayor');

    // Escala con Solfeo y Bemoles (Mib Mayor / D# Mayor)
    const resMib = KeyDetector.detectKey('Mib Fa Sol Lab Sib Do Re Mib', 'LATIN');
    expect(resMib.trumpetKey).toBe('Re# Mayor');

    // Equivalencia enarmónica Bb vs A#
    const resBb = KeyDetector.detectKey('Bb D F Bb');
    const resASharp = KeyDetector.detectKey('A# D F A#');
    expect(resBb.trumpetKey).toBe(resASharp.trumpetKey);
  });

  // -------------------------------------------------------------
  // PASO 2.4: ESCALAS Y MELODÍAS INCOMPLETAS
  // -------------------------------------------------------------
  test('Validación Musical 2.4: Melodías pentatónicas e incompletas', () => {
    // Pentatónica Mayor de Do (C D E G A C)
    const pentaDo = 'C D E G A C';
    const resPentaDo = KeyDetector.detectKey(pentaDo);
    expect(resPentaDo.trumpetKey).toBe('C Mayor');

    // Pentatónica Menor de La (A C D E G A)
    const pentaLa = 'A C D E G A';
    const resPentaLa = KeyDetector.detectKey(pentaLa);
    expect(resPentaLa.trumpetKey).toBe('A Menor');

    // Melodía sin sensible {D F G A C D} con cadencia en D
    const noLeadingTone = 'D F G A C D';
    const resNoLeading = KeyDetector.detectKey(noLeadingTone);
    expect(resNoLeading.trumpetKey).toBe('D Menor');
  });

  // -------------------------------------------------------------
  // PASO 2.5: AMBIGÜEDAD Y NOTAS INSUFICIENTES
  // -------------------------------------------------------------
  test('Validación Musical 2.5: Reconocimiento explícito de ambigüedad sin certeza falsa', () => {
    // 1. Nota única: intrínsecamente ambigua
    const singleNote = KeyDetector.detectKey('C');
    expect(singleNote.isAmbiguous).toBe(true);
    expect(singleNote.ambiguityReason).toBe('INSUFFICIENT_NOTES');
    expect(singleNote.confidence).toBeLessThanOrEqual(0.2);
    expect(singleNote.candidateKeys).toContain('C Mayor');
    expect(singleNote.candidateKeys).toContain('C Menor');

    // 2. Quinta abierta sin tercera modal (C G C G C)
    const openFifth = KeyDetector.detectKey('C G C G C');
    expect(openFifth.isAmbiguous).toBe(true);
    expect(openFifth.ambiguityReason).toBe('NO_THIRD');
    expect(openFifth.confidence).toBeLessThan(0.5);
    expect(openFifth.candidateKeys).toContain('C Mayor');
    expect(openFifth.candidateKeys).toContain('C Menor');

    // 3. Dos notas de segunda (C D)
    const twoNotes = KeyDetector.detectKey('C D');
    expect(twoNotes.isAmbiguous).toBe(true);
    expect(twoNotes.confidence).toBeLessThan(0.35);
  });

  // -------------------------------------------------------------
  // PASO 2.6: CROMATISMOS Y NOTAS DE PASO
  // -------------------------------------------------------------
  test('Validación Musical 2.6: Melodías con notas cromáticas o de paso', () => {
    // Línea de Do Mayor con #4/b5 de paso y b7 de blues (C E F F# G Bb C)
    const bluesPassing = 'C E F F# G Bb C';
    const res = KeyDetector.detectKey(bluesPassing);
    expect(res.trumpetKey).toBe('C Mayor');
  });

  // -------------------------------------------------------------
  // PASO 2.7: DIFERENCIAS ENTRE TROMPETA EN SIB Y TECLADO (CONCIERTO)
  // -------------------------------------------------------------
  test('Validación Musical 2.7: Transposición y coherencia según instrumento activo', () => {
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

  // -------------------------------------------------------------
  // PASO 2.8: CONSUMO DE Note[] DESDE CONTROLADORES
  // -------------------------------------------------------------
  test('Validación Musical 2.8: Soporte para Note[] objetos desde controladores de edición', () => {
    const noteObjects = [
      new Note(2, 4, 'natural', 'sharp', 'english'), // D
      new Note(5, 4, 'natural', 'sharp', 'english'), // F
      new Note(9, 4, 'natural', 'sharp', 'english'), // A
      new Note(2, 4, 'natural', 'sharp', 'english'), // D
    ];
    const res = KeyDetector.detectKey(noteObjects);
    expect(res.trumpetKey).toBe('D Menor');
    expect(res.concertKey).toBe('C Menor');
    expect(res.isAmbiguous).toBe(false);
  });

  // -------------------------------------------------------------
  // PASO 2.9: COMPATIBILIDAD CON CANCIONES ANTERIORES Y MODELO DE DATOS
  // -------------------------------------------------------------
  test('Validación Musical 2.9: Retrocompatibilidad completa con todas las propiedades de DualKeyResult', () => {
    const res = KeyDetector.detectKey('D F G A C# D');
    expect(res).toHaveProperty('trumpetKey');
    expect(res).toHaveProperty('concertKey');
    expect(res).toHaveProperty('formatted');
    expect(res).toHaveProperty('key');
    expect(res).toHaveProperty('name');
    expect(res).toHaveProperty('concertEquivalent');
    expect(res).toHaveProperty('confidence');
    expect(res).toHaveProperty('root');
    expect(res).toHaveProperty('mode');
    expect(res).toHaveProperty('isAmbiguous');
    expect(res.key).toBe(res.trumpetKey);
    expect(res.name).toBe(res.trumpetKey);
    expect(res.concertEquivalent).toBe(res.concertKey);
  });

  // -------------------------------------------------------------
  // PASO 2.10: PROSA, LETRAS Y COMENTARIOS EN ESPAÑOL
  // -------------------------------------------------------------
  test('Validación Musical 2.10: Filtrado de palabras y expresiones en español (La, Mi, Si, a)', () => {
    const textWithLyrics = 'La gloria sea a Dios con alabanza D E F G A C# D';
    const res = KeyDetector.detectKey(textWithLyrics);
    expect(res.trumpetKey).toBe('D Menor');

    const textWithComments = '*Intro* D F A *Coro* D F A D';
    const resComm = KeyDetector.detectKey(textWithComments);
    expect(resComm.trumpetKey).toBe('D Menor');

    const solfegeWithProse = 'Mi corazon canta a ti / Re Fa Sol La Re';
    const resSolfegeProse = KeyDetector.detectKey(solfegeWithProse, 'LATIN');
    expect(resSolfegeProse.trumpetKey).toBe('Re Menor');
  });
});
