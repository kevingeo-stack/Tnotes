import { describe, it, expect, beforeEach } from 'vitest';
import { transposeText, transposeKeyName } from '../TranspositionEngine';
import { formatDualKeyDisplay } from '../NotationSystem';
import { NoteStorageService, getAllNotes, sanitizeLegacyNotes, sanitizeEmptyNotes } from '../../../services/storage/NoteStorageService';
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
    it('executes sanitizeLegacyNotes and repairs notes missing activeInstrument', () => {
      const rawLegacy = JSON.stringify([
        {
          id: 'old-note',
          title: 'Canción Antigua',
          content: 'F G A',
          detectedKey: 'F Mayor',
          updatedAt: 1500000000000
        }
      ]);
      localStorageMock.setItem('trumpet_notes_data', rawLegacy);

      sanitizeLegacyNotes();

      const repaired = JSON.parse(localStorageMock.getItem('trumpet_notes_data') || '[]');
      expect(repaired.length).toBe(1);
      expect(repaired[0].activeInstrument).toBe('keyboard');
    });

    it('automatically migrates legacy notes lacking activeInstrument into keyboard mode on getAllNotes', () => {
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

    it('automatically re-evaluates outdated keys for songs like "Fiesta", "Al poderoso" and "Cómo hizo David" on getAllNotes', () => {
      // Simulate stored notes that previously had wrong key detections
      const storedNotes = [
        {
          id: 'song-1',
          title: 'Al poderoso',
          content: 'D D A A G A C# C# D E F E D',
          detectedKey: 'A Mayor', // previously wrong
          activeInstrument: 'keyboard',
          updatedAt: 1600000000000
        },
        {
          id: 'song-2',
          title: 'Cómo hizo David',
          content: 'A D D E D C A A E D',
          detectedKey: 'A Menor', // previously wrong
          activeInstrument: 'keyboard',
          updatedAt: 1600000000000
        },
        {
          id: 'song-3',
          title: 'Fuego',
          content: 'F# A B F#',
          detectedKey: 'D Mayor', // previously wrong
          activeInstrument: 'keyboard',
          updatedAt: 1600000000000
        }
      ];
      localStorageMock.setItem('trumpet_notes_data', JSON.stringify(storedNotes));

      const reevaluated = getAllNotes();
      expect(reevaluated.length).toBe(3);
      expect(reevaluated[0].detectedKey).toBe('D Menor');
      expect(reevaluated[1].detectedKey).toBe('D Menor');
      expect(reevaluated[2].detectedKey).toBe('F# Menor');

      // Verify that corrected keys were persisted back to storage
      const inStorage = JSON.parse(localStorageMock.getItem('trumpet_notes_data') || '[]');
      expect(inStorage[0].detectedKey).toBe('D Menor');
      expect(inStorage[1].detectedKey).toBe('D Menor');
      expect(inStorage[2].detectedKey).toBe('F# Menor');
    });

    it('purges empty notes with no content and empty title via sanitizeEmptyNotes', () => {
      const mixedNotes = [
        { id: 'valid-1', title: 'Canción 1', content: 'C D E', activeInstrument: 'keyboard', detectedKey: 'C', updatedAt: Date.now() },
        { id: 'empty-1', title: '', content: '', activeInstrument: 'keyboard', detectedKey: 'Indeterminada', updatedAt: Date.now() },
        { id: 'empty-2', title: 'Canción sin título', content: '   ', activeInstrument: 'keyboard', detectedKey: 'Indeterminada', updatedAt: Date.now() },
        { id: 'valid-2', title: 'Sólo acordes', content: 'Am G F E', activeInstrument: 'trumpet', detectedKey: 'Am', updatedAt: Date.now() }
      ];
      localStorageMock.setItem('trumpet_notes_data', JSON.stringify(mixedNotes));

      sanitizeEmptyNotes();

      const remaining = JSON.parse(localStorageMock.getItem('trumpet_notes_data') || '[]');
      expect(remaining.length).toBe(2);
      expect(remaining.map((r: any) => r.id)).toEqual(['valid-1', 'valid-2']);
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

  describe('Quick Note Insertion Formatting', () => {
    it('formats sequence E E E # E directly into E E E# E', () => {
      let content = '';
      const insertNatural = (note: string) => {
        const needsLeading = content.length > 0 && !/[\s\n]$/.test(content);
        content = `${content}${needsLeading ? ' ' : ''}${note} `;
      };
      const insertSharp = () => {
        const before = content.replace(/\s+$/, '');
        content = `${before}# `;
      };

      insertNatural('E');
      insertNatural('E');
      insertNatural('E');
      insertSharp();
      insertNatural('E');

      expect(content.trim()).toBe('E E E# E');
    });
  });
});
