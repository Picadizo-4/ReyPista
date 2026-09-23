// src/services/firebase/matches.ts
import { doc, collection, runTransaction, increment } from 'firebase/firestore';
import { db } from './config';
import type { Match, Player } from '../../core/types';

export const registerMatch = async (
  tournamentId: string,
  seasonNumber: number,
  winnerId: string,
  loserId: string,
  winnerSets: number,
  loserSets: number,
  pointsAwardedLoser: number
): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    // 1. Preparamos todas las referencias a los documentos que vamos a tocar
    const matchRef = doc(collection(db, 'matches'));
    const globalWinnerRef = doc(db, 'players', winnerId);
    const globalLoserRef = doc(db, 'players', loserId);
    
    // IDs compuestos para asegurar que un jugador tiene un único registro por torneo/temporada
    const tWinnerRef = doc(db, 'tournamentPlayers', `${tournamentId}_${winnerId}`);
    const tLoserRef = doc(db, 'tournamentPlayers', `${tournamentId}_${loserId}`);
    const sWinnerRef = doc(db, 'seasonPlayers', `${tournamentId}_${seasonNumber}_${winnerId}`);
    const sLoserRef = doc(db, 'seasonPlayers', `${tournamentId}_${seasonNumber}_${loserId}`);

    // 2. Lecturas obligatorias (para calcular si el ganador ha superado su mejor racha histórica)
    const globalWinnerSnap = await transaction.get(globalWinnerRef);
    if (!globalWinnerSnap.exists()) throw new Error("Ganador no encontrado en la base global");
    
    const winnerData = globalWinnerSnap.data() as Player;
    const newCurrentStreak = winnerData.currentStreak + 1;
    const newBestStreak = Math.max(newCurrentStreak, winnerData.bestStreak);

    // 3. Escrituras atómicas
    // A. Guardamos el registro del partido
    transaction.set(matchRef, {
      id: matchRef.id,
      tournamentId,
      seasonNumber,
      date: Date.now(),
      winnerId,
      loserId,
      winnerSets,
      loserSets,
      pointsAwardedWinner: 3, // Regla de negocio inmutable
      pointsAwardedLoser
    } as Match);

    // B. Actualizamos Ranking Global (usamos increment para delegar el cálculo al servidor)
    transaction.update(globalWinnerRef, {
      totalPoints: increment(3),
      totalMatches: increment(1),
      totalSetsWon: increment(winnerSets),
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak
    });

    transaction.update(globalLoserRef, {
      totalPoints: increment(pointsAwardedLoser),
      totalMatches: increment(1),
      totalSetsWon: increment(loserSets),
      currentStreak: 0 // El perdedor rompe su racha
    });

    // C. Actualizamos Histórico del Torneo y Temporada Actual
    // Usamos { merge: true } para que si es el primer partido que juegan, el documento 
    // se cree automáticamente sin dar error, y si ya existe, solo sume los puntos.
    const winnerStats = {
      tournamentId, playerId: winnerId,
      points: increment(3), matchesPlayed: increment(1), setsWon: increment(winnerSets)
    };
    
    const loserStats = {
      tournamentId, playerId: loserId,
      points: increment(pointsAwardedLoser), matchesPlayed: increment(1), setsWon: increment(loserSets)
    };

    transaction.set(tWinnerRef, winnerStats, { merge: true });
    transaction.set(tLoserRef, loserStats, { merge: true });
    transaction.set(sWinnerRef, { ...winnerStats, seasonNumber }, { merge: true });
    transaction.set(sLoserRef, { ...loserStats, seasonNumber }, { merge: true });
  });
};