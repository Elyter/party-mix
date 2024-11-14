import React, { createContext, useContext, useState, useEffect } from 'react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [queue, setQueue] = useState([]);
  const [votes, setVotes] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [clientId, setClientId] = useState(null);

  useEffect(() => {
    if (ws) {
      const handleMessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Message reçu du serveur:', data);

        if (data.error) {
          Toast.show({
            type: 'error',
            text1: 'Erreur',
            text2: data.error,
          });
        } else if (data.action === 'queueUpdated') {
          setQueue(data.queue);
          console.log('Queue mise à jour avec', data.queue.length, 'titres');
        } else if (data.action === 'roomCreated') {
          setRoomCode(data.roomCode);
          ws.send(JSON.stringify({ action: 'joinRoom', roomCode: data.roomCode, clientId }));
          // Sauvegarder le code de la salle dans AsyncStorage
          AsyncStorage.setItem('roomCode', data.roomCode);
          console.log('Code de la salle sauvegardé dans AsyncStorage:', data.roomCode);
        } else if (data.action === 'joinedRoom') {
          setRoomCode(data.roomCode);
          console.log('Rejoint la room', data.roomCode);
          Toast.show({
            type: 'success',
            text1: 'Rejoindre la room',
            text2: `Rejoint la room ${data.roomCode}`,
          });
          AsyncStorage.setItem('roomCode', data.roomCode);
          console.log('Code de la salle sauvegardé dans AsyncStorage:', data.roomCode);
          setQueue(data.queue);
        } else if (data.action === 'votesUpdated') {
          setVotes(data.votes);
          setTotalClients(data.totalClients);
        } else if (data.action === 'queueRefreshed') {
          setQueue(data.queue);
        }
      };

      ws.addEventListener('message', handleMessage);

      return () => {
        ws.removeEventListener('message', handleMessage);
      };
    }
  }, [ws]);

  useEffect(() => {
    if (clientId) {
      console.log('ClientId mis à jour dans le contexte:', clientId);
    } else {
      console.log('ClientId est null dans le contexte');
    }
  }, [clientId]);

  return (
    <WebSocketContext.Provider value={{ 
      ws, 
      setWs, 
      roomCode, 
      setRoomCode, 
      queue, 
      setQueue,
      votes,
      setVotes,
      totalClients,
      setTotalClients,
      clientId,
      setClientId
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === null) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};