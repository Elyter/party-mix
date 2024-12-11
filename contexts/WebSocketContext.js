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
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('WebSocket déjà connecté');
        return;
      }

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
        reconnectAttemptsRef.current += 1;
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

  useEffect(() => {
    if (ws) {
      const handleMessage = (event) => {
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

        switch (data.type) {
          case MessageTypes.CLIENT_ID:
            setClientId(data.clientId);
            break;

          case 'roomCreated':
            setRoomCode(data.roomCode);
            ws.send(JSON.stringify({ 
              action: 'joinRoom', 
              roomId: data.roomCode 
            }));
            break;

          case 'roomJoined':
            setRoomCode(data.roomCode);
            setQueue(data.queue || []);
            if (data.currentTrack) {
              setCurrentTrack(data.currentTrack);
            }
            break;

          case 'queueUpdate':
            console.log('Queue mise à jour avec:', data.queue);
            setQueue(data.queue || []);
            if (data.currentTrack !== undefined) {
              setCurrentTrack(data.currentTrack);
            }
            break;

          case MessageTypes.SONG_ADDED:
            // Supprimer cette partie car la queue est déjà mise à jour par queueUpdate
            // setQueue(prevQueue => [...prevQueue, data.track]);
            break;

          case MessageTypes.VOTE_UPDATE:
            setVotes(data.totalVotes);
            setTotalClients(data.totalClients);
            break;

          case MessageTypes.ERROR:
            Toast.show({
              type: 'error',
              text1: 'Erreur',
              text2: data.message || data.error || 'Une erreur est survenue',
              visibilityTime: 3000,
            });
            break;

          case 'queueRefreshed':
            console.log('Queue rafraîchie avec:', data.queue);
            setQueue(data.queue || []);
            if (data.currentTrack !== undefined) {
              setCurrentTrack(data.currentTrack);
            }
            break;

          case 'voteCompleted':
            if (data.result === 'passed') {
              setVotes(0);
            }
            break;
        }
      };

      ws.addEventListener('message', handleMessage);
      return () => ws.removeEventListener('message', handleMessage);
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

// Pour créer une room
const createRoom = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = createMessage(Actions.CREATE_ROOM);
    ws.send(JSON.stringify(message));
  }
};

// Pour rejoindre une room
const joinRoom = (roomCode) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = createMessage(Actions.JOIN_ROOM, {
      roomCode
    });
    ws.send(JSON.stringify(message));
  }
};

// Pour envoyer une chanson
const sendSong = (url) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = createMessage(Actions.SEND_SONG, {
      url
    });
    ws.send(JSON.stringify(message));
  }
};

// Pour voter
const sendVote = (value) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = createMessage(Actions.VOTE, {
      value
    });
    ws.send(JSON.stringify(message));
  }
};