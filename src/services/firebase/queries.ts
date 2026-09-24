// src/services/firebase/queries.ts
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './config';
import type { Tournament, SeasonPlayer, TournamentPlayer, Match, Player } from '../../core/types';

export interface SeasonWinner {
  seasonNumber: number;
  winnerName: string;
  winnerAvatar: string | null;
  points: number;
}

export const getTournamentData = async (tournamentId: string) => {
  const tSnap = await getDoc(doc(db, 'tournaments', tournamentId));
  if (!tSnap.exists()) throw new Error("Torneo no encontrado en la base de datos");
  const tournament = tSnap.data() as Tournament;

  const pSnap = await getDocs(query(collection(db, 'players'), where('isActive', '==', true)));
  const allPlayers = pSnap.docs.map(d => d.data() as Player);
  
  const safePlayerIds = tournament.playerIds || [];
  const tournamentPlayers = allPlayers.filter(p => safePlayerIds.includes(p.id));

  // 1. Temporada Actual
  const sSnap = await getDocs(query(
    collection(db, 'seasonPlayers'),
    where('tournamentId', '==', tournamentId),
    where('seasonNumber', '==', tournament.currentSeasonNumber)
  ));
  const seasonRanking = sSnap.docs.map(d => d.data() as SeasonPlayer).sort((a, b) => b.points - a.points);

  // 2. Histórico Total
  const hSnap = await getDocs(query(
    collection(db, 'tournamentPlayers'),
    where('tournamentId', '==', tournamentId)
  ));
  const historicalRanking = hSnap.docs.map(d => d.data() as TournamentPlayer).sort((a, b) => b.points - a.points);

  // 3. Partidos
  const mSnap = await getDocs(query(
    collection(db, 'matches'),
    where('tournamentId', '==', tournamentId)
  ));
  const matches = mSnap.docs.map(d => d.data() as Match).sort((a, b) => b.date - a.date);

  // 4. Palmarés seguro
  const seasonWinners: SeasonWinner[] = [];
  try {
    const allSeasonPlayersSnap = await getDocs(query(
      collection(db, 'seasonPlayers'),
      where('tournamentId', '==', tournamentId)
    ));
    
    const seasonPlayersData = allSeasonPlayersSnap.docs.map(d => d.data() as SeasonPlayer);

    const currentSeason = tournament.currentSeasonNumber || 1;
    for (let s = 1; s < currentSeason; s++) {
      const playersInSeason = seasonPlayersData.filter(sp => sp.seasonNumber === s);
      if (playersInSeason.length > 0) {
        playersInSeason.sort((a, b) => b.points - a.points);
        const topPlayerRecord = playersInSeason[0];
        const playerInfo = allPlayers.find(p => p.id === topPlayerRecord.playerId);

        if (playerInfo) {
          seasonWinners.push({
            seasonNumber: s,
            winnerName: playerInfo.name,
            winnerAvatar: playerInfo.avatarUrl,
            points: topPlayerRecord.points
          });
        }
      }
    }
  } catch (err) {
    console.error("Aviso menor al calcular el palmarés:", err);
  }

  return { tournament, tournamentPlayers, seasonRanking, historicalRanking, matches, seasonWinners };
};

export interface PlayerStats {
  totalWins: number;
  totalLosses: number;
  winRate: number;
  tournamentsWon: number;
  currentStreak: number;    // Racha actual de victorias seguidas
  maxStreak: number;        // Mejor racha histórica
  wonTournamentsList: { tournamentName: string; seasonNumber: number; points: number }[];
}

export const getPlayerDetailedStats = async (playerId: string): Promise<PlayerStats> => {
  // 1. Obtener todos los partidos donde participó el jugador
  const matchesWinSnap = await getDocs(query(collection(db, 'matches'), where('winnerId', '==', playerId)));
  const matchesLossSnap = await getDocs(query(collection(db, 'matches'), where('loserId', '==', playerId)));
  
  const totalWins = matchesWinSnap.size;
  const totalLosses = matchesLossSnap.size;
  const totalMatches = totalWins + totalLosses;
  const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  // 2. Calcular rachas ordenando todos sus partidos cronológicamente
  const allPlayerMatches: { date: number; isWin: boolean }[] = [];
  
  matchesWinSnap.docs.forEach(d => {
    const data = d.data();
    allPlayerMatches.push({ date: data.date || 0, isWin: true });
  });
  
  matchesLossSnap.docs.forEach(d => {
    const data = d.data();
    allPlayerMatches.push({ date: data.date || 0, isWin: false });
  });

  // Ordenar de más antiguo a más reciente para calcular rachas correctamente
  allPlayerMatches.sort((a, b) => a.date - b.date);

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 0;

  for (const match of allPlayerMatches) {
    if (match.isWin) {
      tempStreak++;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    } else {
      tempStreak = 0; // Se rompe la racha
    }
  }

  // La racha actual se calcula mirando los partidos desde el final hacia atrás
  currentStreak = 0;
  for (let i = allPlayerMatches.length - 1; i >= 0; i--) {
    if (allPlayerMatches[i].isWin) {
      currentStreak++;
    } else {
      break; // En cuanto encuentra una derrota, se corta la racha actual
    }
  }

  // 3. Calcular torneos/temporadas ganadas buscando en seasonPlayers
  const spSnap = await getDocs(query(collection(db, 'seasonPlayers'), where('playerId', '==', playerId)));
  const playerSeasonRecords = spSnap.docs.map(d => d.data() as SeasonPlayer);

  const tSnap = await getDocs(collection(db, 'tournaments'));
  const tournamentsMap = new Map<string, string>();
  tSnap.docs.forEach(d => tournamentsMap.set(d.id, d.data().name));

  const wonTournamentsList: { tournamentName: string; seasonNumber: number; points: number }[] = [];

  for (const record of playerSeasonRecords) {
    const tId = record.tournamentId;
    const seasonNum = record.seasonNumber;

    const seasonQuery = await getDocs(query(
      collection(db, 'seasonPlayers'),
      where('tournamentId', '==', tId),
      where('seasonNumber', '==', seasonNum)
    ));

    const seasonParticipants = seasonQuery.docs.map(d => d.data() as SeasonPlayer);
    if (seasonParticipants.length > 0) {
      seasonParticipants.sort((a, b) => b.points - a.points);
      if (seasonParticipants[0].playerId === playerId) {
        const tName = tournamentsMap.get(tId) || 'Torneo';
        const exists = wonTournamentsList.some(item => item.tournamentName === tName && item.seasonNumber === seasonNum);
        if (!exists) {
          wonTournamentsList.push({
            tournamentName: tName,
            seasonNumber: seasonNum,
            points: record.points
          });
        }
      }
    }
  }

  return {
    totalWins,
    totalLosses,
    winRate,
    tournamentsWon: wonTournamentsList.length,
    currentStreak,
    maxStreak,
    wonTournamentsList
  };
};