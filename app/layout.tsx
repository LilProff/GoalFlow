'use client';

import './globals.css';
import { useEffect, useState, ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

function AuthLoader({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Small delay to ensure auth state is initialized
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        <AuthProvider>
          <AuthLoader>
            {children}
          </AuthLoader>
        </AuthProvider>
      </body>
    </html>
  );
}
