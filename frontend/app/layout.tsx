import './globals.css';
import { Providers } from './providers';
import { Navbar } from './components/Navbar';

export const metadata = {
  title: 'zkPredict — Zero Knowledge Prediction Markets',
  description: 'Private prediction markets powered by zero-knowledge proofs on Ethereum',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-zinc-100 antialiased">
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
