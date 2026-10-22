import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorText?: string;
}

class RootErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, errorText: undefined };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorText: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Runtime error caught safely:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-amber-500 mb-2">TNotes</h2>
          <p className="text-sm text-neutral-400 mb-6 max-w-xs">
            Ocurrió un problema temporal al cargar la vista. Tus canciones y listas están a salvo.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                // Solo recarga la aplicación, NUNCA borra localStorage
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Recargar Aplicación
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}

// PWA Service Worker Registration
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(swUrl).then((reg) => {
      // Force checking for updates from server immediately
      reg.update().catch(() => {});
    }).catch(err => {
      console.log('SW registration error:', err);
    });
  });
}

