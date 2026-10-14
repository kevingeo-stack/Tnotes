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

const ROOT_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Ponderación armónica por intervalo respecto a la tónica (0 a 11)
// MODO MAYOR: Las notas ajenas (b2, 3ra menor, b6) reciben penalización destructiva
const MAJOR_WEIGHTS = [
   6.0,  // 0: Tónica
 -12.0,  // 1: b2 (ajena)
   2.5,  // 2: 2da mayor
 -15.0,  // 3: 3ra menor (incompatible con Mayor)
   4.5,  // 4: 3ra mayor (definitoria de modo mayor)
   3.0,  // 5: 4ta justa
  -8.0,  // 6: Tritono
   4.5,  // 7: 5ta justa
 -12.0,  // 8: b6 (ajena en mayor)
   2.5,  // 9: 6ta mayor
  -5.0,  // 10: b7
   3.0   // 11: 7ma mayor (sensible)
];

// MODO MENOR (Universal: Natural, Armónica y Dórica):
// La b2 (intervalo 1) es AJENA a Menor (ej. A# en La Menor se penaliza con -15.0)
// La b6 (intervalo 8 = Bb en Re menor) es PROPIA de Menor (+3.5)
const MINOR_WEIGHTS = [
   6.0,  // 0: Tónica
 -15.0,  // 1: b2 (ajena a la escala menor tradicional; descarta falsos positivos)
   2.5,  // 2: 2da mayor
   5.0,  // 3: 3ra menor (definitoria de modo menor)
 -18.0,  // 4: 3ra mayor (incompatible con Menor)
   3.0,  // 5: 4ta justa
  -8.0,  // 6: Tritono
   4.5,  // 7: 5ta justa
   3.5,  // 8: 6ta menor (b6, característica de Re menor con Bb/A#)
   2.0,  // 9: 6ta mayor (dórica / melódica)
   3.0,  // 10: 7ma menor (menor natural)
   3.5   // 11: 7ma mayor (sensible de menor armónica, ej. C# en Re menor)
];

export interface KeySignatureMatch {
  key: string;
  name: string;
  concertEquivalent: string;
  confidence: number;
  mode: 'major' | 'minor';
}

export class KeyDetector {
  private static extractPitches(text: string): { pitches: number[]; first?: number; last?: number; secondLast?: number } {
    if (!text) return { pitches: [] };

    // Ignorar anotaciones entre asteriscos (*...*) y normalizar sostenidos / bemoles unicode
    const clean = text.replace(/\*([^*]*)\*?/g, ' ').replace(/♯/g, '#').replace(/♭/g, 'b');

    const tokens = clean.match(/(DO[#b]?|RE[#b]?|MI[#b]?|FA[#b]?|SOL[#b]?|LA[#b]?|SI[#b]?|Do[#b]?|Re[#b]?|Mi[#b]?|Fa[#b]?|Sol[#b]?|La[#b]?|Si[#b]?|[A-Ga-g][#b]?)/g) || [];
    const pitches: number[] = [];

    tokens.forEach(tok => {
      const norm = tok.toUpperCase();
      if (PITCH_INDEX[norm] !== undefined) {
        pitches.push(PITCH_INDEX[norm]);
      }
    });

    const len = pitches.length;
    return {
      pitches,
      first: len > 0 ? pitches[0] : undefined,
      last: len > 0 ? pitches[len - 1] : undefined,
      secondLast: len > 1 ? pitches[len - 2] : undefined
    };
  }

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
    const { pitches, first, last, secondLast } = this.extractPitches(text);

    if (pitches.length === 0) {
      return 'Sin tono';
    }

    const counts = new Array(12).fill(0);
    pitches.forEach(p => counts[p]++);

    let bestScore = -Infinity;
    let bestKey = 'C Mayor';

    for (let root = 0; root < 12; root++) {
      // 1. EVALUAR MODO MAYOR
      let scoreMaj = 0;
      for (let i = 0; i < 12; i++) {
        const interval = (i - root + 12) % 12;
        scoreMaj += counts[i] * MAJOR_WEIGHTS[interval];
      }
      // Sinergia de tríada mayor (Tónica + 3ra mayor y 5ta justa)
      if (counts[root] > 0 && counts[(root + 4) % 12] > 0) {
        scoreMaj += 5.0;
      }
      if (counts[root] > 0 && counts[(root + 7) % 12] > 0) {
        scoreMaj += 2.0;
      }
      // Resolución cadencial
      if (last === root) {
        scoreMaj += 6.0;
        if (secondLast === (root + 2) % 12 || secondLast === (root + 11) % 12 || secondLast === (root + 7) % 12) {
          scoreMaj += 4.0; // Cadencia auténtica (2->1, 7->1, 5->1)
        }
      }
      if (first === root) scoreMaj += 2.0;

      if (scoreMaj > bestScore) {
        bestScore = scoreMaj;
        bestKey = `${ROOT_NAMES[root]} Mayor`;
      }

      // 2. EVALUAR MODO MENOR
      let scoreMin = 0;
      for (let i = 0; i < 12; i++) {
        const interval = (i - root + 12) % 12;
        scoreMin += counts[i] * MINOR_WEIGHTS[interval];
      }
      // Sinergia de tríada menor (Tónica + 3ra menor y 5ta justa)
      if (counts[root] > 0 && counts[(root + 3) % 12] > 0) {
        scoreMin += 5.0;
      }
      if (counts[root] > 0 && counts[(root + 7) % 12] > 0) {
        scoreMin += 2.0;
      }
      // Resolución cadencial
      if (last === root) {
        scoreMin += 6.0;
        if (secondLast === (root + 2) % 12 || secondLast === (root + 11) % 12 || secondLast === (root + 10) % 12 || secondLast === (root + 7) % 12) {
          scoreMin += 4.0; // Cadencia auténtica (2->1, 7->1, b7->1, 5->1)
        }
      }
      if (first === root) scoreMin += 2.0;

      if (scoreMin > bestScore) {
        bestScore = scoreMin;
        bestKey = `${ROOT_NAMES[root]} Menor`;
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
