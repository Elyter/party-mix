import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, StatusBar, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { BlurView } from 'expo-blur';
import { useWebSocket } from '../contexts/WebSocketContext';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }) {
  const { ws, roomCode, setRoomCode, clientId } = useWebSocket();
  const [inputRoomCode, setInputRoomCode] = useState('');

  const [fontsLoaded] = useFonts({
    'Krub-Medium': require('../assets/fonts/Krub-Medium.ttf'),
    'Krub-Bold': require('../assets/fonts/Krub-Bold.ttf'),
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [salonCode, setSalonCode] = useState('');

  if (!fontsLoaded) {
    return null;
  }

  const createRoom = () => {
    try {
      ws.send(JSON.stringify({ action: 'createRoom', clientId }));
      navigation.navigate('Comment utiliser l\'application')
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message WebSocket:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'envoyer la demande de création de salle.',
      });
    }
  };

  const handleJoinSalon = () => {
    // Logique pour rejoindre le salon avec le code
    if (ws && ws.readyState === WebSocket.OPEN && inputRoomCode && clientId) {
      ws.send(JSON.stringify({ action: 'joinRoom', roomCode: inputRoomCode, clientId }));
      setRoomCode(inputRoomCode);
    } else {
      console.error('WebSocket non connecté, code de salle manquant, ou clientId manquant');
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible de rejoindre la salle. Vérifiez votre connexion et le code.',
      });
    }
    setModalVisible(false);
    navigation.navigate("File d'attente");
  };

  return (
    <ImageBackground
      source={require('../assets/images/background.jpg')}
      style={styles.background}
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)']}
        style={styles.gradient}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.container}>
          <View style={styles.contentContainer}>
            <Text style={styles.title}>Party Mix</Text>
            <Text style={styles.subtitle}>
              Connectez-vous, 
              {'\n'}
              ajoutez <Text style={{fontFamily: 'Krub-Bold'}}>vos sons,</Text>
              {'\n'}
              et laissez <Text style={{fontFamily: 'Krub-Bold'}}>la soirée</Text> commencer !
            </Text>
            <Text style={styles.description}>
            La playlist de la soirée, créée par vous tous.
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
            >
              <LinearGradient
                colors={['#691587', '#9D39C0']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={[styles.button, styles.joinButton]}
              >
                <Text style={styles.buttonText}>REJOINDRE UN SALON</Text>
                <MaterialIcons name="arrow-forward" size={24} color="white" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={() => createRoom()}
            >
              <Text style={styles.buttonTextCréer}>CRÉER VOTRE SALON</Text>
              <MaterialIcons name="arrow-forward" size={24} color="black" />
            </TouchableOpacity>

          </View>
        </View>
        <TouchableOpacity style={styles.termsButton}>
          <Text style={styles.termsText}>Conditions générales d'utilisations</Text>
        </TouchableOpacity>
      </LinearGradient>
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={15} style={styles.blurView}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Rejoindre un salon</Text>
              <Text style={styles.modalSubtitle}>Entrez le code du salon à rejoindre</Text>
              <TextInput
                style={styles.input}
                onChangeText={setInputRoomCode}
                value={inputRoomCode}
                placeholder='Code'
                placeholderTextColor="#A0A0A0"
                keyboardType="numeric"
                maxLength={4}
                autoFocus={true}
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.refuserButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.refuserButtonText}>REFUSER</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.accepterButton]}
                  onPress={handleJoinSalon}
                >
                  <Text style={styles.accepterButtonText}>ACCEPTER</Text>
                  <MaterialIcons name="arrow-forward" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  contentContainer: {
    alignItems: 'flex-start',
    width: '100%',
    marginTop: '50%',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 50,
    fontFamily: 'Krub-Bold',
  },
  subtitle: {
    fontSize: 23,
    color: 'white',
    marginBottom: 15,
    fontFamily: 'Krub-Medium',
  },
  description: {
    fontSize: 16,
    color: 'white',
    marginBottom: 40,
    fontFamily: 'Krub-Medium',
  },
  button: {
    padding: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  joinButton: {
    // Le style de fond est maintenant géré par le LinearGradient
  },
  createButton: {
    backgroundColor: 'white',
    borderColor: 'white',
    textColor: 'black',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    fontFamily: 'Krub-Bold',
  },
  buttonTextCréer: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    fontFamily: 'Krub-Bold',
  },
  termsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  termsText: {
    color: 'white',
    textDecorationLine: 'underline',
    color: '#691587',
    fontFamily: 'Krub-Medium',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalView: {
    width: '90%',
    backgroundColor: '#2C0E44',
    borderRadius: 45,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    fontFamily: 'Krub-Bold',
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 20,
    fontFamily: 'Krub-Medium',
    textAlign: 'center',
  },
  input: {
    width: '50%',
    height: 60,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 20,
    fontFamily: 'Krub-Medium',
    color: 'black',
    textAlign: 'center',
    fontSize: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    fontFamily: 'Krub-Medium',
  },
  modalButton: {
    padding: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  refuserButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'white',
    textColor: 'black',
  },
  accepterButton: {
    backgroundColor: '#691587',
    borderWidth: 2,
    borderColor: '#691587',
    textColor: 'white',
  },
  refuserButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Krub-Bold',
  },
  accepterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
    fontFamily: 'Krub-Bold',
  },
  blurView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  howToText: {
    color: 'white',
    textDecorationLine: 'underline',
    fontFamily: 'Krub-Medium',
  },
});