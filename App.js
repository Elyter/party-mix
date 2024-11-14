import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import Toast from 'react-native-toast-message';
import { enableScreens } from 'react-native-screens';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

enableScreens();

import HomeScreen from './screens/HomeScreen';
import QueueScreen from './screens/QueueScreen';
import ControlsScreen from './screens/ControlsScreen';
import HowToScreen from './screens/HowToScreen';

const Stack = createStackNavigator();

function MainApp() {
  const { ws, setWs, clientId, setClientId } = useWebSocket();
  const wsRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isClientIdReady, setIsClientIdReady] = useState(false);

  useEffect(() => {
    const initClientId = async () => {
      try {
        let id = await AsyncStorage.getItem('clientId');
        if (!id) {
          id = generateUUID();
          await AsyncStorage.setItem('clientId', id);
        }
        setClientId(id);
        setIsClientIdReady(true);
        console.log('ClientId initialisé dans App.js:', id);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du clientId:', error);
      }
    };
    initClientId();
  }, []);

  useEffect(() => {
    if (isClientIdReady) {
      connectWebSocket();
    }
  }, [isClientIdReady]);

  const connectWebSocket = async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket déjà connecté');
      return;
    }

    if (!clientId) {
      console.log('ClientId non disponible, attente avant la connexion WebSocket');
      return;
    }

    console.log('Tentative de connexion WebSocket avec clientId:', clientId);
    const newWs = new WebSocket('wss://eliottb.dev:8080');
    
    newWs.onopen = async () => {
      console.log('WebSocket connecté');
      setWs(newWs);
      wsRef.current = newWs;
      await sendClientInfo();
      rejoinRoom();
      Toast.show({
        type: 'success',
        text1: 'Connexion réussie',
        text2: 'WebSocket connecté',
      });
    };

    newWs.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
      console.error('Message d\'erreur:', error.message);
      console.error('Type d\'erreur:', error.type);
      console.error('URL:', error.target.url);
      Toast.show({
        type: 'error',
        text1: 'Erreur de connexion',
        text2: `Impossible de se connecter au serveur: ${error.message}`,
      });
    };

    newWs.onclose = (event) => {
      console.error('WebSocket fermé:', event);
      console.error('Code:', event.code);
      console.error('Raison:', event.reason);
      Toast.show({
        type: 'error',
        text1: 'Connexion perdue',
        text2: `WebSocket fermé: ${event.reason || 'Raison inconnue'}`,
      });
      setTimeout(connectWebSocket, 1000);
    };

    return () => {
      if (newWs) {
        newWs.close();
      }
    };
  };

  const sendClientInfo = async () => {
    if (!clientId) {
      console.log('ClientId non disponible, impossible d\'envoyer les informations client');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'clientInfo',
        clientId: clientId
      }));
    }
  };

  const rejoinRoom = async () => {
    try {
      const savedRoom = await AsyncStorage.getItem('roomCode');
      if (savedRoom && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('Tentative de rejoindre la room:', savedRoom);
        wsRef.current.send(JSON.stringify({ 
          action: 'joinRoom', 
          roomId: savedRoom,
          clientId: clientId 
        }));
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la room:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: `Impossible de rejoindre la room: ${error}`,
      });
    }
  };

  useEffect(() => {
    let heartbeatCleanup;

    const setupWebSocket = async () => {
      if (isClientIdReady) {
        await connectWebSocket();
        heartbeatCleanup = startHeartbeat();
      }
    };

    setupWebSocket();

    const handleAppStateChange = async (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App réactivée, vérification de la connexion WebSocket');
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log('WebSocket non connecté, tentative de reconnexion');
          if (isClientIdReady) {
            await connectWebSocket();
            heartbeatCleanup = startHeartbeat();
          }
        } else {
          console.log('WebSocket toujours connecté');
          await rejoinRoom();
        }
      }
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (heartbeatCleanup) {
        heartbeatCleanup();
      }
      appStateSubscription.remove();
    };
  }, [isClientIdReady]);

  const startHeartbeat = () => {
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
      } else {
        clearInterval(heartbeatInterval);
        connectWebSocket();
      }
    }, 30000); // Envoie un heartbeat toutes les 30 secondes

    return () => clearInterval(heartbeatInterval);
  };

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: '#111',
            },
            headerTintColor: '#ff5500',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerShown: false,
          }}
        >
          <Stack.Screen name="Accueil" component={HomeScreen} />
          <Stack.Screen name="File d'attente" component={QueueScreen} />
          <Stack.Screen name="Contrôles" component={ControlsScreen} />
          <Stack.Screen name="Comment utiliser l'application" component={HowToScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}

export default function App() {
  const [ws, setWs] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [clientId, setClientId] = useState(null);

  return (
    <WebSocketProvider value={{ ws, setWs, roomCode, setRoomCode, clientId, setClientId }}>
      <MainApp />
    </WebSocketProvider>
  );
}

// Ajoutez cette fonction en haut du fichier, après les autres importations
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
