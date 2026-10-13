import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <>
      {isInstallable && (
        <div className="fixed top-16 left-3 right-3 z-40 bg-surface-container-high border border-primary-container/30 rounded-xl p-3 shadow-md flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">install_mobile</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-sm font-semibold text-on-surface truncate">Install TrumpetNotes</span>
              <span className="font-body-sm text-xs text-on-surface-variant truncate">Full offline access on your music stand</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface"
              aria-label="Dismiss banner"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            <button
              onClick={install}
              className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-xs font-semibold shadow-sm hover:bg-primary-container transition-all active:scale-95"
            >
              Install
            </button>
          </div>
        </div>
      )}

      {isIOS && !isInstallable && (
        <div className="fixed top-16 left-3 right-3 z-40 bg-surface-container-high border border-primary-container/30 rounded-xl p-3 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[18px]">ios_share</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-sm font-semibold text-on-surface truncate">Add to Home Screen</span>
              <span className="font-body-sm text-xs text-on-surface-variant truncate">Fast offline launch on iPad & iPhone</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
            <button
              onClick={() => setShowIOSModal(true)}
              className="px-2.5 py-1 rounded-lg bg-primary-container text-on-primary font-label-sm text-xs font-semibold shadow-sm"
            >
              How-To
            </button>
          </div>
        </div>
      )}

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-surface-container-lowest p-5 shadow-xl border border-outline-variant">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline-sm text-base text-on-surface">Install on iOS / Safari</h3>
              <button onClick={() => setShowIOSModal(false)} className="text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <ol className="font-body-md text-sm text-on-surface-variant space-y-2.5 list-decimal pl-4 mb-4">
              <li>
                Tap the <strong className="text-on-surface">Share button</strong> <span className="material-symbols-outlined inline text-[16px] align-text-bottom">ios_share</span> in Safari’s bottom toolbar.
              </li>
              <li>
                Scroll down and select <strong className="text-on-surface">Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong className="text-on-surface">Add</strong> in the top-right corner to open in full screen without browser bars.
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 rounded-xl bg-primary-container text-on-primary font-headline-sm text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
