import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './components/sidebar';

export const metadata: Metadata = {
  title: 'Realty Engine',
  description: 'Acquisition engine for Indian real estate developers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark-bg text-white">
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
