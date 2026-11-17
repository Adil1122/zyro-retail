import type { Metadata } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono, Noto_Naskh_Arabic } from 'next/font/google';
import './globals.css';
import { ToastContainer } from '@/components/ui/Toast';
import { ZyroStoreProvider } from '@/services/zyro-store';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-inter-tight',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
});

const notoUrdu = Noto_Naskh_Arabic({
  subsets: ['arabic'],
  weight: ['500', '600', '700'],
  variable: '--font-urdu',
});

export const metadata: Metadata = {
  title: 'ZYRO Retail POS',
  description:
    'Modular retail Point of Sale, inventory, khata, purchasing, orders, cash shift, payroll, and reporting application.',
  openGraph: {
    title: 'ZYRO Retail POS',
    description:
      'Modular retail Point of Sale, inventory, khata, purchasing, orders, cash shift, payroll, and reporting application.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable} ${notoUrdu.variable}`}
    >
      <body className="min-h-screen bg-[#F4EFE9] text-[#0B2A2F]">
        <ZyroStoreProvider>
          {children}
          <ToastContainer />
        </ZyroStoreProvider>
      </body>
    </html>
  );
}
