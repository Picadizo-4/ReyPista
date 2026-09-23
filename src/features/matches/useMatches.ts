// src/features/matches/useMatches.ts
import { useState } from 'react';
import { registerMatch } from '../../services/firebase/matches';
import toast from 'react-hot-toast';

export const useMatches = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addMatch = async (
    tournamentId: string,
    seasonNumber: number,
    winnerId: string,
    loserId: string,
    winnerSets: number,
    loserSets: number,
    pointsAwardedLoser: number
  ) => {
    try {
      setIsSubmitting(true);
      await registerMatch(
        tournamentId,
        seasonNumber,
        winnerId,
        loserId,
        winnerSets,
        loserSets,
        pointsAwardedLoser
      );
      toast.success("¡Partido registrado correctamente!");
    } catch (error) {
      toast.error("Error al registrar el partido");
      console.error(error);
      throw error; // Lanzamos el error por si el componente visual necesita abortar alguna acción
    } finally {
      setIsSubmitting(false);
    }
  };

  return { addMatch, isSubmitting };
};