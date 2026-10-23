import { SongNote, Setlist } from './note';
import { NotationSystem } from '../domain/music/NotationSystem';

export interface BackupMetadata {
  name: string;
  version: string;
}

export interface BackupSettings {
  notation?: NotationSystem;
  theme?: 'dark' | 'light';
}

export interface TNotesBackupData {
  songs: SongNote[];
  setlists: Setlist[];
}

export interface TNotesBackupPayload {
  format: 'tnotes-backup';
  schemaVersion: 1;
  exportedAt: number;
  exportedAtISO: string;
  app?: BackupMetadata;
  settings?: BackupSettings;
  data: TNotesBackupData;
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  payload?: TNotesBackupPayload;
}

export interface SongConflict {
  existing: SongNote;
  incoming: SongNote;
  assignedId: string;
}

export interface SetlistConflict {
  existing: Setlist;
  incoming: Setlist;
  assignedId: string;
}

export interface UnresolvedReference {
  setlistName: string;
  missingSongId: string;
}

export interface ImportPlan {
  songsToAdd: SongNote[];
  songsToSkipIdentical: SongNote[];
  songConflicts: SongConflict[];
  setlistsToAdd: Setlist[];
  setlistsToSkipIdentical: Setlist[];
  setlistConflicts: SetlistConflict[];
  unresolvedReferences: UnresolvedReference[];
  settings?: BackupSettings;
  idMap: Record<string, string>;
}

export interface ImportExecutionResult {
  success: boolean;
  songsAddedCount: number;
  songsSkippedCount: number;
  setlistsAddedCount: number;
  setlistsSkippedCount: number;
  unresolvedReferencesCount: number;
  settingsImported: boolean;
  error?: string;
}

export interface ImportOptions {
  importSettings?: boolean;
}
