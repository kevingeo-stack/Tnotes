import React, { useState } from 'react';
import { TrumpetAudioEngine } from '../services/audio/TrumpetAudioEngine.ts';

interface TunerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TunerModal: React.FC<TunerModalProps> = ({ isOpen, onClose }) => {
  const [selectedDroneNote, setSelectedDroneNote] = useState<{ note: string; freq: number }>({
    note: 'A4',
    freq: 440,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isOpen) return null;

  const droneTones = [
    { note: 'A#3', freq: 233.08 },
    { note: 'C4', freq: 261.63 },
    { note: 'D4', freq: 293.66 },
    { note: 'D#4', freq: 311.13 },
    { note: 'F4', freq: 349.23 },
    { note: 'G4', freq: 392.00 },
    { note: 'A4', freq: 440.00 },
    { note: 'A#4', freq: 466.16 },
  ];

  const handleToggleDrone = (item: { note: string; freq: number }) => {
    setSelectedDroneNote(item);
    const audioEngine = TrumpetAudioEngine.getInstance();
    if (isPlaying && selectedDroneNote.note === item.note) {
      audioEngine.stopDrone();
      setIsPlaying(false);
    } else {
      audioEngine.startDrone(item.freq);
      setIsPlaying(true);
    }
  };

  const handleClose = () => {
    TrumpetAudioEngine.getInstance().stopDrone();
    setIsPlaying(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-5 shadow-2xl border border-outline-variant flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">graphic_eq</span>
            <h2 className="font-headline-sm text-base text-on-surface font-semibold">
              Pitch Reference & Drone
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Big Visual Gauge */}
        <div className="p-4 rounded-xl bg-surface-container flex flex-col items-center justify-center border border-[#e8ded3]">
          <span className="font-headline-xl text-3xl font-extrabold text-on-surface">
            {selectedDroneNote.note}
          </span>
          <span className="font-label-md text-xs text-primary font-bold">
            {selectedDroneNote.freq} Hz
          </span>
          <span className="font-label-sm text-[10px] text-tertiary mt-1">
            Concert pitch harmonic drone with acoustic brass warmth
          </span>
        </div>

        {/* Drone Selector Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {droneTones.map((item) => {
            const isCurrent = isPlaying && selectedDroneNote.note === item.note;
            return (
              <button
                key={item.note}
                onClick={() => handleToggleDrone(item)}
                className={`py-2 px-1 rounded-lg font-label-md text-xs font-semibold flex flex-col items-center transition-all ${
                  isCurrent
                    ? 'bg-primary text-on-primary ring-2 ring-primary-container scale-103'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span>{item.note}</span>
                <span className="text-[9px] opacity-75">{Math.round(item.freq)}Hz</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handleToggleDrone(selectedDroneNote)}
          className={`w-full py-2.5 rounded-xl font-headline-sm text-sm font-semibold transition-all shadow-xs ${
            isPlaying
              ? 'bg-red-700 text-white'
              : 'bg-primary-container text-on-primary'
          }`}
        >
          {isPlaying ? 'Stop Drone' : `Play ${selectedDroneNote.note} Drone`}
        </button>
      </div>
    </div>
  );
};
