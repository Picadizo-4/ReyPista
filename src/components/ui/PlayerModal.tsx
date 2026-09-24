// src/components/ui/PlayerModal.tsx
import { useState, useEffect, useRef } from 'react';
import { X, Trophy, Swords, Percent, Award, Flame, Camera } from 'lucide-react';
import { Avatar } from './Avatar';
import { getPlayerDetailedStats, type PlayerStats } from '../../services/firebase/queries';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase/config';
import { convertImageToBase64 } from '../../utils/imageUtils';
import type { Player } from '../../core/types';
import toast from 'react-hot-toast';

interface PlayerModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayerUpdated?: (playerId: string, newAvatarUrl: string) => void;
}

// Función para determinar el rango según las victorias
const getPlayerRank = (wins: number) => {
  if (wins >= 100) return { label: 'Leyenda del Tenis', color: 'bg-purple-100 text-purple-700 border-purple-200' };
  if (wins >= 60) return { label: 'Jugador Elite', color: 'bg-red-100 text-red-700 border-red-200' };
  if (wins >= 30) return { label: 'Semiprofesional', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
  if (wins >= 10) return { label: 'Jugador Avanzado', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  return { label: 'Principiante en la Pista', color: 'bg-green-100 text-green-700 border-green-200' };
};

export const PlayerModal = ({ player, isOpen, onClose, onPlayerUpdated }: PlayerModalProps) => {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && player) {
      setCurrentAvatar(player.avatarUrl);
      setIsLoading(true);
      getPlayerDetailedStats(player.id)
        .then(data => setStats(data))
        .catch(err => console.error("Error cargando estadísticas del jugador", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, player]);

  if (!isOpen || !player) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const base64String = await convertImageToBase64(file);
      
      const playerRef = doc(db, 'players', player.id);
      await updateDoc(playerRef, { avatarUrl: base64String });

      setCurrentAvatar(base64String);
      toast.success("¡Foto de perfil actualizada con éxito!");
      
      // Enviamos el ID y el nuevo avatar al componente padre al momento
      if (onPlayerUpdated) {
        onPlayerUpdated(player.id, base64String);
      }
    } catch (error: any) {
      if (error.message !== "FILE_TOO_LARGE") {
        console.error("Error al actualizar la foto:", error);
        toast.error("Hubo un error al subir la imagen.");
      }
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const rank = getPlayerRank(stats?.totalWins || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {/* Botón Cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-2 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabecera con Avatar Interactivo */}
        <div className="bg-gradient-to-b from-blue-50 to-white p-6 pb-4 flex flex-col items-center text-center border-b border-gray-100">
          
          {/* Contenedor del Avatar con botón flotante de cámara */}
          <div className="relative group cursor-pointer mb-2" onClick={() => fileInputRef.current?.click()} title="Cambiar foto de perfil">
            <div className={`transform scale-125 transition-opacity ${isUploading ? 'opacity-50' : 'group-hover:opacity-90'}`}>
              <Avatar url={currentAvatar} name={player.name} size="lg" />
            </div>
            
            {/* Overlay con icono de cámara */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform scale-125">
              <Camera className="w-5 h-5 text-white" />
            </div>

            {/* Input file oculto */}
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageChange}
            />
          </div>

          <span className="text-[10px] text-gray-400 mt-1 mb-1">Pulsa sobre la imagen para cambiar la foto</span>

          <h2 className="text-2xl font-bold text-gray-900 mt-1">{player.name}</h2>
          
          {/* Rango Dinámico */}
          <div className={`text-xs font-bold px-3 py-1 rounded-full mt-2 border shadow-sm transition-all ${rank.color}`}>
            {isLoading ? 'Calculando rango...' : rank.label}
          </div>
        </div>

        {/* Contenido con Estadísticas */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-gray-400 text-sm animate-pulse">Calculando estadísticas...</div>
          ) : (
            <>
              {/* Tarjetas de Métricas Principales */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                  <div className="flex justify-center mb-1 text-blue-600">
                    <Percent className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-gray-900 block">{stats?.winRate || 0}%</span>
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Victorias</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                  <div className="flex justify-center mb-1 text-green-600">
                    <Swords className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-gray-900 block">{stats?.totalWins || 0}</span>
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">Ganados</span>
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">Perdidos ({stats?.totalLosses || 0})</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-100">
                  <div className="flex justify-center mb-1 text-yellow-500">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-extrabold text-gray-900 block">{stats?.tournamentsWon || 0}</span>
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Títulos</span>
                </div>
              </div>

              {/* Tarjetas de Rachas (Racha actual y Récord máximo) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-orange-50/60 p-3.5 rounded-2xl text-center border border-orange-100 flex flex-col justify-center">
                  <div className="flex items-center justify-center gap-1 text-orange-600 text-xs font-semibold mb-1">
                    <Flame className="w-4 h-4 fill-orange-500 text-orange-500" /> Racha Actual
                  </div>
                  <span className="text-xl font-black text-orange-700">
                    {stats?.currentStreak || 0} <span className="text-xs font-normal text-orange-600">victorias</span>
                  </span>
                </div>

                <div className="bg-amber-50/60 p-3.5 rounded-2xl text-center border border-amber-100 flex flex-col justify-center">
                  <div className="flex items-center justify-center gap-1 text-amber-600 text-xs font-semibold mb-1">
                    🏆 Mejor Racha
                  </div>
                  <span className="text-xl font-black text-amber-700">
                    {stats?.maxStreak || 0} <span className="text-xs font-normal text-amber-600">récord</span>
                  </span>
                </div>
              </div>

              {/* Palmarés Individual */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" /> Palmarés y Títulos
                </h3>

                {stats?.wonTournamentsList.length === 0 ? (
                  <div className="bg-gray-50 p-4 rounded-2xl text-center text-gray-400 text-xs border border-gray-100">
                    Aún no ha conquistado ninguna temporada o torneo. ¡A jugar!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stats?.wonTournamentsList.map((item, idx) => (
                      <div key={idx} className="bg-yellow-50/50 border border-yellow-100 p-3.5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xs">
                            🏆
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 text-sm block">{item.tournamentName}</span>
                            <span className="text-xs text-yellow-700 font-medium">Temporada {item.seasonNumber}</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-blue-600 bg-white px-2.5 py-1 rounded-lg border border-yellow-100 shadow-sm">
                          {item.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-black transition-colors"
          >
            Cerrar Perfil
          </button>
        </div>
      </div>
    </div>
  );
};