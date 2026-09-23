// src/services/firebase/tournaments.ts
import { collection, doc, setDoc, getDocs, updateDoc, increment, writeBatch, query, where } from 'firebase/firestore';
import { db } from './config';
import type { Tournament } from '../../core/types';

const TOURNAMENTS_COLLECTION = 'tournaments';

export const getTournaments = async (): Promise<Tournament[]> => {
  const snap = await getDocs(collection(db, TOURNAMENTS_COLLECTION));
  return snap.docs.map(doc => doc.data() as Tournament);
};

export const createTournament = async (
  name: string, 
  bestOf: number, 
  punishmentLast: string | null,
  punishmentSecondToLast: string | null,
  playerIds: string[]
): Promise<string> => {
  const newTournamentRef = doc(collection(db, TOURNAMENTS_COLLECTION));
  
  const newTournament: Tournament = {
    id: newTournamentRef.id,
    name,
    bestOf,
    setsToWin: Math.ceil(bestOf / 2),
    punishmentLast,
    punishmentSecondToLast,
    currentSeasonNumber: 1,
    createdAt: Date.now(),
    playerIds
  };

  await setDoc(newTournamentRef, newTournament);
  return newTournamentRef.id;
};

export const advanceSeason = async (tournamentId: string): Promise<void> => {
  const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
  await updateDoc(tournamentRef, {
    currentSeasonNumber: increment(1)
  });
};

export const removeTournamentData = async (tournamentId: string, removeGlobalPoints: boolean): Promise<void> => {
  const batch = writeBatch(db);
  
  // 1. Eliminamos el documento del torneo
  batch.delete(doc(db, TOURNAMENTS_COLLECTION, tournamentId));

  // 2. Leemos todo lo relacionado con el torneo
  const tpSnap = await getDocs(query(collection(db, 'tournamentPlayers'), where('tournamentId', '==', tournamentId)));
  const spSnap = await getDocs(query(collection(db, 'seasonPlayers'), where('tournamentId', '==', tournamentId)));
  const mSnap = await getDocs(query(collection(db, 'matches'), where('tournamentId', '==', tournamentId)));

  // 3. Si el usuario quiere, restamos las estadísticas globales
  if (removeGlobalPoints) {
    tpSnap.docs.forEach(d => {
      const tpData = d.data();
      const playerRef = doc(db, 'players', tpData.playerId);
      batch.update(playerRef, {
        totalPoints: increment(-(tpData.points || 0)),
        totalMatches: increment(-(tpData.matchesPlayed || 0)),
        totalSetsWon: increment(-(tpData.setsWon || 0))
      });
    });
  }

  // 4. SIEMPRE borramos los datos internos del torneo para no dejar "basura" en Firebase
  tpSnap.docs.forEach(d => batch.delete(d.ref));
  spSnap.docs.forEach(d => batch.delete(d.ref));
  mSnap.docs.forEach(d => batch.delete(d.ref));

  // Ejecutamos todos los cambios a la vez
  await batch.commit();
};

export const updatePunishments = async (
  tournamentId: string, 
  punishmentLast: string | null, 
  punishmentSecondToLast: string | null
): Promise<void> => {
  const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
  await updateDoc(tournamentRef, {
    punishmentLast,
    punishmentSecondToLast
  });
};