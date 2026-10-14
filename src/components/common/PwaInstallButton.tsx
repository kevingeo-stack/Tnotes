import React, { useEffect, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';

export const PwaInstallButton: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    setIsInstalled(
      (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' && (navigator as any).standalone === true)
    );

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (!reg) return;
        reg.onupdatefound = () => {
          const worker = reg.installing;
          if (worker) {
            worker.onstatechange = () => {
              if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                setHasUpdate(true);
                setWaitingWorker(worker);
              }
            };
          }
        };
      });
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  if (hasUpdate) {
    return (
      <button
        onClick={() => { waitingWorker?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload(); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
        title="Actualizar a la nueva versión"
      >
        <RefreshCw size={14} className="animate-spin" />
        <span>Actualizar App</span>
      </button>
    );
  }

  if (isInstalled || !installPrompt) return null;

  return (
    <button
      onClick={async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const res = await installPrompt.userChoice;
        if (res.outcome === 'accepted') setInstallPrompt(null);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-600 text-white text-xs font-semibold shadow hover:bg-amber-700 active:scale-95 transition-all cursor-pointer"
      title="Instalar en este dispositivo"
    >
      <Download size={14} />
      <span>Descargar App</span>
    </button>
  );
};
