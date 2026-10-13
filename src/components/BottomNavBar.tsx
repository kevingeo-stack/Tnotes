import React from 'react';

export type AppTab = 'notes' | 'routines' | 'valves' | 'etudes';

interface BottomNavBarProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs: Array<{ id: AppTab; label: string; icon: string }> = [
    { id: 'notes', label: 'Notes', icon: 'stylus_note' },
    { id: 'routines', label: 'Routines', icon: 'music_note' },
    { id: 'valves', label: 'Valves', icon: 'radio_button_checked' },
    { id: 'etudes', label: 'Études', icon: 'library_books' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-[#fbf9f5]/90 backdrop-blur-xl border-t border-[#e8ded3]/80 shadow-[0_-2px_12px_rgba(43,38,31,0.04)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] ${
                  isActive ? 'text-primary' : 'text-on-surface-variant'
                }`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {tab.icon}
              </span>
              <span className={`font-label-sm text-[11px] mt-0.5 tracking-tight ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
