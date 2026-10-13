export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type SharpPitch = typeof PITCH_CLASSES[number];
export type PitchClass = number;
export type Accidental = 'natural' | 'sharp' | 'flat';

const FLAT_TO_SHARP: Record<string, SharpPitch> = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#',
};

// Matches a single standalone note token (e.g. C, c#, Eb, Bb4)
export const NOTE_REGEX = /(?<![a-zA-Z])([A-Ga-g][#b]?[0-9]?)(?![a-zA-Z])/g;

export function normalizeToSharp(token: string): SharpPitch | null {
    let noteStr = token.replace(/\d/g, '');
    if (noteStr.length === 0) return null;
    noteStr = noteStr.charAt(0).toUpperCase() + noteStr.slice(1).toLowerCase();

    if (FLAT_TO_SHARP[noteStr]) {
        noteStr = FLAT_TO_SHARP[noteStr];
    }

    if (PITCH_CLASSES.includes(noteStr as SharpPitch)) {
        return noteStr as SharpPitch;
    }

    return null;
}
