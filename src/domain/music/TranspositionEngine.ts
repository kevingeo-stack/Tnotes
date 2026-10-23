import { NOTE_REGEX, normalizeToSharp, SharpPitch, PITCH_CLASSES, normalizeFlatsToSharps, normalizeKeyName } from './PitchClass';

export { normalizeFlatsToSharps, normalizeKeyName };

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
    if (!keyName || keyName === 'Indeterminada' || keyName === 'Sin tono' || keyName === 'Desconocido') return keyName || 'Sin tono';
    const normalizedKey = normalizeKeyName(keyName);
    const parts = normalizedKey.split(' ');
    if (parts.length !== 2) return normalizedKey;
    const root = parts[0];
    const mode = parts[1];
    
    const upper = root.toUpperCase().replace('♯', '#').replace('♭', 'B');
    const currentIndex = PITCH_INDEX[upper];
    if (currentIndex === undefined) {
      const normalizedRoot = normalizeToSharp(root);
      if (!normalizedRoot) return normalizedKey;
      const idx = PITCH_CLASSES.indexOf(normalizedRoot);
      if (idx === -1) return normalizedKey;
      const newIndex = (((idx + semitones) % 12) + 12) % 12;
      return `${PITCH_CLASSES[newIndex]} ${mode}`;
    }

    const newIndex = (((currentIndex + semitones) % 12) + 12) % 12;
    const isLatin = /^(Do|Re|Mi|Fa|Sol|La|Si)/i.test(root);
    return `${isLatin ? LATIN_SHARP_PITCHES[newIndex] : SHARP_PITCHES[newIndex]} ${mode}`;
}

export function transposeText(text: string, direction: 'KEYBOARD_TO_TRUMPET' | 'TRUMPET_TO_KEYBOARD'): string {
    const semitones = direction === 'KEYBOARD_TO_TRUMPET' ? 2 : -2;
    return TranspositionEngine.transposeBySemitones(text, semitones);
}

export const transposeSongText = transposeText;

export const PITCH_INDEX: Record<string, number> = {
  // English
  'C': 0, 'C#': 1, 'C♯': 1, 'DB': 1, 'D♭': 1, 'D': 2, 'D#': 3, 'D♯': 3, 'EB': 3, 'E♭': 3, 'E': 4, 'E#': 5, 'E♯': 5, 'FB': 4, 'F♭': 4,
  'F': 5, 'F#': 6, 'F♯': 6, 'GB': 6, 'G♭': 6, 'G': 7, 'G#': 8, 'G♯': 8, 'AB': 8, 'A♭': 8, 'A': 9, 'A#': 10, 'A♯': 10, 'BB': 10, 'B♭': 10, 'B': 11, 'B#': 0, 'B♯': 0, 'CB': 11, 'C♭': 11,
  // Latin Solfege
  'DO': 0, 'DO#': 1, 'DO♯': 1, 'REB': 1, 'RE♭': 1, 'RE': 2, 'RE#': 3, 'RE♯': 3, 'MIB': 3, 'MI♭': 3, 'MI': 4, 'MI#': 5, 'MI♯': 5, 'FAB': 4, 'FA♭': 4,
  'FA': 5, 'FA#': 6, 'FA♯': 6, 'SOLB': 6, 'SOL♭': 6, 'SOL': 7, 'SOL#': 8, 'SOL♯': 8, 'LAB': 8, 'LA♭': 8, 'LA': 9, 'LA#': 10, 'LA♯': 10, 'SIB': 10, 'SI♭': 10, 'SI': 11, 'SI#': 0, 'SI♯': 0, 'DOB': 11, 'DO♭': 11
};

export const SHARP_PITCHES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const LATIN_SHARP_PITCHES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

