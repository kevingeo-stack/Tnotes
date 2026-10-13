import { useState, useEffect } from 'react';
import { PWAInstallService } from '../services/pwa/PWAInstallService.ts';

export function usePWAInstall() {
  const service = PWAInstallService.getInstance();
  const [isInstallable, setIsInstallable] = useState(service.isInstallable());
  const [isInstalled, setIsInstalled] = useState(service.isAppInstalled());
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    }

    const unsubscribe = service.addListener((canInstall) => {
      setIsInstallable(canInstall);
      setIsInstalled(service.isAppInstalled());
    });

    return unsubscribe;
  }, [service]);

  const install = async () => {
    return await service.promptInstall();
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    install,
  };
}
