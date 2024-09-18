import React, { createContext, useContext, useState, useEffect } from 'react';
import Toast from 'react-native-toast-message';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [queue, setQueue] = useState([]);
  const [votes, setVotes] = useState(0);
  const [totalClients, setTotalClients] = useState(0);

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
        } else if (data.action === 'roomCreated') {
          setRoomCode(data.roomCode);
        } else if (data.action === 'joinedRoom') {
          setRoomCode(data.roomCode);
          setQueue(data.queue);
        } else if (data.action === 'votesUpdated') {
          setVotes(data.votes);
          setTotalClients(data.totalClients);
        }
      };

      ws.addEventListener('message', handleMessage);

      return () => {
        ws.removeEventListener('message', handleMessage);
      };
    }
  }, [ws]);

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
      setTotalClients
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