import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { FirebaseManager } from './FirebaseManager.ts';

export interface TrumpetNote {
  id: string;
  title: string;
  subtitle?: string;
  category: 'exercises' | 'transcriptions' | 'fingering' | 'gigs';
  rawScoreText: string;
  transposedScoreText?: string;
  detectedKeyTrumpet: string;
  detectedKeyConcert: string;
  harmonicConfidence: number;
  initialValvesLabel?: string;
  valve1?: boolean;
  valve2?: boolean;
  valve3?: boolean;
  slideAdjustment?: string;
  muteType?: string;
  tempoBpm: number;
  meter: string;
  tempoDescription?: string;
  embouchureAdvice?: string;
  focusTip?: string;
  tuningTipTitle?: string;
  tuningTipBody?: string;
  tags: string[];
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const INITIAL_SEED_NOTES: TrumpetNote[] = [
  {
    id: 'note-arban-1',
    title: 'Arban Characteristic Study No. 1',
    subtitle: '12 mins ago',
    category: 'exercises',
    rawScoreText: 'C4 - E4 - G4 - C5 - B4 - A4 - G4 | D4 - F#4 - A4 - C5',
    transposedScoreText: 'Bb3 - D4 - F4 - Bb4 - A4 - G4 - F4 | C4 - E4 - G4 - Bb4',
    detectedKeyTrumpet: 'C Major',
    detectedKeyConcert: 'Bb Major',
    harmonicConfidence: 98,
    initialValvesLabel: '1-2',
    valve1: true,
    valve2: true,
    valve3: false,
    tempoBpm: 112,
    meter: '4/4',
    tempoDescription: 'Allegro Moderato',
    embouchureAdvice: 'Keep corners firm and center relaxed. Use double tonguing (Ta-Ka-Ta-Ka) cleanly on 16th note divisions.',
    focusTip: 'Clean articulation, harmonic color warmth',
    tags: ['Double Tonguing', 'Velocity', 'Arban'],
    pinned: true,
    createdAt: Date.now() - 12 * 60 * 1000,
    updatedAt: Date.now() - 12 * 60 * 1000,
  },
  {
    id: 'note-autumn-leaves',
    title: 'Autumn Leaves - Harmon Mute Solo Lick',
    subtitle: 'Miles Tone Study #4',
    category: 'transcriptions',
    rawScoreText: 'C4 D4 E4 G4 | A4 B4 C5 B4 A4 | G4 E4 D4 C4',
    transposedScoreText: 'Bb3 C4 D4 F4 | G4 A4 Bb4 A4 G4 | F4 D4 C4 Bb3',
    detectedKeyTrumpet: 'C Major',
    detectedKeyConcert: 'Bb Major',
    harmonicConfidence: 98,
    initialValvesLabel: '0',
    valve1: false,
    valve2: false,
    valve3: false,
    muteType: 'Harmon (Stem Out)',
    tempoBpm: 116,
    meter: '4/4',
    tempoDescription: 'Medium Swing • Allegretto',
    embouchureAdvice: 'Keep embouchure supple through the octave leap in measure 2. Avoid pressing the mouthpiece against the top lip; lean slightly on breath velocity instead.',
    focusTip: 'Clean articulation, harmonic color warmth',
    tuningTipTitle: 'Mute Tuning Tip',
    tuningTipBody: 'The Harmon mute pulls the pitch sharp on C#4 and D4. Pull out the 3rd valve slide by approximately 8mm.',
    tags: ['Harmon Mute (Stem Out)', 'Miles Davis', 'Jazz Lick'],
    pinned: false,
    createdAt: Date.now() - 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 24 * 60 * 60 * 1000,
  },
  {
    id: 'note-clarke-2',
    title: 'Clarke Technical Study #2 (Fingering focus)',
    subtitle: '3 days ago',
    category: 'fingering',
    rawScoreText: 'F4 G4 A4 Bb4 C5 Bb4 A4 G4 | F4 E4 D4 C4 D4 E4 F4',
    transposedScoreText: 'Eb4 F4 G4 Ab4 Bb4 Ab4 G4 F4 | Eb4 D4 C4 Bb3 C4 D4 Eb4',
    detectedKeyTrumpet: 'F Major',
    detectedKeyConcert: 'Eb Major',
    harmonicConfidence: 95,
    initialValvesLabel: '1-2-0',
    valve1: true,
    valve2: true,
    valve3: false,
    tempoBpm: 144,
    meter: '4/4',
    tempoDescription: 'Presto leggiero',
    embouchureAdvice: 'Keep fingers curved directly over valve buttons. Do not raise fingers higher than 1 cm off the caps.',
    focusTip: 'Finger independence, light piston action',
    tags: ['Smooth Slur', 'Clarke', 'Valve Agility'],
    pinned: false,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'note-lead-warmup',
    title: 'Lead Trumpet Warm-up & Pedal Tones',
    subtitle: 'May 18',
    category: 'exercises',
    rawScoreText: 'F#3 C4 G4 C5 | E5 G5 C6',
    transposedScoreText: 'E3 Bb3 F4 Bb4 | D5 F5 Bb5',
    detectedKeyTrumpet: 'C Major',
    detectedKeyConcert: 'Bb Major',
    harmonicConfidence: 92,
    initialValvesLabel: '1-2-3',
    valve1: true,
    valve2: true,
    valve3: true,
    muteType: 'Open Horn',
    tempoBpm: 80,
    meter: '4/4',
    tempoDescription: 'Lento espressivo',
    embouchureAdvice: 'Lead pipe buzzing first: 5 min relaxation before high register. Breathe deeply expanding the lower ribcage.',
    focusTip: 'Air stream support, lip aperture freedom',
    tags: ['Open Horn', 'Pedals & Lip Slurs', 'Air Stream'],
    pinned: false,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
  },
];

const LOCAL_STORAGE_KEY = 'trumpetnotes_local_notes_v1';

/**
 * NoteRepository manages note storage enforcing even path segments:
 * `users/{userId}/notes/{noteId}` (2 collection/doc pairs).
 * Seamless offline fallback with instant local caching ensures zero-latency editing.
 */
export class NoteRepository {
  private static localCache: Map<string, TrumpetNote> = new Map();
  private static initialized: boolean = false;

