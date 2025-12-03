import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

// Toast types
type ToastType = 'success' | 'error' | 'info' | 'warning' | 'celebration';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: { action?: Toast['action']; duration?: number }) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showCelebration: (message: string) => void;
  showUndo: (message: string, onUndo: () => void) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Individual Toast Component
const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));
    
    // Auto dismiss
    const duration = toast.duration || (toast.action ? 8000 : 3000);
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onDismiss, 300);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [toast.duration, toast.action, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#EF4444" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M12 9v4m0 4h.01" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
              <path d="M12 3L2 21h20L12 3z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
        );
      case 'celebration':
        return <span className="text-lg">🎉</span>;
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#8B5CF6" strokeWidth="2"/>
              <path d="M12 8v4m0 4h.01" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        );
    }
  };

  const getStyles = () => {
    const baseStyles = {
      background: 'rgba(26, 22, 51, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
    };
    
    if (toast.type === 'celebration') {
      return {
        ...baseStyles,
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(236, 72, 153, 0.9))',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
      };
    }
    
    return baseStyles;
  };

  return (
    <div
      className={`flex items-center space-x-3 px-4 py-3 rounded-2xl shadow-lg transition-all duration-300 ${
        isVisible && !isLeaving 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-4 scale-95'
      }`}
      style={getStyles()}
    >
      {getIcon()}
      
      <span className={`text-sm font-medium flex-1 ${toast.type === 'celebration' ? 'text-white' : 'text-white/90'}`}>
        {toast.message}
      </span>
      
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
          className="text-sm font-bold text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 -mr-2"
        >
          {toast.action.label}
        </button>
      )}
      
      <button
        onClick={() => {
          setIsLeaving(true);
          setTimeout(onDismiss, 300);
        }}
        className="text-white/40 hover:text-white/70 transition-colors p-1 -mr-1"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
};

// Toast Container/Provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string, 
    type: ToastType = 'info',
    options?: { action?: Toast['action']; duration?: number }
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      message,
      type,
      action: options?.action,
      duration: options?.duration,
    };
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error', { duration: 5000 });
  }, [showToast]);

  const showCelebration = useCallback((message: string) => {
    showToast(message, 'celebration', { duration: 4000 });
  }, [showToast]);

  const showUndo = useCallback((message: string, onUndo: () => void) => {
    showToast(message, 'info', {
      action: { label: 'Undo', onClick: onUndo },
      duration: 5000,
    });
  }, [showToast]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showCelebration, showUndo, hideToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-24 left-4 right-4 z-50 flex flex-col items-center space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem toast={toast} onDismiss={() => hideToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
