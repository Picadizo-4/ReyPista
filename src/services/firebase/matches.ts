// src/services/firebase/matches.ts
import { collection, doc, getDocs, query, where, writeBatch, increment } from 'firebase/firestore';
import { db } from './config';

const MATCHES_COLLECTION = 'matches';

export const registerMatch = async (
  tournamentId: string,
  seasonNumber: number,
  winnerId: string,
  loserId: string,
  winnerSets: number,
  loserSets: number,
  pointsAwardedLoser: number
): Promise<string> => {
  const batch = writeBatch(db);

  // 1. Crear el documento del partido
  const newMatchRef = doc(collection(db, MATCHES_COLLECTION));
  const newMatch = {
    tournamentId,
    seasonNumber,
    winnerId,
    loserId,
    winnerSets,
    loserSets,
    pointsAwardedLoser,
    date: Date.now()
  };
  batch.set(newMatchRef, newMatch);

  // 2. Actualizar estadísticas en seasonPlayers (Temporada actual)
  const spQuery = query(
    collection(db, 'seasonPlayers'),
    where('tournamentId', '==', tournamentId),
    where('seasonNumber', '==', seasonNumber)
  );
  const spSnap = await getDocs(spQuery);

  spSnap.docs.forEach((docSnap: any) => {
    const data = docSnap.data();
    if (data.playerId === winnerId) {
      batch.update(docSnap.ref, {
        points: increment(3),
        matchesPlayed: increment(1),
        setsWon: increment(winnerSets)
      });
    } else if (data.playerId === loserId) {
      batch.update(docSnap.ref, {
        points: increment(pointsAwardedLoser),
        matchesPlayed: increment(1),
        setsWon: increment(loserSets)
      });
    }
  });

  // 3. Actualizar estadísticas en tournamentPlayers (Histórico del Torneo)
  const tpQuery = query(
    collection(db, 'tournamentPlayers'),
    where('tournamentId', '==', tournamentId)
  );
  const tpSnap = await getDocs(tpQuery);

  tpSnap.docs.forEach((docSnap: any) => {
    const data = docSnap.data();
    if (data.playerId === winnerId) {
      batch.update(docSnap.ref, {
        points: increment(3),
        matchesPlayed: increment(1),
        setsWon: increment(winnerSets)
      });
    } else if (data.playerId === loserId) {
      batch.update(docSnap.ref, {
        points: increment(pointsAwardedLoser),
        matchesPlayed: increment(1),
        setsWon: increment(loserSets)
      });
    }
  });

  // 4. Actualizar estadísticas globales en la colección principal 'players' (Global Dashboard)
  const winnerPlayerRef = doc(db, 'players', winnerId);
  batch.update(winnerPlayerRef, {
    totalPoints: increment(3),
    totalMatches: increment(1),
    totalSetsWon: increment(winnerSets)
  });

  const loserPlayerRef = doc(db, 'players', loserId);
  batch.update(loserPlayerRef, {
    totalPoints: increment(pointsAwardedLoser),
    totalMatches: increment(1),
    totalSetsWon: increment(loserSets)
  });

  await batch.commit();
  return newMatchRef.id;
};

export const deleteLastMatchService = async (tournamentId: string) => {
  const matchesQuery = query(
    collection(db, MATCHES_COLLECTION), 
    where('tournamentId', '==', tournamentId)
  );
  const matchesSnap = await getDocs(matchesQuery);
  if (matchesSnap.empty) throw new Error("No hay partidos registrados en este torneo.");

  const matchesList = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
  matchesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const lastMatch = matchesList[0];

  const batch = writeBatch(db);

  // 1. Revertir estadísticas en seasonPlayers (Temporada actual)
  const spQuery = query(
    collection(db, 'seasonPlayers'),
    where('tournamentId', '==', tournamentId),
    where('seasonNumber', '==', lastMatch.seasonNumber)
  );
  const spSnap = await getDocs(spQuery);
  
  spSnap.docs.forEach((docSnap: any) => {
    const data = docSnap.data();
    if (data.playerId === lastMatch.winnerId) {
      batch.update(docSnap.ref, {
        points: increment(-3),
        matchesPlayed: increment(-1),
        setsWon: increment(-lastMatch.winnerSets)
      });
    } else if (data.playerId === lastMatch.loserId) {
      batch.update(docSnap.ref, {
        points: increment(-(lastMatch.pointsAwardedLoser || 0)),
        matchesPlayed: increment(-1),
        setsWon: increment(-lastMatch.loserSets)
      });
    }
  });

  // 2. Revertir estadísticas en tournamentPlayers (Histórico del Torneo)
  const tpQuery = query(
    collection(db, 'tournamentPlayers'),
    where('tournamentId', '==', tournamentId)
  );
  const tpSnap = await getDocs(tpQuery);

  tpSnap.docs.forEach((docSnap: any) => {
    const data = docSnap.data();
    if (data.playerId === lastMatch.winnerId) {
      batch.update(docSnap.ref, {
        points: increment(-3),
        matchesPlayed: increment(-1),
        setsWon: increment(-lastMatch.winnerSets)
      });
    } else if (data.playerId === lastMatch.loserId) {
      batch.update(docSnap.ref, {
        points: increment(-(lastMatch.pointsAwardedLoser || 0)),
        matchesPlayed: increment(-1),
        setsWon: increment(-lastMatch.loserSets)
      });
    }
  });

  // 3. Revertir estadísticas globales en la colección principal 'players' (Global Dashboard)
  const winnerPlayerRef = doc(db, 'players', lastMatch.winnerId);
  batch.update(winnerPlayerRef, {
    totalPoints: increment(-3),
    totalMatches: increment(-1),
    totalSetsWon: increment(-lastMatch.winnerSets)
  });

  const loserPlayerRef = doc(db, 'players', lastMatch.loserId);
  batch.update(loserPlayerRef, {
    totalPoints: increment(-(lastMatch.pointsAwardedLoser || 0)),
    totalMatches: increment(-1),
    totalSetsWon: increment(-lastMatch.loserSets)
  });

  // 4. Borrar el documento del partido
  batch.delete(doc(db, MATCHES_COLLECTION, lastMatch.id));

  await batch.commit();
};