import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/useAuth';
import { GameProvider } from '@/hooks/useGame';
import { MissionProvider } from '@/hooks/useMissions';

export const metadata: Metadata = {
  title: 'Tag Support - Real-time Tag Game',
  description: 'PWA for supporting real-time tag games with location tracking',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <GameProvider>
            <MissionProvider>{children}</MissionProvider>
          </GameProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
