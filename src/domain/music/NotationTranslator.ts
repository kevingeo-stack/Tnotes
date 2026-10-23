import { normalizeFlatsToSharps } from './PitchClass';

export type NotationStyle = 'ENGLISH' | 'LATIN';

// Conversión de notación inglesa a solfeo latino (exclusivamente naturales y sostenidos)
// Reemplazos ordenados para evitar colisiones (ej. Do# antes que Do)
const MAPPING_ENG_TO_LAT: Array<[RegExp, string]> = [
  // Sostenidos y equivalentes enarmónicos con bemol
  [/\bC#/gi, 'Do#'], [/\bDb\b/gi, 'Do#'], [/\bD♭\b/gi, 'Do#'], [/\bC\b/gi, 'Do'],
  [/\bD#/gi, 'Re#'], [/\bEb\b/gi, 'Re#'], [/\bE♭\b/gi, 'Re#'], [/\bD\b/gi, 'Re'],
  [/\bE#/gi, 'Mi#'], [/\bFb\b/gi, 'Mi'],  [/\bF♭\b/gi, 'Mi'],  [/\bE\b/gi, 'Mi'],
  [/\bF#/gi, 'Fa#'], [/\bGb\b/gi, 'Fa#'], [/\bG♭\b/gi, 'Fa#'], [/\bF\b/gi, 'Fa'],
  [/\bG#/gi, 'Sol#'], [/\bAb\b/gi, 'Sol#'], [/\bA♭\b/gi, 'Sol#'], [/\bG\b/gi, 'Sol'],
  [/\bA#/gi, 'La#'], [/\bBb\b/gi, 'La#'], [/\bB♭\b/gi, 'La#'], [/\bA\b/gi, 'La'],
  [/\bB#/gi, 'Si#'],  [/\bCb\b/gi, 'Si'],  [/\bC♭\b/gi, 'Si'],  [/\bB\b/gi, 'Si'],
  // Normalización de bemoles latinos residuales si ya venían en el texto
  [/\bReb\b/gi, 'Do#'], [/\bRe♭\b/gi, 'Do#'],
  [/\bMib\b/gi, 'Re#'], [/\bMi♭\b/gi, 'Re#'],
  [/\bSolb\b/gi, 'Fa#'], [/\bSol♭\b/gi, 'Fa#'],
  [/\bLab\b/gi, 'Sol#'], [/\bLa♭\b/gi, 'Sol#'],
  [/\bSib\b/gi, 'La#'], [/\bSi♭\b/gi, 'La#'],
  [/\bDob\b/gi, 'Si'],  [/\bDo♭\b/gi, 'Si'],
  [/\bFab\b/gi, 'Mi'],  [/\bFa♭\b/gi, 'Mi']
];

// Conversión de solfeo latino a notación inglesa (exclusivamente naturales y sostenidos)
const MAPPING_LAT_TO_ENG: Array<[RegExp, string]> = [
  // Sostenidos y equivalentes enarmónicos con bemol
  [/\bDo#/gi, 'C#'], [/\bReb\b/gi, 'C#'], [/\bRe♭\b/gi, 'C#'], [/\bDo\b/gi, 'C'],
  [/\bRe#/gi, 'D#'], [/\bMib\b/gi, 'D#'], [/\bMi♭\b/gi, 'D#'], [/\bRe\b/gi, 'D'],
  [/\bMi#/gi, 'E#'], [/\bFab\b/gi, 'E'],  [/\bFa♭\b/gi, 'E'],  [/\bMi\b/gi, 'E'],
  [/\bFa#/gi, 'F#'], [/\bSolb\b/gi, 'F#'], [/\bSol♭\b/gi, 'F#'], [/\bFa\b/gi, 'F'],
  [/\bSol#/gi, 'G#'], [/\bLab\b/gi, 'G#'], [/\bLa♭\b/gi, 'G#'], [/\bSol\b/gi, 'G'],
  [/\bLa#/gi, 'A#'], [/\bSib\b/gi, 'A#'], [/\bSi♭\b/gi, 'A#'], [/\bLa\b/gi, 'A'],
  [/\bSi#/gi, 'B#'], [/\bDob\b/gi, 'B'],  [/\bDo♭\b/gi, 'B'],  [/\bSi\b/gi, 'B'],
  // Normalización de bemoles ingleses residuales si ya venían en el texto
  [/\bDb\b/gi, 'C#'], [/\bD♭\b/gi, 'C#'],
  [/\bEb\b/gi, 'D#'], [/\bE♭\b/gi, 'D#'],
  [/\bGb\b/gi, 'F#'], [/\bG♭\b/gi, 'F#'],
  [/\bAb\b/gi, 'G#'], [/\bA♭\b/gi, 'G#'],
  [/\bBb\b/gi, 'A#'], [/\bB♭\b/gi, 'A#'],
  [/\bCb\b/gi, 'B'],  [/\bC♭\b/gi, 'B'],
  [/\bFb\b/gi, 'E'],  [/\bF♭\b/gi, 'E']
];

export class NotationTranslator {
  public static translateFullContent(text: string, targetStyle: NotationStyle): string {
    if (!text) return text;

    return text.split(/(\*[^*]*\*?)/g).map(part => {
      if (part.startsWith('*')) return part; // No tocar anotaciones entre asteriscos

      // Primero normalizar cualquier bemol a sostenidos
      let translated = normalizeFlatsToSharps(part);

      if (targetStyle === 'LATIN') {
        MAPPING_ENG_TO_LAT.forEach(([regex, replacement]) => {
          translated = translated.replace(regex, replacement);
        });
      } else {
        MAPPING_LAT_TO_ENG.forEach(([regex, replacement]) => {
          translated = translated.replace(regex, replacement);
        });
      }
      return translated;
    }).join('');
  }

  public static translateText(text: string, targetStyle: NotationStyle): string {
    return this.translateFullContent(text, targetStyle);
  }
}
