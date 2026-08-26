import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LeetCode Companion',
  description: 'Track and analyze your LeetCode progress',
};

import Sidebar from '@/components/ui/Sidebar';
import TopBar from '@/components/ui/TopBar';
import Footer from '@/components/ui/Footer';
import ExtensionSync from '@/components/ExtensionSync';
import { cookies } from 'next/headers';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('jwt_token')?.value;

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} h-screen flex overflow-hidden bg-background text-zinc-100`}>
        <ExtensionSync token={token} />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            <div className="max-w-6xl mx-auto w-full pb-12 flex-1 flex flex-col">
              <div className="flex-1">
                {children}
              </div>
              <Footer />
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
