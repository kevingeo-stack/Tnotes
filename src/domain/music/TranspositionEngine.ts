import { NOTE_REGEX, normalizeToSharp, SharpPitch, PITCH_CLASSES } from './PitchClass';

function transpose(pitch: SharpPitch, semitones: number): SharpPitch {
    const currentIndex = PITCH_CLASSES.indexOf(pitch);
    const newIndex = (((currentIndex + semitones) % 12) + 12) % 12;
    return PITCH_CLASSES[newIndex];
}

export function keyboardToTrumpet(pitch: SharpPitch): SharpPitch {
    return transpose(pitch, 2);
}

export function trumpetToKeyboard(pitch: SharpPitch): SharpPitch {
    return transpose(pitch, -2);
}

export function transposeKeyName(keyName: string, semitones: number): string {
    if (!keyName || keyName === 'Indeterminada' || keyName === 'Sin tono') return keyName || 'Sin tono';
    const parts = keyName.split(' ');
    if (parts.length !== 2) return keyName;
    const normalizedRoot = normalizeToSharp(parts[0]) || (parts[0] as SharpPitch);
    const mode = parts[1];
    
    const currentIndex = PITCH_CLASSES.indexOf(normalizedRoot);
    if (currentIndex === -1) return keyName;

    const newIndex = (((currentIndex + semitones) % 12) + 12) % 12;
    return `${PITCH_CLASSES[newIndex]} ${mode}`;
}

export function transposeText(text: string, direction: 'KEYBOARD_TO_TRUMPET' | 'TRUMPET_TO_KEYBOARD'): string {
    if (!text) return '';
    return text.split(/(\*[^*]*\*?)/g).map(part => {
        if (part.startsWith('*')) {
            return part; // Mantener comentario intacto
        }
        return part.replace(NOTE_REGEX, (match) => {
            const normalized = normalizeToSharp(match);
            if (normalized) {
                return direction === 'KEYBOARD_TO_TRUMPET' 
                    ? keyboardToTrumpet(normalized) 
                    : trumpetToKeyboard(normalized);
            }
            return match;
        });
    }).join('');
}

export const transposeSongText = transposeText;

