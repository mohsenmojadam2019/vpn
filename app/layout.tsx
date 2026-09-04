import './globals.css';

export const metadata = {
  title: 'Paydar VPN',
  description: 'VLESS subscription and node control plane',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
