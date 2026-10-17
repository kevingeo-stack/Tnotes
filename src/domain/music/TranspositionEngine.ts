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

export const PITCH_INDEX: Record<string, number> = {
  'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'F': 5,
  'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11,
  'DO': 0, 'DO#': 1, 'REB': 1, 'RE': 2, 'RE#': 3, 'MIB': 3, 'MI': 4, 'FA': 5,
  'FA#': 6, 'SOLB': 6, 'SOL': 7, 'SOL#': 8, 'LAB': 8, 'LA': 9, 'LA#': 10, 'SIB': 10, 'SI': 11
};

export const SHARP_PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const LATIN_SHARP_PITCHES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export class TranspositionEngine {
  /**
   * Transpone un texto completo N semitonos arriba o abajo respetando comentarios.
   */
  public static transposeBySemitones(text: string, semitones: number): string {
    if (!text || semitones === 0) return text;

    return text.split(/(\*[^*]*\*?)/g).map(part => {
      if (part.startsWith('*')) return part;

      return part.replace(/(?<![a-zA-Z])([A-G][#b]?|Do[#b]?|Re[#b]?|Mi|Fa[#b]?|Sol[#b]?|La[#b]?|Si[#b]?)(?![a-zA-Z#b])/gi, match => {
        const upper = match.toUpperCase();
        const pitchClass = PITCH_INDEX[upper];
        if (pitchClass === undefined) return match;

        const newPitchClass = (pitchClass + semitones + 120) % 12;
        const isLatin = /^(Do|Re|Mi|Fa|Sol|La|Si)/i.test(match);
        return isLatin ? LATIN_SHARP_PITCHES[newPitchClass] : SHARP_PITCHES[newPitchClass];
      });
    }).join('');
  }

  /**
   * Calcula los semitonos de diferencia desde el tono actual hacia el tono de destino.
   */
  public static calculateShift(currentKeyStr: string, targetKeyStr: string): number {
    if (!currentKeyStr || !targetKeyStr) return 0;
    const currentRoot = currentKeyStr.trim().split(' ')[0].toUpperCase();
    const targetRoot = targetKeyStr.trim().split(' ')[0].toUpperCase();

    const currentIdx = PITCH_INDEX[currentRoot] ?? 0;
    const targetIdx = PITCH_INDEX[targetRoot] ?? 0;

    let diff = targetIdx - currentIdx;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;

    return diff;
  }
}
