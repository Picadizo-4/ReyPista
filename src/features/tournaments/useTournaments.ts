// src/features/tournaments/useTournaments.ts
import { useState, useEffect, useCallback } from 'react';
import { getTournaments, createTournament, removeTournamentData } from '../../services/firebase/tournaments';
import type { Tournament } from '../../core/types';
import toast from 'react-hot-toast';

export const useTournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTournaments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getTournaments();
      setTournaments(data);
    } catch (error) {
      toast.error("Error al cargar los torneos");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const addTournament = async (
    name: string, 
    bestOf: number, 
    punishmentLast: string | null,
    punishmentSecondToLast: string | null,
    playerIds: string[]
  ) => {
    try {
      await createTournament(name, bestOf, punishmentLast, punishmentSecondToLast, playerIds);
      toast.success(`Torneo "${name}" creado con éxito`);
      await fetchTournaments();
    } catch (error) {
      toast.error("No se pudo crear el torneo");
    }
  };

  const deleteTournament = async (id: string, name: string, removeGlobal: boolean) => {
    try {
      await removeTournamentData(id, removeGlobal);
      toast.success(`Torneo "${name}" eliminado`);
      await fetchTournaments();
    } catch (error) {
      toast.error("Error al eliminar el torneo");
    }
  };

  return { tournaments, isLoading, addTournament, deleteTournament, refreshTournaments: fetchTournaments };
};

