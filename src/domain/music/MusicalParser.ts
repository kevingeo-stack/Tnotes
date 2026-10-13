import { Note } from './Note.ts';

export type TokenType = 'note' | 'chord' | 'barline' | 'prose' | 'whitespace' | 'symbol';

export interface ParsedToken {
  readonly type: TokenType;
  readonly raw: string;
  readonly note?: Note;
  readonly startIndex: number;
  readonly endIndex: number;
}

export interface ITokenizationStrategy {
  readonly name: string;
  tokenize(input: string): ParsedToken[];
}

/**
 * Standard strategy for mixed brass notes, chords, barlines, lyrics, and practice prose.
 */
export class FlexibleMusicalStrategy implements ITokenizationStrategy {
  public readonly name = 'FlexibleMusical';

  // Common chord patterns in jazz and brass lead sheets (e.g. Dm7b5, G7alt, Cmaj7, Fm, Bb7)
  private readonly chordRegex = /^[A-Ga-g](b|#|♯|♭)?(m|maj|min|dim|aug|sus|alt|add|\+|-|[0-9]|b5|#5|b9|#9|#11|b13)*$/;

  public tokenize(input: string): ParsedToken[] {
    const tokens: ParsedToken[] = [];
    if (!input) return tokens;

    // Regex matches whitespace sequences, barlines, punctuation, words
    const regex = /(\r\n|\r|\n|\s+|\|+|[:;,\-–—→➔]+|[^\s|:;,\-–—→➔]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      const raw = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + raw.length;

      // 1. Whitespace
      if (/^\s+$/.test(raw)) {
        tokens.push({ type: 'whitespace', raw, startIndex, endIndex });
        continue;
      }

      // 2. Barlines
      if (/^\|+$/.test(raw)) {
        tokens.push({ type: 'barline', raw, startIndex, endIndex });
        continue;
      }

      // 3. Arrow symbols / musical hyphens
      if (/^[:;,\-–—→➔]+$/.test(raw)) {
        tokens.push({ type: 'symbol', raw, startIndex, endIndex });
        continue;
      }

      // 4. Try parsing as single musical note (e.g., C4, D4, E4, Bb, Sol, Do#)
      const parsedNote = Note.parse(raw);
      if (parsedNote) {
        // Distinguish pure English/Latin note from standard English words like "A", "I", "In", "As"
        // If it's a single "A" or "I" followed or preceded by prose words, we can check context:
        // If raw is "A" or "a", check if it looks like a note list or prose
        if (raw.toUpperCase() === 'A' && input.length > 20) {
          // Check if neighboring tokens are musical notes
          const isNoteContext = /([A-G][0-9]?|[♯♭#b]|\|)\s*A\b/.test(input) || /\bA\s*([A-G][0-9]?|[♯♭#b]|\|)/.test(input);
          if (isNoteContext) {
            tokens.push({ type: 'note', raw, note: parsedNote, startIndex, endIndex });
            continue;
          }
        } else {
          tokens.push({ type: 'note', raw, note: parsedNote, startIndex, endIndex });
          continue;
        }
      }

      // 5. Try chord detection (e.g., Dm7b5, G7alt, Cm7)
      if (this.chordRegex.test(raw) && raw.length > 1) {
        tokens.push({ type: 'chord', raw, startIndex, endIndex });
        continue;
      }

      // 6. Fallback prose
      tokens.push({ type: 'prose', raw, startIndex, endIndex });
    }

    return tokens;
  }
}

/**
 * Strict Stave strategy focusing on explicit note lines.
 */
export class StrictStaveStrategy implements ITokenizationStrategy {
  public readonly name = 'StrictStave';

  public tokenize(input: string): ParsedToken[] {
    const tokens: ParsedToken[] = [];
    const regex = /(\s+|\|+|[^\s|]+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(input)) !== null) {
      const raw = match[0];
      const startIndex = match.index;
      const endIndex = startIndex + raw.length;

      if (/^\s+$/.test(raw)) {
        tokens.push({ type: 'whitespace', raw, startIndex, endIndex });
      } else if (/^\|+$/.test(raw)) {
        tokens.push({ type: 'barline', raw, startIndex, endIndex });
      } else {
        const note = Note.parse(raw);
        if (note) {
          tokens.push({ type: 'note', raw, note, startIndex, endIndex });
        } else {
          tokens.push({ type: 'prose', raw, startIndex, endIndex });
        }
      }
    }

    return tokens;
  }
}

/**
 * MusicalParser implements the Strategy Pattern to parse text and extract notes
 * while preserving original structure, whitespace, and formatting.
 */
export class MusicalParser {
  private strategy: ITokenizationStrategy;

  constructor(strategy?: ITokenizationStrategy) {
    this.strategy = strategy ?? new FlexibleMusicalStrategy();
  }

  public setStrategy(strategy: ITokenizationStrategy): void {
    this.strategy = strategy;
  }

  public getStrategy(): ITokenizationStrategy {
    return this.strategy;
  }

  public tokenize(text: string): ParsedToken[] {
    return this.strategy.tokenize(text);
  }

  public extractNotes(text: string): Note[] {
    const tokens = this.tokenize(text);
    return tokens
      .filter((t): t is ParsedToken & { note: Note } => t.type === 'note' && t.note !== undefined)
      .map(t => t.note);
  }
}
