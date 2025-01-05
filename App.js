import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import Toast from 'react-native-toast-message';
import { enableScreens } from 'react-native-screens';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

enableScreens();

import HomeScreen from './screens/HomeScreen';
import QueueScreen from './screens/QueueScreen';
import HowToScreen from './screens/HowToScreen';

const Stack = createStackNavigator();

// Ajouter cette ligne après les imports
const navigationRef = createNavigationContainerRef();

function MainApp() {
  const { ws, setWs, clientId, setClientId } = useWebSocket();
  const wsRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isClientIdReady, setIsClientIdReady] = useState(false);

  // Supprimer la ligne const navigationRef = useRef(null);

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

        // Tenter de récupérer et rejoindre la dernière room
        const lastRoom = await AsyncStorage.getItem('roomCode');
        if (lastRoom && ws?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            action: 'joinRoom',
            roomId: lastRoom,
            clientId: id
          }));
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Impossible d\'initialiser l\'application',
        });
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

    console.log('Tentative de connexion WebSocket');
    const newWs = new WebSocket('wss://eliottb.dev:8080');
    
    newWs.onopen = async () => {
      console.log('WebSocket connecté');
      setWs(newWs);
      wsRef.current = newWs;
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
        // Utiliser la nouvelle référence globale
        if (navigationRef.isReady()) {
          navigationRef.navigate("File d'attente");
        }
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
    const setupWebSocket = async () => {
      if (isClientIdReady) {
        await connectWebSocket();
      }
    };

    setupWebSocket();

    const handleAppStateChange = async (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // Vérifier l'état de la connexion au retour de l'app
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          await connectWebSocket();
          const savedRoom = await AsyncStorage.getItem('roomCode');
          if (savedRoom && clientId) {
            wsRef.current?.send(JSON.stringify({
              action: 'joinRoom',
              roomId: savedRoom,
              clientId
            }));
          }
        }
      }
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      appStateSubscription.remove();
    };
  }, [isClientIdReady]);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
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
