import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HRMS Platform - Modern Multi-Tenant Human Resource Management',
  description:
    'Enterprise-grade multi-tenant HRMS built for Indian SMEs with attendance tracking, leave workflows, and role-based access control.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
