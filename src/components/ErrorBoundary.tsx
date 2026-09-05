import React, { ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-4 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            A apărut o eroare neașteptată
          </h1>
          <p className="text-gray-600 mb-6">
            Te rugăm să faci o captură de ecran și să o trimiți dezvoltatorului.
          </p>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100 text-left w-full max-w-md overflow-auto max-h-64">
            <p className="font-mono text-xs text-red-600 font-bold mb-2">
              {this.state.error?.toString()}
            </p>
            <pre className="font-mono text-xs text-gray-500 whitespace-pre-wrap">
              {this.state.errorInfo?.componentStack}
            </pre>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = "/"; // Force reload home
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/30 hover:bg-red-700 transition-colors"
            >
              Reîncarcă Aplicația
            </button>
            
            <button
               onClick={() => {
                  if (window.confirm("Atenție! Această acțiune va șterge toate DATELE și SETĂRILE locale pentru a debloca aplicația. Sigur dorești să continui?")) {
                      localStorage.clear();
                      window.location.href = "/";
                  }
               }}
               className="px-6 py-3 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
               Reset total (Deblocare)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
