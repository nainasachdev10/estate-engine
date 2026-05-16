'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  /** epoch ms when the toast was created — used for enter animation timing */
  createdAt: number;
  /** when true, the toast is sliding out and should be removed shortly */
  leaving?: boolean;
}

interface ToastState {
  toasts: ToastItem[];
}

type ToastAction =
  | { type: 'add'; toast: ToastItem }
  | { type: 'dismiss'; id: string }
  | { type: 'remove'; id: string };

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4000;
const EXIT_ANIM_MS = 220;

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'add': {
      // Keep at most MAX_VISIBLE — drop oldest if exceeded.
      const next = [...state.toasts, action.toast];
      const overflow = next.length - MAX_VISIBLE;
      return { toasts: overflow > 0 ? next.slice(overflow) : next };
    }
    case 'dismiss':
      return {
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, leaving: true } : t,
        ),
      };
    case 'remove':
      return { toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

interface ToastContextValue {
  toast: ToastApi;
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): { toast: ToastApi } {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return { toast: ctx.toast };
}

// ---------------------------------------------------------------------------
// Provider implementation (named export — wrapped by toast-provider.tsx)
// ---------------------------------------------------------------------------

let toastCounter = 0;
function makeId(): string {
  toastCounter += 1;
  return `t_${Date.now().toString(36)}_${toastCounter}`;
}

export function ToastRoot({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { toasts: [] });
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'dismiss', id });
    const t = setTimeout(() => dispatch({ type: 'remove', id }), EXIT_ANIM_MS);
    timers.current.set(`${id}_exit`, t);
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = makeId();
      dispatch({ type: 'add', toast: { id, type, message, createdAt: Date.now() } });
      const t = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, t);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const toast = useMemo<ToastApi>(
    () => ({
      success: (m: string) => push('success', m),
      error: (m: string) => push('error', m),
      info: (m: string) => push('info', m),
    }),
    [push],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ toast, toasts: state.toasts, dismiss }),
    [toast, state.toasts, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={state.toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Viewport + single toast item
// ---------------------------------------------------------------------------

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const TYPE_STYLES: Record<ToastType, { ring: string; dot: string; icon: string }> = {
  success: {
    ring: 'border-green-500/30 shadow-[0_0_24px_-12px_rgba(34,197,94,0.6)]',
    dot: 'bg-green-400',
    icon: 'text-green-400',
  },
  error: {
    ring: 'border-red-500/30 shadow-[0_0_24px_-12px_rgba(239,68,68,0.6)]',
    dot: 'bg-red-400',
    icon: 'text-red-400',
  },
  info: {
    ring: 'border-gold/40 shadow-[0_0_24px_-12px_rgba(212,175,55,0.6)]',
    dot: 'bg-gold',
    icon: 'text-gold',
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const style = TYPE_STYLES[toast.type];

  return (
    <div
      role="status"
      data-leaving={toast.leaving ? 'true' : 'false'}
      className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-dark-secondary/95 px-4 py-3 text-sm text-white backdrop-blur transition-all duration-200 ease-out
        ${style.ring}
        data-[leaving=true]:translate-x-3 data-[leaving=true]:opacity-0
        data-[leaving=false]:translate-x-0 data-[leaving=false]:opacity-100
        motion-safe:animate-[toast-in_220ms_cubic-bezier(0.16,1,0.3,1)_both]`}
    >
      <span className={`mt-1.5 inline-block h-2 w-2 flex-none rounded-full ${style.dot}`} />
      <p className="flex-1 leading-snug text-gray-100">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className={`-mr-1 -mt-1 rounded p-1 text-xs text-gray-500 transition-colors hover:bg-dark-tertiary hover:text-white ${style.icon}`}
      >
        x
      </button>
    </div>
  );
}
