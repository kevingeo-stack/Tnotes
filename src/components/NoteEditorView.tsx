import React, { useState, useEffect, useRef } from 'react';
import { NoteEditorController, NoteEditorState, PitchPerspective } from '../controllers/NoteEditorController.ts';
import { TrumpetNote } from '../services/firebase/NoteRepository.ts';
import { ValveNode } from './ValveNode.tsx';
import { MetronomeDroneWidget } from './MetronomeDroneWidget.tsx';
import { Note } from '../domain/music/Note.ts';

interface NoteEditorViewProps {
  note: TrumpetNote;
  userId: string;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

export const NoteEditorView: React.FC<NoteEditorViewProps> = ({
  note,
  userId,
  onShowToast,
}) => {
  const controllerRef = useRef<NoteEditorController | null>(null);
  if (!controllerRef.current || controllerRef.current.getState().currentNote.id !== note.id) {
    controllerRef.current = new NoteEditorController(userId, note);
  }
  const controller = controllerRef.current;

  const [state, setState] = useState<NoteEditorState>(controller.getState());
  const [activeTokenIdx, setActiveTokenIdx] = useState<number>(4); // default active index (A4)
  const [isEditingRaw, setIsEditingRaw] = useState<boolean>(false);
  const [showKeyPicker, setShowKeyPicker] = useState<boolean>(false);
  const [showMutePicker, setShowMutePicker] = useState<boolean>(false);

  useEffect(() => {
    const unsub = controller.subscribe((newState) => {
      setState(newState);
    });
    return unsub;
  }, [controller]);

  // Extract note tokens for the stave flow
  const noteTokens = state.parsedTokens.filter((t) => t.type === 'note' && t.note);

  const handleCopy = () => {
    const textToCopy =
      state.perspective === 'c'
        ? state.transposedScore
        : state.currentNote.rawScoreText;
    navigator.clipboard.writeText(textToCopy);
    onShowToast('Notes copied to clipboard');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: state.currentNote.title,
        text: `Trumpet Notes: ${state.currentNote.title}\n${state.currentNote.rawScoreText}\nKey: ${state.trumpetKey} (Concert: ${state.concertKey})`,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(
        `${state.currentNote.title} - ${state.currentNote.rawScoreText}`
      );
      onShowToast('Share link copied to clipboard');
    }
  };

  const handleKeySelect = (keyName: string) => {
    // When manually changing key signature
    onShowToast(`Key signature adjusted to ${keyName}`);
    setShowKeyPicker(false);
  };

  const handleMuteSelect = (mute: string) => {
    controller.updateMute(mute);
    setShowMutePicker(false);
    onShowToast(`Mute profile: ${mute}`);
  };

