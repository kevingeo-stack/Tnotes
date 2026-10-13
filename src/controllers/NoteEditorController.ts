import { Note } from '../domain/music/Note.ts';
import { MusicalParser, ParsedToken } from '../domain/music/MusicalParser.ts';
import { KeyDetector, KeySignatureMatch } from '../domain/music/KeyDetector.ts';
import { TrumpetTransposer } from '../domain/music/TrumpetTransposer.ts';
import { NoteRepository, TrumpetNote } from '../services/firebase/NoteRepository.ts';

export type PitchPerspective = 'bb' | 'c' | 'dual';
export type NotationMode = 'english' | 'latin';

export interface NoteEditorState {
  currentNote: TrumpetNote;
  perspective: PitchPerspective;
  notationMode: NotationMode;
  extractedNotes: Note[];
  parsedTokens: ParsedToken[];
  transposedScore: string;
  trumpetKey: string;
  concertKey: string;
  confidence: number;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  selectedTokenIndex: number | null;
}

export type StateListener = (state: NoteEditorState) => void;

/**
 * Controller / ViewModel for Trumpet Manuscript Editor.
 * Encapsulates debounced typing, parsing, transposition, key detection,
 * undo/redo, and persistence via NoteRepository.
 */
export class NoteEditorController {
  private userId: string;
  private currentNote: TrumpetNote;
  private perspective: PitchPerspective = 'bb';
  private notationMode: NotationMode = 'english';
  private parser: MusicalParser;
  private transposer: TrumpetTransposer;

  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private isSaving: boolean = false;
  private selectedTokenIndex: number | null = null;
  private listeners: Set<StateListener> = new Set();

  constructor(userId: string, initialNote: TrumpetNote) {
    this.userId = userId;
    this.currentNote = { ...initialNote };
    this.parser = new MusicalParser();
    this.transposer = new TrumpetTransposer(this.parser);
    this.undoStack.push(initialNote.rawScoreText);
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }

  public getState(): NoteEditorState {
    const rawText = this.currentNote.rawScoreText;
    const tokens = this.parser.tokenize(rawText);
    const notes: Note[] = [];

    tokens.forEach(t => {
      if (t.type === 'note' && t.note) {
        notes.push(t.note);
      }
    });

    const keyMatch: KeySignatureMatch = KeyDetector.detectKey(notes);
    const transResult = this.transposer.trumpetToConcert(rawText, this.notationMode);

    return {
      currentNote: this.currentNote,
      perspective: this.perspective,
      notationMode: this.notationMode,
      extractedNotes: notes,
      parsedTokens: tokens,
      transposedScore: transResult.transposed,
      trumpetKey: keyMatch.name,
      concertKey: keyMatch.concertEquivalent,
      confidence: keyMatch.confidence,
      canUndo: this.undoStack.length > 1,
      canRedo: this.redoStack.length > 0,
      isSaving: this.isSaving,
      selectedTokenIndex: this.selectedTokenIndex,
    };
  }

  /**
   * Updates raw score text with debounce and automatic transposition / persistence
   */
  public handleScoreTextChange(newText: string, recordUndo: boolean = true): void {
    if (newText === this.currentNote.rawScoreText) return;

    if (recordUndo) {
      this.undoStack.push(newText);
      if (this.undoStack.length > 50) this.undoStack.shift();
      this.redoStack = []; // reset redo
    }

    const tokens = this.parser.tokenize(newText);
    const notes = tokens
      .filter((t): t is ParsedToken & { note: Note } => t.type === 'note' && t.note !== undefined)
      .map(t => t.note);

    const keyMatch = KeyDetector.detectKey(notes);
    const transResult = this.transposer.trumpetToConcert(newText, this.notationMode);

    // Initial valve preview from first note
    const firstNote = notes[0];
    const initialFingering = firstNote ? firstNote.getFingering() : null;

    this.currentNote = {
      ...this.currentNote,
      rawScoreText: newText,
      transposedScoreText: transResult.transposed,
      detectedKeyTrumpet: keyMatch.name,
      detectedKeyConcert: keyMatch.concertEquivalent,
      harmonicConfidence: keyMatch.confidence,
      initialValvesLabel: initialFingering ? initialFingering.label : this.currentNote.initialValvesLabel,
      valve1: initialFingering?.valve1 ?? this.currentNote.valve1,
      valve2: initialFingering?.valve2 ?? this.currentNote.valve2,
      valve3: initialFingering?.valve3 ?? this.currentNote.valve3,
      updatedAt: Date.now(),
    };

    this.notify();
    this.scheduleDebouncedSave();
  }

  public updateTitle(newTitle: string): void {
    this.currentNote = {
      ...this.currentNote,
      title: newTitle,
      updatedAt: Date.now(),
    };
    this.notify();
    this.scheduleDebouncedSave();
  }

  public updateMute(muteType: string): void {
    this.currentNote = {
      ...this.currentNote,
      muteType,
      updatedAt: Date.now(),
    };
    this.notify();
    this.scheduleDebouncedSave();
  }

  public updateTempo(tempoBpm: number): void {
    this.currentNote = {
      ...this.currentNote,
      tempoBpm,
      updatedAt: Date.now(),
    };
    this.notify();
    this.scheduleDebouncedSave();
  }

  public setPerspective(perspective: PitchPerspective): void {
    this.perspective = perspective;
    this.notify();
  }

  public toggleNotationMode(): void {
    this.notationMode = this.notationMode === 'english' ? 'latin' : 'english';
    this.notify();
  }

  public setSelectedTokenIndex(idx: number | null): void {
    this.selectedTokenIndex = idx;
    this.notify();
  }

  public undo(): void {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    this.handleScoreTextChange(prev, false);
  }

  public redo(): void {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    this.handleScoreTextChange(next, false);
  }

  /**
   * Mobile toolbar token insertions
   */
  public insertToken(tokenStr: string): void {
    const current = this.currentNote.rawScoreText;
    const updated = current ? `${current.trimEnd()} ${tokenStr}` : tokenStr;
    this.handleScoreTextChange(updated);
  }

  public shiftOctave(semitoneDelta: number): void {
    // Transpose all notes up/down by 1 octave (12 semitones) or requested delta
    const shift = semitoneDelta * 12;
    const tokens = this.parser.tokenize(this.currentNote.rawScoreText);
    const updatedParts = tokens.map(t => {
      if (t.type === 'note' && t.note) {
        const transposed = t.note.transpose(shift);
        return transposed.format(this.notationMode, true);
      }
      return t.raw;
    });
    this.handleScoreTextChange(updatedParts.join(''));
  }

  private scheduleDebouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.isSaving = true;
    this.notify();

    this.saveTimeout = setTimeout(async () => {
      try {
        await NoteRepository.updateNote(this.userId, this.currentNote.id, this.currentNote);
      } catch {
        // Handled via local offline cache
      } finally {
        this.isSaving = false;
        this.notify();
      }
    }, 350);
  }
}
