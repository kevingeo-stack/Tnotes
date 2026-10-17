export type NotationStyle = 'ENGLISH' | 'LATIN';

// Reemplazos ordenados para evitar colisiones (ej. Do# antes que Do)
const MAPPING_ENG_TO_LAT: Array<[RegExp, string]> = [
  [/\bC#/gi, 'Do#'], [/\bDb/gi, 'Reb'], [/\bC\b/gi, 'Do'],
  [/\bD#/gi, 'Re#'], [/\bEb/gi, 'Mib'], [/\bD\b/gi, 'Re'],
  [/\bE#/gi, 'Mi#'], [/\bE\b/gi, 'Mi'],
  [/\bF#/gi, 'Fa#'], [/\bGb/gi, 'Solb'], [/\bF\b/gi, 'Fa'],
  [/\bG#/gi, 'Sol#'], [/\bAb/gi, 'Lab'], [/\bG\b/gi, 'Sol'],
  [/\bA#/gi, 'La#'], [/\bBb/gi, 'Sib'], [/\bA\b/gi, 'La'],
  [/\bB#/gi, 'Si#'], [/\bB\b/gi, 'Si']
];

const MAPPING_LAT_TO_ENG: Array<[RegExp, string]> = [
  [/\bDo#/gi, 'C#'], [/\bReb/gi, 'Db'], [/\bDo\b/gi, 'C'],
  [/\bRe#/gi, 'D#'], [/\bMib/gi, 'Eb'], [/\bRe\b/gi, 'D'],
  [/\bMi#/gi, 'E#'], [/\bMi\b/gi, 'E'],
  [/\bFa#/gi, 'F#'], [/\bSolb/gi, 'Gb'], [/\bFa\b/gi, 'F'],
  [/\bSol#/gi, 'G#'], [/\bLab/gi, 'Ab'], [/\bSol\b/gi, 'G'],
  [/\bLa#/gi, 'A#'], [/\bSib/gi, 'Bb'], [/\bLa\b/gi, 'A'],
  [/\bSi#/gi, 'B#'], [/\bSi\b/gi, 'B']
];

export class NotationTranslator {
  public static translateFullContent(text: string, targetStyle: NotationStyle): string {
    if (!text) return text;

    return text.split(/(\*[^*]*\*?)/g).map(part => {
      if (part.startsWith('*')) return part; // No tocar anotaciones entre asteriscos

      let translated = part;
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
