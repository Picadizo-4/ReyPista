// src/features/tournaments/TournamentView.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy, History, Swords, AlertCircle, Medal, CheckCircle2, X, Plus, RefreshCw, Settings, Award, Calendar, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { useTournamentDetail } from './useTournamentDetail';
import { useMatches } from '../matches/useMatches';
import { Avatar } from '../../components/ui/Avatar';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { saveJornada, deleteLastJornada } from '../../services/firebase/tournaments';
import toast from 'react-hot-toast';

export const TournamentView = () => {
  const { id } = useParams<{ id: string }>();
  const { tournament, players, seasonRanking, historicalRanking, matches, seasonWinners, isLoading, refreshDetail, handleAdvanceSeason, handleUpdatePunishments, isAdvancing } = useTournamentDetail(id);
  const { addMatch, deleteLastMatch, isSubmitting, isDeleting } = useMatches();

  const [activeTab, setActiveTab] = useState<'season' | 'historical' | 'matches' | 'palmares' | 'jornadas'>('season');
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showPunishmentModal, setShowPunishmentModal] = useState(false);
  const [showDeleteJornadaModal, setShowDeleteJornadaModal] = useState(false);
  const [showDeleteMatchModal, setShowDeleteMatchModal] = useState(false);

  // Estados formularios
  const [winnerId, setWinnerId] = useState('');
  const [loserId, setLoserId] = useState('');
  const [scoreObj, setScoreObj] = useState('');

  const [editPunishLast, setEditPunishLast] = useState('');
  const [editPunishSecond, setEditPunishSecond] = useState('');

  // Estados para la pestaña de Jornadas
  const [selectedSeasonForJornadas, setSelectedSeasonForJornadas] = useState<number>(1);
  const [selectedJornadaNumber, setSelectedJornadaNumber] = useState<number>(1);

  const jornadasGuardadas = (tournament as any)?.jornadas || [];
  const temporadasConJornadas = Array.from(new Set(jornadasGuardadas.map((j: any) => j.seasonNumber))) as number[];
  if (tournament?.currentSeasonNumber && !temporadasConJornadas.includes(tournament.currentSeasonNumber)) {
    temporadasConJornadas.push(tournament.currentSeasonNumber);
  }
  temporadasConJornadas.sort((a, b) => a - b);

  const jornadasDeLaTemporadaSeleccionada = jornadasGuardadas
    .filter((j: any) => j.seasonNumber === selectedSeasonForJornadas)
    .sort((a: any, b: any) => a.jornadaNumber - b.jornadaNumber);

  useEffect(() => {
    if (tournament) {
      setEditPunishLast(tournament.punishmentLast || '');
      setEditPunishSecond(tournament.punishmentSecondToLast || '');
      if (tournament.currentSeasonNumber && !selectedSeasonForJornadas) {
        setSelectedSeasonForJornadas(tournament.currentSeasonNumber);
      }
    }
  }, [tournament]);

  useEffect(() => {
    if (jornadasDeLaTemporadaSeleccionada.length > 0) {
      const exists = jornadasDeLaTemporadaSeleccionada.some((j: any) => j.jornadaNumber === selectedJornadaNumber);
      if (!exists) {
        const ultimaDisponible = Math.max(...jornadasDeLaTemporadaSeleccionada.map((j: any) => j.jornadaNumber));
        setSelectedJornadaNumber(ultimaDisponible);
      }
    } else {
      setSelectedJornadaNumber(1);
    }
  }, [jornadasDeLaTemporadaSeleccionada, selectedJornadaNumber]);

  if (isLoading) return <div className="p-8 text-center text-gray-500 font-medium animate-pulse">Cargando torneo...</div>;
  if (!tournament) return <div className="p-8 text-center text-red-500 font-medium">Torneo no encontrado</div>;

  const getPlayer = (pId: string) => players.find(p => p.id === pId);

  const possibleScores = tournament.bestOf === 3 
    ? [{ label: '2 - 0', w: 2, l: 0 }, { label: '2 - 1', w: 2, l: 1 }]
    : [{ label: '3 - 0', w: 3, l: 0 }, { label: '3 - 1', w: 3, l: 1 }, { label: '3 - 2', w: 3, l: 2 }];

  const handleRegisterMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winnerId || !loserId || !scoreObj) return;

    const score = possibleScores.find(s => s.label === scoreObj);
    if (!score) return;

    const pointsAwardedLoser = (score.w - score.l === 1) ? 1 : 0;

    await addMatch(
      tournament.id,
      tournament.currentSeasonNumber,
      winnerId,
      loserId,
      score.w,
      score.l,
      pointsAwardedLoser
    );

    setWinnerId('');
    setLoserId('');
    setScoreObj('');
    setShowMatchModal(false);
    refreshDetail();
  };

  const handleSavePunishments = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleUpdatePunishments(editPunishLast.trim() || null, editPunishSecond.trim() || null);
    setShowPunishmentModal(false);
  };

  const handleFinalizeJornada = async () => {
    const jornadasActuales = (tournament as any).jornadas || [];
    const temporadaActualNum = tournament.currentSeasonNumber;
    
    const jornadasDeEstaTemp = jornadasActuales.filter((j: any) => j.seasonNumber === temporadaActualNum);

    const nuevoRankingActual = seasonRanking.map((p, idx) => ({
      playerId: p.playerId,
      points: Number(p.points || 0),
      matchesPlayed: Number(p.matchesPlayed || 0),
      setsWon: Number(p.setsWon || 0),
      position: idx + 1
    }));

    if (jornadasDeEstaTemp.length > 0) {
      const jornadasOrdenadas = [...jornadasDeEstaTemp].sort((a: any, b: any) => b.jornadaNumber - a.jornadaNumber);
      const ultimaJornadaRegistrada = jornadasOrdenadas[0];

      const rankingAnterior = ultimaJornadaRegistrada.ranking || [];
      
      const esIgual = rankingAnterior.length === nuevoRankingActual.length && rankingAnterior.every((item: any, index: number) => {
        const actual = nuevoRankingActual[index];
        return item.playerId === actual.playerId && item.points === actual.points && item.position === actual.position;
      });

      if (esIgual) {
        toast.error(`La clasificación es idéntica a la de la Jornada ${ultimaJornadaRegistrada.jornadaNumber}. No hay cambios que registrar.`);
        return;
      }
    }

    const siguienteNumJornada = jornadasDeEstaTemp.length + 1;

    const nuevaJornada = {
      id: `${temporadaActualNum}-${siguienteNumJornada}-${Date.now()}`,
      seasonNumber: temporadaActualNum,
      jornadaNumber: siguienteNumJornada,
      date: new Date().toISOString(),
      ranking: nuevoRankingActual
    };

    try {
      await saveJornada(tournament.id, nuevaJornada);
      setSelectedSeasonForJornadas(temporadaActualNum);
      setSelectedJornadaNumber(siguienteNumJornada);
      toast.success(`¡Jornada ${siguienteNumJornada} registrada con éxito!`);
      refreshDetail();
    } catch (error) {
      console.error('Error al registrar jornada:', error);
      toast.error('Hubo un error al registrar la jornada.');
    }
  };

  const handleDeleteLatestJornada = async () => {
    try {
      await deleteLastJornada(tournament.id);
      toast.success('Se ha eliminado la última jornada registrada.');
      setShowDeleteJornadaModal(false);
      refreshDetail();
    } catch (error) {
      console.error('Error al borrar jornada:', error);
      toast.error('Hubo un error al eliminar la jornada.');
    }
  };

  const handleDeleteLatestMatch = async () => {
    try {
      await deleteLastMatch(tournament.id);
      setShowDeleteMatchModal(false);
      refreshDetail();
    } catch (error) {
      console.error('Error al borrar partido:', error);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* CABECERA DEL TORNEO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{tournament.name}</h2>
        <div className="flex gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-blue-500" /> Temporada {tournament.currentSeasonNumber}
          </span>
          <span className="flex items-center gap-1">
            <Swords className="w-4 h-4 text-orange-500" /> Mejor de {tournament.bestOf}
          </span>
        </div>
      </div>

      {/* NAVEGACIÓN POR PESTAÑAS */}
      <div className="flex bg-gray-200 p-1 rounded-xl gap-1 overflow-x-auto">
        <button onClick={() => setActiveTab('season')} className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === 'season' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          <Medal className="w-4 h-4" /> Temporada
        </button>
        <button onClick={() => setActiveTab('jornadas')} className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === 'jornadas' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          <Calendar className="w-4 h-4" /> Jornadas
        </button>
        <button onClick={() => setActiveTab('historical')} className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === 'historical' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          <History className="w-4 h-4" /> Histórico
        </button>
        <button onClick={() => setActiveTab('matches')} className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === 'matches' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          <Swords className="w-4 h-4" /> Partidos
        </button>
        <button onClick={() => setActiveTab('palmares')} className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-all ${activeTab === 'palmares' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
          <Award className="w-4 h-4" /> Palmarés
        </button>
      </div>

      {/* CONTENIDO: TEMPORADA ACTUAL */}
      {activeTab === 'season' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowSeasonModal(true)}
                disabled={isAdvancing}
                className="text-gray-500 bg-white border border-gray-200 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 hover:text-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isAdvancing ? 'animate-spin' : ''}`} /> 
                Cerrar Temp. {tournament.currentSeasonNumber}
              </button>

              <button 
                onClick={handleFinalizeJornada}
                className="text-blue-600 bg-blue-50 border border-blue-200 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm"
              >
                <Calendar className="w-4 h-4" /> Finalizar Jornada
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {seasonRanking.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No hay partidos jugados esta temporada.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 text-xs sm:text-sm">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 w-8 text-center">#</th>
                      <th className="px-2 sm:px-4 py-3">Jugador</th>
                      <th className="px-2 sm:px-4 py-3 text-center" title="Puntos">Pts</th>
                      <th className="px-2 sm:px-4 py-3 text-center" title="Partidos Jugados">PJ</th>
                      <th className="px-2 sm:px-4 py-3 text-center" title="Sets Ganados">Sets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {seasonRanking.map((p, index) => {
                      const playerInfo = getPlayer(p.playerId);
                      if (!playerInfo) return null;

                      const isLast = index === seasonRanking.length - 1 && seasonRanking.length >= 2;
                      const isSecondToLast = index === seasonRanking.length - 2 && seasonRanking.length >= 3;
                      const punishment = isLast ? tournament.punishmentLast : isSecondToLast ? tournament.punishmentSecondToLast : null;

                      return (
                        <tr key={p.playerId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-2 sm:px-4 py-4 text-center font-semibold text-gray-500">{index + 1}</td>
                          <td className="px-2 sm:px-4 py-4 min-w-[120px]">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Avatar url={playerInfo.avatarUrl} name={playerInfo.name} size="sm" />
                              <div>
                                <span className="font-medium text-gray-900 block truncate">{playerInfo.name}</span>
                                {punishment && (
                                  <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${isLast ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                    <AlertCircle className="w-3 h-3" /> {punishment}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-4 text-center font-bold text-blue-600 text-base">{p.points}</td>
                          <td className="px-2 sm:px-4 py-4 text-center text-gray-500">{p.matchesPlayed || 0}</td>
                          <td className="px-2 sm:px-4 py-4 text-center text-gray-500">{p.setsWon || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              onClick={() => setShowPunishmentModal(true)}
              className="text-gray-600 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 transition-colors shadow-sm"
            >
              <Settings className="w-4 h-4 text-gray-400" /> Reasignar castigos
            </button>

            <button 
              onClick={() => setShowMatchModal(true)}
              className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold hover:bg-black flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Registrar Partido
            </button>
          </div>
        </div>
      )}

      {/* CONTENIDO: NUEVA PESTAÑA JORNADAS */}
      {activeTab === 'jornadas' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Temporada</label>
              <select 
                value={selectedSeasonForJornadas} 
                onChange={(e) => {
                  const sNum = Number(e.target.value);
                  setSelectedSeasonForJornadas(sNum);
                  const jList = jornadasGuardadas.filter((j: any) => j.seasonNumber === sNum);
                  if (jList.length > 0) {
                    setSelectedJornadaNumber(jList[0].jornadaNumber);
                  } else {
                    setSelectedJornadaNumber(1);
                  }
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                {temporadasConJornadas.map(sNum => (
                  <option key={`temp-${sNum}`} value={sNum}>Temporada {sNum}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Jornada</label>
              <select 
                value={selectedJornadaNumber} 
                onChange={(e) => setSelectedJornadaNumber(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
                disabled={jornadasDeLaTemporadaSeleccionada.length === 0}
              >
                {jornadasDeLaTemporadaSeleccionada.length === 0 ? (
                  <option value="">No hay jornadas guardadas</option>
                ) : (
                  jornadasDeLaTemporadaSeleccionada.map((j: any) => (
                    <option key={`jor-${j.jornadaNumber}`} value={j.jornadaNumber}>Jornada {j.jornadaNumber}</option>
                  ))
                )}
              </select>
            </div>

            {jornadasGuardadas.length > 0 && (
              <button
                onClick={() => setShowDeleteJornadaModal(true)}
                className="bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                title="Eliminar última jornada registrada"
              >
                <Trash2 className="w-4 h-4" /> Borrar última
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800">Clasificación - Temp. {selectedSeasonForJornadas} • Jornada {selectedJornadaNumber}</h3>
                {(() => {
                  const currentJornadaObj = jornadasDeLaTemporadaSeleccionada.find((j: any) => j.jornadaNumber === selectedJornadaNumber);
                  if (currentJornadaObj?.date) {
                    return <span className="text-xs text-gray-400">Registrada el {new Date(currentJornadaObj.date).toLocaleDateString()}</span>;
                  }
                  return null;
                })()}
              </div>
              <span className="text-xs text-gray-500 bg-gray-200/60 px-2.5 py-1 rounded-full font-medium">Histórico Oficial</span>
            </div>

            {(() => {
              const currentJornadaObj = jornadasDeLaTemporadaSeleccionada.find((j: any) => j.jornadaNumber === selectedJornadaNumber);
              if (!currentJornadaObj || !currentJornadaObj.ranking || currentJornadaObj.ranking.length === 0) {
                return <div className="p-8 text-center text-gray-500 text-sm">No hay datos registrados para esta jornada. Pulsa en "Finalizar Jornada" en la pestaña Temporada para guardar una instantánea.</div>;
              }

              const indexActualJornada = jornadasDeLaTemporadaSeleccionada.findIndex((j: any) => j.jornadaNumber === selectedJornadaNumber);
              const previousJornadaObj = indexActualJornada > 0 ? jornadasDeLaTemporadaSeleccionada[indexActualJornada - 1] : null;

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 text-xs sm:text-sm">
                      <tr>
                        <th className="px-2 sm:px-4 py-3 w-16 text-center">#</th>
                        <th className="px-2 sm:px-4 py-3">Jugador</th>
                        <th className="px-2 sm:px-4 py-3 text-center" title="Puntos">Pts</th>
                        <th className="px-2 sm:px-4 py-3 text-center" title="Partidos Jugados">PJ</th>
                        <th className="px-2 sm:px-4 py-3 text-center" title="Sets Ganados">Sets</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {currentJornadaObj.ranking.map((row: any) => {
                        const playerInfo = getPlayer(row.playerId);
                        
                        let trendIcon = null;
                        if (previousJornadaObj && previousJornadaObj.ranking) {
                          const prevRow = previousJornadaObj.ranking.find((r: any) => r.playerId === row.playerId);
                          if (prevRow) {
                            if (row.position < prevRow.position) {
                              trendIcon = <span title="Sube posiciones"><TrendingUp className="w-4 h-4 text-green-600 inline ml-1" /></span>;
                            } else if (row.position > prevRow.position) {
                              trendIcon = <span title="Baja posiciones"><TrendingDown className="w-4 h-4 text-red-600 inline ml-1" /></span>;
                            } else {
                              trendIcon = <span title="Mantiene posición"><Minus className="w-4 h-4 text-amber-500 inline ml-1" /></span>;
                            }
                          }
                        }

                        return (
                          <tr key={row.playerId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-2 sm:px-4 py-4 text-center font-semibold text-gray-700">
                              <div className="flex items-center justify-center gap-1">
                                <span>{row.position}</span>
                                {trendIcon}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 min-w-[120px]">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <Avatar url={playerInfo?.avatarUrl || null} name={playerInfo?.name || 'Desconocido'} size="sm" />
                                <span className="font-medium text-gray-900 truncate">{playerInfo?.name || 'Jugador'}</span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-4 text-center font-bold text-blue-600 text-base">{row.points}</td>
                            <td className="px-2 sm:px-4 py-4 text-center text-gray-500">{row.matchesPlayed}</td>
                            <td className="px-2 sm:px-4 py-4 text-center text-gray-500">{row.setsWon}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* CONTENIDO: HISTÓRICO */}
      {activeTab === 'historical' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {historicalRanking.length === 0 ? (
             <div className="p-8 text-center text-gray-500 text-sm">No hay datos históricos.</div>
          ) : (
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
                   {historicalRanking.map((p, index) => {
                     const playerInfo = getPlayer(p.playerId);
                     return (
                       <tr key={p.playerId} className="hover:bg-gray-50">
                         <td className="px-2 sm:px-4 py-3 text-center font-semibold text-gray-500">{index + 1}</td>
                         <td className="px-2 sm:px-4 py-3 min-w-[120px]">
                           <div className="flex items-center gap-2 sm:gap-3">
                             <Avatar url={playerInfo?.avatarUrl || null} name={playerInfo?.name || 'Desc.'} size="sm" />
                             <span className="font-medium text-gray-900 truncate">{playerInfo?.name}</span>
                           </div>
                         </td>
                         <td className="px-2 sm:px-4 py-3 text-center font-bold text-gray-700">{p.points}</td>
                         <td className="px-2 sm:px-4 py-3 text-center text-gray-500">{p.matchesPlayed || 0}</td>
                         <td className="px-2 sm:px-4 py-3 text-center text-gray-500">{p.setsWon || 0}</td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          )}
        </div>
      )}

      {/* CONTENIDO: HISTORIAL DE PARTIDOS */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {matches.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowDeleteMatchModal(true)}
                disabled={isDeleting}
                className="bg-red-50 text-red-600 border border-red-200 px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> {isDeleting ? 'Borrando...' : 'Borrar último partido'}
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {matches.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No se han registrado partidos aún.</div>
              ) : (
                matches.map((m, index) => {
                  const winner = getPlayer(m.winnerId);
                  const loser = getPlayer(m.loserId);
                  
                  const isFirstMatch = index === 0;
                  const isDifferentSeason = !isFirstMatch && m.seasonNumber !== matches[index - 1].seasonNumber;
                  const showSeasonHeader = isFirstMatch || isDifferentSeason;

                  const matchDateStr = new Date(m.date).toLocaleDateString();
                  const prevMatchDateStr = !isFirstMatch ? new Date(matches[index - 1].date).toLocaleDateString() : null;
                  const showDayHeader = !isFirstMatch && !isDifferentSeason && matchDateStr !== prevMatchDateStr;

                  return (
                    <div key={m.id}>
                      {showSeasonHeader && (
                        <div className="bg-gray-100/80 px-4 py-2.5 border-y border-gray-200 flex items-center justify-center gap-2">
                          <div className="h-px bg-gray-300 flex-1"></div>
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Temporada {m.seasonNumber}
                          </span>
                          <div className="h-px bg-gray-300 flex-1"></div>
                        </div>
                      )}

                      {showDayHeader && (
                        <div className="bg-gray-50 px-4 py-1.5 flex items-center justify-center gap-2">
                          <div className="h-px bg-gray-200 flex-1"></div>
                          <span className="text-[11px] font-medium text-gray-400">
                            Jornada / {matchDateStr}
                          </span>
                          <div className="h-px bg-gray-200 flex-1"></div>
                        </div>
                      )}
                      
                      <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-green-700 text-sm flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> {winner?.name}
                          </span>
                          <span className="text-gray-500 text-sm ml-4">{loser?.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded text-sm tracking-widest">
                            {m.winnerSets}-{m.loserSets}
                          </span>
                          <div className="text-xs text-gray-400 mt-1">
                            {matchDateStr}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO: PALMARÉS */}
      {activeTab === 'palmares' && (
        <div className="space-y-3">
          {seasonWinners.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center text-gray-500 text-sm">
              Aún no hay temporadas cerradas. Cierra una temporada para ver al campeón aquí.
            </div>
          ) : (
            seasonWinners.map(sw => (
              <div key={`palmares-${sw.seasonNumber}`} className="bg-white p-4 rounded-2xl shadow-sm border border-yellow-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600 font-bold shrink-0">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-yellow-600 uppercase tracking-wider block">
                      Temporada {sw.seasonNumber}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Avatar url={sw.winnerAvatar} name={sw.winnerName} size="sm" />
                      <span className="font-bold text-gray-900 text-base">{sw.winnerName}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-blue-600 text-lg">{sw.points}</span>
                  <span className="text-xs text-gray-400 block">puntos</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: REGISTRO DE PARTIDO */}
      {showMatchModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowMatchModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <form onSubmit={handleRegisterMatch} className="p-6 space-y-5">
              <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Swords className="w-5 h-5 text-blue-600" /> Registrar Resultado
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ganador</label>
                  <select 
                    required 
                    value={winnerId} 
                    onChange={e => {
                      setWinnerId(e.target.value);
                      if (loserId === e.target.value) setLoserId('');
                    }} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Selecciona al ganador...</option>
                    {players.map(p => <option key={`w-${p.id}`} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perdedor</label>
                  <select 
                    required 
                    value={loserId} 
                    onChange={e => setLoserId(e.target.value)} 
                    disabled={!winnerId}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <option value="">{winnerId ? 'Selecciona al perdedor...' : 'Elige primero un ganador'}</option>
                    {players.filter(p => p.id !== winnerId).map(p => (
                      <option key={`l-${p.id}`} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resultado (Sets)</label>
                <div className="flex gap-2">
                  {possibleScores.map(score => (
                    <label key={`score-${score.label}`} className={`flex-1 flex justify-center items-center py-3 px-3 rounded-xl border-2 cursor-pointer transition-all ${scoreObj === score.label ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-gray-100 bg-white hover:border-gray-200 text-gray-600'}`}>
                      <input type="radio" name="score" value={score.label} checked={scoreObj === score.label} onChange={() => setScoreObj(score.label)} className="sr-only" />
                      {score.label}
                    </label>
                  ))}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !winnerId || !loserId || !scoreObj} 
                className="w-full bg-blue-600 text-white px-4 py-3.5 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors mt-4 shadow-sm"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Partido'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR BORRADO DE PARTIDO */}
      <ConfirmModal
        isOpen={showDeleteMatchModal}
        title="¿Borrar el último partido?"
        message="Esta acción eliminará permanentemente el último partido registrado y revertirá los puntos y estadísticas asociadas. ¿Estás seguro?"
        confirmText="Sí, borrar partido"
        isDangerous={true}
        onConfirm={handleDeleteLatestMatch}
        onClose={() => setShowDeleteMatchModal(false)}
      />

      {/* MODAL: CONFIRMAR BORRADO DE JORNADA */}
      <ConfirmModal
        isOpen={showDeleteJornadaModal}
        title="¿Eliminar la última jornada?"
        message="Esta acción borrará permanentemente la última jornada registrada y restaurará el estado anterior. ¿Estás seguro?"
        confirmText="Sí, eliminar"
        isDangerous={true}
        onConfirm={handleDeleteLatestJornada}
        onClose={() => setShowDeleteJornadaModal(false)}
      />

      {/* MODAL: CONFIRMAR CIERRE DE TEMPORADA */}
      <ConfirmModal
        isOpen={showSeasonModal}
        title={`¿Cerrar Temporada ${tournament.currentSeasonNumber}?`}
        message="La tabla de la temporada actual se limpiará y comenzará de cero, pero los puntos y estadísticas de todos los jugadores se conservarán intactos en la pestaña Histórico y el ganador pasará al Palmarés."
        confirmText="Sí, iniciar nueva temporada"
        isDangerous={false}
        onConfirm={handleAdvanceSeason}
        onClose={() => setShowSeasonModal(false)}
      />

      {/* MODAL: REASIGNAR CASTIGOS */}
      {showPunishmentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowPunishmentModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <form onSubmit={handleSavePunishments} className="p-6 space-y-4">
              <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Settings className="w-5 h-5 text-blue-600" /> Reasignar Castigos
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Castigo Último Puesto</label>
                <input 
                  type="text" 
                  value={editPunishLast} 
                  onChange={e => setEditPunishLast(e.target.value)} 
                  placeholder="Ej: Paga las cervezas" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Castigo Penúltimo Puesto</label>
                <input 
                  type="text" 
                  value={editPunishSecond} 
                  onChange={e => setEditPunishSecond(e.target.value)} 
                  placeholder="Ej: Compra las bolas" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full bg-blue-600 text-white px-4 py-3.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors mt-4 shadow-sm"
              >
                Guardar Castigos
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};