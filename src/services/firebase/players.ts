// src/services/firebase/players.ts
import { collection, doc, setDoc, getDocs, updateDoc, query, where } from 'firebase/firestore';
import { db } from './config';
import type { Player } from '../../core/types';

const PLAYERS_COLLECTION = 'players';

export const createPlayer = async (name: string): Promise<string> => {
  const newPlayerRef = doc(collection(db, PLAYERS_COLLECTION));
  
  const newPlayer: Player = {
    id: newPlayerRef.id,
    name,
    avatarUrl: null, // Más adelante implementaremos Storage para las fotos
    totalPoints: 0,
    totalMatches: 0,
    totalSetsWon: 0,
    bestStreak: 0,
    currentStreak: 0,
    isActive: true, // true por defecto al crear
  };

  await setDoc(newPlayerRef, newPlayer);
  return newPlayerRef.id;
};

// Obtenemos solo los jugadores activos (para los selectores de los partidos)
export const getActivePlayers = async (): Promise<Player[]> => {
  const q = query(collection(db, PLAYERS_COLLECTION), where("isActive", "==", true));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => doc.data() as Player);
};

// Soft Delete (Modo Legado): Oculta al jugador pero mantiene sus estadísticas y partidos pasados
export const softDeletePlayer = async (playerId: string): Promise<void> => {
  const playerRef = doc(db, PLAYERS_COLLECTION, playerId);
  await updateDoc(playerRef, {
    isActive: false
  });
};