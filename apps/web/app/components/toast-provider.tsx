'use client';

import { ToastRoot } from './toast';

/**
 * Public wrapper used in app/layout.tsx.
 *
 * Kept as a thin wrapper so the layout file doesn't import the reducer/state
 * machinery directly — easier to swap implementations later.
 */
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  return <ToastRoot>{children}</ToastRoot>;
}

export { useToast } from './toast';
