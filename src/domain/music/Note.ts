import { PitchClass, Accidental, normalizeFlatsToSharps } from './PitchClass.ts';
import { TrumpetFingering, TrumpetFingeringInfo } from './TrumpetFingering.ts';

// Convención exclusiva de TNotes: solo notas naturales y sostenidas
const ENGLISH_NAMES: Record<number, { natural?: string; sharp: string }> = {
  0: { natural: 'C', sharp: 'C' },
  1: { sharp: 'C#' },
  2: { natural: 'D', sharp: 'D' },
  3: { sharp: 'D#' },
  4: { natural: 'E', sharp: 'E' },
  5: { natural: 'F', sharp: 'F' },
  6: { sharp: 'F#' },
  7: { natural: 'G', sharp: 'G' },
  8: { sharp: 'G#' },
  9: { natural: 'A', sharp: 'A' },
  10: { sharp: 'A#' },
  11: { natural: 'B', sharp: 'B' },
};

const LATIN_BASE_MAP: Record<string, number> = {
  do: 0,
  ut: 0,
  re: 2,
  mi: 4,
  fa: 5,
  sol: 7,
  so: 7,
  la: 9,
  si: 11,
  ti: 11,
};

const LATIN_NAMES: Record<number, { natural?: string; sharp: string }> = {
  0: { natural: 'Do', sharp: 'Do' },
  1: { sharp: 'Do#' },
  2: { natural: 'Re', sharp: 'Re' },
  3: { sharp: 'Re#' },
  4: { natural: 'Mi', sharp: 'Mi' },
  5: { natural: 'Fa', sharp: 'Fa' },
  6: { sharp: 'Fa#' },
  7: { natural: 'Sol', sharp: 'Sol' },
  8: { sharp: 'Sol#' },
  9: { natural: 'La', sharp: 'La' },
  10: { sharp: 'La#' },
  11: { natural: 'Si', sharp: 'Si' },
};

export class Note {
  private readonly pitchClass: PitchClass;
  private readonly octave: number;
  private readonly accidental: Accidental;
  private readonly preferredAccidental: 'sharp';
  private readonly originalNotation: 'english' | 'latin';

  constructor(
    pitchClass: number,
    octave: number = 4,
    accidental: Accidental = 'natural',
    preferredAccidental: 'sharp' = 'sharp',
    originalNotation: 'english' | 'latin' = 'english'
  ) {
    this.pitchClass = ((pitchClass % 12) + 12) % 12 as PitchClass;
    this.octave = octave;
    this.accidental = accidental;
    this.preferredAccidental = 'sharp';
    this.originalNotation = originalNotation;
  }

  /**
   * Returns chromatic semitone index (0 to 11)
   */
  public getPitchClass(): number {
    return this.pitchClass;
  }

  public getOctave(): number {
    return this.octave;
  }

  public getAccidental(): Accidental {
    return this.accidental;
  }

  public getPreferredAccidental(): 'sharp' {
    return this.preferredAccidental;
  }

  public getOriginalNotation(): 'english' | 'latin' {
    return this.originalNotation;
  }

  /**
   * Transposes note by number of semitones (positive = up, negative = down).
   * Returns a new immutable Note instance normalized exclusively to natural or sharp.
   */
  public transpose(semitones: number): Note {
    const rawNewPitch = this.pitchClass + semitones;
    const newPitchClass = ((rawNewPitch % 12) + 12) % 12;
    const octaveShift = Math.floor(rawNewPitch / 12);
    const newOctave = Math.max(1, Math.min(8, this.octave + octaveShift));

    const isNatural = [0, 2, 4, 5, 7, 9, 11].includes(newPitchClass);
    const newAccidental: Accidental = isNatural ? 'natural' : 'sharp';

    return new Note(
      newPitchClass,
      newOctave,
      newAccidental,
      'sharp',
      this.originalNotation
    );
  }

  /**
   * Converts to Latin Solfège notation strictly using naturals and sharps:
   * Do, Do#, Re, Re#, Mi, Fa, Fa#, Sol, Sol#, La, La#, Si
   */
  public toLatin(includeOctave: boolean = false): string {
    const entry = LATIN_NAMES[this.pitchClass];
    const name = entry.natural || entry.sharp;
    return includeOctave ? `${name}${this.octave}` : name;
  }

