// src/features/matches/useMatches.ts
import { useState } from 'react';
import { registerMatch, deleteLastMatchService } from '../../services/firebase/matches';
import toast from 'react-hot-toast';

export const useMatches = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteLastMatch = async (tournamentId: string) => {
    try {
      setIsDeleting(true);
      await deleteLastMatchService(tournamentId);
      toast.success("Último partido borrado y estadísticas revertidas");
    } catch (error: any) {
      console.error("Error al borrar el último partido:", error);
      toast.error(error.message || "Error al borrar el partido");
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return { addMatch, deleteLastMatch, isSubmitting, isDeleting };
};