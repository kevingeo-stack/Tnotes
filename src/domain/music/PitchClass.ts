export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export type SharpPitch = typeof PITCH_CLASSES[number];
export type PitchClass = number;
export type Accidental = 'natural' | 'sharp';

export const FLAT_REPLACEMENTS_LATIN: Record<string, string> = {
  'SIB': 'La#', 'SI♭': 'La#', 'Sib': 'La#', 'Si♭': 'La#',
  'MIB': 'Re#', 'MI♭': 'Re#', 'Mib': 'Re#', 'Mi♭': 'Re#',
  'LAB': 'Sol#', 'LA♭': 'Sol#', 'Lab': 'Sol#', 'La♭': 'Sol#',
  'REB': 'Do#', 'RE♭': 'Do#', 'Reb': 'Do#', 'Re♭': 'Do#',
  'SOLB': 'Fa#', 'SOL♭': 'Fa#', 'Solb': 'Fa#', 'Sol♭': 'Fa#',
  'DOB': 'Si',  'DO♭': 'Si',  'Dob': 'Si',  'Do♭': 'Si',
  'FAB': 'Mi',  'FA♭': 'Mi',  'Fab': 'Mi',  'Fa♭': 'Mi'
};

export const FLAT_REPLACEMENTS_ENGLISH: Record<string, string> = {
  'Bb': 'A#', 'B♭': 'A#', 'bb': 'A#',
  'Eb': 'D#', 'E♭': 'D#', 'EB': 'D#', 'eb': 'D#',
  'Ab': 'G#', 'A♭': 'G#', 'AB': 'G#', 'ab': 'G#',
  'Db': 'C#', 'D♭': 'C#', 'DB': 'C#', 'db': 'C#',
  'Gb': 'F#', 'G♭': 'F#', 'GB': 'F#', 'gb': 'F#',
  'Cb': 'B',  'C♭': 'B',  'CB': 'B',  'cb': 'B',
  'Fb': 'E',  'F♭': 'E',  'FB': 'E',  'fb': 'E'
};

export const FLAT_TO_SHARP: Record<string, SharpPitch> = {
  'Db': 'C#', 'D♭': 'C#', 'DB': 'C#',
  'Eb': 'D#', 'E♭': 'D#', 'EB': 'D#',
  'Gb': 'F#', 'G♭': 'F#', 'GB': 'F#',
  'Ab': 'G#', 'A♭': 'G#', 'AB': 'G#',
  'Bb': 'A#', 'B♭': 'A#', 'BB': 'A#',
  'Cb': 'B',  'C♭': 'B',  'CB': 'B',
  'Fb': 'E',  'F♭': 'E',  'FB': 'E',
  // Enarmónicos latinos a clave en inglés
  'Reb': 'C#', 'Re♭': 'C#', 'REB': 'C#',
  'Mib': 'D#', 'Mi♭': 'D#', 'MIB': 'D#',
  'Solb': 'F#', 'Sol♭': 'F#', 'SOLB': 'F#',
  'Lab': 'G#', 'La♭': 'G#', 'LAB': 'G#',
  'Sib': 'A#', 'Si♭': 'A#', 'SIB': 'A#',
  'Dob': 'B',  'Do♭': 'B',  'DOB': 'B',
  'Fab': 'E',  'Fa♭': 'E',  'FAB': 'E'
};

// Coincide con tokens de notas respetando límites para no afectar palabras en español
export const NOTE_REGEX = /(?<![a-zA-ZñáéíóúÁÉÍÓÚÑ])([A-Ga-g][#b♯♭]?[0-9]?)(?![a-zA-ZñáéíóúÁÉÍÓÚÑ])/g;

/**
 * Normaliza cualquier texto sustituyendo notas con bemoles (inglés o solfeo latino)
 * por sus equivalentes exactos en sostenidos o naturales.
 * Protege comentarios entre *asteriscos* y palabras en español.
 * Cumple la Regla 8: 'B' mayúscula aislada es la nota Si natural y nunca un bemol.
 */
export function normalizeFlatsToSharps(text: string): string {
  if (!text) return text;

  return text.split(/(\*[^*]*\*?)/g).map(part => {
    if (part.startsWith('*')) return part;

    // 1. Solfeo latino: Do|Re|Mi|Fa|Sol|La|Si seguido de b o ♭
    let res = part.replace(
      /(?<![a-zA-ZñáéíóúÁÉÍÓÚÑ])(Do|Re|Mi|Fa|Sol|La|Si)(b|♭|B)([0-9])?(?![a-zA-ZñáéíóúÁÉÍÓÚÑ#♯])/gi,
      (match, note, flat, octave = '') => {
        const key = `${note.toUpperCase()}${flat.toUpperCase()}`;
        const rep = FLAT_REPLACEMENTS_LATIN[key];
        return rep ? `${rep}${octave}` : match;
      }
    );

    // 2. Notación inglesa: Bb, B♭, o [A, C..G] con b o ♭
    // Regla 8: 'B' es la nota Si. Solo 'Bb' (b minúscula) o 'B♭' es Si bemol -> A#.
    res = res.replace(
      /(?<![a-zA-ZñáéíóúÁÉÍÓÚÑ])(B[b♭]|b[b♭]|[AC-Gac-g][b♭B])([0-9])?(?![a-zA-ZñáéíóúÁÉÍÓÚÑ#♯])/g,
      (match, noteWithFlat, octave = '') => {
        const rep = FLAT_REPLACEMENTS_ENGLISH[noteWithFlat] ||
                    FLAT_REPLACEMENTS_ENGLISH[noteWithFlat.charAt(0).toUpperCase() + noteWithFlat.slice(1)];
        return rep ? `${rep}${octave}` : match;
      }
    );

    return res;
  }).join('');
}

/**
 * Normaliza nombres de tonalidades (ej. "Bb Mayor" -> "A# Mayor", "Mib Menor" -> "Re# Menor")
 */
export function normalizeKeyName(keyName: string): string {
  if (!keyName || keyName === 'Indeterminada' || keyName === 'Sin tono' || keyName === 'Desconocido') {
    return keyName || 'Sin tono';
  }
  const parts = keyName.trim().split(/\s+/);
  if (parts.length === 0) return keyName;
  const root = parts[0];
  const mode = parts.slice(1).join(' ');
  const normalizedRoot = normalizeFlatsToSharps(root);
  return mode ? `${normalizedRoot} ${mode}` : normalizedRoot;
}

export function normalizeToSharp(token: string): SharpPitch | null {
  if (!token) return null;
  const clean = token.replace(/\d/g, '').trim();
  if (clean.length === 0) return null;

  const normalized = normalizeFlatsToSharps(clean);
  const formatted = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  if (PITCH_CLASSES.includes(formatted as SharpPitch)) {
    return formatted as SharpPitch;
  }

  if (FLAT_TO_SHARP[clean]) {
    return FLAT_TO_SHARP[clean];
  }

  return null;
}