export class TranspositionEngine {
  /**
   * Transpone un texto completo N semitonos arriba o abajo respetando comentarios,
   * solfeo latino, notación inglesa, alteraciones y octavas numéricas.
   * La salida utiliza exclusivamente clases de altura naturales y sostenidas.
   */
  public static transposeBySemitones(text: string, semitones: number): string {
    if (!text || semitones === 0) return normalizeFlatsToSharps(text);

    return text.split(/(\*[^*]*\*?)/g).map(part => {
      if (part.startsWith('*')) return part;

      return part.replace(
        /(?<![a-zA-ZñáéíóúÁÉÍÓÚÑ])(Do[#b♯♭]?|Re[#b♯♭]?|Mi[#b♯♭]?|Fa[#b♯♭]?|Sol[#b♯♭]?|La[#b♯♭]?|Si[#b♯♭]?|[A-G][#b♯♭]?)([0-9])?(?![a-zA-ZñáéíóúÁÉÍÓÚÑ#b♯♭0-9])/gi,
        (match, notePart, octavePart, offset, fullString) => {
          // Si es "La" seguido de palabra en minúscula que NO es nota ni modo (ej. "La canción", "La trompeta"), es artículo
          if (/^la$/i.test(notePart)) {
            const rest = fullString.slice(offset + match.length);
            const nextWordMatch = rest.match(/^\s+([a-zA-ZñáéíóúÁÉÍÓÚÑ#b♯♭0-9]+)/);
            if (nextWordMatch) {
              const nextWord = nextWordMatch[1];
              const isNextWordNoteOrMode = /^(do[#b♯♭]?|re[#b♯♭]?|mi[#b♯♭]?|fa[#b♯♭]?|sol[#b♯♭]?|la[#b♯♭]?|si[#b♯♭]?|[a-g][#b♯♭]?|[0-9]+|menor|mayor|min|maj|m)$/i.test(nextWord);
              if (!isNextWordNoteOrMode && /^[a-zñáéíóú]/.test(nextWord)) {
                return match;
              }
            }
          }

          // Desambiguar la preposición "a" frente a la nota "A"
          if (/^a$/i.test(notePart) && octavePart === undefined) {
            const rest = fullString.slice(offset + match.length);
            const nextWordMatch = rest.match(/^\s+([a-zA-ZñáéíóúÁÉÍÓÚÑ#b♯♭0-9]+)/);
            if (nextWordMatch) {
              const nextWord = nextWordMatch[1];
              const isNextWordNoteOrMode = /^(do[#b♯♭]?|re[#b♯♭]?|mi[#b♯♭]?|fa[#b♯♭]?|sol[#b♯♭]?|la[#b♯♭]?|si[#b♯♭]?|[a-g][#b♯♭]?|[0-9]+|menor|mayor|min|maj|m)$/i.test(nextWord);
              // Si va seguida de palabra en minúscula no musical (ej. "vamos a cantar", "a tiempo"): es preposición
              if (!isNextWordNoteOrMode && /^[a-zñáéíóú]/.test(nextWord)) {
                return match;
              }
            }

            // Si es "a" minúscula precedida por verbo o palabra española no musical (ej. "cambia a C4", "luego cambia a Bb4", "de C a D")
            if (notePart === 'a') {
              const prev = fullString.slice(0, offset);
              // Caso de construcción correlativa "de [Nota] a [Nota]"
              if (/\bde\s+(do[#b♯♭]?|re[#b♯♭]?|mi[#b♯♭]?|fa[#b♯♭]?|sol[#b♯♭]?|la[#b♯♭]?|si[#b♯♭]?|[a-g][#b♯♭]?)\s+$/i.test(prev)) {
                return match;
              }
              const prevWordMatch = prev.match(/([a-zA-ZñáéíóúÁÉÍÓÚÑ]+)\s+$/);
              if (prevWordMatch) {
                const prevWord = prevWordMatch[1];
                const isPrevWordNote = /^(do[#b♯♭]?|re[#b♯♭]?|mi[#b♯♭]?|fa[#b♯♭]?|sol[#b♯♭]?|la[#b♯♭]?|si[#b♯♭]?|[a-g][#b♯♭]?)$/i.test(prevWord);
                if (!isPrevWordNote) {
                  return match;
                }
              }
            }
          }

          const upper = notePart.toUpperCase().replace('♯', '#').replace('♭', 'B');
          const pitchClass = PITCH_INDEX[upper];
          if (pitchClass === undefined) return match;

          const newPitchClass = (((pitchClass + semitones) % 12) + 12) % 12;
          const isLatin = /^(Do|Re|Mi|Fa|Sol|La|Si)/i.test(notePart);
          const baseName = isLatin ? LATIN_SHARP_PITCHES[newPitchClass] : SHARP_PITCHES[newPitchClass];

          return octavePart !== undefined ? `${baseName}${octavePart}` : baseName;
        }
      );
    }).join('');
  }

  /**
   * Calcula los semitonos de diferencia desde el tono actual hacia el tono de destino.
   */
  public static calculateShift(currentKeyStr: string, targetKeyStr: string): number {
    if (!currentKeyStr || !targetKeyStr) return 0;
    const currentRoot = currentKeyStr.trim().split(' ')[0].toUpperCase().replace('♯', '#').replace('♭', 'B');
    const targetRoot = targetKeyStr.trim().split(' ')[0].toUpperCase().replace('♯', '#').replace('♭', 'B');

    const currentIdx = PITCH_INDEX[currentRoot] ?? 0;
    const targetIdx = PITCH_INDEX[targetRoot] ?? 0;

    let diff = targetIdx - currentIdx;
    if (diff > 6) diff -= 12;
    if (diff < -6) diff += 12;

    return diff;
  }
}
