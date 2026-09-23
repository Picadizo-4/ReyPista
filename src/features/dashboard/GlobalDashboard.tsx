// src/features/dashboard/GlobalDashboard.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Plus, Trash2, ChevronRight, X, Award } from 'lucide-react';
import { useTournaments } from '../tournaments/useTournaments';
import { usePlayers } from '../players/usePlayers';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PlayerModal } from '../../components/ui/PlayerModal';
import type { Player } from '../../core/types';

export const GlobalDashboard = () => {
  const { tournaments, addTournament, deleteTournament, isLoading: loadingT } = useTournaments();
  const { players, addPlayer, removePlayer, refreshPlayers, isLoading: loadingP } = usePlayers();

  // Estados Formulario Jugador
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showPlayerForm, setShowPlayerForm] = useState(false);

  // Estados Formulario Torneo
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [tName, setTName] = useState('');
  const [tBestOf, setTBestOf] = useState(3);
  const [tPunishLast, setTPunishLast] = useState('');
  const [tPunishSecond, setTPunishSecond] = useState('');
  const [tSelectedPlayers, setTSelectedPlayers] = useState<string[]>([]);

  // Modales y selección de jugador
  const [playerToDelete, setPlayerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [tournamentToDelete, setTournamentToDelete] = useState<{ id: string; name: string } | null>(null);
  const [removeGlobalPoints, setRemoveGlobalPoints] = useState(true);
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);

  const sortedGlobalPlayers = [...players].sort((a, b) => 
    b.totalPoints - a.totalPoints || b.totalSetsWon - a.totalSetsWon
  );

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    await addPlayer(newPlayerName.trim());
    setNewPlayerName('');
    setShowPlayerForm(false);
  };

  const handleTogglePlayer = (playerId: string) => {
    setTSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleAddTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tName.trim() || tSelectedPlayers.length < 2) {
      alert("Necesitas un nombre y seleccionar al menos 2 jugadores.");
      return;
    }
    
    await addTournament(tName.trim(), tBestOf, tPunishLast.trim() || null, tPunishSecond.trim() || null, tSelectedPlayers);
    setTName('');
    setTBestOf(3);
    setTPunishLast('');
    setTPunishSecond('');
    setTSelectedPlayers([]);
    setShowTournamentForm(false);
  };

  const confirmDeletePlayer = (id: string, name: string) => {
    setPlayerToDelete({ id, name });
  };

  const handleExecuteDeletePlayer = async () => {
    if (!playerToDelete) return;
    await removePlayer(playerToDelete.id, playerToDelete.name);
    setPlayerToDelete(null);
  };

  const handleExecuteDeleteTournament = async () => {
    if (!tournamentToDelete) return;
    await deleteTournament(tournamentToDelete.id, tournamentToDelete.name, removeGlobalPoints);
    if (removeGlobalPoints) {
      await refreshPlayers();
    }
    setTournamentToDelete(null);
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. SECCIÓN TORNEOS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <img 
              src="/atp-tours.png" 
              alt="ATP Tour" 
              className="h-7 object-contain" 
            />
            <span className="text-gray-300 font-light">|</span>
            <h2 className="text-lg font-bold text-gray-800">Torneos Activos</h2>
          </div>
          <button 
            onClick={() => setShowTournamentForm(!showTournamentForm)}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1 transition-colors"
          >
            {showTournamentForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showTournamentForm ? 'Cancelar' : 'Crear Torneo'}
          </button>
        </div>

        {showTournamentForm && (
          <form onSubmit={handleAddTournament} className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 mb-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Torneo</label>
              <input type="text" required value={tName} onChange={e => setTName(e.target.value)} placeholder="Ej: Liga de Verano" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona a los participantes</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-lg">
                {players.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={tSelectedPlayers.includes(p.id)}
                      onChange={() => handleTogglePlayer(p.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    {p.name}
                  </label>
                ))}
                {players.length === 0 && <span className="text-xs text-gray-400 col-span-2">Añade jugadores al roster primero.</span>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Formato</label>
                <select value={tBestOf} onChange={e => setTBestOf(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value={3}>Al mejor de 3</option>
                  <option value={5}>Al mejor de 5</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Castigo Último</label>
                <input type="text" value={tPunishLast} onChange={e => setTPunishLast(e.target.value)} placeholder="Opcional" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Castigo Penúltimo</label>
                <input type="text" value={tPunishSecond} onChange={e => setTPunishSecond(e.target.value)} placeholder="Opcional" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              Guardar Torneo
            </button>
          </form>
        )}

        {loadingT ? (
          <p className="text-gray-500 text-sm">Cargando torneos...</p>
        ) : tournaments.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
            No hay torneos creados todavía.
          </div>
        ) : (
          <div className="grid gap-3">
            {tournaments.map((t) => (
              <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all group">
                <Link to={`/tournament/${t.id}`} className="flex-1 block">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-sm text-gray-500">
                    Mejor de {t.bestOf} • Temporada {t.currentSeasonNumber}
                  </p>
                </Link>
                <div className="flex items-center gap-1 pl-4 border-l border-gray-100">
                  <button 
                    onClick={() => setTournamentToDelete({ id: t.id, name: t.name })}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar Torneo"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <Link to={`/tournament/${t.id}`} className="p-2">
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. SÚPER TABLA GLOBAL */}
      <section>
        <div className="flex justify-left items-center mb-4">
          <img 
            src="/atp-rankings.png" 
            alt="PIF ATP Rankings" 
            className="h-8 object-contain" 
          />
        </div>
        
        {loadingP ? (
          <p className="text-gray-500 text-sm">Cargando clasificación...</p>
        ) : sortedGlobalPlayers.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
            Aún no hay jugadores registrados.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 text-xs sm:text-sm">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 w-8 text-center">#</th>
                    <th className="px-2 sm:px-4 py-3">Jugador</th>
                    <th className="px-2 sm:px-4 py-3 text-center" title="Puntos Totales">Pts</th>
                    <th className="px-2 sm:px-4 py-3 text-center" title="Partidos Jugados">PJ</th>
                    <th className="px-2 sm:px-4 py-3 text-center" title="Sets Ganados">Sets</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedGlobalPlayers.map((p, index) => (
                    <tr 
                      key={p.id} 
                      onClick={() => setSelectedPlayerForModal(p)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-2 sm:px-4 py-3 text-center font-semibold text-gray-500">{index + 1}</td>
                      <td className="px-2 sm:px-4 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Avatar url={p.avatarUrl} name={p.name} size="sm" />
                          <span className="font-medium text-gray-900 truncate hover:text-blue-600 transition-colors">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center font-bold text-blue-600">{p.totalPoints}</td>
                      <td className="px-2 sm:px-4 py-3 text-center text-gray-500">{p.totalMatches}</td>
                      <td className="px-2 sm:px-4 py-3 text-center text-gray-500">{p.totalSetsWon}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 3. ROSTER / GESTIÓN DE JUGADORES */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-600" />
            <h2 className="text-lg font-bold text-gray-700">Jugadores Activos</h2>
          </div>
          <button onClick={() => setShowPlayerForm(!showPlayerForm)} className="text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1 transition-colors">
            {showPlayerForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            Añadir
          </button>
        </div>

        {showPlayerForm && (
          <form onSubmit={handleAddPlayer} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex gap-2">
            <input type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="Nombre del jugador..." className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            <button type="submit" disabled={!newPlayerName.trim()} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors">
              Guardar
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {players.map((p) => (
            <div key={p.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div 
                onClick={() => setSelectedPlayerForModal(p)}
                className="flex items-center gap-2 cursor-pointer flex-1"
              >
                <Avatar url={p.avatarUrl} name={p.name} size="sm" />
                <span className="font-medium text-gray-700 text-sm hover:text-blue-600 transition-colors">{p.name}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDeletePlayer(p.id, p.name);
                }} 
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                title="Eliminar jugador"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL: PERFIL DETALLADO DEL JUGADOR */}
      <PlayerModal 
        player={selectedPlayerForModal}
        isOpen={!!selectedPlayerForModal}
        onClose={() => setSelectedPlayerForModal(null)}
      />

      {/* MODAL: CONFIRMAR BORRADO DE JUGADOR */}
      <ConfirmModal
        isOpen={!!playerToDelete}
        title="¿Eliminar jugador?"
        message={`¿Estás seguro de que quieres ocultar a ${playerToDelete?.name}? Sus partidos anteriores se mantendrán de forma segura en el histórico.`}
        confirmText="Eliminar"
        isDangerous={true}
        onConfirm={handleExecuteDeletePlayer}
        onClose={() => setPlayerToDelete(null)}
      />

      {/* MODAL: CONFIRMAR BORRADO DE TORNEO */}
      <ConfirmModal
        isOpen={!!tournamentToDelete}
        title={`Eliminar torneo "${tournamentToDelete?.name}"`}
        message="Esta acción es irreversible y borrará todos los partidos y temporadas de este torneo."
        confirmText="Sí, eliminar torneo"
        isDangerous={true}
        onConfirm={handleExecuteDeleteTournament}
        onClose={() => setTournamentToDelete(null)}
      >
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={removeGlobalPoints}
              onChange={(e) => setRemoveGlobalPoints(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="text-xs text-gray-700 leading-tight">
              <strong>Restar estadísticas de la Clasificación Global:</strong> Desmarca esta casilla si quieres borrar el torneo visualmente pero conservando los puntos acumulados por los jugadores en la Súper Tabla.
            </span>
          </label>
        </div>
      </ConfirmModal>

    </div>
  );
};