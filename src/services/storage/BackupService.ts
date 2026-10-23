import { SongNote, Setlist } from '../../types/note';
import {
  TNotesBackupPayload,
  ImportValidationResult,
  ImportPlan,
  ImportExecutionResult,
  ImportOptions,
  BackupSettings
} from '../../types/backup';
import { NoteStorageService } from './NoteStorageService';
import { SetlistStorageService } from './SetlistStorageService';
import { NotationSystem } from '../../domain/music/NotationSystem';

const CURRENT_SCHEMA_VERSION = 1;
const FORMAT_IDENTIFIER = 'tnotes-backup';

const getStorage = (): Storage | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Genera un identificador único que no colisione con los existentes.
 */
function generateUniqueId(existingIds: Set<string>, prefix: string = 'import'): string {
  let id = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  while (existingIds.has(id)) {
    id = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
  existingIds.add(id);
  return id;
}

/**
 * Snapshot del estado de almacenamiento para reversión atómica (Rollback).
 */
interface StorageSnapshot {
  notesPrimary: string | null;
  notesLegacy: string | null;
  setlistsPrimary: string | null;
  setlistsLegacy: string | null;
  notation: string | null;
  theme: string | null;
}

function captureStorageSnapshot(): StorageSnapshot {
  const storage = getStorage();
  if (!storage) {
    return {
      notesPrimary: null,
      notesLegacy: null,
      setlistsPrimary: null,
      setlistsLegacy: null,
      notation: null,
      theme: null,
    };
  }
  return {
    notesPrimary: storage.getItem('trumpet_notes_data'),
    notesLegacy: storage.getItem('tnotes_songs_v1'),
    setlistsPrimary: storage.getItem('trumpet_setlists_data'),
    setlistsLegacy: storage.getItem('trumpet_setlists_data_v1'),
    notation: storage.getItem('notation'),
    theme: storage.getItem('theme'),
  };
}

function restoreStorageSnapshot(snapshot: StorageSnapshot): void {
  const storage = getStorage();
  if (!storage) return;

  const restoreKey = (key: string, val: string | null) => {
    try {
      if (val !== null) storage.setItem(key, val);
      else storage.removeItem(key);
    } catch {
      // Evitar que un error secundario de almacenamiento interrumpa la reversión
    }
  };

  restoreKey('trumpet_notes_data', snapshot.notesPrimary);
  restoreKey('tnotes_songs_v1', snapshot.notesLegacy);
  restoreKey('trumpet_setlists_data', snapshot.setlistsPrimary);
  restoreKey('trumpet_setlists_data_v1', snapshot.setlistsLegacy);
  restoreKey('notation', snapshot.notation);
  restoreKey('theme', snapshot.theme);
}

/**
 * Comprueba si dos canciones tienen el mismo contenido musical y textual.
 */
function areSongsIdentical(a: SongNote, b: SongNote): boolean {
  const titleA = (a.title || '').trim();
  const titleB = (b.title || '').trim();
  if (titleA !== titleB) return false;

  const contentA = (a.content || '').trim();
  const contentB = (b.content || '').trim();
  if (contentA !== contentB) return false;

  const instA = a.activeInstrument || 'keyboard';
  const instB = b.activeInstrument || 'keyboard';
  if (instA !== instB) return false;

  const baseContentA = (a.baseContent || a.content || '').trim();
  const baseContentB = (b.baseContent || b.content || '').trim();
  if (baseContentA !== baseContentB) return false;

  const baseInstA = a.baseInstrument || instA;
  const baseInstB = b.baseInstrument || instB;
  if (baseInstA !== baseInstB) return false;

  return true;
}

/**
 * Comprueba si dos listas son idénticas en nombre y referencias de canciones.
 */
function areSetlistsIdentical(a: Setlist, b: Setlist): boolean {
  if (a.name.trim() !== b.name.trim()) return false;
  if (a.songIds.length !== b.songIds.length) return false;
  for (let i = 0; i < a.songIds.length; i++) {
    if (a.songIds[i] !== b.songIds[i]) return false;
  }
  return true;
}

export class BackupService {
  /**
   * Genera el payload completo del respaldo sin modificar el almacenamiento.
   */
  public static createBackupPayload(
    songs?: SongNote[],
    setlists?: Setlist[],
    settings?: BackupSettings
  ): TNotesBackupPayload {
    const storage = getStorage();

    const actualSongs = songs ?? NoteStorageService.getAll();
    const actualSetlists = setlists ?? SetlistStorageService.getAll();

    const savedNotation = storage ? (storage.getItem('notation') as NotationSystem) : null;
    const savedTheme = storage ? (storage.getItem('theme') as 'dark' | 'light') : null;

    const actualSettings: BackupSettings = settings ?? {
      notation: savedNotation === 'natural' || savedNotation === 'en' ? savedNotation : undefined,
      theme: savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : undefined,
    };

    const now = Date.now();

    return {
      format: FORMAT_IDENTIFIER,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: now,
      exportedAtISO: new Date(now).toISOString(),
      app: {
        name: 'TNotes',
        version: '1.0.0',
      },
      settings: actualSettings,
      data: {
        songs: actualSongs,
        setlists: actualSetlists,
      },
    };
  }

  /**
   * Descarga el archivo .tnotes en el navegador.
   */
  public static downloadBackup(payload?: TNotesBackupPayload): void {
    const data = payload ?? this.createBackupPayload();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date(data.exportedAt).toISOString().split('T')[0];
    const filename = `tnotes_backup_${dateStr}.tnotes`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Valida en memoria el texto crudo del archivo sin escribir en almacenamiento.
   */
  public static validateBackupText(rawText: string): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!rawText || rawText.trim().length === 0) {
      return {
        isValid: false,
        errors: ['El archivo seleccionado está vacío.'],
        warnings: [],
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      return {
        isValid: false,
        errors: ['El archivo no tiene un formato JSON válido o está corrupto.'],
        warnings: [],
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        isValid: false,
        errors: ['Estructura de respaldo no válida: debe ser un objeto JSON.'],
        warnings: [],
      };
    }

    // 1. Identificador de formato
    if (parsed.format !== FORMAT_IDENTIFIER) {
      return {
        isValid: false,
        errors: [
          `Identificador de formato no reconocido ("${parsed.format || 'desconocido'}"). Debe ser un archivo .tnotes de TNotes.`,
        ],
        warnings: [],
      };
    }

    // 2. Versión de esquema
    if (typeof parsed.schemaVersion !== 'number') {
      errors.push('Falta la versión de esquema ("schemaVersion") en el archivo.');
    } else if (parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      return {
        isValid: false,
        errors: [
          `Versión de esquema ${parsed.schemaVersion} no soportada. Esta versión de TNotes admite hasta la versión ${CURRENT_SCHEMA_VERSION}. Actualiza la aplicación.`,
        ],
        warnings: [],
      };
    } else if (parsed.schemaVersion < 1) {
      errors.push(`Versión de esquema ${parsed.schemaVersion} inválida.`);
    }

    // 3. Estructura de data
    if (!parsed.data || typeof parsed.data !== 'object') {
      errors.push('El archivo no contiene la sección principal de datos ("data").');
      return { isValid: false, errors, warnings };
    }

    // 4. Validar canciones
    if (!Array.isArray(parsed.data.songs)) {
      errors.push('La sección de canciones ("data.songs") debe ser un arreglo.');
    } else {
      parsed.data.songs.forEach((song: any, idx: number) => {
        if (!song || typeof song !== 'object') {
          errors.push(`Canción en posición ${idx} no es un objeto válido.`);
          return;
        }
        if (!song.id || typeof song.id !== 'string') {
          errors.push(`Canción en posición ${idx} carece de un "id" válido.`);
        }
        if (typeof song.title !== 'string') {
          errors.push(`Canción en posición ${idx} (id: ${song.id || 'desconocido'}) carece de "title".`);
        }
        if (typeof song.content !== 'string') {
          errors.push(`Canción en posición ${idx} (id: ${song.id || 'desconocido'}) carece de "content".`);
        }
        if (song.activeInstrument && song.activeInstrument !== 'keyboard' && song.activeInstrument !== 'trumpet') {
          warnings.push(`Canción "${song.title || song.id}" tiene activeInstrument inválido; se asumirá "keyboard".`);
        }
      });
    }

    // 5. Validar listas
    if (!Array.isArray(parsed.data.setlists)) {
      errors.push('La sección de listas ("data.setlists") debe ser un arreglo.');
    } else {
      parsed.data.setlists.forEach((list: any, idx: number) => {
        if (!list || typeof list !== 'object') {
          errors.push(`Lista en posición ${idx} no es un objeto válido.`);
          return;
        }
        if (!list.id || typeof list.id !== 'string') {
          errors.push(`Lista en posición ${idx} carece de un "id" válido.`);
        }
        if (typeof list.name !== 'string') {
          errors.push(`Lista en posición ${idx} carece de "name".`);
        }
        if (!Array.isArray(list.songIds)) {
          errors.push(`Lista "${list.name || idx}" carece de un arreglo "songIds".`);
        }
      });
    }

    if (errors.length > 0) {
      return { isValid: false, errors, warnings };
    }

    return {
      isValid: true,
      errors: [],
      warnings,
      payload: parsed as TNotesBackupPayload,
    };
  }

  /**
   * Construye un plan de fusión en memoria calculando diferencias, colisiones de IDs
   * y remapeo de listas sin tocar el almacenamiento.
   */
  public static buildImportPlan(
    payload: TNotesBackupPayload,
    existingSongs?: SongNote[],
    existingSetlists?: Setlist[]
  ): ImportPlan {
    const currentSongs = existingSongs ?? NoteStorageService.getAll();
    const currentSetlists = existingSetlists ?? SetlistStorageService.getAll();

    const existingSongMap = new Map<string, SongNote>();
    currentSongs.forEach(s => existingSongMap.set(s.id, s));

    const existingIdsSet = new Set<string>();
    currentSongs.forEach(s => existingIdsSet.add(s.id));

    const idMap: Record<string, string> = {};

    const songsToAdd: SongNote[] = [];
    const songsToSkipIdentical: SongNote[] = [];
    const songConflicts: ImportPlan['songConflicts'] = [];

    // 1. Procesar canciones
    for (const incoming of payload.data.songs) {
      const existing = existingSongMap.get(incoming.id);

      if (!existing) {
        // No hay colisión de ID -> Canción nueva
        existingIdsSet.add(incoming.id);
        idMap[incoming.id] = incoming.id;
        songsToAdd.push(incoming);
      } else {
        // Colisión de ID: verificar si el contenido es idéntico
        if (areSongsIdentical(existing, incoming)) {
          // Idéntica -> Se omite para no duplicar
          songsToSkipIdentical.push(incoming);
          idMap[incoming.id] = existing.id;
        } else {
          // Mismo ID pero contenido diferente -> Conservar ambas, generar nuevo ID para la entrante
          const newId = generateUniqueId(existingIdsSet, 'song');
          idMap[incoming.id] = newId;

          const remappedSong: SongNote = {
            ...incoming,
            id: newId,
          };

          songConflicts.push({
            existing,
            incoming,
            assignedId: newId,
          });
          songsToAdd.push(remappedSong);
        }
      }
    }

    // 2. Procesar listas y remapear referencias
    const allKnownSongIds = new Set<string>();
    currentSongs.forEach(s => allKnownSongIds.add(s.id));
    songsToAdd.forEach(s => allKnownSongIds.add(s.id));

    const existingSetlistMap = new Map<string, Setlist>();
    currentSetlists.forEach(s => existingSetlistMap.set(s.id, s));

    const existingSetlistIdsSet = new Set<string>();
    currentSetlists.forEach(s => existingSetlistIdsSet.add(s.id));

    const setlistsToAdd: Setlist[] = [];
    const setlistsToSkipIdentical: Setlist[] = [];
    const setlistConflicts: ImportPlan['setlistConflicts'] = [];
    const unresolvedReferences: ImportPlan['unresolvedReferences'] = [];

    for (const incomingList of payload.data.setlists) {
      const remappedSongIds: string[] = [];

      // Preservar orden exacto al remapear
      for (const origSongId of incomingList.songIds) {
        const resolvedId = idMap[origSongId] || origSongId;
        if (allKnownSongIds.has(resolvedId)) {
          remappedSongIds.push(resolvedId);
        } else {
          // Referencia no resuelta
          unresolvedReferences.push({
            setlistName: incomingList.name,
            missingSongId: origSongId,
          });
        }
      }

      const preparedList: Setlist = {
        ...incomingList,
        songIds: remappedSongIds,
      };

      const existingList = existingSetlistMap.get(incomingList.id);

      if (!existingList) {
        existingSetlistIdsSet.add(preparedList.id);
        setlistsToAdd.push(preparedList);
      } else {
        if (areSetlistsIdentical(existingList, preparedList)) {
          setlistsToSkipIdentical.push(incomingList);
        } else {
          const newId = generateUniqueId(existingSetlistIdsSet, 'list');
          setlistConflicts.push({
            existing: existingList,
            incoming: incomingList,
            assignedId: newId,
          });
          setlistsToAdd.push({
            ...preparedList,
            id: newId,
          });
        }
      }
    }

    return {
      songsToAdd,
      songsToSkipIdentical,
      songConflicts,
      setlistsToAdd,
      setlistsToSkipIdentical,
      setlistConflicts,
      unresolvedReferences,
      settings: payload.settings,
      idMap,
    };
  }

  /**
   * Ejecuta el plan de importación de forma atómica y segura con reversión automática en caso de error.
   */
  public static executeImportPlan(
    plan: ImportPlan,
    options: ImportOptions = {}
  ): ImportExecutionResult {
    const snapshot = captureStorageSnapshot();
    const storage = getStorage();

    if (!storage) {
      return {
        success: false,
        songsAddedCount: 0,
        songsSkippedCount: 0,
        setlistsAddedCount: 0,
        setlistsSkippedCount: 0,
        unresolvedReferencesCount: plan.unresolvedReferences.length,
        settingsImported: false,
        error: 'El almacenamiento local (localStorage) no está disponible en este dispositivo.',
      };
    }

    try {
      const currentSongs = NoteStorageService.getAll();
      const currentSetlists = SetlistStorageService.getAll();

      // Fusión en memoria
      const finalSongs = [...currentSongs, ...plan.songsToAdd].sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );

      const finalSetlists = [...currentSetlists, ...plan.setlistsToAdd].sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );

      // Escritura atómica conjunta
      NoteStorageService.saveAll(finalSongs);
      SetlistStorageService.saveAll(finalSetlists);

      let settingsImported = false;
      if (options.importSettings && plan.settings) {
        if (plan.settings.notation === 'en' || plan.settings.notation === 'natural') {
          storage.setItem('notation', plan.settings.notation);
          settingsImported = true;
        }
        if (plan.settings.theme === 'dark' || plan.settings.theme === 'light') {
          storage.setItem('theme', plan.settings.theme);
          settingsImported = true;
        }
      }

      return {
        success: true,
        songsAddedCount: plan.songsToAdd.length,
        songsSkippedCount: plan.songsToSkipIdentical.length,
        setlistsAddedCount: plan.setlistsToAdd.length,
        setlistsSkippedCount: plan.setlistsToSkipIdentical.length,
        unresolvedReferencesCount: plan.unresolvedReferences.length,
        settingsImported,
      };
    } catch (e: any) {
      // Reversión total e inmediata
      restoreStorageSnapshot(snapshot);

      const errorMsg =
        e?.name === 'QuotaExceededError' || e?.code === 22
          ? 'La cuota de almacenamiento del navegador se ha superado. No se modificó ningún dato.'
          : (e?.message || 'Error inesperado durante la escritura. Se restauró el estado previo.');

      return {
        success: false,
        songsAddedCount: 0,
        songsSkippedCount: 0,
        setlistsAddedCount: 0,
        setlistsSkippedCount: 0,
        unresolvedReferencesCount: plan.unresolvedReferences.length,
        settingsImported: false,
        error: errorMsg,
      };
    }
  }
}
