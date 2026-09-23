// src/core/types.ts

/**
 * JUGADOR (Global - Pantalla 1)
 * Contiene los acumuladores de TODOS los torneos para la Súper Tabla.
 */
export interface Player {
  id: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  totalMatches: number;
  totalSetsWon: number;
  bestStreak: number;
  currentStreak: number;
  isActive: boolean; // false si se elimina en "modo legado" (Soft Delete)
}

/**
 * TORNEO (Pantalla 2)
 * Define las reglas de una sala concreta.
 */
export interface Tournament {
  id: string;
  name: string;
  bestOf: number;
  setsToWin: number;
  punishmentLast: string | null;
  punishmentSecondToLast: string | null;
  currentSeasonNumber: number;
  createdAt: number;
  playerIds: string[]; // <-- NUEVO CAMPO
}

/**
 * JUGADOR DEL TORNEO (Histórico del Torneo)
 * Acumuladores de un jugador dentro de un torneo concreto (suma de todas sus temporadas).
 * Nunca se reinicia.
 */
export interface TournamentPlayer {
  id: string; // Compuesto por: torneoId_jugadorId
  tournamentId: string;
  playerId: string;
  points: number;
  matchesPlayed: number;
  setsWon: number;
}

/**
 * JUGADOR DE LA TEMPORADA (Clasificación Actual)
 * Los puntos que SÍ se reinician al pulsar "Finalizar Temporada".
 */
export interface SeasonPlayer {
  id: string; // Compuesto por: torneoId_temporada_jugadorId
  tournamentId: string;
  seasonNumber: number;
  playerId: string;
  points: number;
  matchesPlayed: number;
  setsWon: number;
}

/**
 * PARTIDO (Historial)
 * Registro inmutable del resultado.
 */
export interface Match {
  id: string;
  tournamentId: string;
  seasonNumber: number;
  date: number; // Timestamp
  winnerId: string;
  loserId: string;
  winnerSets: number;
  loserSets: number;
  pointsAwardedWinner: number; // Siempre 3
  pointsAwardedLoser: number; // 0 o 1
}