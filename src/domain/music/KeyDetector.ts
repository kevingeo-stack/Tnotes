import { normalizeFlatsToSharps } from './PitchClass';

export interface DualKeyResult {
  trumpetKey: string;     // Ej: "D Menor" / "Re Menor"
  concertKey: string;     // Ej: "C Menor" / "Do Menor" (2 semitonos abajo)
  formatted: string;      // Ej: "🎺 D Menor | 🎹 C Menor"
  key: string;            // Para retrocompatibilidad (= trumpetKey)
  name: string;           // Para retrocompatibilidad (= trumpetKey)
  concertEquivalent: string; // Para retrocompatibilidad (= concertKey)
  confidence: number;     // Calibrado de 0.0 a 1.0 según variedad de notas, cadencia y margen
  root: string;           // Tónica
  mode: 'Mayor' | 'Menor';
  isAmbiguous: boolean;   // Indica si la evidencia musical es insuficiente o hay empate técnico
  ambiguityReason?: 'NO_PITCHES' | 'INSUFFICIENT_NOTES' | 'NO_THIRD' | 'MULTIPLE_CANDIDATES' | 'CHROMATIC_UNCERTAINTY';
  candidateKeys?: string[]; // Principales tonalidades candidatas en caso de ambigüedad
}

export type KeyDetectionResult = DualKeyResult;
export type KeySignatureMatch = DualKeyResult;

export const PITCH_MAP: Record<string, number> = {
  // Notación Inglesa (con alteraciones ASCII y Unicode)
  'C': 0, 'C#': 1, 'C♯': 1, 'DB': 1, 'D♭': 1, 'D': 2, 'D#': 3, 'D♯': 3, 'EB': 3, 'E♭': 3,
  'E': 4, 'E#': 5, 'E♯': 5, 'FB': 4, 'F♭': 4, 'F': 5, 'F#': 6, 'F♯': 6, 'GB': 6, 'G♭': 6,
  'G': 7, 'G#': 8, 'G♯': 8, 'AB': 8, 'A♭': 8, 'A': 9, 'A#': 10, 'A♯': 10, 'BB': 10, 'B♭': 10,
  'B': 11, 'B#': 0, 'B♯': 0, 'CB': 11, 'C♭': 11,
  // Solfeo Latino (con alteraciones ASCII y Unicode)
  'DO': 0, 'DO#': 1, 'DO♯': 1, 'REB': 1, 'RE♭': 1, 'RE': 2, 'RE#': 3, 'RE♯': 3, 'MIB': 3, 'MI♭': 3,
  'MI': 4, 'MI#': 5, 'MI♯': 5, 'FAB': 4, 'FA♭': 4, 'FA': 5, 'FA#': 6, 'FA♯': 6, 'SOLB': 6, 'SOL♭': 6,
  'SOL': 7, 'SOL#': 8, 'SOL♯': 8, 'LAB': 8, 'LA♭': 8, 'LA': 9, 'LA#': 10, 'LA♯': 10, 'SIB': 10, 'SI♭': 10,
  'SI': 11, 'SI#': 0, 'SI♯': 0, 'DOB': 11, 'DO♭': 11
};

export const SHARP_NAMES_ENG = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SHARP_NAMES_LAT = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
export const ALL_SHARP_ROOTS = SHARP_NAMES_ENG;

// Perfiles tonales cognitivos (jerarquía tonal de Krumhansl-Schmuckler adaptada para líneas melódicas y metales)
// Intervalos cromáticos 0..11 respecto a la tónica:
// Mayor: 0(1), 1(b2), 2(2), 3(b3), 4(3), 5(4), 6(tritono), 7(5), 8(b6), 9(6), 10(b7), 11(7)
const W_MAJ = [6.5, -2.0, 3.5, -3.0, 5.5, 4.0, -2.0, 5.2, -2.0, 3.8, -2.0, 4.0];

// Menor: incluye menor natural, armónica (sensible 11) y melódica/dórica (sexta mayor 9)
const W_MIN = [6.5, -2.0, 3.5, 5.5, -3.0, 4.0, -2.0, 5.0, 4.0, 2.5, 3.5, 4.2];

