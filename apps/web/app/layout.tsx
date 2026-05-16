import type { Metadata } from 'next';
import './globals.css';
import { PostHogProvider } from './providers';
import ToastProvider from './components/toast-provider';

export const metadata: Metadata = {
  title: 'Realty Engine',
  description: 'Acquisition engine for Indian real estate developers',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-dark-bg text-white">
        <PostHogProvider>
          <ToastProvider>{children}</ToastProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
