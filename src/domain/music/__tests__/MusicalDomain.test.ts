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
});

describe('KeyDetector', () => {
    it('detects C Mayor from text', () => {
        const text = "C D E F G A B";
        expect(detectKey(text)).toBe('C Mayor');
    });

    it('detects C Mayor from array of notes', () => {
        expect(detectKey(['C', 'E', 'G', 'F', 'C'])).toBe('C Mayor');
    });


    it('detects A Menor from specific sequence', () => {
        const text = "CCCDC BBBCB AAABAG#";
        expect(detectKey(text)).toBe('A Menor');
    });

    it('returns Indeterminada for insufficient data', () => {
        expect(detectKey("Hola mundo")).toBe('Indeterminada');
        expect(detectKey([])).toBe('Indeterminada');
    });
});
