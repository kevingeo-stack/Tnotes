import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

export const PwaInstallButton: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      // Si ya había un worker en espera de activación:
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
        setHasUpdate(true);
      }

      // Escuchar cuando se detecte una nueva versión descargándose:
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Hay una actualización lista para aplicarse
            setWaitingWorker(installingWorker);
            setHasUpdate(true);
          }
        };
      };
    });

    // Cuando el nuevo Service Worker tome el control, recargar la app
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdateClick = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
  };

  // El botón SOLO se muestra si se detectó una actualización pendiente
  if (!hasUpdate) return null;

  return (
    <button
      type="button"
      onClick={handleUpdateClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
      title="Instalar última versión de TNotes"
    >
      <RefreshCw size={14} className="animate-spin" />
      <span>Actualizar App</span>
    </button>
  );
};
