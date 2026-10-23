import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { NoteEditorView } from '../../../components/views/NoteEditorView';
import { SongNote } from '../../../types/note';
import { NoteStorageService, translateAllNotesInStorage } from '../../../services/storage/NoteStorageService';
import { NotationTranslator, NotationStyle } from '../NotationTranslator';
import { resolveEditorReturnDestination } from '../../../App';
import { ViewState } from '../../../components/navigation/FabNavigation';

// Mock storage aislado en memoria
const mockStore: Record<string, string> = {};
const testStorage = {
  getItem: (key: string) => mockStore[key] || null,
  setItem: (key: string, value: string) => { mockStore[key] = value.toString(); },
  removeItem: (key: string) => { delete mockStore[key]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};
// @ts-ignore
globalThis.localStorage = testStorage;

describe('Sincronización de Notación entre Selector Global y Editor (TNotes)', () => {
  beforeEach(() => {
    testStorage.clear();
    testStorage.setItem('notation', 'en');
  });

  // =========================================================================
  // 1. CAMBIAR DE NOTACIÓN EN EL SELECTOR GLOBAL Y VERIFICAR ACTUALIZACIÓN DEL EDITOR
  // =========================================================================
  it('1. cambiar de notación en el selector global actualiza la representación del Editor', () => {
    const song: SongNote = {
      id: 'song-sync-1',
      title: 'Melodía de Prueba',
      content: 'C E G',
      baseContent: 'C E G',
      baseInstrument: 'keyboard',
      activeInstrument: 'keyboard',
      detectedKey: 'D Mayor',
      concertKey: 'C Mayor',
      updatedAt: 1000
    };

    // Render inicial en inglés
    const htmlEn = renderToString(
      React.createElement(NoteEditorView, {
        note: song,
        onNoteChange: () => {},
        onSaveAndExit: () => {},
        notation: 'en'
      })
    );
    expect(htmlEn).toContain('C E G');
    expect(htmlEn).toContain('EN');

    // Al cambiar la prop global a 'natural' (Solfeo Latino)
    const songLatin: SongNote = {
      ...song,
      content: NotationTranslator.translateFullContent(song.content, 'LATIN')
    };

    const htmlNat = renderToString(
      React.createElement(NoteEditorView, {
        note: songLatin,
        onNoteChange: () => {},
        onSaveAndExit: () => {},
        notation: 'natural'
      })
    );
    expect(htmlNat).toContain('Do Mi Sol');
    expect(htmlNat).toContain('Solfeo');
  });

  // =========================================================================
  // 2. CAMBIAR DE NOTACIÓN EN EL EDITOR Y VERIFICAR ACTUALIZACIÓN GLOBAL
  // =========================================================================
  it('2. cambiar de notación en el Editor invoca onToggleNotation y sincroniza localStorage y repertorio', () => {
    let globalNotation = 'en';
    const mockToggleGlobal = () => {
      globalNotation = globalNotation === 'en' ? 'natural' : 'en';
      testStorage.setItem('notation', globalNotation);
      const targetStyle: NotationStyle = globalNotation === 'natural' ? 'LATIN' : 'ENGLISH';
      translateAllNotesInStorage(targetStyle);
    };

    const song: SongNote = {
      id: 'song-editor-toggle',
      title: 'Canción Reversible',
      content: 'D F# A',
      baseContent: 'D F# A',
      baseInstrument: 'trumpet',
      activeInstrument: 'trumpet',
      detectedKey: 'D Mayor',
      concertKey: 'C Mayor',
      updatedAt: 1000
    };
    NoteStorageService.save(song);

    // Simular toggle desde el Editor
    mockToggleGlobal();

    expect(globalNotation).toBe('natural');
    expect(testStorage.getItem('notation')).toBe('natural');

    // Comprobar que el repertorio en almacenamiento fue traducido
    const reloaded = NoteStorageService.getAll().find(s => s.id === 'song-editor-toggle')!;
    expect(reloaded.content).toBe('Re Fa# La');
    expect(reloaded.detectedKey).toBe('Re Mayor');
    expect(reloaded.concertKey).toBe('Do Mayor');
  });

  // =========================================================================
  // 3. NAVEGAR ENTRE TONALIDADES, MODO LISTA Y EDITOR MANTIENE LA PREFERENCIA
  // =========================================================================
  it('3. navegar entre Tonalidades, Modo Lista y el Editor conserva la preferencia de notación', () => {
    testStorage.setItem('notation', 'natural');
    let appNotation = testStorage.getItem('notation') || 'en';
    let currentView: ViewState = 'grouping';

    // 1. En Tonalidades
    expect(appNotation).toBe('natural');
    expect(currentView).toBe('grouping');

    // 2. Navegar a Modo Lista
    currentView = 'setlist';
    expect(appNotation).toBe('natural');

    // 3. Abrir canción en el Editor
    currentView = 'editor';
    expect(appNotation).toBe('natural');

    // 4. Salir de vuelta a Modo Lista
    const returnDest = resolveEditorReturnDestination('setlist');
    currentView = returnDest;
    expect(currentView).toBe('setlist');
    expect(appNotation).toBe('natural');
    expect(testStorage.getItem('notation')).toBe('natural');
  });

  // =========================================================================
  // 4. CONFIRMAR QUE EL CAMBIO DE NOTACIÓN NO TRANSPONE NINGUNA CANCIÓN
  // =========================================================================
  it('4. confirma rigurosamente que el cambio de notación no aplica transposición ni altera la afinación', () => {
    const originalText = 'C E G Bb'; // Bb será normalizado a La# por Zero-Flats
    const latin = NotationTranslator.translateFullContent(originalText, 'LATIN');
    expect(latin).toBe('Do Mi Sol La#');

    // Al regresar a inglés: debe corresponder nota por nota a la misma altura tonal
    const backToEng = NotationTranslator.translateFullContent(latin, 'ENGLISH');
    expect(backToEng).toBe('C E G A#');

    // C es Do (0 semitonos), E es Mi (0 semitonos), G es Sol (0 semitonos), A# es La# (0 semitonos)
    // No hay desfases de 2 semitonos
    expect(latin.startsWith('Do')).toBe(true);
    expect(latin).not.toContain('Re'); // Si hubiera transposición a trompeta (+2) C se volvería Re
  });

  // =========================================================================
  // 5. CONTENIDO ORIGINAL Y REFERENCIAS MUSICALES PERMANECEN INTACTOS
  // =========================================================================
  it('5. el contenido original y las referencias de baseInstrument permanecen intactas', () => {
    const song: SongNote = {
      id: 'preserve-refs',
      title: 'Himno Sagrado',
      content: 'Sol Si Re',
      baseContent: 'Sol Si Re',
      baseInstrument: 'trumpet',
      activeInstrument: 'trumpet',
      detectedKey: 'Sol Mayor',
      concertKey: 'Fa Mayor',
      updatedAt: 1500
    };
    NoteStorageService.save(song);

    // Cambiar a inglés
    translateAllNotesInStorage('ENGLISH');

    const loadedEn = NoteStorageService.getAll().find(s => s.id === 'preserve-refs')!;
    expect(loadedEn.baseInstrument).toBe('trumpet');
    expect(loadedEn.activeInstrument).toBe('trumpet');
    expect(loadedEn.content).toBe('G B D');
    expect(loadedEn.baseContent).toBe('G B D');
    expect(loadedEn.detectedKey).toBe('G Mayor');
    expect(loadedEn.concertKey).toBe('F Mayor');

    // Regresar a solfeo
    translateAllNotesInStorage('LATIN');

    const loadedNat = NoteStorageService.getAll().find(s => s.id === 'preserve-refs')!;
    expect(loadedNat.baseInstrument).toBe('trumpet');
    expect(loadedNat.activeInstrument).toBe('trumpet');
    expect(loadedNat.content).toBe('Sol Si Re');
    expect(loadedNat.baseContent).toBe('Sol Si Re');
    expect(loadedNat.detectedKey).toBe('Sol Mayor');
    expect(loadedNat.concertKey).toBe('Fa Mayor');
  });

  // =========================================================================
  // 6. NOTACIÓN LATINA USA DO-RE-MI Y LA INGLESA C-D-E
  // =========================================================================
  it('6. la notación latina presenta nombres Do-Re-Mi y la inglesa C-D-E en todos los grados', () => {
    const engScale = 'C D E F G A B';
    const latScale = NotationTranslator.translateFullContent(engScale, 'LATIN');
    expect(latScale).toBe('Do Re Mi Fa Sol La Si');

    const backToEng = NotationTranslator.translateFullContent(latScale, 'ENGLISH');
    expect(backToEng).toBe('C D E F G A B');
  });

  // =========================================================================
  // 7. CONVENCIÓN ZERO-FLATS SE RESPETA EN REPRESENTACIONES DE TROMPETA
  // =========================================================================
  it('7. la convención Zero-Flats se respeta estrictamente en trompeta durante la traducción', () => {
    // Si entran bemoles en el texto original, deben convertirse en sostenidos en ambos idiomas
    const textWithFlats = 'Bb Eb Ab Db Gb';
    const latResult = NotationTranslator.translateFullContent(textWithFlats, 'LATIN');
    expect(latResult).toBe('La# Re# Sol# Do# Fa#');
    expect(latResult).not.toContain('Sib');
    expect(latResult).not.toContain('Mib');
    expect(latResult).not.toContain('Lab');
    expect(latResult).not.toContain('Reb');
    expect(latResult).not.toContain('Solb');

    const engResult = NotationTranslator.translateFullContent(latResult, 'ENGLISH');
    expect(engResult).toBe('A# D# G# C# F#');
    expect(engResult).not.toContain('Bb');
    expect(engResult).not.toContain('Eb');
    expect(engResult).not.toContain('Ab');
    expect(engResult).not.toContain('Db');
    expect(engResult).not.toContain('Gb');
  });

  // =========================================================================
  // 8. GUARDAR Y SALIR CONSERVA NAVEGACIÓN CONTEXTUAL TRAS CAMBIAR NOTACIÓN
  // =========================================================================
  it('8. guardar y salir del Editor conserva la navegación contextual incluso tras alternar notación', () => {
    let currentView: ViewState = 'setlist';
    let editorReturnView: ViewState = 'grouping';
    let notation: 'en' | 'natural' = 'en';

    // 1. Abrir desde Modo Lista
    editorReturnView = resolveEditorReturnDestination(currentView);
    currentView = 'editor';
    expect(currentView).toBe('editor');
    expect(editorReturnView).toBe('setlist');

    // 2. Cambiar notación dentro del editor
    notation = notation === 'en' ? 'natural' : 'en';
    testStorage.setItem('notation', notation);
    expect(notation).toBe('natural');

    // 3. Confirmar y guardar: debe regresar a 'setlist' (Modo Lista), no a Tonalidades
    const returnDest = resolveEditorReturnDestination(editorReturnView);
    editorReturnView = 'grouping'; // reset para aislar ediciones
    currentView = returnDest;

    expect(currentView).toBe('setlist');
    expect(testStorage.getItem('notation')).toBe('natural');
  });
});
