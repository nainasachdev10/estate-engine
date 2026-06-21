import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PostHogProvider } from './providers';
import ToastProvider from './components/toast-provider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Realty Engine — AI Acquisition Engine for Real Estate',
    template: '%s · Realty Engine',
  },
  description:
    'Voice calling, AI lead scoring, WhatsApp & email drips, ad creatives, and a 30-day social calendar — one platform that runs the entire acquisition funnel for Indian real estate developers.',
  applicationName: 'Realty Engine',
  openGraph: {
    title: 'Realty Engine — AI Acquisition Engine for Real Estate',
    description:
      'One platform runs your entire acquisition funnel — voice, scoring, messaging, ads, and social — around the clock.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
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
