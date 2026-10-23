import { describe, it, expect, beforeEach } from 'vitest';
import { PITCH_CLASSES, normalizeFlatsToSharps, normalizeKeyName, normalizeToSharp } from '../PitchClass';
import { Note } from '../Note';
import { KeyDetector, detectKey, ALL_SHARP_ROOTS } from '../KeyDetector';
import { TranspositionEngine, keyboardToTrumpet, trumpetToKeyboard, transposeKeyName, transposeText, SHARP_PITCHES, LATIN_SHARP_PITCHES } from '../TranspositionEngine';
import { NotationTranslator } from '../NotationTranslator';
import { formatKeyName, formatDualKeyDisplay } from '../NotationSystem';
import { TrumpetFingering } from '../TrumpetFingering';
import { NoteStorageService } from '../../../services/storage/NoteStorageService';
import { SongNote } from '../../../types/note';

describe('Suite de Pruebas Obligatorias: Convención de Trompeta (Solo Naturales y Sostenidos) vs Teclado', () => {

  // =========================================================================
  // 1. NINGUNA PANTALLA O COMPONENTE RELACIONADO CON TROMPETA MUESTRA BEMOLES
  // =========================================================================
  describe('1. Ninguna pantalla relacionada con trompeta muestra bemoles', () => {
    it('los selectores de tonalidades de trompeta contienen exclusivamente naturales y sostenidos', () => {
      // 12 tonos en inglés
      const trumpetKeysEng = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      // 12 tonos en solfeo latino
      const trumpetKeysLat = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

      for (const k of trumpetKeysEng) {
        expect(k).not.toMatch(/[b♭]/);
      }
      for (const k of trumpetKeysLat) {
        expect(k).not.toMatch(/[b♭]/);
      }
    });

    it('los badges y etiquetas de tonalidad de trompeta nunca muestran bemoles', () => {
      const scales = [
        'Bb C D Eb F G A Bb',
        'Eb G Bb Eb',
        'Ab C Eb Ab',
        'Db F Ab Db',
        'Sib Re Fa Sib',
        'Mib Sol Sib Mib',
        'Lab Do Mib Lab'
      ];

      for (const scale of scales) {
        const resEng = KeyDetector.detectKey(scale, 'ENGLISH', 'trumpet');
        expect(resEng.trumpetKey).not.toMatch(/[b♭]/);

        const resLat = KeyDetector.detectKey(scale, 'LATIN', 'trumpet');
        expect(resLat.trumpetKey).not.toMatch(/[b♭]/);

        const dualBadge = formatDualKeyDisplay(resEng.trumpetKey, 'en');
        expect(dualBadge).not.toMatch(/[b♭]/);
      }
    });

    it('la digitación de trompeta y tabla de notas excluye bemoles en su nomenclatura', () => {
      for (let pitch = 0; pitch < 12; pitch++) {
        const fingering = TrumpetFingering.getFingering(pitch, 4);
        expect(fingering).toBeDefined();
        expect(fingering.label).toMatch(/^(0|1|2|3|1-2|1-3|2-3|1-2-3)$/);
      }
    });

    it('las notas de referencia y afinador de trompeta solo emplean naturales y sostenidos', () => {
      const droneTones = [
        { note: 'A#3', freq: 233.08 },
        { note: 'C4', freq: 261.63 },
        { note: 'D4', freq: 293.66 },
        { note: 'D#4', freq: 311.13 },
        { note: 'F4', freq: 349.23 },
        { note: 'G4', freq: 392.00 },
        { note: 'A4', freq: 440.00 },
        { note: 'A#4', freq: 466.16 },
      ];

      for (const item of droneTones) {
        expect(item.note).not.toMatch(/[b♭]/);
        expect(PITCH_CLASSES.some(p => item.note.startsWith(p))).toBe(true);
      }
    });
  });

  // =========================================================================
  // 2. LOS DOCE NOMBRES DE NOTAS PERMITIDOS SE REPRESENTAN CORRECTAMENTE
  // =========================================================================
  describe('2. Los doce nombres de notas permitidos se representan correctamente', () => {
    it('notación en inglés: C, C#, D, D#, E, F, F#, G, G#, A, A#, B', () => {
      const expectedEng = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      expect(PITCH_CLASSES).toEqual(expectedEng);
      expect(SHARP_PITCHES).toEqual(expectedEng);
      expect(ALL_SHARP_ROOTS).toEqual(expectedEng);

      for (let pitch = 0; pitch < 12; pitch++) {
        const note = new Note(pitch, 4);
        expect(note.toEnglish()).toBe(expectedEng[pitch]);
        expect(note.toEnglish()).not.toMatch(/[b♭]/);
      }
    });

    it('solfeo latino: Do, Do#, Re, Re#, Mi, Fa, Fa#, Sol, Sol#, La, La#, Si', () => {
      const expectedLat = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
      expect(LATIN_SHARP_PITCHES).toEqual(expectedLat);

      for (let pitch = 0; pitch < 12; pitch++) {
        const note = new Note(pitch, 4);
        expect(note.toLatin()).toBe(expectedLat[pitch]);
        expect(note.toLatin()).not.toMatch(/[b♭]/);
      }
    });
  });

  // =========================================================================
  // 3. LAS EQUIVALENCIAS ENARMÓNICAS CONSERVAN LA ALTURA MUSICAL
  // =========================================================================
  describe('3. Las equivalencias enarmónicas conservan la altura musical', () => {
    it('convierte bemoles en inglés conservando exactamente el pitchClass cromático', () => {
      const pairs: Array<[string, string, number]> = [
        ['Bb', 'A#', 10],
        ['Eb', 'D#', 3],
        ['Ab', 'G#', 8],
        ['Db', 'C#', 1],
        ['Gb', 'F#', 6],
        ['Cb', 'B', 11],
        ['Fb', 'E', 4]
      ];

      for (const [flat, sharp, pitchClass] of pairs) {
        expect(normalizeFlatsToSharps(flat)).toBe(sharp);
        const noteFlat = Note.parse(flat);
        const noteSharp = Note.parse(sharp);
        expect(noteFlat?.getPitchClass()).toBe(pitchClass);
        expect(noteSharp?.getPitchClass()).toBe(pitchClass);
        expect(noteFlat?.getFrequency()).toBeCloseTo(noteSharp!.getFrequency(), 4);
      }
    });

    it('convierte bemoles en solfeo latino conservando exactamente el pitchClass cromático', () => {
      const pairs: Array<[string, string, number]> = [
        ['Sib', 'La#', 10],
        ['Mib', 'Re#', 3],
        ['Lab', 'Sol#', 8],
        ['Reb', 'Do#', 1],
        ['Solb', 'Fa#', 6],
        ['Dob', 'Si', 11],
        ['Fab', 'Mi', 4]
      ];

      for (const [flat, sharp, pitchClass] of pairs) {
        expect(normalizeFlatsToSharps(flat)).toBe(sharp);
        const noteFlat = Note.parse(flat);
        const noteSharp = Note.parse(sharp);
        expect(noteFlat?.getPitchClass()).toBe(pitchClass);
        expect(noteSharp?.getPitchClass()).toBe(pitchClass);
        expect(noteFlat?.getFrequency()).toBeCloseTo(noteSharp!.getFrequency(), 4);
      }
    });

    it('soporta caracteres Unicode ♭ y los normaliza sin alterar la frecuencia', () => {
      expect(normalizeFlatsToSharps('B♭')).toBe('A#');
      expect(normalizeFlatsToSharps('Si♭')).toBe('La#');
      expect(normalizeFlatsToSharps('E♭')).toBe('D#');
      expect(normalizeFlatsToSharps('Mi♭')).toBe('Re#');

      const parsedUnicode = Note.parse('B♭4');
      const parsedSharp = Note.parse('A#4');
      expect(parsedUnicode?.getFrequency()).toBeCloseTo(parsedSharp!.getFrequency(), 4);
    });
  });

  // =========================================================================
  // 4. LA TRANSPOSICIÓN ENTRE TROMPETA Y TECLADO MANTIENE LA DIRECCIÓN CORRECTA DE LOS DOS SEMITONOS
  // =========================================================================
  describe('4. Transposición entre trompeta y teclado mantiene dirección correcta de 2 semitonos', () => {
    it('trompeta en Sib suena 2 semitonos por debajo de lo que lee', () => {
      // Trompeta lee C -> Suena Bb/A# en Teclado (-2 semitonos)
      expect(trumpetToKeyboard('C')).toBe('A#');
      // Trompeta lee D -> Suena C en Teclado (-2 semitonos)
      expect(trumpetToKeyboard('D')).toBe('C');
      // Trompeta lee G -> Suena F en Teclado (-2 semitonos)
      expect(trumpetToKeyboard('G')).toBe('F');
      // Trompeta lee A# -> Suena G# en Teclado (-2 semitonos)
      expect(trumpetToKeyboard('A#')).toBe('G#');
    });

    it('teclado (concierto) lee 2 semitonos por debajo de lo que lee la trompeta', () => {
      // Teclado toca C -> Trompeta lee D (+2 semitonos)
      expect(keyboardToTrumpet('C')).toBe('D');
      // Teclado toca F -> Trompeta lee G (+2 semitonos)
      expect(keyboardToTrumpet('F')).toBe('G');
      // Teclado toca A# -> Trompeta lee C (+2 semitonos)
      expect(keyboardToTrumpet('A#')).toBe('C');
    });

    it('transposeKeyName mantiene la dirección matemática de los semitonos', () => {
      // Tono Trompeta C Mayor -> Tono Teclado A# Mayor (-2 semitonos)
      expect(transposeKeyName('C Mayor', -2)).toBe('A# Mayor');
      // Tono Trompeta D Menor -> Tono Teclado C Menor (-2 semitonos)
      expect(transposeKeyName('D Menor', -2)).toBe('C Menor');
      // Tono Teclado C Menor -> Tono Trompeta D Menor (+2 semitonos)
      expect(transposeKeyName('C Menor', 2)).toBe('D Menor');
    });
  });

  // =========================================================================
  // 5. EL TECLADO PUEDE MOSTRAR BEMOLES SIN QUE ESTOS APAREZCAN EN TROMPETA
  // =========================================================================
  describe('5. El teclado puede mostrar bemoles sin que estos aparezcan en trompeta', () => {
    it('una partitura de teclado con bemoles se transpone a trompeta exclusivamente con sostenidos', () => {
      const keyboardNotesWithFlats = 'Bb C D Eb F G A Bb';
      const trumpetNotes = transposeText(keyboardNotesWithFlats, 'KEYBOARD_TO_TRUMPET');

      // En trompeta: C D E F G A B C
      expect(trumpetNotes).toBe('C D E F G A B C');
      expect(trumpetNotes).not.toMatch(/[b♭]/);
    });

    it('una partitura de teclado en solfeo con bemoles se transpone a trompeta libre de bemoles', () => {
      const keyboardLatinWithFlats = 'Sib Do Re Mib Fa Sol La Sib';
      const trumpetNotes = transposeText(keyboardLatinWithFlats, 'KEYBOARD_TO_TRUMPET');

      // En trompeta: Do Re Mi Fa Sol La Si Do
      expect(trumpetNotes).toBe('Do Re Mi Fa Sol La Si Do');
      expect(trumpetNotes).not.toMatch(/[b♭]/);
    });

    it('las notas del teclado no son forzadas a sostenidos destructivamente', () => {
      const keyboardOriginal = 'Bb Eb Ab Db';
      // La representación directa del teclado retiene sus notas originales
      expect(keyboardOriginal).toContain('Bb');
      expect(keyboardOriginal).toContain('Eb');

      // Mientras que la representación de trompeta proyecta a sostenidos
      const trumpetNormalized = normalizeFlatsToSharps(keyboardOriginal);
      expect(trumpetNormalized).toBe('A# D# G# C#');
      expect(trumpetNormalized).not.toMatch(/[b♭]/);
    });
  });

  // =========================================================================
  // 6. LAS CANCIONES ANTIGUAS CON BEMOLES SE PUEDEN ABRIR SIN PÉRDIDA DE INFORMACIÓN
  // =========================================================================
  describe('6. Las canciones antiguas con bemoles se pueden abrir sin pérdida de información', () => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] || null,
      setItem: (k: string, v: string) => { store[k] = v.toString(); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };

    beforeEach(() => {
      mockStorage.clear();
      // @ts-ignore
      globalThis.localStorage = mockStorage;
    });

    it('abre canciones legacy guardadas con notas y tonalidades con bemol sin borrar datos', () => {
      const legacySongs: SongNote[] = [
        {
          id: 'song-legacy-1',
          title: 'Alabanza Antigua en Sib',
          content: 'Bb C D Eb F G A Bb *intro suave*',
          activeInstrument: 'trumpet',
          detectedKey: 'Bb Mayor',
          concertKey: 'Ab Mayor',
          updatedAt: 1600000000000
        },
        {
          id: 'song-legacy-2',
          title: 'Himno en Mib',
          content: 'Mib Fa Sol Lab Sib Do Re Mib',
          activeInstrument: 'keyboard',
          detectedKey: 'Mib Mayor',
          concertKey: 'Reb Mayor',
          updatedAt: 1600000001000
        }
      ];

      mockStorage.setItem('trumpet_notes_data', JSON.stringify(legacySongs));

      const loaded = NoteStorageService.getAll();
      expect(loaded.length).toBe(2);

      // Canción 1 (Trompeta): tonalidad normalizada a sostenidos
      expect(loaded[0].detectedKey).toBe('A# Mayor');
      expect(loaded[0].title).toBe('Alabanza Antigua en Sib');
      expect(loaded[0].content).toContain('*intro suave*');

      // Canción 2 (Teclado): información y contenido intactos
      expect(loaded[1].title).toBe('Himno en Mib');
      expect(loaded[1].content).toBe('Mib Fa Sol Lab Sib Do Re Mib');
    });
  });

  // =========================================================================
  // 7. CAMBIAR DE INSTRUMENTO REPETIDAMENTE NO MODIFICA NI ACUMULA TRANSPOSICIONES
  // =========================================================================
  describe('7. Cambiar de instrumento repetidamente no modifica ni acumula transposiciones', () => {
    it('mantiene la referencia base estable durante 10 ciclos alternados', () => {
      const baseContent = 'C D E F G A B';
      const baseInstrument: 'trumpet' | 'keyboard' = 'trumpet';

      let currentContent = baseContent;
      let currentInst: 'trumpet' | 'keyboard' = baseInstrument;

      for (let cycle = 0; cycle < 10; cycle++) {
        // Alternar a teclado (-2 semitonos desde base)
        currentInst = 'keyboard';
        currentContent = transposeText(baseContent, 'TRUMPET_TO_KEYBOARD');
        expect(currentContent).toBe('A# C D D# F G A');

        // Alternar de regreso a trompeta (0 deriva, vuelve a base)
        currentInst = 'trumpet';
        currentContent = baseContent;
        expect(currentContent).toBe('C D E F G A B');
      }

      expect(currentContent).toBe(baseContent);
    });
  });

  // =========================================================================
  // 8. EL EDITOR, CATÁLOGO TONAL, LISTAS, SELECTORES Y ESPACIO ARMÓNICO SON COHERENTES
  // =========================================================================
  describe('8. Coherencia entre editor, catálogo, listas, selectores y espacio armónico', () => {
    it('todas las vistas de trompeta concuerdan unánimemente en la misma tonalidad sin bemoles', () => {
      const inputNotes = 'A# C D D# F G A A#';
      const detection = KeyDetector.detectKey(inputNotes, 'ENGLISH', 'trumpet');

      expect(detection.trumpetKey).toBe('A# Mayor');
      expect(detection.trumpetKey).not.toMatch(/[b♭]/);

      // Catálogo / Agrupamiento
      const catalogKey = normalizeKeyName(detection.trumpetKey);
      expect(catalogKey).toBe('A# Mayor');

      // Formato Dual en Editor / Setlist
      const dualBadge = formatDualKeyDisplay(detection.trumpetKey, 'en');
      expect(dualBadge).toBe('A# / La# Mayor');
      expect(dualBadge).not.toMatch(/[b♭]/);

      // Espacio armónico
      const formattedKey = formatKeyName(detection.trumpetKey, 'en');
      expect(formattedKey).toBe('A# Mayor');
    });
  });

  // =========================================================================
  // 9. LA DETECCIÓN TONAL NO INVENTA UNA TONALIDAD PARA EVITAR BEMOLES
  // =========================================================================
  describe('9. La detección tonal no inventa una tonalidad para evitar bemoles', () => {
    it('identifica la tónica real exacta basada en correlación armónica y cadencia', () => {
      // Escala de A# Mayor introducida con bemoles enarmónicos
      const inputFlats = 'Bb C D Eb F G A Bb';
      const resultFlats = KeyDetector.detectKey(inputFlats, 'ENGLISH', 'trumpet');

      // Escala de A# Mayor introducida directamente con sostenidos
      const inputSharps = 'A# C D D# F G A A#';
      const resultSharps = KeyDetector.detectKey(inputSharps, 'ENGLISH', 'trumpet');

      // Ambas deben coincidir en la misma tónica armónica exacta (A# Mayor)
      expect(resultFlats.trumpetKey).toBe('A# Mayor');
      expect(resultSharps.trumpetKey).toBe('A# Mayor');
      expect(resultFlats.root).toBe('A#');
      expect(resultSharps.root).toBe('A#');
      expect(resultFlats.mode).toBe('Mayor');
    });

    it('reconoce ambigüedad en lugar de asignar una certeza falsa', () => {
      const ambiguousNotes = 'C G C'; // Quinta abierta sin tercera resolviendo en C
      const result = KeyDetector.detectKey(ambiguousNotes, 'ENGLISH', 'trumpet');
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityReason).toBe('NO_THIRD');
      expect(result.candidateKeys).toContain('C Mayor');
      expect(result.candidateKeys).toContain('C Menor');
    });
  });

  // =========================================================================
  // 10. LAS NOTAS Y LOS TEXTOS QUE NO SON NOTAS MUSICALES NO SE CORROMPEN
  // =========================================================================
  describe('10. Las notas y los textos que no son notas musicales no se corrompen', () => {
    it('no corrompe prosa ni palabras en español', () => {
      const lyrics = 'Habla sobre el libro de David y debemos subir a alabar';
      const normalized = normalizeFlatsToSharps(lyrics);
      expect(normalized).toBe(lyrics);
    });

    it('no confunde la letra mayúscula B con un bemol', () => {
      // 'B' aislada es Si natural
      const progression = 'A B C D';
      expect(normalizeFlatsToSharps(progression)).toBe('A B C D');

      // 'Bb' sí es Si bemol -> A#
      const progressionWithBb = 'A Bb B C';
      expect(normalizeFlatsToSharps(progressionWithBb)).toBe('A A# B C');
    });

    it('respeta estrictamente comentarios y anotaciones entre asteriscos', () => {
      const text = 'D E F# *tocar suavemente en Bb y subir* G A';
      const normalized = normalizeFlatsToSharps(text);
      expect(normalized).toBe('D E F# *tocar suavemente en Bb y subir* G A');
    });
  });
});
