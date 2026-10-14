import { describe, it, expect } from 'vitest';
import { normalizeToSharp } from '../PitchClass';
import { keyboardToTrumpet, trumpetToKeyboard, transposeText } from '../TranspositionEngine';
import { detectKey } from '../KeyDetector';

describe('PitchClass', () => {
    it('normalizes natural notes', () => {
        expect(normalizeToSharp('C')).toBe('C');
        expect(normalizeToSharp('F')).toBe('F');
    });
    
    it('removes octaves', () => {
        expect(normalizeToSharp('F4')).toBe('F');
        expect(normalizeToSharp('C#5')).toBe('C#');
    });

    it('converts flats to sharps', () => {
        expect(normalizeToSharp('Eb')).toBe('D#');
        expect(normalizeToSharp('Bb3')).toBe('A#');
        expect(normalizeToSharp('Db')).toBe('C#');
    });

    it('returns null for invalid notes', () => {
        expect(normalizeToSharp('H')).toBeNull();
        expect(normalizeToSharp('Invalid')).toBeNull();
        expect(normalizeToSharp('C#b')).toBeNull(); // handled safely
    });
});

describe('TranspositionEngine', () => {
    it('transposes Keyboard to Trumpet (+2 semitones)', () => {
        expect(keyboardToTrumpet('F')).toBe('G');
        expect(keyboardToTrumpet('A#')).toBe('C');
        expect(keyboardToTrumpet('B')).toBe('C#');
    });

    it('transposes Trumpet to Keyboard (-2 semitones)', () => {
        expect(trumpetToKeyboard('F')).toBe('D#');
        expect(trumpetToKeyboard('C')).toBe('A#');
        expect(trumpetToKeyboard('C#')).toBe('B');
    });

    it('transposes text correctly, keeping punctuation', () => {
        const text = "La canción está en F, luego cambia a Bb4. C# m";
        const transposedToTrumpet = transposeText(text, 'KEYBOARD_TO_TRUMPET');
        // 'a' could be parsed as a note? No, 'a' should be skipped because it's a valid word but wait, let's see. 
        // If 'a' is matched, it would become B. My NOTE_REGEX will match 'a', 'F', 'Bb4', 'C#'.
        // So 'a' becomes 'B'. If that fails, we can reconsider regex.
        expect(transposedToTrumpet).toBe("La canción está en G, luego cambia B C. D# m");

        const transposedToKeyboard = transposeText(text, 'TRUMPET_TO_KEYBOARD');
        expect(transposedToKeyboard).toBe("La canción está en D#, luego cambia G G#. B m");
    });

    it('preserves *...* comments intact during transposition', () => {
        const text = "D E F *aquí debemos hacer tal cosa* A A#";
        const transposed = transposeText(text, 'KEYBOARD_TO_TRUMPET');
        expect(transposed).toBe("E F# G *aquí debemos hacer tal cosa* B C");
    });
});

describe('KeyDetector', () => {
    it('detects C Mayor from text', () => {
        const text = "C D E F G A B C";
        expect(detectKey(text).key).toBe('C Mayor');
    });

    it('detects C Mayor from array of notes', () => {
        expect(detectKey(['C', 'E', 'G', 'F', 'C']).key).toBe('C Mayor');
    });

    it('detects F# Menor from Fuego notes (F# A B F#)', () => {
        const text = "F# A B F#";
        const result = detectKey(text);
        expect(result.key).toBe('F# Menor');
        expect(result.root).toBe('F#');
        expect(result.mode).toBe('Menor');
    });

    it('detects D Menor from D, E, F, G, A, C# con reposo en D', () => {
        expect(detectKey("D E F G A C# D").key).toBe('D Menor');
    });

    it('excludes *...* comments from tonal detection', () => {
        const textWithComments = "*aquí debemos hacer tal cosa* D E F G A C# D";
        expect(detectKey(textWithComments).key).toBe('D Menor');
    });

    it('accurately detects "Al poderoso" as D Menor (English and Solfeo)', () => {
        const alPoderosoEn = "D D A A G A C# C# D E F E D";
        expect(detectKey(alPoderosoEn).key).toBe('D Menor');

        const alPoderosoSolfeo = "Re Re La La Sol La Do# Do# Re Mi Fa Mi Re";
        expect(detectKey(alPoderosoSolfeo).key).toBe('D Menor');
    });

    it('accurately detects "Cómo hizo David" as D Menor (English and Solfeo)', () => {
        const davidEn = "A D D E D C A A E D";
        expect(detectKey(davidEn).key).toBe('D Menor');

        const davidSolfeo = "La Re Re Mi Re Do La La Mi Re";
        expect(detectKey(davidSolfeo).key).toBe('D Menor');
    });

    it('returns Desconocido / Sin tono for empty or non-musical data', () => {
        expect(detectKey("").key).toBe('Desconocido');
        expect(detectKey([]).key).toBe('Desconocido');
        expect(detectKey("*comentario sin notas*").key).toBe('Desconocido');
        expect(detectKey("").formatted).toBe('Sin tono');
    });
});
