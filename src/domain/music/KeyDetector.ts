export interface KeyDetectionResult {
  key: string;
  root: string;
  mode: 'Mayor' | 'Menor';
  formatted: string;
  name: string;
  concertEquivalent: string;
  confidence: number;
}

export const ALL_SHARP_ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

// Algoritmo determinista de detección de tonalidad melódica
export function detectKey(notesText: string | string[] | any[]): KeyDetectionResult {
  let rawText = '';
  if (Array.isArray(notesText)) {
    rawText = notesText
      .map(n => (typeof n === 'string' ? n : n?.toEnglish ? n.toEnglish() : n?.name ? n.name : String(n)))
      .join(' ');
  } else if (typeof notesText === 'string') {
    rawText = notesText;
  }

  // Pre-limpieza: comentarios de guía entre asteriscos (*...*) y normalización de sostenidos/bemoles unicode
  const sanitized = rawText
    .replace(/\*([^*]*)\*?/g, ' ')
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b');

  // Conversión de solfeo latino a cifrado inglés
  const solfegeMap: Record<string, string> = {
    'DO#': 'C#', 'REB': 'Db', 'DO': 'C',
    'RE#': 'D#', 'MIB': 'Eb', 'RE': 'D',
    'FA#': 'F#', 'SOLB': 'Gb', 'FA': 'F',
    'SOL#': 'G#', 'LAB': 'Ab', 'SOL': 'G',
    'LA#': 'A#', 'SIB': 'Bb', 'LA': 'A',
    'SI': 'B', 'MI': 'E'
  };

  const converted = sanitized.replace(
    /(?<![a-zA-Z])(DO#|REB|DO|RE#|MIB|RE|FA#|SOLB|FA|SOL#|LAB|SOL|LA#|SIB|LA|SI|MI)(?![a-zA-Z#b])/gi,
    m => solfegeMap[m.toUpperCase()] || m
  );

  // 1. Extraer todas las notas válidas (A-G con posibles alteraciones # o b)
  const matches = converted.match(/(?<![a-zA-Z])([A-G][#b]?)(?![a-zA-Z#b])/gi) || [];

  if (matches.length === 0) {
    return {
      key: 'Desconocido',
      root: '',
      mode: 'Mayor',
      formatted: 'Sin tono',
      name: 'Sin tono',
      concertEquivalent: 'Sin tono',
      confidence: 0
    };
  }

  // Normalización estricta a sostenidos estándar
  const normalize = (n: string): string => {
    const upper = n.toUpperCase();
    const map: Record<string, string> = {
      'BB': 'A#', 'DB': 'C#', 'EB': 'D#', 'GB': 'F#', 'AB': 'G#',
      'C#': 'C#', 'D#': 'D#', 'F#': 'F#', 'G#': 'G#', 'A#': 'A#',
      'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'A': 'A', 'B': 'B'
    };
    return map[upper] || upper;
  };
  const notes = matches.map(normalize);

  // 2. Determinar la Tónica candidata (Root)
  // Se prioriza la nota de resolución final y la nota con mayor peso/frecuencia
  const lastNote = notes[notes.length - 1];
  const counts: Record<string, number> = {};
  notes.forEach((n, idx) => {
    counts[n] = (counts[n] || 0) + 1;
    if (idx === notes.length - 1) counts[n] += 2; // Peso extra a la nota final de reposo
    if (idx === 0) counts[n] += 1;                // Peso a la nota de entrada
  });

  // Nota con mayor puntaje como tónica
  let root = lastNote;
  let maxScore = 0;
  for (const [note, score] of Object.entries(counts)) {
    if (score > maxScore || (score === maxScore && note === lastNote)) {
      maxScore = score;
      root = note;
    }
  }

  // 3. Evaluar Modo (Mayor vs Menor) con base en la 3ª a partir de la tónica
  const chromatic = ALL_SHARP_ROOTS;
  const rootIdx = chromatic.indexOf(root as any);
  const safeRootIdx = rootIdx !== -1 ? rootIdx : 0;
  const minorThird = chromatic[(safeRootIdx + 3) % 12];
  const majorThird = chromatic[(safeRootIdx + 4) % 12];

  let mode: 'Mayor' | 'Menor' = 'Menor'; // Default en este repertorio
  const hasMinor = notes.includes(minorThird);
  const hasMajor = notes.includes(majorThird);

  if (hasMajor && !hasMinor) {
    mode = 'Mayor';
  } else if (hasMinor) {
    mode = 'Menor';
  } else {
    // Si no hay 3ª explícita, evaluar si la nota final es menor relativa
    mode = 'Menor';
  }

  const key = `${root} ${mode}`;
  return {
    key,
    root,
    mode,
    formatted: key,
    name: key,
    concertEquivalent: key,
    confidence: 1
  };
}

export class KeyDetector {
  public static detectKey(notes: string[] | string | any[]): KeyDetectionResult {
    return detectKey(notes);
  }

  public static detect(notes: string[] | string | any[]): string {
    return detectKey(notes).key;
  }

  public static detectDetailed(notes: string[] | string | any[]): KeyDetectionResult {
    return detectKey(notes);
  }
}

export const cleanMusicContent = (rawText: string): string => {
  if (!rawText) return '';
  return rawText.replace(/\*([^*]*)\*?/g, ' ');
};

export type KeySignatureMatch = KeyDetectionResult;
