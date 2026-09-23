// src/features/players/usePlayers.ts
import { useState, useEffect, useCallback } from 'react';
import { getActivePlayers, createPlayer, softDeletePlayer } from '../../services/firebase/players';
import type { Player } from '../../core/types';
import toast from 'react-hot-toast';

export const usePlayers = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlayers = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getActivePlayers();
      setPlayers(data);
    } catch (error) {
      toast.error("Error al cargar los jugadores");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const addPlayer = async (name: string) => {
    try {
      await createPlayer(name);
      toast.success(`${name} añadido al roster`);
      await fetchPlayers(); 
    } catch (error) {
      toast.error("No se pudo crear el jugador");
    }
  };

  const removePlayer = async (id: string, name: string) => {
    try {
      await softDeletePlayer(id);
      toast.success(`${name} ocultado (modo legado)`);
      setPlayers(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      toast.error("Error al eliminar al jugador");
    }
  };

  return { players, isLoading, addPlayer, removePlayer, refreshPlayers: fetchPlayers };
};