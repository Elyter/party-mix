import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageTypes, Actions, createMessage } from '../constants/websocket';
const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [ws, setWs] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [queue, setQueue] = useState([]);
  const [votes, setVotes] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [clientId, setClientId] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 2000;

  const connectWebSocket = async () => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: 'Impossible de se connecter au serveur après plusieurs tentatives',
      });
      return;
    }

    try {
      if (ws?.readyState === WebSocket.OPEN) return;

      const newWs = new WebSocket('wss://eliottb.dev:8080');
      
      newWs.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
        Toast.show({
          type: 'error',
          text1: 'Erreur de connexion',
          text2: 'La connexion au serveur a échoué',
        });
      };

      newWs.onclose = () => {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, RECONNECT_DELAY);
      };

      setWs(newWs);
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Message reçu du serveur:', data);

    if (data.error === "Room not found") {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Cette salle n\'existe pas',
        visibilityTime: 3000,
      });
      setRoomCode(null);
      return;
    }

    const messageHandlers = {
      [MessageTypes.CLIENT_ID]: () => setClientId(data.clientId),
      ['roomCreated']: () => {
        setRoomCode(data.roomCode);
        ws.send(JSON.stringify({ action: 'joinRoom', roomId: data.roomCode }));
      },
      ['roomJoined']: () => {
        setRoomCode(data.roomCode);
        setQueue(data.queue || []);
        data.currentTrack && setCurrentTrack(data.currentTrack);
      },
      ['queueUpdate']: () => {
        setQueue(data.queue || []);
        data.currentTrack !== undefined && setCurrentTrack(data.currentTrack);
      },
      [MessageTypes.VOTE_UPDATE]: () => {
        setVotes(data.totalVotes);
        setTotalClients(data.totalClients);
      },
      [MessageTypes.ERROR]: () => {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: data.message || data.error || 'Une erreur est survenue',
          visibilityTime: 3000,
        });
      },
      ['voteCompleted']: () => {
        if (data.result === 'passed') setVotes(0);
      }
    };

    const handler = messageHandlers[data.type];
    if (handler) handler();
  };

  useEffect(() => {
    if (ws) {
      ws.addEventListener('message', handleWebSocketMessage);
      return () => ws.removeEventListener('message', handleWebSocketMessage);
    }
  }, [ws]);

  useEffect(() => {
    if (clientId) {
      console.log('ClientId mis à jour dans le contexte:', clientId);
    } else {
      console.log('ClientId est null dans le contexte');
    }
  }, [clientId]);

  useEffect(() => {
    if (roomCode) {
      AsyncStorage.setItem('roomCode', roomCode);
    } else {
      AsyncStorage.removeItem('roomCode');
    }
  }, [roomCode]);

  const value = {
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
    setClientId,
    currentTrack,
    setCurrentTrack
  };

  return (
    <WebSocketContext.Provider value={value}>
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