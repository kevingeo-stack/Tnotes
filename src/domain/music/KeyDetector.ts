// Tabla de clases de tono cromáticas (0 a 11)
const PITCH_INDEX: Record<string, number> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'DB': 1,
  'D': 2,
  'D#': 3, 'EB': 3,
  'E': 4, 'FB': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'GB': 6,
  'G': 7,
  'G#': 8, 'AB': 8,
  'A': 9,
  'A#': 10, 'BB': 10,
  'B': 11, 'CB': 11,
  // Solfeo
  'DO': 0, 'DO#': 1, 'REB': 1,
  'RE': 2, 'RE#': 3, 'MIB': 3,
  'MI': 4,
  'FA': 5, 'FA#': 6, 'SOLB': 6,
  'SOL': 7, 'SOL#': 8, 'LAB': 8,
  'LA': 9, 'LA#': 10, 'SIB': 10,
  'SI': 11
};

const ROOT_NAMES_EN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Perfiles tonales relativos a la tónica (índice 0 a 11)
// Perfil Mayor con penalización estricta para notas ajenas (b3, b6, b7)
const MAJOR_PROFILE = [
  6.35,  // 0: Tónica
 -2.50,  // 1: b2 (ajena)
  3.48,  // 2: 2da mayor
 -3.00,  // 3: 3ra menor (fuerte penalización en mayor)
  4.38,  // 4: 3ra mayor (definitoria de modo mayor)
  4.09,  // 5: 4ta justa
 -2.50,  // 6: Tritono
  5.19,  // 7: 5ta justa
 -2.50,  // 8: b6 (ajena en mayor)
  3.66,  // 9: 6ta mayor
 -1.80,  // 10: 7ma menor
  4.20   // 11: 7ma mayor (sensible)
];

// Perfil Menor universal: integra Menor Natural, Menor Armónica (sensible 11) y Dórica (9)
const MINOR_PROFILE = [
  6.33,  // 0: Tónica
 -2.00,  // 1: b2
  3.48,  // 2: 2da mayor
  5.38,  // 3: 3ra menor (definitoria de modo menor)
 -3.50,  // 4: 3ra mayor (fuerte penalización en menor)
  3.53,  // 5: 4ta justa
 -2.00,  // 6: Tritono
  5.08,  // 7: 5ta justa
  3.60,  // 8: 6ta menor (menor natural/eólica)
  1.80,  // 9: 6ta mayor (dórica / menor melódica)
  3.80,  // 10: 7ma menor (menor natural)
  3.60   // 11: 7ma mayor (sensible de menor armónica - CRÍTICO para resolver dominantes como A en Dm)
];

export interface KeySignatureMatch {
  key: string;
  name: string;
  concertEquivalent: string;
  confidence: number;
  mode: 'major' | 'minor';
}

