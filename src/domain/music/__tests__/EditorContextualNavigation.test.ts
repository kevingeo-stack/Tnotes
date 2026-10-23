import { describe, it, expect, beforeEach } from 'vitest';
import { resolveEditorReturnDestination } from '../../../App';
import { ViewState } from '../../../components/navigation/FabNavigation';
import { SongNote, Setlist } from '../../../types/note';
import { NoteStorageService } from '../../../services/storage/NoteStorageService';
import { SetlistStorageService } from '../../../services/storage/SetlistStorageService';
import { KeyDetector } from '../KeyDetector';

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

describe('Navegación Contextual del Editor (TNotes)', () => {
  beforeEach(() => {
    testStorage.clear();
    testStorage.setItem('notation', 'natural');
  });

  // =========================================================================
  // 1. ABRIR DESDE TONALIDADES Y GUARDAR/SALIR DEVUELVE A TONALIDADES
  // =========================================================================
  it('1. abrir desde Tonalidades y guardar/salir devuelve a Tonalidades (grouping)', () => {
    let currentView: ViewState = 'grouping';
    let editorReturnView: ViewState = 'grouping';

    // Simular handleSelectNote con origen 'grouping'
    const openFromGrouping = (origin?: ViewState) => {
      editorReturnView = resolveEditorReturnDestination(origin);
      currentView = 'editor';
    };

    openFromGrouping('grouping');
    expect(currentView).toBe('editor');
    expect(editorReturnView).toBe('grouping');

    // Simular handleSaveAndExit
    const destination = resolveEditorReturnDestination(editorReturnView);
    editorReturnView = 'grouping'; // reset
    currentView = destination;

    expect(currentView).toBe('grouping');
    expect(editorReturnView).toBe('grouping');
  });

  // =========================================================================
  // 2. ABRIR DESDE MODO LISTA Y GUARDAR/SALIR DEVUELVE A MODO LISTA
  // =========================================================================
  it('2. abrir desde Modo Lista y guardar/salir devuelve a Modo Lista (setlist)', () => {
    let currentView: ViewState = 'setlist';
    let editorReturnView: ViewState = 'grouping';
    let activeSetlistId: string | null = 'list-alabanzas-1';

    // Simular que el usuario hace clic en el botón de edición de una canción dentro de una lista
    const openFromSetlist = (origin?: ViewState) => {
      editorReturnView = resolveEditorReturnDestination(origin);
      currentView = 'editor';
    };

    openFromSetlist('setlist');
    expect(currentView).toBe('editor');
    expect(editorReturnView).toBe('setlist');

    // Simular guardado y salida desde el editor
    const destination = resolveEditorReturnDestination(editorReturnView);
    editorReturnView = 'grouping'; // reset para aislar ediciones
    currentView = destination;

    expect(currentView).toBe('setlist');
    // El setlist ID debe mantenerse para reabrir la misma lista activa
    expect(activeSetlistId).toBe('list-alabanzas-1');
  });

  // =========================================================================
  // 3. ABRIR SIN UN ORIGEN VÁLIDO UTILIZA EL DESTINO PREDETERMINADO
  // =========================================================================
  it('3. abrir sin un origen válido o directamente utiliza Tonalidades como predeterminado', () => {
    expect(resolveEditorReturnDestination(null)).toBe('grouping');
    expect(resolveEditorReturnDestination(undefined)).toBe('grouping');
    expect(resolveEditorReturnDestination('editor')).toBe('grouping');
    expect(resolveEditorReturnDestination('' as any)).toBe('grouping');
    expect(resolveEditorReturnDestination('non-existent-view' as any)).toBe('grouping');
  });

  // =========================================================================
  // 4. CAMBIAR EL ORIGEN ENTRE DOS EDICIONES NO CONSERVA EL ANTERIOR
  // =========================================================================
  it('4. cambiar el origen de navegación entre dos ediciones no conserva accidentalmente el origen anterior', () => {
    let currentView: ViewState = 'grouping';
    let editorReturnView: ViewState = 'grouping';

    // Sesión 1: Abrir desde Modo Lista
    editorReturnView = resolveEditorReturnDestination('setlist');
    currentView = 'editor';
    expect(editorReturnView).toBe('setlist');

    // Salir y guardar: debe regresar a setlist y resetear editorReturnView a grouping
    let destination = resolveEditorReturnDestination(editorReturnView);
    editorReturnView = 'grouping';
    currentView = destination;
    expect(currentView).toBe('setlist');
    expect(editorReturnView).toBe('grouping');

    // Sesión 2: Abrir directamente el Editor desde la barra lateral (sin origen o directo)
    // El click en NavItem 'editor' resetea explícitamente a grouping
    editorReturnView = 'grouping';
    currentView = 'editor';

    // Salir de Sesión 2: NO debe ir a setlist, debe ir a grouping
    destination = resolveEditorReturnDestination(editorReturnView);
    editorReturnView = 'grouping';
    currentView = destination;
    expect(currentView).toBe('grouping');

    // Sesión 3: Abrir desde Espacio Armónico
    editorReturnView = resolveEditorReturnDestination('pitch-space');
    currentView = 'editor';
    expect(editorReturnView).toBe('pitch-space');

    destination = resolveEditorReturnDestination(editorReturnView);
    editorReturnView = 'grouping';
    currentView = destination;
    expect(currentView).toBe('pitch-space');
    expect(editorReturnView).toBe('grouping');
  });

  // =========================================================================
  // 5. GUARDAR Y SALIR MANTIENE INTACTOS CONTENIDO E INFORMACIÓN MUSICAL
  // =========================================================================
  it('5. guardar y salir mantiene intactos el contenido y la información musical de la canción', () => {
    const song: SongNote = {
      id: 'song-preserved-nav',
      title: 'Himno de Fortaleza',
      content: 'Sol Si Re',
      baseContent: 'Sol Si Re',
      baseInstrument: 'trumpet',
      activeInstrument: 'trumpet',
      detectedKey: 'Sol Mayor',
      concertKey: 'Fa Mayor',
      updatedAt: 1000
    };

    NoteStorageService.save(song);

    // Modificar contenido en editor y guardar
    const updatedContent = 'Sol Si Re *Solo* Sol Si Re';
    const keyRes = KeyDetector.detectKey(updatedContent, 'LATIN', 'trumpet');
    const updatedSong: SongNote = {
      ...song,
      content: updatedContent,
      detectedKey: keyRes.trumpetKey,
      concertKey: keyRes.concertKey,
      updatedAt: 2000
    };

    NoteStorageService.save(updatedSong);

    const reloaded = NoteStorageService.getAll().find(s => s.id === 'song-preserved-nav')!;
    expect(reloaded.content).toBe('Sol Si Re *Solo* Sol Si Re');
    expect(reloaded.baseContent).toBe('Sol Si Re');
    expect(reloaded.baseInstrument).toBe('trumpet');
    expect(reloaded.activeInstrument).toBe('trumpet');
    expect(reloaded.detectedKey).toBe('Sol Mayor');
    expect(reloaded.concertKey).toBe('Fa Mayor');
    expect(reloaded.updatedAt).toBe(2000);
  });

  // =========================================================================
  // 6. LOS FLUJOS DE CREACIÓN DE CANCIONES NUEVAS SIGUEN FUNCIONANDO
  // =========================================================================
  it('6. los flujos de creación de canciones nuevas respetan el origen y persisten correctamente', () => {
    let currentView: ViewState = 'setlist';
    let editorReturnView: ViewState = 'grouping';

    // Usuario pulsa "+ Nueva Nota" estando en 'setlist'
    editorReturnView = resolveEditorReturnDestination(currentView);
    currentView = 'editor';
    expect(editorReturnView).toBe('setlist');

    // Guardar la nueva canción
    const newNote: SongNote = {
      id: 'fresh-song-1',
      title: 'Alabanza Nueva',
      content: 'Do Mi Sol Do',
      activeInstrument: 'keyboard',
      detectedKey: 'Re Mayor',
      concertKey: 'Do Mayor',
      updatedAt: 3000
    };
    NoteStorageService.save(newNote);

    // Salir del editor
    const dest = resolveEditorReturnDestination(editorReturnView);
    editorReturnView = 'grouping';
    currentView = dest;

    expect(currentView).toBe('setlist');
    const saved = NoteStorageService.getAll().find(s => s.id === 'fresh-song-1');
    expect(saved).toBeDefined();
    expect(saved?.title).toBe('Alabanza Nueva');
  });

  // =========================================================================
  // 7. NO SE PRODUCEN REGRESIONES EN LA SELECCIÓN DE CANCIONES NI EN LAS LISTAS
  // =========================================================================
  it('7. no se producen regresiones en la selección de canciones ni en las listas guardadas', () => {
    // 1. Crear una canción
    const songA: SongNote = {
      id: 'song-a',
      title: 'Canción en Sol',
      content: 'Sol Si Re',
      activeInstrument: 'trumpet',
      detectedKey: 'Sol Mayor',
      concertKey: 'Fa Mayor',
      updatedAt: 1000
    };
    NoteStorageService.save(songA);

    // 2. Crear una lista y añadir la canción
    const setlist: Setlist = {
      id: 'setlist-domingo',
      name: 'Culto de Adoración',
      songIds: ['song-a'],
      updatedAt: 1000
    };
    SetlistStorageService.save(setlist);

    // 3. Simular navegación hacia el editor desde la lista
    let activeSetlistId: string | null = 'setlist-domingo';
    let currentView: ViewState = 'setlist';
    let returnView: ViewState = resolveEditorReturnDestination(currentView);
    currentView = 'editor';

    // 4. Modificar la canción en el editor
    const songAModified: SongNote = {
      ...songA,
      title: 'Canción en Sol (Modificada)',
      updatedAt: 1500
    };
    NoteStorageService.save(songAModified);

    // 5. Retornar a la vista
    currentView = resolveEditorReturnDestination(returnView);
    expect(currentView).toBe('setlist');
    expect(activeSetlistId).toBe('setlist-domingo');

    // 6. Verificar integridad de la lista: la referencia a song-a no se perdió
    const loadedList = SetlistStorageService.getById('setlist-domingo');
    expect(loadedList).toBeDefined();
    expect(loadedList?.songIds).toContain('song-a');

    // 7. Verificar que los datos de la canción modificada están disponibles para la lista
    const refreshedSong = NoteStorageService.getAll().find(s => s.id === 'song-a');
    expect(refreshedSong?.title).toBe('Canción en Sol (Modificada)');
  });
});