  /**
   * Converts to English notation strictly using naturals and sharps:
   * C, C#, D, D#, E, F, F#, G, G#, A, A#, B
   */
  public toEnglish(includeOctave: boolean = false): string {
    const entry = ENGLISH_NAMES[this.pitchClass];
    const name = entry.natural || entry.sharp;
    return includeOctave ? `${name}${this.octave}` : name;
  }

  /**
   * Formats the note according to the requested notation system
   */
  public format(notation: 'english' | 'latin', includeOctave: boolean = false): string {
    return notation === 'latin' ? this.toLatin(includeOctave) : this.toEnglish(includeOctave);
  }

  /**
   * Returns trumpet fingering for this note
   */
  public getFingering(): TrumpetFingeringInfo {
    return TrumpetFingering.getFingering(this.pitchClass, this.octave);
  }

  /**
   * Calculates audio frequency in Hz (A4 = 440 Hz)
   */
  public getFrequency(): number {
    const midiNumber = 12 * (this.octave + 1) + this.pitchClass;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
  }

  /**
   * Parses token and normalizes any flatted input to its natural/sharp equivalent.
   * Examples: "C4", "Bb" -> A#, "Sib" -> La#, "Do#4", "F#", "Eb3" -> D#3, "Sol"
   */
  public static parse(token: string): Note | null {
    if (!token || typeof token !== 'string') return null;
    const clean = token.trim();
    if (clean.length === 0) return null;

    // Normalizar si contiene bemoles antes de procesar
    const normalized = normalizeFlatsToSharps(clean);

    // Check Latin solfège match: (Do|Re|Mi|Fa|Sol|La|Si)(#|b|♯|♭)?(\d)?
    const latinMatch = normalized.match(/^(Do|Re|Mi|Fa|Sol|So|La|Si|Ti)([#b♯♭])?(\d)?$/i);
    if (latinMatch) {
      const baseRaw = latinMatch[1].toLowerCase();
      const accidentalChar = latinMatch[2];
      const octaveRaw = latinMatch[3];

      const basePitch = LATIN_BASE_MAP[baseRaw];
      if (basePitch === undefined) return null;

      let shift = 0;
      if (accidentalChar === '#' || accidentalChar === '♯') {
        shift = 1;
      } else if (accidentalChar === 'b' || accidentalChar === '♭') {
        shift = -1;
      }

      const pitchClass = ((basePitch + shift % 12) + 12) % 12;
      const octave = octaveRaw ? parseInt(octaveRaw, 10) : 4;
      const isNatural = [0, 2, 4, 5, 7, 9, 11].includes(pitchClass);
      const accidental: Accidental = isNatural ? 'natural' : 'sharp';

      return new Note(pitchClass, octave, accidental, 'sharp', 'latin');
    }

    // Check English note match: ([A-G])([#b♯♭])?(\d)?
    const englishMatch = normalized.match(/^([A-Ga-g])([#b♯♭])?(\d)?$/);
    if (englishMatch) {
      const letter = englishMatch[1].toUpperCase();
      const accidentalChar = englishMatch[2];
      const octaveRaw = englishMatch[3];

      const letterMap: Record<string, number> = {
        C: 0,
        D: 2,
        E: 4,
        F: 5,
        G: 7,
        A: 9,
        B: 11,
      };

      const basePitch = letterMap[letter];
      if (basePitch === undefined) return null;

      let shift = 0;
      if (accidentalChar === '#' || accidentalChar === '♯') {
        shift = 1;
      } else if (accidentalChar === 'b' || accidentalChar === '♭') {
        shift = -1;
      }

      const pitchClass = ((basePitch + shift % 12) + 12) % 12;
      const octave = octaveRaw ? parseInt(octaveRaw, 10) : 4;
      const isNatural = [0, 2, 4, 5, 7, 9, 11].includes(pitchClass);
      const accidental: Accidental = isNatural ? 'natural' : 'sharp';

      return new Note(pitchClass, octave, accidental, 'sharp', 'english');
    }

    return null;
  }
}