export class KeyDetector {
  /**
   * Extrae los tokens de notas válidos ignorando comentarios entre asteriscos y separadores.
   */
  private static extractPitches(text: string): { pitches: number[]; first?: number; last?: number } {
    if (!text) return { pitches: [] };

    // 1. Eliminar comentarios entre asteriscos (*...*) y normalizar sostenidos / bemoles
    const clean = text.replace(/\*([^*]*)\*?/g, ' ').replace(/♯/g, '#').replace(/♭/g, 'B');

    // 2. Extraer palabras y símbolos priorizando solfeo multi-carácter para evitar que DO/RE/FA se consuman como [A-G]
    const tokens = clean.toUpperCase().match(/(DO[#B]?|RE[#B]?|MI|FA[#B]?|SOL[#B]?|LA[#B]?|SI[#B]?|[A-G][#B]?)/g) || [];

    const pitches: number[] = [];
    tokens.forEach(tok => {
      if (PITCH_INDEX[tok] !== undefined) {
        pitches.push(PITCH_INDEX[tok]);
      }
    });

    return {
      pitches,
      first: pitches.length > 0 ? pitches[0] : undefined,
      last: pitches.length > 0 ? pitches[pitches.length - 1] : undefined
    };
  }

  /**
   * Evalúa la tonalidad armónica más probable.
   */
  public static detectKey(text: string): string;
  public static detectKey(notes: any[]): KeySignatureMatch;
  public static detectKey(input: any): any {
    if (typeof input === 'string') {
      return this.detectKeyInternal(input);
    }
    const stringInput = Array.isArray(input)
      ? input.map(item => (typeof item === 'string' ? item : item?.toEnglish ? item.toEnglish() : String(item))).join(' ')
      : String(input);
    const key = this.detectKeyInternal(stringInput);
    return {
      key,
      name: key,
      concertEquivalent: key,
      confidence: 1,
      mode: key.includes('Mayor') ? 'major' : 'minor'
    };
  }

  private static detectKeyInternal(text: string): string {
    const { pitches, first, last } = this.extractPitches(text);

    if (pitches.length === 0) {
      return 'Sin tono';
    }

    // Histograma de frecuencias de clases de tono
    const counts = new Array(12).fill(0);
    pitches.forEach(p => counts[p]++);

    const uniquePitchesCount = counts.filter(c => c > 0).length;
    const totalPitches = pitches.length;

    let bestScore = -Infinity;
    let bestKey = 'C Mayor';

    // Probar las 12 notas raíz como Mayor y como Menor
    for (let root = 0; root < 12; root++) {
      // 1. Evaluación en MODO MAYOR
      let scoreMaj = 0;
      for (let i = 0; i < 12; i++) {
        const interval = (i - root + 12) % 12;
        scoreMaj += counts[i] * MAJOR_PROFILE[interval];
      }
      // Ponderación de cadencia (última nota como tónica)
      if (last === root) {
        scoreMaj += 4.5 * (totalPitches / Math.max(1, uniquePitchesCount));
      }
      if (first === root) {
        scoreMaj += 1.5;
      }
      if (scoreMaj > bestScore) {
        bestScore = scoreMaj;
        bestKey = `${ROOT_NAMES_EN[root]} Mayor`;
      }

      // 2. Evaluación en MODO MENOR
      let scoreMin = 0;
      for (let i = 0; i < 12; i++) {
        const interval = (i - root + 12) % 12;
        scoreMin += counts[i] * MINOR_PROFILE[interval];
      }
      // Ponderación de cadencia (última nota como tónica)
      if (last === root) {
        scoreMin += 4.5 * (totalPitches / Math.max(1, uniquePitchesCount));
      }
      if (first === root) {
        scoreMin += 1.5;
      }
      if (scoreMin > bestScore) {
        bestScore = scoreMin;
        bestKey = `${ROOT_NAMES_EN[root]} Menor`;
      }
    }

    return bestKey;
  }

  public static detect(input: any): string {
    const stringInput = Array.isArray(input)
      ? input.map(item => (typeof item === 'string' ? item : item?.toEnglish ? item.toEnglish() : String(item))).join(' ')
      : (typeof input === 'string' ? input : String(input));
    return this.detectKeyInternal(stringInput);
  }

  public static detectDetailed(input: any): KeySignatureMatch {
    const stringInput = Array.isArray(input)
      ? input.map(item => (typeof item === 'string' ? item : item?.toEnglish ? item.toEnglish() : String(item))).join(' ')
      : (typeof input === 'string' ? input : String(input));
    const key = this.detectKeyInternal(stringInput);
    return {
      key,
      name: key,
      concertEquivalent: key,
      confidence: 1,
      mode: key.includes('Mayor') ? 'major' : 'minor'
    };
  }
}

export function detectKey(text: string | string[]): string {
  const inputStr = Array.isArray(text) ? text.join(' ') : text;
  return KeyDetector.detectKey(inputStr);
}

export const cleanMusicContent = (rawText: string): string => {
  if (!rawText) return '';
  return rawText.replace(/\*([^*]*)\*?/g, ' ');
};
