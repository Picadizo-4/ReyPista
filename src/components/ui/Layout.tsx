// src/components/ui/Layout.tsx
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Cabecera / Topbar */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between relative">
          
          {/* Botón de retroceso a la izquierda (si no es Home) */}
          <div className="flex items-center">
            {!isHome && (
              <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </Link>
            )}
          </div>

          {/* Logo y Título Centrados */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-8 object-contain" 
            />
            <h1 className="text-xl font-bold tracking-tight text-gray-800 uppercase">
              REY DE LA PISTA
            </h1>
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-8 object-contain" 
            />
          </div>

          {/* Espaciador derecho para equilibrar el flex */}
          <div className="w-6"></div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
};