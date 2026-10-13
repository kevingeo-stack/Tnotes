import { Note } from './Note.ts';
import { MusicalParser, ParsedToken } from './MusicalParser.ts';
import { KeyDetector } from './KeyDetector.ts';

export type TranspositionDirection = 'trumpet-to-concert' | 'concert-to-trumpet';

export interface TranspositionResult {
  readonly original: string;
  readonly transposed: string;
  readonly originalNotes: Note[];
  readonly transposedNotes: Note[];
  readonly direction: TranspositionDirection;
  readonly semitones: number;
  readonly originalKey: string;
  readonly transposedKey: string;
}

export class TrumpetTransposer {
  private parser: MusicalParser;

  constructor(parser?: MusicalParser) {
    this.parser = parser ?? new MusicalParser();
  }

  /**
   * Transposes from Bb Trumpet to Concert Pitch (C):
   * Bb Trumpet sounds 2 semitones lower than written (-2 semitones).
   */
  public trumpetToConcert(text: string, forceNotation?: 'english' | 'latin'): TranspositionResult {
    return this.transposeText(text, -2, 'trumpet-to-concert', forceNotation);
  }

  /**
   * Transposes from Concert Pitch (C) to Bb Trumpet:
   * Bb Trumpet reads 2 semitones higher than concert pitch (+2 semitones).
   */
  public concertToTrumpet(text: string, forceNotation?: 'english' | 'latin'): TranspositionResult {
    return this.transposeText(text, 2, 'concert-to-trumpet', forceNotation);
  }

  /**
   * Encapsulates bidirectional transposition preserving all prose, lyrics, and formatting.
   */
  public transposeText(
    text: string,
    semitones: number,
    direction: TranspositionDirection = 'trumpet-to-concert',
    forceNotation?: 'english' | 'latin'
  ): TranspositionResult {
    const tokens: ParsedToken[] = this.parser.tokenize(text);
    const originalNotes: Note[] = [];
    const transposedNotes: Note[] = [];

    const transposedParts: string[] = tokens.map(token => {
      if (token.type === 'note' && token.note) {
        originalNotes.push(token.note);
        const transposedNote = token.note.transpose(semitones);
        transposedNotes.push(transposedNote);

        const targetNotation = forceNotation ?? token.note.getOriginalNotation();
        const hasOctaveInRaw = /\d/.test(token.raw);
        return transposedNote.format(targetNotation, hasOctaveInRaw);
      }

      // Preserve words, whitespace, barlines, chords, symbols as-is
      return token.raw;
    });

    const origKeyMatch = KeyDetector.detectKey(originalNotes);
    const transKeyMatch = KeyDetector.detectKey(transposedNotes);

    return {
      original: text,
      transposed: transposedParts.join(''),
      originalNotes,
      transposedNotes,
      direction,
      semitones,
      originalKey: origKeyMatch.name,
      transposedKey: transKeyMatch.name,
    };
  }
}
