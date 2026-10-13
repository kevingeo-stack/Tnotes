export interface TrumpetFingeringInfo {
  readonly valve1: boolean;
  readonly valve2: boolean;
  readonly valve3: boolean;
  readonly label: string;
  readonly alternate?: string;
  readonly slideAdjustment?: string;
}

export class TrumpetFingering {
  public static readonly OPEN: TrumpetFingeringInfo = {
    valve1: false,
    valve2: false,
    valve3: false,
    label: '0',
  };

  /**
   * Returns fingering for a given pitch and octave (Bb written trumpet pitch)
   */
  public static getFingering(pitchClass: number, octave: number = 4): TrumpetFingeringInfo {
    // Pitch class: 0=C, 1=C#/Db, 2=D, 3=D#/Eb, 4=E, 5=F, 6=F#/Gb, 7=G, 8=G#/Ab, 9=A, 10=A#/Bb, 11=B
    if (octave <= 3) {
      switch (pitchClass) {
        case 6: // F#3
          return { valve1: true, valve2: true, valve3: true, label: '1-2-3', slideAdjustment: 'Extend 3rd slide 15mm' };
        case 7: // G3
          return { valve1: true, valve2: false, valve3: true, label: '1-3', slideAdjustment: 'Extend 3rd slide 10mm' };
        case 8: // G#3
          return { valve1: false, valve2: true, valve3: true, label: '2-3' };
        case 9: // A3
          return { valve1: true, valve2: true, valve3: false, label: '1-2' };
        case 10: // Bb3
          return { valve1: true, valve2: false, valve3: false, label: '1' };
        case 11: // B3
          return { valve1: false, valve2: true, valve3: false, label: '2' };
        default:
          return this.OPEN;
      }
    }

    if (octave === 4) {
      switch (pitchClass) {
        case 0: // C4 (Low C)
          return { valve1: false, valve2: false, valve3: false, label: '0' };
        case 1: // C#4
          return { valve1: true, valve2: true, valve3: true, label: '1-2-3', slideAdjustment: 'Extend 3rd slide ~10mm' };
        case 2: // D4
          return { valve1: true, valve2: false, valve3: true, label: '1-3', slideAdjustment: 'Extend 3rd slide ~8mm' };
        case 3: // Eb4
          return { valve1: false, valve2: true, valve3: true, label: '2-3' };
        case 4: // E4
          return { valve1: true, valve2: true, valve3: false, label: '1-2' };
        case 5: // F4
          return { valve1: true, valve2: false, valve3: false, label: '1' };
        case 6: // F#4
          return { valve1: false, valve2: true, valve3: false, label: '2' };
        case 7: // G4
          return { valve1: false, valve2: false, valve3: false, label: '0' };
        case 8: // G#4 / Ab4
          return { valve1: false, valve2: true, valve3: true, label: '2-3', alternate: '1 (6th partial)' };
        case 9: // A4
          return { valve1: true, valve2: true, valve3: false, label: '1-2', alternate: '3' };
        case 10: // Bb4
          return { valve1: true, valve2: false, valve3: false, label: '1' };
        case 11: // B4
          return { valve1: false, valve2: true, valve3: false, label: '2' };
        default:
          return this.OPEN;
      }
    }

    if (octave === 5) {
      switch (pitchClass) {
        case 0: // C5
          return { valve1: false, valve2: false, valve3: false, label: '0' };
        case 1: // C#5
          return { valve1: true, valve2: true, valve3: false, label: '1-2', alternate: '2' };
        case 2: // D5
          return { valve1: true, valve2: false, valve3: false, label: '1', alternate: '0' };
        case 3: // Eb5
          return { valve1: false, valve2: true, valve3: false, label: '2' };
        case 4: // E5
          return { valve1: false, valve2: false, valve3: false, label: '0', alternate: '1-2' };
        case 5: // F5
          return { valve1: true, valve2: false, valve3: false, label: '1' };
        case 6: // F#5
          return { valve1: false, valve2: true, valve3: false, label: '2' };
        case 7: // G5
          return { valve1: false, valve2: false, valve3: false, label: '0' };
        case 8: // G#5
          return { valve1: false, valve2: true, valve3: true, label: '2-3' };
        case 9: // A5
          return { valve1: true, valve2: true, valve3: false, label: '1-2', alternate: '1' };
        case 10: // Bb5
          return { valve1: true, valve2: false, valve3: false, label: '1' };
        case 11: // B5
          return { valve1: false, valve2: true, valve3: false, label: '2' };
        default:
          return this.OPEN;
      }
    }

    // High register (Octave 6+)
    switch (pitchClass) {
      case 0: // C6 (High C)
        return { valve1: false, valve2: false, valve3: false, label: '0' };
      case 1: // C#6
        return { valve1: true, valve2: true, valve3: false, label: '1-2', alternate: '2' };
      case 2: // D6
        return { valve1: true, valve2: false, valve3: false, label: '1', alternate: '0' };
      case 3: // Eb6
        return { valve1: false, valve2: true, valve3: false, label: '2' };
      case 4: // E6
        return { valve1: false, valve2: false, valve3: false, label: '0' };
      default:
        return this.OPEN;
    }
  }
}
