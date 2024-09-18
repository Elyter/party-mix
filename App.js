import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { WebSocketProvider, useWebSocket } from './contexts/WebSocketContext';
import Toast from 'react-native-toast-message';
import { enableScreens } from 'react-native-screens';
enableScreens();

import HomeScreen from './screens/HomeScreen';
import QueueScreen from './screens/QueueScreen';
import ControlsScreen from './screens/ControlsScreen';
import ProfileScreen from './screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function MainApp() {
  const { setWs } = useWebSocket();

  useEffect(() => {
    const newWs = new WebSocket('wss://eliottb.dev:8080');
    
    newWs.onopen = () => {
      console.log('WebSocket connecté');
      setWs(newWs);
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
    };

    return () => {
      if (newWs) {
        newWs.close();
      }
    };
  }, []);

  return (
    <>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Accueil') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === "File d'attente") {
                iconName = focused ? 'list' : 'list-outline';
              } else if (route.name === 'Contrôles') {
                iconName = focused ? 'options' : 'options-outline';
              } else if (route.name === 'Profil') {
                iconName = focused ? 'person' : 'person-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#ff5500',
            tabBarInactiveTintColor: '#999',
            tabBarStyle: {
              backgroundColor: '#111',
              borderTopColor: '#333',
            },
            tabBarLabelStyle: {
              fontSize: 12,
            },
            headerStyle: {
              backgroundColor: '#111',
            },
            headerTintColor: '#ff5500',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen name="Accueil" component={HomeScreen} />
          <Tab.Screen name="File d'attente" component={QueueScreen} />
          <Tab.Screen name="Contrôles" component={ControlsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <WebSocketProvider>
      <MainApp />
    </WebSocketProvider>
  );
}