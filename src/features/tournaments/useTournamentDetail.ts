// src/features/tournaments/useTournamentDetail.ts
import { useState, useEffect, useCallback } from 'react';
import { getTournamentData, type SeasonWinner } from '../../services/firebase/queries';
import { advanceSeason as advanceSeasonService, updatePunishments as updatePunishmentsService } from '../../services/firebase/tournaments';
import type { Tournament, Player, SeasonPlayer, TournamentPlayer, Match } from '../../core/types';
import toast from 'react-hot-toast';

export const useTournamentDetail = (tournamentId: string | undefined) => {
  const [data, setData] = useState<{
    tournament: Tournament | null;
    players: Player[];
    seasonRanking: SeasonPlayer[];
    historicalRanking: TournamentPlayer[];
    matches: Match[];
    seasonWinners: SeasonWinner[];
  }>({
    tournament: null,
    players: [],
    seasonRanking: [],
    historicalRanking: [],
    matches: [],
    seasonWinners: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancing, setIsAdvancing] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setIsLoading(true);
      const result = await getTournamentData(tournamentId);
      setData({
        tournament: result.tournament,
        players: result.tournamentPlayers,
        seasonRanking: result.seasonRanking,
        historicalRanking: result.historicalRanking,
        matches: result.matches,
        seasonWinners: result.seasonWinners
      });
    } catch (error) {
      toast.error("Error al cargar los datos del torneo");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAdvanceSeason = async () => {
    if (!tournamentId) return;
    try {
      setIsAdvancing(true);
      await advanceSeasonService(tournamentId);
      toast.success("¡Nueva temporada iniciada!");
      await fetchDetail(); 
    } catch (error) {
      toast.error("Error al cambiar de temporada");
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleUpdatePunishments = async (last: string | null, second: string | null) => {
    if (!tournamentId) return;
    try {
      await updatePunishmentsService(tournamentId, last, second);
      toast.success("Castigos actualizados correctamente");
      await fetchDetail();
    } catch (error) {
      toast.error("Error al actualizar los castigos");
    }
  };

  return { ...data, isLoading, isAdvancing, refreshDetail: fetchDetail, handleAdvanceSeason, handleUpdatePunishments };
};