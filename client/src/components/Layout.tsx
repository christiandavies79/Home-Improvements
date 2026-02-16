import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-warm-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>
      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}

function MobileNav() {
  const path = window.location.pathname;

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 px-2 py-1 flex justify-around z-50">
      <MobileNavItem href="/" label="Home" active={path === '/'}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </MobileNavItem>
      <MobileNavItem href="/projects" label="Projects" active={path.startsWith('/projects')}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </MobileNavItem>
      <MobileNavItem href="/projects/new" label="Add" active={false}>
        <div className="w-10 h-10 -mt-4 bg-terra-500 rounded-full flex items-center justify-center text-white shadow-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </MobileNavItem>
      <MobileNavItem href="/settings" label="Settings" active={path === '/settings'}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </MobileNavItem>
    </nav>
  );
}

function MobileNavItem({ href, label, active, children }: {
  href: string; label: string; active: boolean; children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`flex flex-col items-center py-1 px-2 text-xs ${
        active ? 'text-terra-600' : 'text-gray-400'
      }`}
    >
      {children}
      <span className="mt-0.5">{label}</span>
    </a>
  );
}
