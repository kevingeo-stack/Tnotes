import { describe, it, expect, beforeEach } from 'vitest';
import { transposeText, transposeKeyName } from '../TranspositionEngine';
import { formatDualKeyDisplay } from '../NotationSystem';
import { NoteStorageService, getAllNotes } from '../../../services/storage/NoteStorageService';
import { SetlistStorageService } from '../../../services/storage/SetlistStorageService';
import { SongNote, Setlist } from '../../../types/note';

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value.toString(); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
// @ts-ignore
globalThis.localStorage = localStorageMock;

describe('Setlist & Persistent Transposition State', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Reactive Transposition Logic', () => {
    it('transposes from keyboard to trumpet (+2 semitones)', () => {
      const keyboardText = 'A D E\nIntro: C G A F';
      const trumpetText = transposeText(keyboardText, 'KEYBOARD_TO_TRUMPET');
      expect(trumpetText).toBe('B E F#\nIntro: D A B G');
    });

    it('transposes from trumpet to keyboard (-2 semitones)', () => {
      const trumpetText = 'B E F#\nIntro: D A B G';
      const keyboardText = transposeText(trumpetText, 'TRUMPET_TO_KEYBOARD');
      expect(keyboardText).toBe('A D E\nIntro: C G A F');
    });

    it('transposes key names accurately by semitones', () => {
      expect(transposeKeyName('A Menor', 2)).toBe('B Menor');
      expect(transposeKeyName('B Menor', -2)).toBe('A Menor');
      expect(transposeKeyName('C Mayor', 2)).toBe('D Mayor');
      expect(transposeKeyName('Indeterminada', 2)).toBe('Indeterminada');
    });
  });

  describe('Dual Tonal Display', () => {
    it('formats dual key badge in English notation system', () => {
      const displayMinor = formatDualKeyDisplay('A Menor', 'en');
      expect(displayMinor).toBe('Am / La Menor');

      const displayMajor = formatDualKeyDisplay('C Mayor', 'en');
      expect(displayMajor).toBe('C / Do Mayor');
    });

    it('formats dual key badge in Solfège / Natural notation system', () => {
      const displayMinor = formatDualKeyDisplay('A Menor', 'natural');
      expect(displayMinor).toBe('Lam / La Menor');

      const displayMajor = formatDualKeyDisplay('C Mayor', 'natural');
      expect(displayMajor).toBe('Do / Do Mayor');
    });
  });

  describe('Legacy Notes Automatic Migration', () => {
    it('automatically migrates legacy notes lacking activeInstrument into keyboard mode', () => {
      // Simulate raw legacy data without activeInstrument in trumpet_notes_data
      const legacyRaw = JSON.stringify([
        {
          id: 'legacy-1',
          title: 'Antigua Canción',
          content: 'C D E',
          detectedKey: 'C Mayor',
          updatedAt: 1600000000000
        }
      ]);
      localStorageMock.setItem('trumpet_notes_data', legacyRaw);

      // Call getAllNotes()
      const migrated = getAllNotes();
      expect(migrated.length).toBe(1);
      expect(migrated[0].id).toBe('legacy-1');
      expect(migrated[0].activeInstrument).toBe('keyboard');

      // Verify that migrated notes were re-saved into storage with activeInstrument
      const savedInStorage = JSON.parse(localStorageMock.getItem('trumpet_notes_data') || '[]');
      expect(savedInStorage[0].activeInstrument).toBe('keyboard');
    });
  });

  describe('Multi-Setlist Storage Service', () => {
    it('creates, saves, retrieves and deletes multiple setlists', () => {
      const list1: Setlist = {
        id: 'list-1',
        name: 'Servicio Domingo 10 AM',
        songIds: ['song-1', 'song-2'],
        updatedAt: Date.now()
      };

      const list2: Setlist = {
        id: 'list-2',
        name: 'Vigilia de Oración',
        songIds: ['song-3'],
        updatedAt: Date.now() + 1000
      };

      SetlistStorageService.save(list1);
      SetlistStorageService.save(list2);

      const all = SetlistStorageService.getAll();
      expect(all.length).toBe(2);
      // Most recently updated list comes first
      expect(all[0].id).toBe('list-2');
      expect(all[1].id).toBe('list-1');

      // getById
      const retrieved = SetlistStorageService.getById('list-1');
      expect(retrieved?.name).toBe('Servicio Domingo 10 AM');
      expect(retrieved?.songIds).toEqual(['song-1', 'song-2']);

      // delete
      SetlistStorageService.delete('list-1');
      const afterDelete = SetlistStorageService.getAll();
      expect(afterDelete.length).toBe(1);
      expect(afterDelete[0].id).toBe('list-2');
    });
  });
});
