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
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorText: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <h2 className="text-xl font-bold text-amber-500 mb-2">TrumpetNotes</h2>
          <p className="text-sm text-neutral-400 mb-4">Se presentó un problema al inicializar en este dispositivo.</p>
          <button
            onClick={() => {
              try {
                localStorage.clear();
              } catch {
                // Ignore storage clear error
              }
              window.location.reload();
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-semibold cursor-pointer"
          >
            Restablecer y Recargar
          </button>
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
