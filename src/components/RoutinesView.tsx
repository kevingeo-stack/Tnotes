import React from 'react';
import { TrumpetNote } from '../services/firebase/NoteRepository.ts';

interface RoutinesViewProps {
  onLoadRoutine: (routine: Partial<TrumpetNote>) => void;
  onShowToast: (msg: string) => void;
}

export const RoutinesView: React.FC<RoutinesViewProps> = ({ onLoadRoutine, onShowToast }) => {
  const routinePacks = [
    {
      id: 'routine-stamp',
      title: 'James Stamp Warm-Up & Pedal Tones',
      author: 'James Stamp',
      level: 'All Levels',
      duration: '15 min',
      notes: 'C4 G3 C4 E4 G4 | C3 (Pedal) C4',
      description: 'The definitive brass foundation routine. Emphasizes maintaining oral cavity shape and lip buzz into the pedal register without changing embouchure setting.',
      tag: 'Embouchure Conditioning',
      bpm: 80,
    },
    {
      id: 'routine-clarke-1',
      title: 'Herbert L. Clarke First Study (No. 1)',
      author: 'H.L. Clarke',
      level: 'Intermediate - Advanced',
      duration: '12 min',
      notes: 'C4 D4 C4 D4 E4 D4 C4 | D4 E4 D4 E4 F4 E4 D4',
      description: 'Finger velocity and whisper-soft pianissimo air support. Practicing with fingers relaxed directly over valve caps.',
      tag: 'Valve Agility',
      bpm: 120,
    },
    {
      id: 'routine-arban-tongue',
      title: 'Arban Double Tonguing (Ta-Ka)',
      author: 'J.B. Arban',
      level: 'Advanced',
      duration: '10 min',
      notes: 'G4 G4 G4 G4 | G4 G4 G4 G4 | C5 C5 C5 C5 | G4 G4 G4 G4',
      description: 'Rapid staccato articulation study. Match the tone and projection of the secondary "Ka" stroke with the primary "Ta" stroke.',
      tag: 'Articulation Mastery',
      bpm: 132,
    },
    {
      id: 'routine-schlossberg',
      title: 'Schlossberg Daily Flexibility #14',
      author: 'Max Schlossberg',
      level: 'Professional',
      duration: '20 min',
      notes: 'C4 G4 C5 G4 | E4 B4 E5 B4 | D4 A4 D5 A4',
      description: 'Lip flexibility across wide harmonic leaps without adjusting horn angle or jamming pressure against the upper lip.',
      tag: 'Lip Slurs & Flexibility',
      bpm: 92,
    },
  ];

  return (
    <div className="flex flex-col w-full pb-28 max-w-2xl mx-auto px-4 pt-2">
      <div className="mb-4">
        <h1 className="font-headline-md text-xl text-on-surface font-bold">Standard Brass Routines</h1>
        <p className="font-body-sm text-xs text-on-surface-variant">
          Curated warmup protocols from Arban, Clarke, Stamp & Schlossberg
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {routinePacks.map((routine) => (
          <div
            key={routine.id}
            className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-[#e8ded3] flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-[11px] px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-semibold">
                {routine.tag}
              </span>
              <span className="font-label-sm text-xs text-outline">{routine.duration}</span>
            </div>

            <div>
              <h2 className="font-headline-sm text-base text-on-surface font-semibold">
                {routine.title}
              </h2>
              <span className="font-label-sm text-xs text-tertiary">{routine.author} • {routine.level}</span>
            </div>

            <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
              {routine.description}
            </p>

            <div className="bg-surface-container rounded-lg p-2 font-label-md text-xs text-on-surface overflow-x-auto whitespace-nowrap">
              {routine.notes}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-label-sm text-xs text-on-surface-variant">Target: {routine.bpm} BPM</span>
              <button
                onClick={() => {
                  onLoadRoutine({
                    title: routine.title,
                    subtitle: routine.author,
                    rawScoreText: routine.notes,
                    tempoBpm: routine.bpm,
                    category: 'exercises',
                    tags: [routine.tag, routine.author],
                  });
                  onShowToast(`Loaded ${routine.title} into manuscript`);
                }}
                className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-sm text-xs font-semibold shadow-xs hover:bg-primary transition-all active:scale-95"
              >
                Open in Manuscript
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
