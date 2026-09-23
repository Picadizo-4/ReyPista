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
          <div className="flex items-center z-20">
            {!isHome && (
              <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </Link>
            )}
          </div>

          {/* Logo y Título en una sola línea (whitespace-nowrap) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
            <div className="flex items-center gap-2 pointer-events-auto">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-7 w-auto object-contain flex-shrink-0" 
              />
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-gray-800 whitespace-nowrap uppercase">
                REY DE LA PISTA
              </h1>
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-7 w-auto object-contain flex-shrink-0" 
              />
            </div>
          </div>

          {/* Espaciador derecho para equilibrar el flex */}
          <div className="w-6 z-20"></div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  );
};