import React, { useState } from 'react';
import { TrumpetNote } from '../services/firebase/NoteRepository.ts';
import { TrumpetAudioEngine } from '../services/audio/TrumpetAudioEngine.ts';

interface NotesFeedViewProps {
  notes: TrumpetNote[];
  onSelectNote: (note: TrumpetNote) => void;
  onNewNote: () => void;
  onShowToast: (msg: string) => void;
}

export const NotesFeedView: React.FC<NotesFeedViewProps> = ({
  notes,
  onSelectNote,
  onNewNote,
  onShowToast,
}) => {
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedBpm, setFeedBpm] = useState<number>(120);
  const [isPlayingPitch, setIsPlayingPitch] = useState<boolean>(false);

  const audioEngine = TrumpetAudioEngine.getInstance();

  const handleToggleRefTone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const active = audioEngine.toggleDrone(440);
    setIsPlayingPitch(active);
    onShowToast(active ? 'Playing A=440 Hz reference tone' : 'Reference tone silenced');
  };

  const handleAdjustBpm = (delta: number) => {
    setFeedBpm((prev) => {
      const next = Math.max(40, Math.min(260, prev + delta));
      return next;
    });
  };

  const filteredNotes = notes.filter((note) => {
    const matchesFilter = currentFilter === 'all' || note.category === currentFilter;
    const term = searchQuery.toLowerCase().trim();
    if (!term) return matchesFilter;

    const inTitle = note.title.toLowerCase().includes(term);
    const inScore = note.rawScoreText.toLowerCase().includes(term);
    const inTags = note.tags.some((t) => t.toLowerCase().includes(term));
    const inKey =
      note.detectedKeyTrumpet.toLowerCase().includes(term) ||
      note.detectedKeyConcert.toLowerCase().includes(term);

    return matchesFilter && (inTitle || inScore || inTags || inKey);
  });

  return (
    <div className="flex flex-col w-full pb-28 max-w-2xl mx-auto">
      {/* Interactive Quick Tools Bar (Tuner/Metronome Quick Strip) */}
      <section className="px-4 pt-2 pb-1.5 flex items-center justify-between gap-3">
        {/* Metronome Quick Dial */}
        <div className="flex-1 bg-surface-container rounded-xl p-3 flex items-center justify-between shadow-xs border border-[#e8ded3]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">pace</span>
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">Tempo</span>
              <span className="font-label-md text-xs sm:text-sm text-on-surface font-semibold">
                {feedBpm} BPM
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleAdjustBpm(-2)}
              aria-label="Decrease BPM"
              className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
            <button
              onClick={() => handleAdjustBpm(2)}
              aria-label="Increase BPM"
              className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-on-surface hover:bg-surface-bright transition-colors active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        </div>

        {/* Reference Pitch Quick Tone */}
        <div className="flex-1 bg-surface-container rounded-xl p-3 flex items-center justify-between shadow-xs border border-[#e8ded3]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">graphic_eq</span>
            <div className="flex flex-col">
              <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">Ref Pitch</span>
              <span className="font-label-md text-xs sm:text-sm text-on-surface font-semibold">
                A=440 Hz
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleRefTone}
            aria-label="Play Reference Pitch"
            className={`w-8 h-8 rounded-lg flex items-center justify-center active:scale-95 transition-all shadow-xs ${
              isPlayingPitch
                ? 'bg-primary text-on-primary ring-2 ring-primary-container'
                : 'bg-primary-container text-on-primary-fixed'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isPlayingPitch ? 'volume_up' : 'volume_mute'}
            </span>
          </button>
        </div>
      </section>

      {/* Search Input Area */}
      <section className="px-4 pt-1 pb-2">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search riffs, lead sheets, warmups..."
            className="w-full bg-surface-container-lowest text-on-surface font-body-md text-sm pl-10 pr-10 py-2.5 rounded-xl shadow-xs border border-[#e8ded3] focus:outline-none focus:ring-2 focus:ring-primary-container/40 transition-all placeholder:text-outline"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface p-1"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>
      </section>

      {/* Filter Carousel / Chips */}
      <section className="w-full overflow-x-auto no-scrollbar px-4 py-1 flex items-center gap-2">
        <button
          onClick={() => setCurrentFilter('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-xs shadow-xs transition-all whitespace-nowrap ${
            currentFilter === 'all'
              ? 'bg-primary-container text-on-primary-container font-semibold'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">library_music</span>
          <span>All Notes</span>
          <span className="text-[10px] bg-primary/20 px-1 rounded-full font-label-sm">
            {notes.length}
          </span>
        </button>

        <button
          onClick={() => setCurrentFilter('exercises')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-xs transition-all whitespace-nowrap ${
            currentFilter === 'exercises'
              ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span>Trumpet Exercises</span>
        </button>

        <button
          onClick={() => setCurrentFilter('transcriptions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-xs transition-all whitespace-nowrap ${
            currentFilter === 'transcriptions'
              ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span>Transcriptions</span>
        </button>

        <button
          onClick={() => setCurrentFilter('fingering')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-xs transition-all whitespace-nowrap ${
            currentFilter === 'fingering'
              ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span>Fingering Notes</span>
        </button>

        <button
          onClick={() => setCurrentFilter('gigs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label-md text-xs transition-all whitespace-nowrap ${
            currentFilter === 'gigs'
              ? 'bg-primary-container text-on-primary-container font-semibold shadow-xs'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          <span>Gigs & Sets</span>
        </button>
      </section>

      {/* Card Feed / Notes Grid */}
      <section className="px-4 pt-2 flex flex-col gap-3.5">
        {filteredNotes.map((note) => {
          return (
            <article
              key={note.id}
              onClick={() => onSelectNote(note)}
              className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-[#e8ded3] relative overflow-hidden transition-all duration-180 hover:shadow-md cursor-pointer active:scale-99"
            >
              {/* Manuscript Top Banner */}
              <div className="flex items-center justify-between pb-1.5">
                {note.pinned ? (
                  <div className="flex items-center gap-1.5 text-primary">
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      push_pin
                    </span>
                    <span className="font-label-sm text-[11px] font-bold tracking-wider uppercase text-primary">
                      Pinned Daily Routine
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">
                      {note.category === 'transcriptions'
                        ? 'mic'
                        : note.category === 'fingering'
                        ? 'touch_app'
                        : 'air'}
                    </span>
                    <span className="font-label-sm text-[11px] font-medium capitalize">
                      {note.category === 'transcriptions'
                        ? 'Jazz Transcription'
                        : note.category === 'fingering'
                        ? 'Valve Agility'
                        : 'Embouchure Conditioning'}
                    </span>
                  </div>
                )}
                <span className="font-label-sm text-xs text-outline">{note.subtitle || 'Recently'}</span>
              </div>

              {/* Title */}
              <h2 className="font-headline-sm text-base sm:text-lg text-on-surface font-semibold mt-0.5 mb-1.5 leading-snug">
                {note.title}
              </h2>

              {/* Musical Phrase Box */}
              <div className="bg-surface-container-low rounded-lg p-2.5 mb-2.5 border border-[#e8ded3]">
                {note.id === 'note-autumn-leaves' ? (
                  <>
                    <div className="text-on-surface font-label-md text-xs sm:text-sm font-semibold tracking-wide py-0.5">
                      [Bridge] Dm7b5 → G7alt → Cm7 → F7
                    </div>
                    <div className="mt-1.5 pt-1.5 flex items-start gap-1.5 border-t border-[#e8ded3]/50">
                      <span className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5">
                        swap_horiz
                      </span>
                      <p className="font-body-sm text-xs text-on-surface-variant leading-tight">
                        Original concert: <strong className="text-on-surface font-semibold">G minor</strong>. Trumpet transpose:{' '}
                        <strong className="text-on-surface font-semibold">A minor (+2 semitones)</strong>
                      </p>
                    </div>
                  </>
                ) : note.id === 'note-clarke-2' ? (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label-sm text-[11px] text-on-surface-variant">Valve Finger Pattern</span>
                      <span className="font-label-sm text-[11px] text-on-surface-variant">Target: 144 BPM</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      <div className="px-2 py-0.5 bg-surface-container rounded font-label-md text-xs font-bold text-on-surface">1-2-0</div>
                      <span className="text-outline text-xs">→</span>
                      <div className="px-2 py-0.5 bg-surface-container rounded font-label-md text-xs font-bold text-on-surface">1-0-1</div>
                      <span className="text-outline text-xs">→</span>
                      <div className="px-2 py-0.5 bg-surface-container rounded font-label-md text-xs font-bold text-on-surface">2-0-2</div>
                      <span className="text-outline text-xs">→</span>
                      <div className="px-2 py-0.5 bg-primary-fixed rounded font-label-md text-xs font-bold text-on-primary-fixed">0 (Open)</div>
                    </div>
                  </>
                ) : note.id === 'note-lead-warmup' ? (
                  <>
                    <p className="font-label-md text-xs sm:text-sm text-on-surface font-semibold tracking-wide">
                      Low F#3 → C4 → G4 → C5
                    </p>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-1.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[15px]">tips_and_updates</span>
                      <span>Lead pipe buzzing first: 5 min relaxation before high register.</span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label-sm text-[11px] text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">save_as</span> Stave Phrase
                      </span>
                      <span className="font-label-sm text-xs text-primary font-semibold">d=112</span>
                    </div>
                    <p className="font-label-md text-xs sm:text-sm text-on-surface font-semibold tracking-tight leading-relaxed overflow-x-auto whitespace-nowrap py-0.5">
                      {note.rawScoreText}
                    </p>
                  </>
                )}
              </div>

              {/* Initial Valve Indicator Row (if available) */}
              {note.initialValvesLabel && note.id === 'note-arban-1' && (
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="font-label-sm text-xs text-outline mr-0.5">Initial Valves:</span>
                  <div className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded-md">
                    <span className="w-4 h-4 rounded-full bg-surface text-outline font-label-sm text-[10px] flex items-center justify-center font-bold">0</span>
                    <span className="w-4 h-4 rounded-full bg-primary-container text-on-primary font-label-sm text-[10px] flex items-center justify-center font-bold">1</span>
                    <span className="w-4 h-4 rounded-full bg-primary-container text-on-primary font-label-sm text-[10px] flex items-center justify-center font-bold">2</span>
                    <span className="font-label-sm text-xs text-on-surface-variant ml-1 font-medium">(E4 = 1-2)</span>
                  </div>
                </div>
              )}

              {/* Transposition / Key Pill Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-[11px] font-semibold">
                  {note.detectedKeyTrumpet} [Tpt]
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[11px]">
                  {note.detectedKeyConcert} [Concert]
                </span>
                {note.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[11px]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-3 text-primary">
              <span className="material-symbols-outlined text-[32px]">music_off</span>
            </div>
            <h3 className="font-headline-sm text-base text-on-surface mb-1">No notes match your search</h3>
            <p className="font-body-sm text-xs text-on-surface-variant max-w-xs mb-4">
              Try searching for a different key, study name, or clear the active filter.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCurrentFilter('all');
              }}
              className="px-4 py-2 bg-primary-container text-on-primary font-label-sm text-xs rounded-lg active:scale-95 transition-all font-semibold"
            >
              Reset Search & Filters
            </button>
          </div>
        )}
      </section>

      {/* Floating Action Button (FAB) for New Note */}
      <div className="fixed right-5 bottom-20 z-40">
        <button
          onClick={onNewNote}
          aria-label="Create New Note"
          className="flex items-center gap-2 h-14 px-5 rounded-full bg-primary-container text-on-primary-fixed shadow-[0_4px_16px_rgba(119,90,25,0.28)] hover:scale-105 active:scale-95 transition-all duration-200 border border-[#e9c176]/50"
        >
          <span className="material-symbols-outlined text-[24px]">edit_note</span>
          <span className="font-headline-sm text-sm font-semibold pr-1">New Note</span>
        </button>
      </div>
    </div>
  );
};
