import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, StatusBar, Modal } from 'react-native';
import Toast from 'react-native-toast-message';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

export default function HomeScreen({ navigation }) {
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [roomLink, setRoomLink] = useState('');
  const { ws, roomCode, setRoomCode, clientId } = useWebSocket();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const createRoom = () => {
    console.log('Tentative de création de salle');

    if (!ws) {
      console.error('WebSocket non défini');
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Connexion WebSocket non établie.',
      });
      return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket non ouvert. État actuel:', ws.readyState);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'La connexion WebSocket n\'est pas ouverte.',
      });
      return;
    }

    try {
      ws.send(JSON.stringify({ action: 'createRoom', clientId }));
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message WebSocket:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'envoyer la demande de création de salle.',
      });
    }
  };

  const disconnectRoom = () => {
    console.log('Tentative de déconnexion de la salle');
    if (ws && ws.readyState === WebSocket.OPEN && clientId) {
      ws.send(JSON.stringify({ action: 'leaveRoom', clientId }));
      setRoomCode(null);
    } else {
      console.error('WebSocket non connecté, non prêt, ou clientId manquant');
    }
  };

  const joinRoom = () => {
    console.log('Tentative de rejoindre une salle');
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
  };

  useEffect(() => {
    if (ws && clientId) {
      const handleMessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.action === 'roomCreated') {
          setRoomCode(data.roomCode);
          setRoomLink(`https://pm.eliottb.dev/?c=${data.roomCode}`);
          ws.send(JSON.stringify({ action: 'joinRoom', roomCode: data.roomCode, clientId }));
          console.log('Rejoindre la salle automatiquement après création avec clientId:', clientId);
        }
      };

      ws.addEventListener('message', handleMessage);

      return () => {
        ws.removeEventListener('message', handleMessage);
      };
    }
  }, [ws, navigation, clientId]);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(roomLink);
    Toast.show({
      type: 'success',
      text1: 'Lien copié',
      text2: 'Le lien a été copié dans le presse-papiers',
    });
  };

  const shareLink = async () => {
    try {
      await Share.share({
        message: `Rejoignez ma salle Party Mix ! ${roomLink}`,
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error.message);
    }
  };

  const toggleInfoModal = () => {
    setShowInfoModal(!showInfoModal);
  };

  const toggleFeedbackModal = () => {
    setShowFeedbackModal(!showFeedbackModal);
  };

  const sendFeedback = async () => {
    if (feedbackText.trim() === '') {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez entrer un feedback avant d\'envoyer',
      });
      return;
    }

    const webhookUrl = 'https://discord.com/api/webhooks/1285668873814806568/g-Di-TaW7U0x9_b1Irrw3145YJ9_Qnb9_0V45uRLS_XQj3H24mG0GaI_jTAUdAqiW6hA';

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `Nouveau feedback reçu :\n\n${feedbackText}`,
        }),
      });

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Merci pour votre retour !',
          text2: 'Votre feedback a été envoyé avec succès.',
        });
        setFeedbackText('');
        toggleFeedbackModal();
      } else {
        throw new Error('Erreur lors de l\'envoi du feedback');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du feedback:', error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'envoyer le feedback. Veuillez réessayer.',
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Party Mix</Text>
        
        {/* Bouton d'information */}
        <TouchableOpacity style={styles.infoButton} onPress={toggleInfoModal}>
          <Ionicons name="information-circle-outline" size={35} color="#ff5500" />
        </TouchableOpacity>

        {roomCode ? (
          <View style={styles.roomCodeContainer}>
            <Text style={styles.roomCodeLabel}>Code de la salle :</Text>
            <Text style={styles.roomCode}>{roomCode}</Text>
            <TouchableOpacity style={styles.button} onPress={disconnectRoom}>
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text style={styles.buttonText}>Déconnecter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={createRoom}>
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Créer une salle</Text>
          </TouchableOpacity>
        )}
        {!roomCode && (
          <View style={styles.joinContainer}>
            <TextInput
              style={styles.input}
              placeholder="Entrez le code de la salle"
              placeholderTextColor="#999"
              value={inputRoomCode}
              onChangeText={setInputRoomCode}
            />
            <TouchableOpacity style={styles.button} onPress={joinRoom}>
              <Ionicons name="enter-outline" size={24} color="white" />
              <Text style={styles.buttonText}>Rejoindre</Text>
            </TouchableOpacity>
          </View>
        )}
        {roomCode && roomLink && ( // Affichage du lien et du bouton de partage
          <View style={styles.linkContainer}>
            <Text style={styles.linkLabel}>Lien de la salle :</Text>
            <TouchableOpacity onPress={copyToClipboard}>
              <Text style={styles.roomLink}>{roomLink}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={shareLink}>
              <Ionicons name="share-outline" size={24} color="white" />
              <Text style={styles.buttonText}>Partager</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Bouton de feedback */}
        <TouchableOpacity style={styles.feedbackButton} onPress={toggleFeedbackModal}>
          <Ionicons name="chatbox-ellipses-outline" size={24} color="#ff5500" />
          <Text style={styles.feedbackButtonText}>Feedback</Text>
        </TouchableOpacity>

        {/* Modal d'information */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showInfoModal}
          onRequestClose={toggleInfoModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>À propos de Party Mix</Text>
              <Text style={styles.modalText}>
                Party Mix est une application de musique collaborative pour vos soirées !{"\n\n"}
                Elle permet à tous les participants de contribuer à la playlist et de voter pour passer à la chanson suivante.{"\n\n\n"}
                Comment utiliser Party Mix :{"\n\n"}
                1. Créez une salle et partagez le code.{"\n"}
                2. Affichez le lien sur un PC ou une TV pour jouer la musique.{"\n"}
                 3. Tous les participants doivent télécharger l'app et rejoindre avec le code.{"\n"}
                4. Envoyez des musiques et votez pour passer à la suivante.
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={toggleInfoModal}>
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal de feedback */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showFeedbackModal}
          onRequestClose={toggleFeedbackModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Envoyez-nous votre feedback</Text>
              <TextInput
                style={styles.feedbackInput}
                multiline
                numberOfLines={4}
                placeholder="Partagez vos suggestions ou signalez un bug..."
                placeholderTextColor="#999"
                value={feedbackText}
                onChangeText={setFeedbackText}
              />
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity style={styles.modalButton} onPress={toggleFeedbackModal}>
                  <Text style={styles.modalButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.sendButton]} onPress={sendFeedback}>
                  <Text style={styles.modalButtonText}>Envoyer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111', // Fond sombre de SoundCloud
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff5500', // Orange SoundCloud
    marginBottom: 40,
  },
  roomCodeContainer: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff5500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomCodeLabel: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 5,
  },
  roomCode: {
    color: '#ff5500',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  joinContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#222',
    color: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  button: {
    backgroundColor: '#ff5500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  linkContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#222',
    borderRadius: 10,
  },
  roomLink: {
    color: '#ff5500',
    fontSize: 18,
    textDecorationLine: 'underline',
    marginBottom: 10,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff5500',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  infoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff5500',
    marginBottom: 10,
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'left',
  },
  closeButton: {
    backgroundColor: '#ff5500',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  linkLabel: {
    color: '#ccc',
    fontSize: 20,
    marginBottom: 5,
  },
  feedbackButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ff5500',
  },
  feedbackButtonText: {
    color: '#ff5500',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  feedbackInput: {
    backgroundColor: '#333',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
    marginBottom: 20,
    textAlignVertical: 'top',
    width: '100%',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: '#ff5500',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});