export class KeyDetector {
  /**
   * Extrae los semitonos (0..11) de cualquier entrada musical:
   * string, array de strings, array de objetos Note, o números.
   * Filtra prosa/letras en español evitando falsos positivos (La, Mi, Si, a).
   */
  public static parsePitches(text: string | string[] | any): number[] {
    if (!text) return [];

    if (Array.isArray(text)) {
      const pitches: number[] = [];
      for (const item of text) {
        if (typeof item === 'number') {
          pitches.push(((item % 12) + 12) % 12);
        } else if (item && typeof item.getPitchClass === 'function') {
          pitches.push(item.getPitchClass());
        } else if (item && typeof item.pitchClass === 'number') {
          pitches.push(((item.pitchClass % 12) + 12) % 12);
        } else if (typeof item === 'string') {
          pitches.push(...this.parsePitchesFromString(item));
        } else if (item && typeof item === 'object') {
          const str = item.name || item.key || item.raw || item.text;
          if (typeof str === 'string') {
            pitches.push(...this.parsePitchesFromString(str));
          }
        }
      }
      return pitches;
    }

    if (typeof text === 'string') {
      return this.parsePitchesFromString(text);
    }

    if (text && typeof text.getPitchClass === 'function') {
      return [text.getPitchClass()];
    }

    return this.parsePitchesFromString(String(text));
  }

