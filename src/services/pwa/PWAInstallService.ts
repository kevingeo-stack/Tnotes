export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PWAInstallListener = (isInstallable: boolean) => void;

/**
 * PWAInstallService manages Service Worker lifecycle, update notifications,
 * and deferred home screen install prompts.
 */
export class PWAInstallService {
  private static instance: PWAInstallService | null = null;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled: boolean = false;
  private listeners: Set<PWAInstallListener> = new Set();
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.checkStandaloneMode();
    this.registerServiceWorker();
    this.bindInstallPromptListener();
  }

  public static getInstance(): PWAInstallService {
    if (!PWAInstallService.instance) {
      PWAInstallService.instance = new PWAInstallService();
    }
    return PWAInstallService.instance;
  }

  private checkStandaloneMode(): void {
    if (typeof window === 'undefined') return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    this.isInstalled = isStandalone;
  }

  private registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          this.registration = reg;
          // Check for worker updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content is available; please refresh.
                }
              });
            }
          });
        })
        .catch(() => {
          // Worker registration error handled silently
        });
    });
  }

  private bindInstallPromptListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.notifyListeners(true);
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyListeners(false);
    });
  }

  public addListener(listener: PWAInstallListener): () => void {
    this.listeners.add(listener);
    listener(this.isInstallable());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(canInstall: boolean): void {
    this.listeners.forEach((fn) => fn(canInstall));
  }

  public isInstallable(): boolean {
    return !!this.deferredPrompt && !this.isInstalled;
  }

  public isAppInstalled(): boolean {
    return this.isInstalled;
  }

  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    await this.deferredPrompt.prompt();
    const choice = await this.deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.notifyListeners(false);
      return true;
    }

    return false;
  }
}
