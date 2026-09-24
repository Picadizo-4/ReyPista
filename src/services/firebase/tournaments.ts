// src/services/firebase/tournaments.ts
import { collection, doc, setDoc, getDocs, getDoc, updateDoc, increment, writeBatch, query, where } from 'firebase/firestore';
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
  const batch = writeBatch(db);
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

  // 1. Crear el torneo
  batch.set(newTournamentRef, newTournament);

  // 2. Inicializar los registros de los jugadores para este torneo (Temporada 1 y Histórico)
  playerIds.forEach(playerId => {
    // Inicializar Temporada 1
    const seasonPlayerRef = doc(collection(db, 'seasonPlayers'));
    batch.set(seasonPlayerRef, {
      tournamentId: newTournamentRef.id,
      seasonNumber: 1,
      playerId,
      points: 0,
      matchesPlayed: 0,
      setsWon: 0
    });

    // Inicializar Histórico del Torneo
    const tournamentPlayerRef = doc(collection(db, 'tournamentPlayers'));
    batch.set(tournamentPlayerRef, {
      tournamentId: newTournamentRef.id,
      playerId,
      points: 0,
      matchesPlayed: 0,
      setsWon: 0
    });
  });

  await batch.commit();
  return newTournamentRef.id;
};

export const advanceSeason = async (tournamentId: string): Promise<void> => {
  // 1. Obtenemos el torneo para saber el número de la nueva temporada y los jugadores
  const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);
  if (!tournamentSnap.exists()) throw new Error("Torneo no encontrado");

  const tournamentData = tournamentSnap.data() as Tournament;
  const nextSeasonNumber = (tournamentData.currentSeasonNumber || 1) + 1;
  const playerIds = tournamentData.playerIds || [];

  const batch = writeBatch(db);

  // 2. Actualizamos el número de temporada actual en el torneo
  batch.update(tournamentRef, {
    currentSeasonNumber: nextSeasonNumber
  });

  // 3. Creamos los registros de 'seasonPlayers' para la nueva temporada con puntos a 0
  playerIds.forEach(playerId => {
    const seasonPlayerRef = doc(collection(db, 'seasonPlayers'));
    batch.set(seasonPlayerRef, {
      tournamentId,
      seasonNumber: nextSeasonNumber,
      playerId,
      points: 0,
      matchesPlayed: 0,
      setsWon: 0
    });
  });

  await batch.commit();
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

export const saveJornada = async (tournamentId: string, nuevaJornada: any) => {
  const tournamentRef = doc(db, 'tournaments', tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);
  if (!tournamentSnap.exists()) throw new Error("Torneo no encontrado");
  
  const currentJornadas = tournamentSnap.data().jornadas || [];
  const updatedJornadas = [...currentJornadas, nuevaJornada];
  
  await updateDoc(tournamentRef, { jornadas: updatedJornadas });
};

export const deleteLastJornada = async (tournamentId: string) => {
  const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);
  if (!tournamentSnap.exists()) throw new Error("Torneo no encontrado");
  
  const data = tournamentSnap.data();
  const currentJornadas = data.jornadas || [];
  if (currentJornadas.length === 0) return;

  currentJornadas.sort((a: any, b: any) => {
    if (a.seasonNumber !== b.seasonNumber) {
      return b.seasonNumber - a.seasonNumber;
    }
    return b.jornadaNumber - a.jornadaNumber;
  });

  currentJornadas.shift();

  currentJornadas.sort((a: any, b: any) => {
    if (a.seasonNumber !== b.seasonNumber) {
      return a.seasonNumber - b.seasonNumber;
    }
    return a.jornadaNumber - b.jornadaNumber;
  });
  
  await updateDoc(tournamentRef, { jornadas: currentJornadas });
};