  private static parsePitchesFromString(raw: string): number[] {
    if (!raw) return [];

    // Normalizar entradas con bemoles a su equivalente en sostenidos/naturales
    const normalizedFlats = normalizeFlatsToSharps(raw);

    // Omitir anotaciones entre *asteriscos*
    const noComments = normalizedFlats.replace(/(\*[^*]*\*?)/g, ' ');

    // Separar por delimitadores no musicales respetando caracteres de alteración
    const clean = noComments.replace(/[\/\n\r\t,;|:\-_()]/g, ' ');
    const rawTokens = clean.trim().split(/\s+/).filter(Boolean);

    // Detectar si el texto contiene preponderantemente notas en solfeo latino
    const hasLatinMarkers = rawTokens.some(t => /^(do|re|mi|fa|sol|la|si)[#b♯♭]?\d*$/i.test(t));

    const pitches: number[] = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const tok = rawTokens[i];
      const nextTok = rawTokens[i + 1];
      const prevTok = rawTokens[i - 1];

      // 1. Filtrado de palabras del español que coinciden con notas (La, Mi, Si)
      if (/^la$/i.test(tok) || /^mi$/i.test(tok) || /^si$/i.test(tok)) {
        if (nextTok) {
          const isNextMusical = /^(do|re|mi|fa|sol|la|si|[a-g])[#b♯♭]?\d*$|^(menor|mayor|min|maj|m|dim|aug|sus|7|9)$/i.test(nextTok);
          if (!isNextMusical && /^[a-záéíóúñ]/i.test(nextTok) && nextTok.length > 1) {
            continue; // Es artículo "la", pronombre "mi" o conjunción "si"
          }
        }
        if (prevTok) {
          if (/^(de|en|para|por|con|el|al|del)$/i.test(prevTok)) {
            continue;
          }
        }
      }

      // 2. Filtrado de la preposición española "a"
      if (/^a$/i.test(tok)) {
        if (hasLatinMarkers) {
          continue; // En contexto latino, "a" es preposición española
        }
        if (nextTok && !/^(do|re|mi|fa|sol|la|si|[a-g])[#b♯♭]?\d*$/i.test(nextTok) && /^[a-záéíóúñ]/i.test(nextTok)) {
          continue;
        }
        if (prevTok && /^(de|en|para|por|con|al|del|vamos|cantar|alabar|gloria|sea)$/i.test(prevTok)) {
          continue;
        }
      }

      // 3. Extracción de notas: SOLFEO LATINO TIENE PRIORIDAD sobre [A-G] para evitar que 'Do' o 'Fa' colisionen con 'D' o 'F'
      const match = tok.match(/^(DO[#B♯♭]?|RE[#B♯♭]?|MI[#B♯♭]?|FA[#B♯♭]?|SOL[#B♯♭]?|LA[#B♯♭]?|SI[#B♯♭]?|[A-G][#B♯♭]?)/i);
      if (match) {
        const noteCandidate = match[1].toUpperCase().replace(/♯/g, '#').replace(/♭/g, 'B');
        const pitchIdx = PITCH_MAP[noteCandidate];
        if (pitchIdx !== undefined) {
          pitches.push(pitchIdx);
        }
      }
    }

    return pitches;
  }

  public static detectKey(
    text: string | string[] | any,
    notationStyle: 'ENGLISH' | 'LATIN' = 'ENGLISH',
    instrument: 'trumpet' | 'keyboard' = 'trumpet'
  ): DualKeyResult {
    const pitches = this.parsePitches(text);

    // Caso 1: Ausencia de notas
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
        mode: 'Mayor',
        isAmbiguous: false,
        ambiguityReason: 'NO_PITCHES',
        candidateKeys: []
      };
    }

    const names = notationStyle === 'LATIN' ? SHARP_NAMES_LAT : SHARP_NAMES_ENG;
    const uniquePitches = new Set(pitches);

    // Conteo ponderado con pesos de entrada y cadencia
    const counts = new Array(12).fill(0);
    const rawCounts = new Array(12).fill(0);
    pitches.forEach((p, idx) => {
      rawCounts[p]++;
      counts[p]++;
      if (idx === pitches.length - 1) counts[p] += 3; // Nota final de reposo cadencial
      if (idx === 0) counts[p] += 1;                // Nota inicial
    });

    const lastPitch = pitches[pitches.length - 1];
    const firstPitch = pitches[0];

    // Caso 2: Nota única aislada (ambigüedad intrínseca: no existe modo sin tercera ni escala con 1 nota)
    if (uniquePitches.size === 1) {
      const singlePitch = pitches[0];
      let tTonic = instrument === 'keyboard' ? (singlePitch + 2) % 12 : singlePitch;
      let cTonic = instrument === 'keyboard' ? singlePitch : (singlePitch - 2 + 12) % 12;
      const tKey = `${names[tTonic]} Mayor`;
      const cKey = `${names[cTonic]} Mayor`;

      return {
        trumpetKey: tKey,
        concertKey: cKey,
        formatted: instrument === 'keyboard' ? `🎹 ${cKey} | 🎺 ${tKey}` : `🎺 ${tKey} | 🎹 ${cKey}`,
        key: tKey,
        name: tKey,
        concertEquivalent: cKey,
        confidence: 0.15,
        root: names[tTonic],
        mode: 'Mayor',
        isAmbiguous: true,
        ambiguityReason: 'INSUFFICIENT_NOTES',
        candidateKeys: [
          `${names[tTonic]} Mayor`,
          `${names[tTonic]} Menor`
        ]
      };
    }

    // Evaluación de las 24 candidatas tonales (12 Mayores + 12 Menores)
    interface ScoredCandidate {
      root: number;
      mode: 'Mayor' | 'Menor';
      score: number;
    }

    const candidates: ScoredCandidate[] = [];

    for (let root = 0; root < 12; root++) {
      const hasMaj3 = rawCounts[(root + 4) % 12] > 0;
      const hasMin3 = rawCounts[(root + 3) % 12] > 0;

      // Puntuación armónico-cognitiva Mayor
      let scoreMaj = 0;
      for (let p = 0; p < 12; p++) {
        if (counts[p] > 0) {
          const interval = (p - root + 12) % 12;
          scoreMaj += counts[p] * W_MAJ[interval];
        }
      }
      if (hasMaj3 && !hasMin3) {
        scoreMaj += 4.0; // Confirmación positiva del modo mayor
      } else if (!hasMaj3 && hasMin3) {
        scoreMaj -= 6.0; // Tercera menor contradice escala mayor
      }
      if (root === lastPitch) scoreMaj += 8.0; // Cadencia sobre tónica
      else if ((root + 7) % 12 === lastPitch) scoreMaj += 2.0; // Cadencia sobre dominante
      else if ((root + 4) % 12 === lastPitch) scoreMaj += 2.0; // Cadencia sobre tercera
      if (root === firstPitch) scoreMaj += 1.0;

      candidates.push({ root, mode: 'Mayor', score: scoreMaj });

      // Puntuación armónico-cognitiva Menor
      let scoreMin = 0;
      for (let p = 0; p < 12; p++) {
        if (counts[p] > 0) {
          const interval = (p - root + 12) % 12;
          scoreMin += counts[p] * W_MIN[interval];
        }
      }
      if (hasMin3 && !hasMaj3) {
        scoreMin += 4.0; // Confirmación positiva del modo menor
      } else if (!hasMin3 && hasMaj3) {
        scoreMin -= 6.0; // Tercera mayor contradice modo menor
      }
      if (root === lastPitch) scoreMin += 8.0; // Cadencia sobre tónica
      else if ((root + 7) % 12 === lastPitch) scoreMin += 2.0; // Cadencia sobre dominante
      else if ((root + 3) % 12 === lastPitch) scoreMin += 2.0; // Cadencia sobre tercera menor
      if (root === firstPitch) scoreMin += 1.0;

      candidates.push({ root, mode: 'Menor', score: scoreMin });
    }

    // Ordenar de mayor a menor puntuación
    candidates.sort((a, b) => b.score - a.score);
    const winner = candidates[0];
    const runnerUp = candidates[1];

    // Cálculo del margen normalizado respecto al segundo candidato
    const scoreDiff = winner.score - runnerUp.score;
    const baseMagnitude = Math.max(Math.abs(winner.score), 1);
    const relativeMargin = scoreDiff / baseMagnitude;

    // Comprobación de quinta abierta sin tercera modal (ej. C G)
    const winnerHasMaj3 = rawCounts[(winner.root + 4) % 12] > 0;
    const winnerHasMin3 = rawCounts[(winner.root + 3) % 12] > 0;
    const isNoThird = uniquePitches.size === 2 && !winnerHasMaj3 && !winnerHasMin3;

    // Detección de ambigüedad
    let isAmbiguous = false;
    let ambiguityReason: DualKeyResult['ambiguityReason'];

    if (uniquePitches.size < 3) {
      isAmbiguous = true;
      ambiguityReason = isNoThird ? 'NO_THIRD' : 'INSUFFICIENT_NOTES';
    } else if (relativeMargin < 0.08) {
      isAmbiguous = true;
      ambiguityReason = 'MULTIPLE_CANDIDATES';
    }

    // Calibración rigurosa de confianza (0.0 a 1.0)
    let confidence: number;
    if (uniquePitches.size === 1) {
      confidence = 0.15;
    } else if (isNoThird) {
      const pArr = Array.from(uniquePitches);
      const interval = Math.abs(pArr[0] - pArr[1]) % 12;
      const isOpenFifth = interval === 7 || interval === 5;
      confidence = isOpenFifth ? 0.35 : 0.25;
    } else if (uniquePitches.size === 2) {
      confidence = 0.25;
    } else {
      const u = uniquePitches.size;
      const fU = u === 3 ? 0.65 : u === 4 ? 0.75 : u === 5 ? 0.85 : u === 6 ? 0.92 : 1.0;
      const fDelta = relativeMargin < 0.08
        ? Math.max(0.40, 0.40 + (relativeMargin / 0.08) * 0.25)
        : Math.min(1.0, 0.80 + (relativeMargin - 0.08) * 1.5);
      const fN = pitches.length < 4 ? 0.8 : 1.0;
      confidence = Math.round(fU * fDelta * fN * 100) / 100;
      confidence = Math.max(0.1, Math.min(1.0, confidence));
    }

    // Transposición según instrumento activo
    let trumpetTonic: number;
    let concertTonic: number;

    if (instrument === 'keyboard') {
      concertTonic = winner.root;
      trumpetTonic = (winner.root + 2) % 12;
    } else {
      trumpetTonic = winner.root;
      concertTonic = (winner.root - 2 + 12) % 12;
    }

    const trumpetKeyStr = `${names[trumpetTonic]} ${winner.mode}`;
    const concertKeyStr = `${names[concertTonic]} ${winner.mode}`;

    // Construcción de candidatas en caso de ambigüedad
    const candidateKeys: string[] = [];
    if (isAmbiguous) {
      if (isNoThird) {
        candidateKeys.push(`${names[trumpetTonic]} Mayor`, `${names[trumpetTonic]} Menor`);
      } else {
        const topCandidates = candidates.slice(0, 3);
        topCandidates.forEach(c => {
          const cT = instrument === 'keyboard' ? (c.root + 2) % 12 : c.root;
          candidateKeys.push(`${names[cT]} ${c.mode}`);
        });
      }
    }

    return {
      trumpetKey: trumpetKeyStr,
      concertKey: concertKeyStr,
      formatted: instrument === 'keyboard' 
        ? `🎹 ${concertKeyStr} | 🎺 ${trumpetKeyStr}`
        : `🎺 ${trumpetKeyStr} | 🎹 ${concertKeyStr}`,
      key: trumpetKeyStr,
      name: trumpetKeyStr,
      concertEquivalent: concertKeyStr,
      confidence,
      root: names[winner.root],
      mode: winner.mode,
      isAmbiguous,
      ambiguityReason,
      candidateKeys
    };
  }

  public static detect(
    text: string | string[] | any,
    notationStyle: 'ENGLISH' | 'LATIN' = 'ENGLISH',
    instrument: 'trumpet' | 'keyboard' = 'trumpet'
  ): string {
    return this.detectKey(text, notationStyle, instrument).trumpetKey;
  }

  public static detectDetailed(
    text: string | string[] | any,
    notationStyle: 'ENGLISH' | 'LATIN' = 'ENGLISH',
    instrument: 'trumpet' | 'keyboard' = 'trumpet'
  ): DualKeyResult {
    return this.detectKey(text, notationStyle, instrument);
  }
}

export const detectKey = (
  text: string | string[] | any, 
  notationStyle: 'ENGLISH' | 'LATIN' = 'ENGLISH',
  instrument: 'trumpet' | 'keyboard' = 'trumpet'
): DualKeyResult => {
  return KeyDetector.detectKey(text, notationStyle, instrument);
};

export const cleanMusicContent = (rawText: string): string => {
  if (!rawText) return '';
  return rawText.replace(/(\*[^*]*\*?)/g, ' ').replace(/[\/\n\r\t,;]/g, ' ');
};