  private static ensureInitialized() {
    if (this.initialized) return;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: TrumpetNote[] = JSON.parse(stored);
        parsed.forEach(n => this.localCache.set(n.id, n));
      } else {
        INITIAL_SEED_NOTES.forEach(n => this.localCache.set(n.id, n));
        this.saveToStorage();
      }
    } catch {
      INITIAL_SEED_NOTES.forEach(n => this.localCache.set(n.id, n));
    }
    this.initialized = true;
  }

  private static saveToStorage() {
    try {
      const list = Array.from(this.localCache.values());
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Ignore quota error in restrictive mode
    }
  }

  /**
   * Helper that constructs and validates an EVEN segment path:
   * users/{userId}/notes/{noteId}
   */
  public static getNoteDocRef(userId: string, noteId: string) {
    if (!userId || !noteId) {
      throw new Error(`Invalid path parameters: userId='${userId}', noteId='${noteId}'. Must be even segments: users/{userId}/notes/{noteId}`);
    }
    const db = FirebaseManager.getInstance().getFirestore();
    // Path structure: users/{userId}/notes/{noteId} (4 elements = 2 pairs, even segments!)
    return doc(db, 'users', userId, 'notes', noteId);
  }

  public static async createNote(userId: string, partial: Partial<TrumpetNote>): Promise<TrumpetNote> {
    this.ensureInitialized();
    const id = partial.id || `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const now = Date.now();

    const newNote: TrumpetNote = {
      id,
      title: partial.title || 'Untitled Brass Note',
      subtitle: partial.subtitle || 'Just now',
      category: partial.category || 'exercises',
      rawScoreText: partial.rawScoreText || 'C4 D4 E4 G4',
      transposedScoreText: partial.transposedScoreText || 'Bb3 C4 D4 F4',
      detectedKeyTrumpet: partial.detectedKeyTrumpet || 'C Major',
      detectedKeyConcert: partial.detectedKeyConcert || 'Bb Major',
      harmonicConfidence: partial.harmonicConfidence || 95,
      initialValvesLabel: partial.initialValvesLabel || '0',
      valve1: partial.valve1 ?? false,
      valve2: partial.valve2 ?? false,
      valve3: partial.valve3 ?? false,
      slideAdjustment: partial.slideAdjustment,
      muteType: partial.muteType || 'Harmon (Stem Out)',
      tempoBpm: partial.tempoBpm || 116,
      meter: partial.meter || '4/4',
      tempoDescription: partial.tempoDescription || 'Medium Swing • Allegretto',
      embouchureAdvice: partial.embouchureAdvice || 'Maintain steady air velocity through the horn.',
      focusTip: partial.focusTip || 'Clean articulation, harmonic color warmth',
      tuningTipTitle: partial.tuningTipTitle,
      tuningTipBody: partial.tuningTipBody,
      tags: partial.tags || ['Trumpet'],
      pinned: partial.pinned ?? false,
      createdAt: now,
      updatedAt: now,
    };

    // Update local cache immediately
    this.localCache.set(id, newNote);
    this.saveToStorage();

    // Sync to Firestore with even path
    try {
      const docRef = this.getNoteDocRef(userId, id);
      await setDoc(docRef, newNote);
    } catch {
      // Offline fallback succeeds locally
    }

    return newNote;
  }

  public static async updateNote(userId: string, noteId: string, updates: Partial<TrumpetNote>): Promise<void> {
    this.ensureInitialized();
    const existing = this.localCache.get(noteId);
    if (existing) {
      const merged: TrumpetNote = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };
      this.localCache.set(noteId, merged);
      this.saveToStorage();
    }

    try {
      const docRef = this.getNoteDocRef(userId, noteId);
      await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    } catch {
      // Cache / offline fallback succeeds
    }
  }

  public static async getNote(userId: string, noteId: string): Promise<TrumpetNote | null> {
    this.ensureInitialized();
    // Try local cache first for zero latency
    if (this.localCache.has(noteId)) {
      return this.localCache.get(noteId)!;
    }

    try {
      const docRef = this.getNoteDocRef(userId, noteId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as TrumpetNote;
        this.localCache.set(noteId, data);
        this.saveToStorage();
        return data;
      }
    } catch {
      // Fallback
    }

    return null;
  }

  public static async deleteNote(userId: string, noteId: string): Promise<void> {
    this.ensureInitialized();
    this.localCache.delete(noteId);
    this.saveToStorage();

    try {
      const docRef = this.getNoteDocRef(userId, noteId);
      await deleteDoc(docRef);
    } catch {
      // Offline fallback
    }
  }

  /**
   * Streams user notes in real-time with Firestore listener and offline cache listener.
   */
  public static streamUserNotes(userId: string, callback: (notes: TrumpetNote[]) => void): () => void {
    this.ensureInitialized();

    // Immediately deliver cached notes for instant render
    const initialList = Array.from(this.localCache.values()).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
    callback(initialList);

    let unsubscribeFirestore = () => {};

    try {
      const db = FirebaseManager.getInstance().getFirestore();
      if (db && typeof db.type === 'string') {
        const notesCol = collection(db, 'users', userId, 'notes');
        unsubscribeFirestore = onSnapshot(
          notesCol,
          (snapshot) => {
            if (!snapshot.empty) {
              const remoteNotes: TrumpetNote[] = [];
              snapshot.forEach(docSnap => {
                const note = docSnap.data() as TrumpetNote;
                remoteNotes.push(note);
                this.localCache.set(note.id, note);
              });
              this.saveToStorage();

              remoteNotes.sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return b.updatedAt - a.updatedAt;
              });
              callback(remoteNotes);
            }
          },
          (_err) => {
            // Keep using local cached notes
          }
        );
      }
    } catch {
      // Firestore listener not active, continue with local cache
    }

    // Also listen to local window storage events for multi-tab sync!
    const storageHandler = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const updatedList: TrumpetNote[] = JSON.parse(e.newValue);
          this.localCache.clear();
          updatedList.forEach(n => this.localCache.set(n.id, n));
          callback(updatedList);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', storageHandler);

    return () => {
      unsubscribeFirestore();
      window.removeEventListener('storage', storageHandler);
    };
  }
}