  return (
    <div className="flex flex-col w-full pb-32 max-w-3xl mx-auto">
      {/* Top Auxiliary Control Strip (Undo, Redo, Share & Mute Chip) */}
      <section className="px-4 pt-2 pb-1.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {/* Action history & Export */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                controller.undo();
                onShowToast('Undo');
              }}
              disabled={!state.canUndo}
              aria-label="Undo edit"
              className={`w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container transition-colors shadow-xs active:scale-95 ${
                state.canUndo ? 'text-on-surface hover:bg-surface-container-high' : 'text-on-surface-variant/40 opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">undo</span>
            </button>
            <button
              onClick={() => {
                controller.redo();
                onShowToast('Redo');
              }}
              disabled={!state.canRedo}
              aria-label="Redo edit"
              className={`w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container transition-colors shadow-xs active:scale-95 ${
                state.canRedo ? 'text-on-surface hover:bg-surface-container-high' : 'text-on-surface-variant/40 opacity-60'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">redo</span>
            </button>
            <div className="h-5 w-px bg-surface-variant mx-1" />
            <button
              onClick={handleShare}
              aria-label="Share score note"
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors shadow-xs active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px]">ios_share</span>
            </button>
            {state.isSaving && (
              <span className="font-label-sm text-[11px] text-tertiary animate-pulse ml-1">
                Saving...
              </span>
            )}
          </div>

          {/* Quick Stamp / Mute Mode Chip */}
          <div className="relative">
            <button
              onClick={() => setShowMutePicker(!showMutePicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs shadow-xs hover:bg-[#dfd5c8] transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-tertiary">mic_external_on</span>
              <span className="font-medium">{state.currentNote.muteType || 'Harmon (Stem Out)'}</span>
            </button>

            {showMutePicker && (
              <div className="absolute right-0 top-10 z-50 w-52 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant p-1.5">
                {['Harmon (Stem Out)', 'Harmon (Stem In)', 'Cup Mute', 'Straight Mute', 'Plunger', 'Open Horn'].map((m) => (
                  <button
                    key={m}
                    onClick={() => handleMuteSelect(m)}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg font-body-md transition-colors ${
                      state.currentNote.muteType === m ? 'bg-primary-container text-on-primary font-bold' : 'hover:bg-surface-container text-on-surface'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transposition Perspective Segmented Control */}
        <div className="w-full p-1 bg-surface-container-high rounded-xl flex items-center shadow-inner border border-[#d1c5b4]/40">
          <button
            onClick={() => controller.setPerspective('bb')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${
              state.perspective === 'bb'
                ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {state.perspective === 'bb' && <span className="w-2 h-2 rounded-full bg-surface-bright" />}
            <span>Trumpet</span>
          </button>
          <button
            onClick={() => controller.setPerspective('c')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${
              state.perspective === 'c'
                ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {state.perspective === 'c' && <span className="w-2 h-2 rounded-full bg-surface-bright" />}
            <span>Concert (C)</span>
          </button>
          <button
            onClick={() => controller.setPerspective('dual')}
            className={`flex-1 py-1.5 px-2 rounded-lg font-label-md text-xs transition-all flex items-center justify-center gap-1.5 ${
              state.perspective === 'dual'
                ? 'bg-primary-container text-on-primary font-semibold shadow-xs'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {state.perspective === 'dual' && <span className="w-2 h-2 rounded-full bg-surface-bright" />}
            <span>Dual View</span>
          </button>
        </div>
      </section>

      {/* Dynamic Harmonic Key Detection Pill */}
      <section className="px-4 py-1.5 sticky top-16 z-30 backdrop-blur-md">
        <div className="w-full bg-surface-container-lowest/95 rounded-xl px-3.5 py-2 flex items-center justify-between shadow-xs border border-outline-variant/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary" />
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-headline-sm text-sm text-on-surface font-semibold truncate">
                  Key: {state.trumpetKey}
                </span>
                <span className="font-label-sm text-xs text-on-surface-variant truncate">
                  (Concert: {state.concertKey})
                </span>
              </div>
              <span className="font-label-sm text-[11px] text-tertiary font-medium">
                {state.confidence}% Harmonic Confidence
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowKeyPicker(true)}
            className="px-2.5 py-1 rounded-md bg-surface-container font-label-sm text-xs text-primary hover:bg-primary-container hover:text-on-primary transition-colors flex-shrink-0 font-medium"
          >
            Change
          </button>
        </div>

        {showKeyPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-xs rounded-2xl bg-surface-container-lowest p-4 shadow-xl border border-outline-variant">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-headline-sm text-base text-on-surface">Select Tonic Key</h3>
                <button onClick={() => setShowKeyPicker(false)} className="text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto p-1">
                {['C Major', 'G Major', 'D Major', 'A Major', 'E Major', 'F Major', 'A# Major', 'D# Major', 'G# Major', 'A Minor', 'E Minor', 'D Minor', 'G Minor', 'C Minor'].map((k) => (
                  <button
                    key={k}
                    onClick={() => handleKeySelect(k)}
                    className="p-2 text-xs font-label-md rounded-lg bg-surface-container hover:bg-primary-container hover:text-on-primary text-on-surface transition-colors text-center"
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Title Input (Editorial Manuscript Look) */}
      <section className="px-4 pt-3 pb-1">
        <input
          type="text"
          value={state.currentNote.title}
          onChange={(e) => controller.updateTitle(e.target.value)}
          placeholder="Untitled Etude or Solo..."
          className="w-full bg-transparent font-headline-xl-mobile text-2xl text-on-surface font-bold tracking-tight focus:outline-none placeholder:text-on-surface-variant/40"
        />
        <div className="flex items-center gap-3 mt-1.5 text-on-surface-variant font-label-sm text-xs">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">edit_calendar</span>
            {state.currentNote.subtitle || 'Today, 10:42 AM'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">graphic_eq</span>
            Miles Tone Study #4
          </span>
        </div>
      </section>

      {/* Metronome & Acoustic Reference Widget */}
      <section className="px-4 py-2">
        <MetronomeDroneWidget
          initialBpm={state.currentNote.tempoBpm || 116}
          meter={state.currentNote.meter || '4/4'}
          tempoDescription={state.currentNote.tempoDescription || 'Medium Swing • Allegretto'}
          onBpmChange={(newBpm) => controller.updateTempo(newBpm)}
        />
      </section>

      {/* Interactive Manuscript Writing Canvas */}
      <section className="px-4 py-2 flex flex-col gap-4">
        {/* Visual Stave Divider Card */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-outline-variant/70 flex flex-col gap-3 relative overflow-hidden">
          {/* Section Marker Tag */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-xs font-semibold tracking-wider">
                SECTION A
              </span>
              <span className="font-label-md text-xs text-on-surface-variant font-medium">
                Bars 1–4 • Lead Motif
              </span>
            </div>
            <button
              onClick={() => setIsEditingRaw(!isEditingRaw)}
              className="text-on-surface-variant hover:text-primary transition-colors p-1"
              title="Edit Note Text Directly"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isEditingRaw ? 'check' : 'edit'}
              </span>
            </button>
          </div>

          {/* Manuscript Notes Flow with Interactive Valve Nodes */}
          <div className="bg-surface-container-low rounded-lg p-3 flex flex-col gap-3 shadow-inner border border-[#e8ded3]">
            {/* View Mode Indicator Badge */}
            <div className="flex items-center justify-between text-xs font-label-sm text-on-surface-variant">
              <span>
                {state.perspective === 'bb'
                  ? 'Written Trumpet Pitch'
                  : state.perspective === 'c'
                  ? 'Sounding Concert Pitch (-2 ST)'
                  : 'Dual View (Written ➔ Sounding)'}
              </span>
              <span className="text-[11px] text-tertiary">Tap any note to play tone</span>
            </div>

            {/* Note Nodes Horizontal Flow */}
            <div className="flex items-center overflow-x-auto pb-1 gap-2 no-scrollbar">
              {noteTokens.map((token, idx) => {
                const noteObj = token.note!;
                // In concert mode transpose -2, in Bb mode original
                const displayNote = state.perspective === 'c' ? noteObj.transpose(-2) : noteObj;
                const noteLabel = displayNote.format(state.notationMode, true);
                const fingering = displayNote.getFingering();
                const freq = displayNote.getFrequency();
                const isSelected = activeTokenIdx === idx;

                return (
                  <React.Fragment key={idx}>
                    {idx === 4 && (
                      <div className="flex flex-col items-center justify-center px-1">
                        <div className="h-10 w-0.5 bg-outline-variant" />
                      </div>
                    )}
                    <ValveNode
                      noteName={noteLabel}
                      fingering={fingering}
                      isActive={isSelected}
                      frequency={freq}
                      onClick={() => setActiveTokenIdx(idx)}
                    />
                  </React.Fragment>
                );
              })}
            </div>

            {/* Editable or Display Raw Text Pitch Row in JetBrains Mono */}
            {isEditingRaw ? (
              <div className="flex flex-col gap-1">
                <textarea
                  value={state.currentNote.rawScoreText}
                  onChange={(e) => controller.handleScoreTextChange(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-container-lowest rounded p-2.5 font-label-md text-xs text-on-surface border border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container"
                  placeholder="e.g. C4 D4 E4 G4 | A4 B4 C5 B4 A4"
                />
                <span className="font-label-sm text-[10px] text-on-surface-variant">
                  Supports C, D, E or Do, Re, Mi notations. Barlines (|) supported.
                </span>
              </div>
            ) : (
              <div className="w-full bg-surface-container-lowest/90 rounded p-2.5 font-label-md text-xs text-on-surface flex items-center justify-between border border-[#e8ded3]">
                <span className="text-on-surface tracking-wide select-all font-semibold overflow-x-auto whitespace-nowrap mr-2">
                  {state.perspective === 'c'
                    ? state.transposedScore
                    : state.currentNote.rawScoreText}
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface font-label-sm text-xs transition-colors flex-shrink-0 active:scale-95"
                >
                  Copy
                </button>
              </div>
            )}
          </div>

          {/* Embouchure & Articulation Guidance Note */}
          <div className="flex items-start gap-2.5 pt-1">
            <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 flex-shrink-0">
              tips_and_updates
            </span>
            <div className="flex flex-col">
              <p className="font-body-md text-xs sm:text-sm text-on-surface leading-relaxed">
                {state.currentNote.embouchureAdvice ||
                  'Keep embouchure supple through the octave leap in measure 2. Avoid pressing the mouthpiece against the top lip; lean slightly on breath velocity instead.'}
              </p>
              <span className="font-label-sm text-[11px] text-tertiary mt-1 font-semibold">
                Focus: {state.currentNote.focusTip || 'Clean articulation, harmonic color warmth'}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Practice Context Card with image */}
        <div className="bg-surface-container rounded-xl p-3.5 flex items-center gap-3 shadow-xs border border-[#e8ded3]">
          <img
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 shadow-xs border border-outline-variant/40"
            alt="Vintage brass trumpet resting on sheet music with harmon mute"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuClbPBnshhZsXsE6j7O3zzuRjKXdwmVwK72URkFuH-60qlsNUo8PONwQWeuhd4LJVlYxLgWoF6TlLhLjPZSZkkmr1cR6dOjqXOci1nDWXkvTKhm7CKjypKU3co8XJAATam64Oya4vkk8ZLa1pqRsDWwF072itMPuMKcYAxpdnCxXgwIgLKvXwFopjzXosJj5CijpO7Yfw2htkFsnSgSTs3QxmlEOVwBD2GwCrsJ8f9DvEnd5OPJeH3vuw"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-sm text-on-surface font-semibold truncate">
              {state.currentNote.tuningTipTitle || 'Mute Tuning Tip'}
            </span>
            <span className="font-body-sm text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
              {state.currentNote.tuningTipBody ||
                'The Harmon mute pulls the pitch sharp on C#4 and D4. Pull out the 3rd valve slide by approximately 8mm.'}
            </span>
          </div>
        </div>
      </section>

      {/* Transposition Preview Comparative Drawer / Split Panel */}
      <section className="px-4 pt-1 pb-4">
        <div className="w-full bg-surface-container-high rounded-xl p-4 shadow-xs border border-[#d1c5b4]/50 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">sync_alt</span>
              <span className="font-headline-sm text-sm font-semibold text-on-surface">
                Transposition Matrix
              </span>
            </div>
            <span className="font-label-sm text-[11px] px-2 py-0.5 rounded bg-surface-container-lowest text-on-surface-variant font-medium">
              Trumpet ➔ Concert (-2 ST)
            </span>
          </div>

          {/* Comparative Dual Stave Pitch Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Trumpet (Written) */}
            <div className="bg-surface-container-lowest p-3 rounded-lg flex flex-col gap-1.5 shadow-xs border border-[#e8ded3]">
              <span className="font-label-sm text-[10px] text-on-surface-variant font-bold tracking-wider">
                WRITTEN (TRUMPET)
              </span>
              <div className="font-label-md text-xs text-on-surface flex flex-wrap gap-1">
                {noteTokens.slice(0, 5).map((t, idx) => (
                  <span
                    key={idx}
                    className={`px-1.5 py-0.5 rounded ${
                      idx === 4
                        ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                        : 'bg-surface-container'
                    }`}
                  >
                    {t.note!.format(state.notationMode, true)}
                  </span>
                ))}
              </div>
              <span className="font-label-sm text-[11px] text-tertiary font-medium">
                Key of {state.trumpetKey}
              </span>
            </div>

            {/* Concert Pitch (Sounding) */}
            <div className="bg-surface-container-lowest p-3 rounded-lg flex flex-col gap-1.5 shadow-xs border border-[#e8ded3]">
              <span className="font-label-sm text-[10px] text-on-surface-variant font-bold tracking-wider">
                SOUNDING (CONCERT C)
              </span>
              <div className="font-label-md text-xs text-on-surface flex flex-wrap gap-1">
                {noteTokens.slice(0, 5).map((t, idx) => {
                  const soundingNote = t.note!.transpose(-2);
                  return (
                    <span
                      key={idx}
                      className={`px-1.5 py-0.5 rounded ${
                        idx === 4
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed font-bold'
                          : 'bg-secondary-container text-on-secondary-container'
                      }`}
                    >
                      {soundingNote.format(state.notationMode, true)}
                    </span>
                  );
                })}
              </div>
              <span className="font-label-sm text-[11px] text-tertiary font-medium">
                Key of {state.concertKey}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Bottom Musical Utility Quick-Bar */}
      <aside className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-lg px-3 py-2 border-t border-[#e8ded3] shadow-[0_-4px_16px_rgba(43,38,31,0.08)] flex flex-col gap-1.5 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1 no-scrollbar">
          {/* Accidentals Group */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg">
            <button
              onClick={() => {
                controller.insertToken('♯');
                onShowToast('Inserted ♯');
              }}
              className="w-8 h-8 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center justify-center font-bold text-base transition-colors shadow-xs active:scale-90"
              title="Sharp"
            >
              ♯
            </button>
            <button
              onClick={() => {
                controller.insertToken('♮');
                onShowToast('Inserted ♮');
              }}
              className="w-8 h-8 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center justify-center font-bold text-base transition-colors shadow-xs active:scale-90"
              title="Natural"
            >
              ♮
            </button>
          </div>

          {/* Octave Shifters */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg">
            <button
              onClick={() => {
                controller.shiftOctave(1);
                onShowToast('Shifted +8va');
              }}
              className="px-2 h-8 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center justify-center font-label-sm text-xs font-semibold transition-colors shadow-xs active:scale-90"
              title="Octave Up"
            >
              8va ↑
            </button>
            <button
              onClick={() => {
                controller.shiftOctave(-1);
                onShowToast('Shifted -8vb');
              }}
              className="px-2 h-8 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center justify-center font-label-sm text-xs font-semibold transition-colors shadow-xs active:scale-90"
              title="Octave Down"
            >
              8vb ↓
            </button>
          </div>

          {/* Solfège / Nomenclature Toggle */}
          <div className="flex items-center bg-surface-container p-1 rounded-lg">
            <button
              onClick={() => {
                controller.toggleNotationMode();
                onShowToast(`Switched to ${state.notationMode === 'english' ? 'Latin Solfège (Do-Re-Mi)' : 'English (C-D-E)'}`);
              }}
              className="px-2.5 h-8 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center gap-1 font-label-sm text-xs font-medium transition-colors shadow-xs active:scale-90"
            >
              <span className="material-symbols-outlined text-[15px] text-tertiary">swap_horiz</span>
              <span>{state.notationMode === 'english' ? 'CDE ⇄ Solfège' : 'Do-Re-Mi Active'}</span>
            </button>
          </div>

          {/* Rhythms & Rests */}
          <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg">
            <button
              onClick={() => {
                controller.insertToken('𝅘𝅥');
                onShowToast('Quarter Note 𝅘𝅥');
              }}
              className="w-8 h-8 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center justify-center text-lg transition-colors shadow-xs active:scale-90"
              title="Quarter Note"
            >
              𝅘𝅥
            </button>
            <button
              onClick={() => {
                controller.insertToken('𝅘𝅥𝅮');
                onShowToast('Eighth Note 𝅘𝅥𝅮');
              }}
              className="w-8 h-8 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center justify-center text-lg transition-colors shadow-xs active:scale-90"
              title="Eighth Note"
            >
              𝅘𝅥𝅮
            </button>
            <button
              onClick={() => {
                controller.insertToken('𝄽');
                onShowToast('Quarter Rest 𝄽');
              }}
              className="w-8 h-8 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-on-surface flex items-center justify-center text-lg transition-colors shadow-xs active:scale-90"
              title="Quarter Rest"
            >
              𝄽
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
