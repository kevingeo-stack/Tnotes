import { PitchClass, Accidental } from './PitchClass.ts';
import { TrumpetFingering, TrumpetFingeringInfo } from './TrumpetFingering.ts';

const ENGLISH_NAMES: Record<number, { natural?: string; sharp: string; flat: string }> = {
  0: { natural: 'C', sharp: 'B#', flat: 'Dbb' },
  1: { sharp: 'C#', flat: 'Db' },
  2: { natural: 'D', sharp: 'Cx', flat: 'Ebb' },
  3: { sharp: 'D#', flat: 'Eb' },
  4: { natural: 'E', sharp: 'D#', flat: 'Fb' },
  5: { natural: 'F', sharp: 'E#', flat: 'Gbb' },
  6: { sharp: 'F#', flat: 'Gb' },
  7: { natural: 'G', sharp: 'Fx', flat: 'Abb' },
  8: { sharp: 'G#', flat: 'Ab' },
  9: { natural: 'A', sharp: 'Gx', flat: 'Bbb' },
  10: { sharp: 'A#', flat: 'Bb' },
  11: { natural: 'B', sharp: 'A#', flat: 'Cb' },
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

const LATIN_NAMES: Record<number, { natural?: string; sharp: string; flat: string }> = {
  0: { natural: 'Do', sharp: 'Si#', flat: 'Rebb' },
  1: { sharp: 'Do#', flat: 'Reb' },
  2: { natural: 'Re', sharp: 'Dox', flat: 'Mibb' },
  3: { sharp: 'Re#', flat: 'Mib' },
  4: { natural: 'Mi', sharp: 'Re#', flat: 'Fab' },
  5: { natural: 'Fa', sharp: 'Mi#', flat: 'Solbb' },
  6: { sharp: 'Fa#', flat: 'Solb' },
  7: { natural: 'Sol', sharp: 'Fax', flat: 'Labb' },
  8: { sharp: 'Sol#', flat: 'Lab' },
  9: { natural: 'La', sharp: 'Solx', flat: 'Sibb' },
  10: { sharp: 'La#', flat: 'Sib' },
  11: { natural: 'Si', sharp: 'La#', flat: 'Dob' },
};

export class Note {
  private readonly pitchClass: PitchClass;
  private readonly octave: number;
  private readonly accidental: Accidental;
  private readonly preferredAccidental: 'sharp' | 'flat';
  private readonly originalNotation: 'english' | 'latin';

  constructor(
    pitchClass: number,
    octave: number = 4,
    accidental: Accidental = 'natural',
    preferredAccidental: 'sharp' | 'flat' = 'sharp',
    originalNotation: 'english' | 'latin' = 'english'
  ) {
    this.pitchClass = ((pitchClass % 12) + 12) % 12 as PitchClass;
    this.octave = octave;
    this.accidental = accidental;
    this.preferredAccidental = preferredAccidental;
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

  public getPreferredAccidental(): 'sharp' | 'flat' {
    return this.preferredAccidental;
  }

  public getOriginalNotation(): 'english' | 'latin' {
    return this.originalNotation;
  }

  /**
   * Transposes note by number of semitones (positive = up, negative = down).
   * Returns a new immutable Note instance.
   */
  public transpose(semitones: number): Note {
    const rawNewPitch = this.pitchClass + semitones;
    const newPitchClass = ((rawNewPitch % 12) + 12) % 12;
    const octaveShift = Math.floor(rawNewPitch / 12);
    const newOctave = Math.max(1, Math.min(8, this.octave + octaveShift));

    // Choose sharp or flat representation based on destination pitch and shift direction
    let newPreferred: 'sharp' | 'flat' = this.preferredAccidental;
    if (semitones < 0 && (newPitchClass === 10 || newPitchClass === 3 || newPitchClass === 8)) {
      newPreferred = 'flat';
    } else if (semitones > 0 && (newPitchClass === 1 || newPitchClass === 6)) {
      newPreferred = 'sharp';
    }

    const isNatural = [0, 2, 4, 5, 7, 9, 11].includes(newPitchClass);
    const newAccidental: Accidental = isNatural ? 'natural' : newPreferred === 'flat' ? 'flat' : 'sharp';

    return new Note(
      newPitchClass,
      newOctave,
      newAccidental,
      newPreferred,
      this.originalNotation
    );
  }

  /**
   * Converts to Latin Solfège notation (e.g. Do, Re, Mi, Fa, Sol, La, Si, Sib, Do#)
   */
  public toLatin(includeOctave: boolean = false): string {
    const entry = LATIN_NAMES[this.pitchClass];
    let name = '';
    if (this.accidental === 'natural' && entry.natural) {
      name = entry.natural;
    } else if (this.preferredAccidental === 'flat' || this.accidental === 'flat') {
      name = entry.flat;
    } else {
      name = entry.sharp;
    }

    return includeOctave ? `${name}${this.octave}` : name;
  }

  /**
   * Converts to English notation (e.g. C, D, E, F, G, A, B, Bb, C#)
   */
  public toEnglish(includeOctave: boolean = false): string {
    const entry = ENGLISH_NAMES[this.pitchClass];
    let name = '';
    if (this.accidental === 'natural' && entry.natural) {
      name = entry.natural;
    } else if (this.preferredAccidental === 'flat' || this.accidental === 'flat') {
      name = entry.flat;
    } else {
      name = entry.sharp;
    }

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
    // MIDI note number: C4 = 60, A4 = 69
    const midiNumber = 12 * (this.octave + 1) + this.pitchClass;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
  }

  /**
   * Parses a note token string into an immutable Note object
   * Examples: "C4", "Bb", "Sib", "Do#4", "F#", "Eb3", "Sol"
   */
  public static parse(token: string): Note | null {
    if (!token || typeof token !== 'string') return null;
    const clean = token.trim();
    if (clean.length === 0) return null;

    // Check Latin solfège match: (Do|Re|Mi|Fa|Sol|La|Si)(#|b|♯|♭)?(\d)?
    const latinMatch = clean.match(/^(Do|Re|Mi|Fa|Sol|So|La|Si|Ti)([#b♯♭])?(\d)?$/i);
    if (latinMatch) {
      const baseRaw = latinMatch[1].toLowerCase();
      const accidentalChar = latinMatch[2];
      const octaveRaw = latinMatch[3];

      const basePitch = LATIN_BASE_MAP[baseRaw];
      if (basePitch === undefined) return null;

      let accidental: Accidental = 'natural';
      let preferred: 'sharp' | 'flat' = 'sharp';
      let shift = 0;

      if (accidentalChar === '#' || accidentalChar === '♯') {
        accidental = 'sharp';
        preferred = 'sharp';
        shift = 1;
      } else if (accidentalChar === 'b' || accidentalChar === '♭') {
        accidental = 'flat';
        preferred = 'flat';
        shift = -1;
      }

      const pitchClass = ((basePitch + shift % 12) + 12) % 12;
      const octave = octaveRaw ? parseInt(octaveRaw, 10) : 4;

      return new Note(pitchClass, octave, accidental, preferred, 'latin');
    }

    // Check English note match: ([A-G])([#b♯♭])?(\d)?
    const englishMatch = clean.match(/^([A-Ga-g])([#b♯♭])?(\d)?$/);
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

      let accidental: Accidental = 'natural';
      let preferred: 'sharp' | 'flat' = 'sharp';
      let shift = 0;

      if (accidentalChar === '#' || accidentalChar === '♯') {
        accidental = 'sharp';
        preferred = 'sharp';
        shift = 1;
      } else if (accidentalChar === 'b' || accidentalChar === '♭') {
        accidental = 'flat';
        preferred = 'flat';
        shift = -1;
      }

      const pitchClass = ((basePitch + shift % 12) + 12) % 12;
      const octave = octaveRaw ? parseInt(octaveRaw, 10) : 4;

      return new Note(pitchClass, octave, accidental, preferred, 'english');
    }

    return null;
  }
}
