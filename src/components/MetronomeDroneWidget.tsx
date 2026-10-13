import React, { useState, useEffect, useRef } from 'react';
import { TrumpetAudioEngine } from '../services/audio/TrumpetAudioEngine.ts';

interface MetronomeDroneWidgetProps {
  initialBpm?: number;
  meter?: string;
  tempoDescription?: string;
  onBpmChange?: (bpm: number) => void;
}

export const MetronomeDroneWidget: React.FC<MetronomeDroneWidgetProps> = ({
  initialBpm = 116,
  meter = '4/4',
  tempoDescription = 'Medium Swing • Allegretto',
  onBpmChange,
}) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [isDroneActive, setIsDroneActive] = useState(false);

  const audioEngine = TrumpetAudioEngine.getInstance();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setBpm(initialBpm);
  }, [initialBpm]);

  // Handle metronome playback
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = (60 / bpm) * 1000;
      let beatCounter = 0;

      timerRef.current = setInterval(() => {
        beatCounter = (beatCounter % 4) + 1;
        setCurrentBeat(beatCounter);
        audioEngine.playMetronomeClick(beatCounter === 1);
      }, intervalMs);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setCurrentBeat(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isPlaying, bpm, audioEngine]);

  // Clean up drone on unmount
  useEffect(() => {
    return () => {
      audioEngine.stopDrone();
    };
  }, [audioEngine]);

  const toggleMetronome = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleDrone = () => {
    const active = audioEngine.toggleDrone(440);
    setIsDroneActive(active);
  };

  const handleBpmUpdate = (val: number) => {
    const clamped = Math.max(40, Math.min(240, val));
    setBpm(clamped);
    onBpmChange?.(clamped);
  };

  return (
    <div className="w-full bg-[#efeeea] rounded-xl p-3.5 flex flex-col gap-3 shadow-xs border border-[#e8ded3]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleMetronome}
            aria-label={isPlaying ? 'Pause metronome' : 'Start metronome'}
            className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-md text-lg text-on-surface font-bold">
                {bpm}
              </span>
              <span className="font-label-sm text-xs text-on-surface-variant font-medium">BPM</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high font-label-sm text-[10px] text-on-surface font-semibold">
                {meter}
              </span>
            </div>
            <span className="font-label-sm text-xs text-tertiary">
              {tempoDescription}
            </span>
          </div>
        </div>

        {/* Drone Generator */}
        <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1.5 rounded-lg shadow-xs border border-[#e8ded3]/60">
          <button
            onClick={toggleDrone}
            className={`flex items-center gap-1 font-label-sm text-xs font-semibold active:scale-95 transition-all ${
              isDroneActive ? 'text-primary scale-102' : 'text-on-surface'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[18px] transition-colors ${
                isDroneActive ? 'text-primary animate-pulse' : 'text-primary'
              }`}
            >
              {isDroneActive ? 'volume_up' : 'campaign'}
            </span>
            <span>Drone A4</span>
          </button>
          <span className="font-label-sm text-[10px] text-on-surface-variant">440Hz</span>
        </div>
      </div>

      {/* Quick Tempo Slider & Beat Indicator Nodes */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => handleBpmUpdate(bpm - 2)}
          className="w-7 h-7 rounded bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-sm select-none active:bg-primary-container active:text-on-primary transition-colors"
          title="-2 BPM"
        >
          -
        </button>

        <input
          type="range"
          min="40"
          max="220"
          value={bpm}
          onChange={(e) => handleBpmUpdate(parseInt(e.target.value, 10))}
          className="w-full accent-[#c5a059] h-1.5 bg-surface-container-high rounded-lg cursor-pointer"
        />

        <button
          onClick={() => handleBpmUpdate(bpm + 2)}
          className="w-7 h-7 rounded bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-sm select-none active:bg-primary-container active:text-on-primary transition-colors"
          title="+2 BPM"
        >
          +
        </button>

        {/* Beat 1..4 Indicator Nodes */}
        <div className="flex items-center gap-1 pl-1">
          {[1, 2, 3, 4].map((beatNum) => {
            const isCurrent = currentBeat === beatNum;
            const isDownbeat = beatNum === 1;

            return (
              <div
                key={beatNum}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-100 ${
                  isCurrent
                    ? isDownbeat
                      ? 'bg-primary scale-135 shadow-xs'
                      : 'bg-primary-container scale-120'
                    : 'bg-surface-container-highest'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
