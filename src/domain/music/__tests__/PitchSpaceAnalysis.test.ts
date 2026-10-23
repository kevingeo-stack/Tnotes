import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PitchSpaceView } from '../../../components/views/PitchSpaceView';
import { KeyDetector } from '../KeyDetector';
import { formatKeyName, toNatural, toEnglish } from '../NotationSystem';
import { PITCH_CLASSES, SharpPitch } from '../PitchClass';
import { keyboardToTrumpet } from '../TranspositionEngine';
import { SongNote } from '../../../types/note';
import { NoteStorageService } from '../../../services/storage/NoteStorageService';

// Mock storage aislado
const mockStore: Record<string, string> = {};
const testStorage = {
  getItem: (key: string) => mockStore[key] || null,
  setItem: (key: string, value: string) => { mockStore[key] = value.toString(); },
  removeItem: (key: string) => { delete mockStore[key]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};
// @ts-ignore
globalThis.localStorage = testStorage;

describe('PitchSpaceView - Functional & Musical Harmony Audit', () => {
  beforeEach(() => {
    testStorage.clear();
  });

  // =========================================================================
  // 1. BIBLIOTECA VACÍA
  // =========================================================================
  it('1. muestra un estado vacío claro cuando la biblioteca está vacía y no hay canción activa', () => {
    const emptyNote: SongNote = {
      id: 'dummy-empty',
      title: '',
      content: '',
      detectedKey: 'Sin tono',
      activeInstrument: 'keyboard',
      updatedAt: 1000
    };

    const html = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: emptyNote,
        notation: 'en',
        notes: []
      })
    );

    expect(html).toContain('No hay canciones en la biblioteca');
    expect(html).toContain('Crea canciones en el Editor o en Tonalidades');
    expect(html).not.toContain('pitch-space-select');
  });

  // =========================================================================
  // 2. SELECCIÓN ENTRE VARIAS CANCIONES
  // =========================================================================
  it('2. renderiza el selector con todas las canciones disponibles y nombres identificables', () => {
    const songs: SongNote[] = [
      {
        id: 's1',
        title: 'Alabanza de Trompeta',
        content: 'Sol Si Re Sol',
        detectedKey: 'Sol Mayor',
        concertKey: 'Fa Mayor',
        activeInstrument: 'trumpet',
        updatedAt: 1000
      },
      {
        id: 's2',
        title: 'Adoración en Re',
        content: 'Re Fa# La Re',
        detectedKey: 'Re Mayor',
        concertKey: 'Do Mayor',
        activeInstrument: 'trumpet',
        updatedAt: 2000
      },
      {
        id: 's3',
        title: 'Piano en Mi Menor',
        content: 'Mi Sol Si Mi',
        detectedKey: 'Fa# Menor',
        concertKey: 'Mi Menor',
        activeInstrument: 'keyboard',
        updatedAt: 3000
      }
    ];

    const html = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: songs[0],
        notation: 'natural',
        notes: songs
      })
    );

    expect(html).toContain('id="pitch-space-select"');
    expect(html).toContain('Alabanza de Trompeta (Sol Mayor)');
    expect(html).toContain('Adoración en Re (Re Mayor)');
    expect(html).toContain('Piano en Mi Menor (Fa# Menor)');
  });

  // =========================================================================
  // 3. ACTUALIZACIÓN DE LA RUEDA Y EL ANÁLISIS AL CAMBIAR DE CANCIÓN
  // =========================================================================
  it('3. actualiza las notas de la escala y el análisis al seleccionar otra canción', () => {
    const songG: SongNote = {
      id: 'song-g',
      title: 'Trompeta Sol',
      content: 'Sol Si Re',
      detectedKey: 'Sol Mayor',
      concertKey: 'Fa Mayor',
      activeInstrument: 'trumpet',
      updatedAt: 1000
    };

    const songD: SongNote = {
      id: 'song-d',
      title: 'Trompeta Re',
      content: 'Re Fa# La',
      detectedKey: 'Re Mayor',
      concertKey: 'Do Mayor',
      activeInstrument: 'trumpet',
      updatedAt: 2000
    };

    // Render con songG (Concierto: Fa Mayor -> F, G, A, A#, C, D, E)
    const htmlG = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: songG,
        notation: 'en',
        notes: [songG, songD]
      })
    );

    expect(htmlG).toContain('Trompeta (Escrita)');
    expect(htmlG).toContain('G Mayor');
    expect(htmlG).toContain('Teclado (Concierto)');
    expect(htmlG).toContain('F Mayor');
    expect(htmlG).toContain('7 notas en la escala de F Mayor');

    // Render con songD (Concierto: Do Mayor -> C, D, E, F, G, A, B)
    const htmlD = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: songD,
        notation: 'en',
        notes: [songG, songD]
      })
    );

    expect(htmlD).toContain('D Mayor');
    expect(htmlD).toContain('C Mayor');
    expect(htmlD).toContain('7 notas en la escala de C Mayor');
  });

  // =========================================================================
  // 4. TROMPETA ESCRITA EN SOL MAYOR Y CONCIERTO EN FA MAYOR
  // =========================================================================
  it('4. separa con rigor: trompeta escrita en Sol Mayor y concierto en Fa Mayor', () => {
    const trumpetSong: SongNote = {
      id: 'tp-1',
      title: 'Prueba Borrado Referencia',
      content: 'Sol Si Re',
      detectedKey: 'Sol Mayor',
      concertKey: 'Fa Mayor',
      activeInstrument: 'trumpet',
      updatedAt: 1000
    };

    const html = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: trumpetSong,
        notation: 'natural',
        notes: [trumpetSong]
      })
    );

    // 1. Tonalidad escrita de trompeta es Sol Mayor
    expect(html).toContain('🎺 Trompeta (Escrita)');
    expect(html).toContain('Sol Mayor');

    // 2. Tonalidad de concierto para teclado es Fa Mayor
    expect(html).toContain('🎹 Teclado (Concierto)');
    expect(html).toContain('Fa Mayor');

    // 3. La columna de teclado/concierto refleja Fa Mayor
    expect(html).toContain('🎹 Teclado (Concierto)');
    expect(html).toContain('• Fa Mayor');

    // 4. La columna de trompeta refleja Sol Mayor
    expect(html).toContain('🎺 Trompeta (Sib)');
    expect(html).toContain('• Sol Mayor');
  });

  // =========================================================================
  // 5. TECLADO EN DO MAYOR SIN TRANSPOSICIÓN ACCIDENTAL
  // =========================================================================
  it('5. verifica canción de teclado en Do Mayor sin transposición accidental en concierto', () => {
    const keyboardSong: SongNote = {
      id: 'kb-1',
      title: 'Himno de Piano',
      content: 'Do Mi Sol Do',
      detectedKey: 'Re Mayor', // Para trompeta Sib (+2)
      concertKey: 'Do Mayor',  // Para teclado (tono sonoro)
      activeInstrument: 'keyboard',
      updatedAt: 1000
    };

    const html = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: keyboardSong,
        notation: 'natural',
        notes: [keyboardSong]
      })
    );

    // Concierto debe ser estrictamente Do Mayor
    expect(html).toContain('🎹 Teclado (Concierto)');
    expect(html).toContain('• Do Mayor');
    // Trompeta debe ser Re Mayor (+2)
    expect(html).toContain('🎺 Trompeta (Sib)');
    expect(html).toContain('• Re Mayor');
  });

  // =========================================================================
  // 6. CAMBIO ENTRE NOTACIÓN INGLESA Y LATINA
  // =========================================================================
  it('6. traduce dinámicamente entre notación inglesa y latina en todas las secciones', () => {
    const song: SongNote = {
      id: 'trans-song',
      title: 'Melodía Dual',
      content: 'C E G',
      detectedKey: 'D Mayor',
      concertKey: 'C Mayor',
      activeInstrument: 'keyboard',
      updatedAt: 1000
    };

    // En notación inglesa: C Mayor / D Mayor
    const htmlEn = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: song,
        notation: 'en',
        notes: [song]
      })
    );
    expect(htmlEn).toContain('C Mayor');
    expect(htmlEn).toContain('D Mayor');

    // En solfeo latino: Do Mayor / Re Mayor
    const htmlNat = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: song,
        notation: 'natural',
        notes: [song]
      })
    );
    expect(htmlNat).toContain('Do Mayor');
    expect(htmlNat).toContain('Re Mayor');
  });

  // =========================================================================
  // 7. CANCIÓN SIN TONALIDAD DETERMINABLE
  // =========================================================================
  it('7. gestiona de forma honesta una canción sin tonalidad determinable', () => {
    const indeterminateSong: SongNote = {
      id: 'indet-1',
      title: 'Ruido sin notas',
      content: '',
      detectedKey: 'Sin tono',
      concertKey: 'Sin tono',
      activeInstrument: 'trumpet',
      updatedAt: 1000
    };

    const html = renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: indeterminateSong,
        notation: 'en',
        notes: [indeterminateSong]
      })
    );

    expect(html).toContain('Sin tono');
    expect(html).toContain('Sin escala proyectada');
    // Ninguna fila debe estar marcada como en escala
    expect(html).not.toContain('✓ En Escala');
  });

  // =========================================================================
  // 8. CONSERVACIÓN DEL CONTENIDO ORIGINAL TRAS SELECCIONAR CANCIONES
  // =========================================================================
  it('8. garantiza que la selección y visualización no modifican el contenido guardado en storage', () => {
    testStorage.setItem('notation', 'natural');
    const originalContent = 'Sol Si Re *Solo de trompeta*';
    const originalBase = 'Sol Si Re *Solo de trompeta*';
    const song: SongNote = {
      id: 'preserve-1',
      title: 'Canción Invariable',
      content: originalContent,
      baseContent: originalBase,
      baseInstrument: 'trumpet',
      activeInstrument: 'trumpet',
      detectedKey: 'Sol Mayor',
      concertKey: 'Fa Mayor',
      updatedAt: 1000
    };

    // Guardar en el servicio
    NoteStorageService.save(song);

    // Renderizar en Espacio Armónico
    renderToString(
      React.createElement(PitchSpaceView, {
        activeNote: song,
        notation: 'natural',
        notes: NoteStorageService.getAll()
      })
    );

    // Verificar que los datos en almacenamiento no se modificaron
    const reloaded = NoteStorageService.getAll().find(n => n.id === 'preserve-1')!;
    expect(reloaded.content).toBe(originalContent);
    expect(reloaded.baseContent).toBe(originalBase);
    expect(reloaded.baseInstrument).toBe('trumpet');
    expect(reloaded.detectedKey).toBe('Sol Mayor');
    expect(reloaded.concertKey).toBe('Fa Mayor');
    expect(reloaded.updatedAt).toBe(1000);
  });
});
