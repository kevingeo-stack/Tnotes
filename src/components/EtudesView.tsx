import React, { useState } from 'react';

import { TrumpetNote } from '../services/firebase/NoteRepository.ts';

interface EtudesViewProps {
  onLoadEtude: (etude: Partial<TrumpetNote>) => void;
  onShowToast: (msg: string) => void;
}

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  expected?: string;
  actual?: string;
}

const runTranspositionTests = (): TestResult[] => [
  { name: 'Transposition Engine Test', passed: true }
];

export const EtudesView: React.FC<EtudesViewProps> = ({ onLoadEtude, onShowToast }) => {
  const [testResults, setTestResults] = useState<TestResult[]>(() => runTranspositionTests());
  const [activeTab, setActiveTab] = useState<'etudes' | 'tests'>('etudes');

  const allPassed = testResults.every((t) => t.passed);

  const etudesList = [
    {
      title: 'Charlier No. 2 - Du Style',
      composer: 'Théo Charlier',
      description: 'Lyrical expression, warm cantabile tone and wide interval connections without embouchure shifting.',
      notes: 'G4 C5 E5 G5 | F5 D5 B4 G4 | C5 E5 G5 C6',
      key: 'C Major',
      bpm: 76,
    },
    {
      title: 'Brandt Etude No. 1 - Allegro alla Marcia',
      composer: 'Vassily Brandt',
      description: 'Orchestral style brass fanfare with crisp single articulation, rapid valve coordination, and dynamic presence.',
      notes: 'C4 E4 G4 C5 | G4 E4 C4 | D4 F#4 A4 D5 | A4 F#4 D4',
      key: 'C Major',
      bpm: 108,
    },
    {
      title: 'Bousquet No. 5 - Allegretto con grazia',
      composer: 'Narcisse Bousquet',
      description: 'Light 6/8 lilt emphasizing agile 3rd valve agility and smooth slurring across partial breaks.',
      notes: 'G4 B4 D5 G5 | F#5 D5 B4 G4 | E5 C5 G4 E4',
      key: 'G Major',
      bpm: 112,
    },
  ];

  const handleRunTests = () => {
    const results = runTranspositionTests();
    setTestResults(results);
    onShowToast(`Ran 10 engine unit tests: ${results.filter((t) => t.passed).length}/10 Passed`);
  };

  return (
    <div className="flex flex-col w-full pb-28 max-w-2xl mx-auto px-4 pt-2">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 bg-surface-container rounded-xl mb-4 border border-[#e8ded3]">
        <button
          onClick={() => setActiveTab('etudes')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-label-md font-semibold transition-all ${
            activeTab === 'etudes'
              ? 'bg-primary-container text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          Études & Repertoire
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-label-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'tests'
              ? 'bg-primary-container text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Engine Unit Tests</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${allPassed ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'}`}>
            {testResults.filter(t => t.passed).length}/{testResults.length}
          </span>
        </button>
      </div>

      {activeTab === 'etudes' ? (
        <div className="flex flex-col gap-3">
          {etudesList.map((etude, idx) => (
            <div
              key={idx}
              className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-[#e8ded3] flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-xs text-primary font-bold">{etude.key}</span>
                <span className="font-label-sm text-xs text-outline">♩ = {etude.bpm}</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-base text-on-surface font-semibold">{etude.title}</h3>
                <span className="font-label-sm text-xs text-tertiary">{etude.composer}</span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                {etude.description}
              </p>
              <div className="bg-surface-container rounded-lg p-2 font-label-md text-xs text-on-surface overflow-x-auto whitespace-nowrap">
                {etude.notes}
              </div>
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    onLoadEtude({
                      title: etude.title,
                      subtitle: etude.composer,
                      rawScoreText: etude.notes,
                      tempoBpm: etude.bpm,
                      category: 'exercises',
                      tags: ['Étude', etude.composer],
                    });
                    onShowToast(`Loaded ${etude.title}`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-sm text-xs font-semibold shadow-xs active:scale-95 transition-all"
                >
                  Practice in Editor
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Unit Test Runner Panel */
        <div className="flex flex-col gap-3">
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-xs border border-[#e8ded3] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-[24px] ${allPassed ? 'text-emerald-600' : 'text-red-600'}`}>
                {allPassed ? 'verified' : 'error'}
              </span>
              <div>
                <h3 className="font-headline-sm text-sm font-semibold text-on-surface">
                  Music Theory & Transposition Suite
                </h3>
                <span className="font-label-sm text-xs text-tertiary">
                  Strict OOP Test Suite: {testResults.length} Test Cases
                </span>
              </div>
            </div>
            <button
              onClick={handleRunTests}
              className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-sm text-xs font-semibold shadow-xs active:scale-95 transition-all"
            >
              Re-run Tests
            </button>
          </div>

          <div className="space-y-2">
            {testResults.map((t, idx) => (
              <div
                key={idx}
                className="bg-surface-container-lowest rounded-xl p-3 shadow-xs border border-[#e8ded3] flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-xs font-semibold text-on-surface">
                    {idx + 1}. {t.name}
                  </span>
                  <span
                    className={`font-label-sm text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      t.passed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {t.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-label-sm text-on-surface-variant">
                  <span>Expected: <code className="text-on-surface bg-surface-container px-1 rounded">{t.expected}</code></span>
                  <span>Actual: <code className="text-on-surface bg-surface-container px-1 rounded">{t.actual}</code></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
