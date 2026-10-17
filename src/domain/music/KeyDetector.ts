export interface DualKeyResult {
  trumpetKey: string;     // Ej: "D Menor" / "Re Menor"
  concertKey: string;     // Ej: "C Menor" / "Do Menor" (2 semitonos abajo)
  formatted: string;      // Ej: "🎺 D Menor | 🎹 C Menor"
  key: string;            // Para retrocompatibilidad (= trumpetKey)
  name: string;           // Para retrocompatibilidad (= trumpetKey)
  concertEquivalent: string; // Para retrocompatibilidad (= concertKey)
  confidence: number;     // Para retrocompatibilidad (= 1 o 0)
  root: string;           // Tónica
  mode: 'Mayor' | 'Menor';
}

export type KeyDetectionResult = DualKeyResult;
export type KeySignatureMatch = DualKeyResult;

const PITCH_MAP: Record<string, number> = {
  // Inglés
  'C': 0, 'C#': 1, 'DB': 1, 'D': 2, 'D#': 3, 'EB': 3, 'E': 4, 'F': 5,
  'F#': 6, 'GB': 6, 'G': 7, 'G#': 8, 'AB': 8, 'A': 9, 'A#': 10, 'BB': 10, 'B': 11,
  // Solfeo Latino
  'DO': 0, 'DO#': 1, 'REB': 1, 'RE': 2, 'RE#': 3, 'MIB': 3, 'MI': 4, 'FA': 5,
  'FA#': 6, 'SOLB': 6, 'SOL': 7, 'SOL#': 8, 'LAB': 8, 'LA': 9, 'LA#': 10, 'SIB': 10, 'SI': 11
};

export const SHARP_NAMES_ENG = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SHARP_NAMES_LAT = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const ALL_SHARP_ROOTS = SHARP_NAMES_ENG;

export class KeyDetector {
  public static parsePitches(text: string | string[] | any): number[] {
    if (!text) return [];
    let raw = '';
    if (Array.isArray(text)) {
      raw = text.map(t => (typeof t === 'string' ? t : t?.name || t?.key || String(t))).join(' ');
    } else if (typeof text === 'string') {
      raw = text;
    } else {
      raw = String(text);
    }

    // Omitir anotaciones entre *asteriscos*
    const clean = raw.replace(/(\*[^*]*\*?)/g, ' ');
    const tokens = clean.toUpperCase().match(/(?<![A-Z])(DO[#B]?|RE[#B]?|MI|FA[#B]?|SOL[#B]?|LA[#B]?|SI[#B]?|[A-G][#B]?)(?![A-Z#B])/gi) || [];

    const pitches: number[] = [];
    tokens.forEach(tok => {
      const idx = PITCH_MAP[tok.toUpperCase()];
      if (idx !== undefined) pitches.push(idx);
    });
    return pitches;
  }

  public static detectKey(text: string | string[] | any, notationStyle: 'ENGLISH' | 'LATIN' = 'ENGLISH'): DualKeyResult {
    const pitches = this.parsePitches(text);

    if (pitches.length === 0) {
      return {
        trumpetKey: 'Sin tono',
        concertKey: 'Sin tono',
        formatted: 'Sin tono',
        key: 'Desconocido',
        name: 'Sin tono',
        concertEquivalent: 'Sin tono',
        confidence: 0,
        root: '',
        mode: 'Mayor'
      };
    }

    const counts = new Array(12).fill(0);
    pitches.forEach((p, idx) => {
      counts[p]++;
      if (idx === pitches.length - 1) counts[p] += 2; // Peso extra a la nota final de reposo
      if (idx === 0) counts[p] += 1;                // Peso a la nota de entrada
    });

    const lastPitch = pitches[pitches.length - 1];
    let bestScore = -Infinity;
    let bestTonic = 2; // Default D
    let bestMode: 'Mayor' | 'Menor' = 'Menor';

    for (let root = 0; root < 12; root++) {
      // Puntuación armónica menor
      let scoreMin = counts[root] * 6.0 + counts[(root + 3) % 12] * 5.0 + counts[(root + 7) % 12] * 4.5 + counts[(root + 8) % 12] * 3.5;
      scoreMin -= counts[(root + 4) % 12] * 18.0 + counts[(root + 1) % 12] * 15.0;
      if (root === lastPitch) scoreMin += 4.0;

      if (scoreMin > bestScore) {
        bestScore = scoreMin;
        bestTonic = root;
        bestMode = 'Menor';
      }

      // Puntuación armónica mayor
      let scoreMaj = counts[root] * 6.0 + counts[(root + 4) % 12] * 5.0 + counts[(root + 7) % 12] * 4.5;
      scoreMaj -= counts[(root + 3) % 12] * 18.0 + counts[(root + 1) % 12] * 15.0;
      if (counts[(root + 4) % 12] === 0) scoreMaj -= 12.0; // Penalización si carece de tercera mayor
      if (root === lastPitch) scoreMaj += 4.0;

      if (scoreMaj > bestScore) {
        bestScore = scoreMaj;
        bestTonic = root;
        bestMode = 'Mayor';
      }
    }

    // Tono en Teclado / Concierto (2 semitonos abajo que Trompeta)
    const concertTonic = (bestTonic - 2 + 12) % 12;

    const names = notationStyle === 'LATIN' ? SHARP_NAMES_LAT : SHARP_NAMES_ENG;

    const trumpetKeyStr = `${names[bestTonic]} ${bestMode}`;
    const concertKeyStr = `${names[concertTonic]} ${bestMode}`;

    return {
      trumpetKey: trumpetKeyStr,
      concertKey: concertKeyStr,
      formatted: `🎺 ${trumpetKeyStr} | 🎹 ${concertKeyStr}`,
      key: trumpetKeyStr,
      name: trumpetKeyStr,
      concertEquivalent: concertKeyStr,
      confidence: 1,
      root: names[bestTonic],
      mode: bestMode
    };
  }

  public static detect(text: string | string[] | any, notationStyle: 'ENGLISH' | 'LATIN' = 'ENGLISH'): string {
    return this.detectKey(text, notationStyle).trumpetKey;
  }

  public static detectDetailed(text: string | string[] | any, notationStyle: 'ENGLISH' | 'LATIN' = 'ENGLISH'): DualKeyResult {
    return this.detectKey(text, notationStyle);
  }
}

export const detectKey = (text: string | string[] | any, notationStyle: 'ENGLISH' | 'LATIN' = 'ENGLISH'): DualKeyResult => {
  return KeyDetector.detectKey(text, notationStyle);
};

export const cleanMusicContent = (rawText: string): string => {
  if (!rawText) return '';
  return rawText.replace(/(\*[^*]*\*?)/g, ' ');
};
