export interface KeyDetectionResult {
  root: string;
  mode: 'Mayor' | 'Menor';
  formatted: string;
  // Compatibilidad con controladores y vistas existentes:
  key: string;
  name: string;
  concertEquivalent: string;
  confidence: number;
}

// Mapeo enarmónico a índices cromáticos (0 a 11)
const PITCH_MAP: Record<string, number> = {
  // Cifrado inglés
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
  // Solfeo latino
  'DO': 0, 'DO#': 1, 'REB': 1,
  'RE': 2, 'RE#': 3, 'MIB': 3,
  'MI': 4,
  'FA': 5, 'FA#': 6, 'SOLB': 6,
  'SOL': 7, 'SOL#': 8, 'LAB': 8,
  'LA': 9, 'LA#': 10, 'SIB': 10,
  'SI': 11
};

const ROOT_DISPLAY_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ROOT_DISPLAY_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export class KeyDetector {
  /**
   * Normaliza texto o arreglo de notas extrayendo los tonos cromáticos y resoluciones.
   */
  public static parsePitches(input: string[] | string | any[]): { pitches: number[]; first?: number; last?: number; secondLast?: number } {
    let rawText = '';
    if (Array.isArray(input)) {
      rawText = input.map(item => (typeof item === 'string' ? item : item?.toEnglish ? item.toEnglish() : String(item))).join(' ');
    } else if (typeof input === 'string') {
      rawText = input;
    }

    // 1. Omitir comentarios de guía entre asteriscos (*...*) y normalizar símbolos unicode
    const sanitized = rawText.replace(/\*([^*]*)\*?/g, ' ').replace(/♯/g, '#').replace(/♭/g, 'b');

    // 2. Extraer tokens de notas válidos priorizando solfeo multi-carácter
    const regex = /(DO[#b]?|RE[#b]?|MI[#b]?|FA[#b]?|SOL[#b]?|LA[#b]?|SI[#b]?|Do[#b]?|Re[#b]?|Mi[#b]?|Fa[#b]?|Sol[#b]?|La[#b]?|Si[#b]?|[A-Ga-g][#b]?)/g;
    const tokens = sanitized.match(regex) || [];

    const pitches: number[] = [];
    tokens.forEach(tok => {
      const norm = tok.toUpperCase();
      if (PITCH_MAP[norm] !== undefined) {
        pitches.push(PITCH_MAP[norm]);
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

  /**
   * Deduce deterministamente la tonalidad correcta distinguiendo relativas mayores/menores.
   */
  public static detectKey(notes: string[] | string | any[]): KeyDetectionResult {
    const { pitches, first, last, secondLast } = this.parsePitches(notes);

    if (pitches.length === 0) {
      return {
        root: 'C',
        mode: 'Mayor',
        formatted: 'Sin tono',
        key: 'Sin tono',
        name: 'Sin tono',
        concertEquivalent: 'Sin tono',
        confidence: 0
      };
    }

    // Histograma de frecuencias
    const counts = new Array(12).fill(0);
    pitches.forEach(p => counts[p]++);

    // ---------------------------------------------------------
    // ETAPA 1: Puntuación de Tónica Candidata (Centro de Gravedad)
    // ---------------------------------------------------------
    const tonicScores = new Array(12).fill(0);

    for (let root = 0; root < 12; root++) {
      let score = 0;

      // 1. Frecuencia directa de la tónica
      score += counts[root] * 3.5;

      // 2. Apoyo de quinta justa (root + 7)
      score += counts[(root + 7) % 12] * 2.0;

      // 3. Ponderación cadencial crítica (última nota de la frase)
      if (last === root) {
        score += 8.5;

        // Bonificación por cadencia auténtica (2->1, 7->1, 5->1)
        if (
          secondLast === (root + 2) % 12 ||
          secondLast === (root + 11) % 12 ||
          secondLast === (root + 10) % 12 ||
          secondLast === (root + 7) % 12
        ) {
          score += 4.5;
        }
      }

      // 4. Nota inicial de la frase
      if (first === root) {
        score += 2.0;
      }

      tonicScores[root] = score;
    }

    // Ordenar raíces candidatas de mayor a menor probabilidad de tónica
    const candidateRoots = Array.from({ length: 12 }, (_, i) => i)
      .sort((a, b) => tonicScores[b] - tonicScores[a]);

    // ---------------------------------------------------------
    // ETAPA 2: Discriminación Mayor vs. Menor con Penalización Diatónica
    // ---------------------------------------------------------
    let bestTonic = candidateRoots[0];
    let bestMode: 'Mayor' | 'Menor' = 'Mayor';
    let highestOverallScore = -Infinity;

    // Evaluamos las mejores raíces candidatas
    for (const root of candidateRoots.slice(0, 4)) {
      const baseTonicScore = tonicScores[root];

      const cSecond   = counts[(root + 2) % 12]; // 2da mayor
      const cThirdMin = counts[(root + 3) % 12]; // 3ra menor
      const cThirdMaj = counts[(root + 4) % 12]; // 3ra mayor
      const cTritone  = counts[(root + 6) % 12]; // Tritono (ajena a tonalidad)
      const cFifth    = counts[(root + 7) % 12]; // 5ta justa
      const cFlat2    = counts[(root + 1) % 12]; // 2da menor (ajena)
      const cFlat6    = counts[(root + 8) % 12]; // 6ta menor (propia de menor eólica/armónica)
      const cMaj6     = counts[(root + 9) % 12]; // 6ta mayor (dórica)
      const cFlat7    = counts[(root + 10) % 12]; // 7ma menor
      const cLeadTone = counts[(root + 11) % 12]; // 7ma mayor (sensible de menor armónica)

      // Evaluación para MODO MENOR:
      let minorScore = baseTonicScore;
      minorScore += cThirdMin * 6.5; // Presencia de 3ra menor: fuerte indicio menor
      minorScore += cSecond * 2.0; // 2da mayor diatónica
      minorScore += cFifth * 2.0; // Apoyo de 5ta justa
      minorScore += (cFlat6 + cMaj6) * 2.5; // Sextas diatónicas
      minorScore += (cFlat7 + cLeadTone) * 3.0; // Séptimas naturales o sensibles armónicas
      minorScore += (cThirdMin > 0 && cFifth > 0) ? 4.0 : 0; // Tríada menor completa

      // Penalizaciones estrictas en menor:
      minorScore -= cThirdMaj * 16.0; // La 3ra mayor destruye el modo menor
      minorScore -= cFlat2 * 14.0; // b2 ajena (ej. A# en La menor)
      minorScore -= cTritone * 10.0;

      // Evaluación para MODO MAYOR:
      let majorScore = baseTonicScore;
      majorScore += cThirdMaj * 6.5; // Presencia de 3ra mayor: fuerte indicio mayor
      majorScore += cSecond * 2.0; // 2da mayor diatónica
      majorScore += cFifth * 2.0; // Apoyo de 5ta justa
      majorScore += cMaj6 * 2.5; // 6ta mayor
      majorScore += cLeadTone * 3.5; // 7ma mayor (sensible)
      majorScore += (cThirdMaj > 0 && cFifth > 0) ? 4.0 : 0; // Tríada mayor completa

      // Penalizaciones estrictas en mayor:
      majorScore -= cThirdMin * 16.0; // La 3ra menor destruye el modo mayor
      majorScore -= cFlat6 * 12.0; // b6 ajena
      majorScore -= cFlat2 * 14.0; // b2 ajena
      majorScore -= cTritone * 14.0; // Tritono fuertemente ajeno a modo mayor sin alterar

      // En piezas extensas (>5 notas), una tonalidad mayor requiere su quinta
      if (cFifth === 0 && pitches.length > 5) {
        majorScore -= 8.0;
      }

      if (minorScore > highestOverallScore) {
        highestOverallScore = minorScore;
        bestTonic = root;
        bestMode = 'Menor';
      }

      if (majorScore > highestOverallScore) {
        highestOverallScore = majorScore;
        bestTonic = root;
        bestMode = 'Mayor';
      }
    }

    // Preferencia de nomenclatura por tonalidad (usar bemoles donde aplique comúnmente)
    const useFlat = [1, 3, 8, 10].includes(bestTonic) && bestMode === 'Mayor';
    const rootName = useFlat ? ROOT_DISPLAY_FLAT[bestTonic] : ROOT_DISPLAY_SHARP[bestTonic];
    const formatted = `${rootName} ${bestMode}`;

    return {
      root: rootName,
      mode: bestMode,
      formatted,
      key: formatted,
      name: formatted,
      concertEquivalent: formatted,
      confidence: 1
    };
  }

  public static detect(notes: string[] | string | any[]): string {
    return this.detectKey(notes).formatted;
  }

  public static detectDetailed(notes: string[] | string | any[]): KeyDetectionResult {
    return this.detectKey(notes);
  }
}

export function detectKey(notes: string[] | string | any[]): string {
  return KeyDetector.detectKey(notes).formatted;
}

export const cleanMusicContent = (rawText: string): string => {
  if (!rawText) return '';
  return rawText.replace(/\*([^*]*)\*?/g, ' ');
};

export type KeySignatureMatch = KeyDetectionResult;
