import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Animated, PanResponder, Dimensions, FlatList, Linking, RefreshControl, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';
import * as Clipboard from 'expo-clipboard'; 
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNavigation } from '@react-navigation/native';

const QueueScreen = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);
  const [songUrl, setSongUrl] = useState('');
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const cardModalOpacity = useRef(new Animated.Value(0)).current;
  const cardsOpacity = useRef(new Animated.Value(1)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const { ws, roomCode, votes, totalClients, clientId, queue, setQueue } = useWebSocket();
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const arrowOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(arrowAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(arrowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const sendSongUrl = async () => {
    if (ws && ws.readyState === WebSocket.OPEN && roomCode && clientId) {
      ws.send(JSON.stringify({ action: 'sendSong', roomCode, soundcloudUrl: songUrl, clientId }));
      setSongUrl('');
      setModalVisible(false);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const rotateValue = gestureState.dx / (Dimensions.get('window').width / 2);
        rotateAnim.setValue(rotateValue);
        
        // Ajuster l'opacité du modal et des cartes en fonction du glissement
        const opacityValue = Math.min(Math.abs(gestureState.dx) / 100, 1);
        cardModalOpacity.setValue(opacityValue);
        cardsOpacity.setValue(1 - opacityValue + 25);
        
        // Faire disparaître progressivement la flèche
        arrowOpacity.setValue(1 - opacityValue);
        
        // Rendre le modal visible dès le début du glissement
        if (!cardModalVisible && gestureState.dx < 0) {
          setCardModalVisible(true);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          Animated.parallel([
            Animated.timing(rotateAnim, {
              toValue: -1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(cardModalOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(cardsOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            })
          ]).start();
        } else {
          Animated.parallel([
            Animated.spring(rotateAnim, {
              toValue: 0,
              friction: 5,
              useNativeDriver: false,
            }),
            Animated.timing(cardModalOpacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: false,
            }),
            Animated.timing(cardsOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: false,
            })
          ]).start(() => {
            setCardModalVisible(false);
          });
        }
      },
    })
  ).current;

  const closeModal = () => {
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue: 0,
        friction: 5,
        useNativeDriver: false,
      }),
      Animated.timing(cardModalOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(cardsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      })
    ]).start(() => {
      setCardModalVisible(false);
    });
  };

  const parseTrackDetails = (url) => {
    const cleanUrl = url.split('?')[0];
    const regex = /soundcloud\.com\/([^/]+)\/([^/]+)/;
    const match = cleanUrl.match(regex);
    if (match) {
      const artist = match[1].replace(/-/g, ' ');
      const title = match[2].replace(/-/g, ' ');
      return { url: cleanUrl, title, artist };
    } else {
      return { url: cleanUrl, title: 'Titre inconnu', artist: 'Artiste inconnu' };
    }
  };

  const openSoundCloudLink = (url) => {
    Linking.openURL(url).catch((err) => console.error('Erreur lors de l\'ouverture du lien:', err));
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (ws && ws.readyState === WebSocket.OPEN && roomCode && clientId) {
      ws.send(JSON.stringify({ action: 'refreshQueue', roomCode, clientId }));
    }
    console.log('onRefresh');
    setRefreshing(false);
  }, [ws, roomCode, clientId]);

  const [fontsLoaded] = useFonts({
    'Krub-Medium': require('../assets/fonts/Krub-Medium.ttf'),
    'Krub-Bold': require('../assets/fonts/Krub-Bold.ttf'),
  });

  useEffect(() => {
    if (modalVisible) {
      Clipboard.getStringAsync().then(text => {
        setSongUrl(text);
      });
    }
  }, [modalVisible]);

  const handleAddButtonPress = () => {
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSongUrl('');
  };

  const handleAddSong = () => {
    // Logique pour ajouter la chanson à la file d'attente
    console.log('Ajouter la chanson:', songUrl);
    handleCloseModal();
  };

  const handleInvite = async () => {
    try {
      const result = await Share.share({
        message: `Rejoins-moi dans la room ${roomCode} sur PartyMix ! Si tu n'as pas l'application, clique sur ce lien : https://eliottb.dev/partymix/redirect.html`,
      });
      if (result.action === Share.sharedAction) {
        console.log('Contenu partagé');
      } else if (result.action === Share.dismissedAction) {
        console.log('Partage annulé');
      }
    } catch (error) {
      console.error('Erreur lors du partage:', error.message);
    }
  };

  const handleVote = () => {
    if (ws && ws.readyState === WebSocket.OPEN && roomCode) {
      ws.send(JSON.stringify({ action: 'vote', roomCode, vote: !hasVoted, clientId }));
    }
    setHasVoted(!hasVoted);
    closeModal();
  };

  const handleQuit = () => {
    navigation.navigate('Accueil');
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient colors={['#4c0080', '#2d004d']} style={styles.container}>
      <TouchableOpacity style={styles.quitButton} onPress={handleQuit}>
        <Icon name="arrow-back" size={34} color="#fff" />
      </TouchableOpacity>

      <Animated.View
        style={[styles.cardsContainer, { opacity: cardsOpacity }]}
        {...panResponder.panHandlers}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: '#3A0958',
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['-90deg', '-20deg', '15deg'],
                  }),
                },
                { translateY: 30 },
                { translateX: 200 },
              ],
              opacity: rotateAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [0, 1, 1],
              }),
            },
          ]}
        >
          <Text style={styles.cardText}>Carte 2</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.card2,
            {
              backgroundColor: '#2d004d',
              transform: [
                {
                  rotate: rotateAnim.interpolate({
                    inputRange: [-1, 0, 1],
                    outputRange: ['-80deg', '-10deg', '15deg'],
                  }),
                },
                { translateY: 0 },
                { translateX: 220 },
              ],
              opacity: rotateAnim.interpolate({
                inputRange: [-1, 0, 1],
                outputRange: [0, 1, 1],
              }),
            },
          ]}
        >
          <Text style={styles.cardText}>Carte 1</Text>
        </Animated.View>

        <Animated.View style={[
          styles.arrowContainer,
          {
            transform: [{
              translateX: arrowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -20]
              })
            }],
            opacity: arrowOpacity
          }
        ]}>
          <Icon name="chevron-left" size={40} color="#F0A56C" />
        </Animated.View>
      </Animated.View>

      <View style={styles.header}>
        <Text style={styles.roomNumber}>Salon numéro</Text>
        <Text style={styles.roomNumberValue}>{roomCode}</Text>
        <TouchableOpacity onPress={handleInvite}>
          <LinearGradient
            colors={['#691587', '#9D39C0']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 0}}
            style={[styles.button, styles.inviteButton]}
          >
            <Text style={styles.inviteButtonText}>INVITER QUELQU'UN</Text>
            <Icon name="add" size={29} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.queueContainer}>
        <Text style={styles.queueTitle}>File d'attente</Text>
        {queue.length > 0 ? (
          <Text style={styles.queueSubtitle}>{queue.length - 1} musiques dans la file</Text>
        ) : (
          <Text style={styles.queueSubtitle}>Aucune musique dans la file</Text>
        )}
        
        {queue.length > 0 ? (
          <View style={styles.nowPlayingContainer}>
            <View style={styles.queueItem}>
              <View style={styles.queueItemInfo}>
                <Text style={styles.queueItemTitle}>
                  {parseTrackDetails(queue[0]).title}
                </Text>
                <Text style={styles.queueItemArtist}>{parseTrackDetails(queue[0]).artist}</Text>
                <Text style={styles.nowPlayingLabel}> ▶ Lecture en cours</Text>
              </View>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => openSoundCloudLink(queue[0])}
              >
                <Icon name="play-circle-outline" size={28} color="#F0A56C" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyQueueContainer}>
            <Text style={styles.emptyQueueText}>
              Cliquez sur le bouton + en bas à droite pour ajouter des musiques
            </Text>
            <Icon name="arrow-downward" size={100} color="#F0A56C" style={styles.arrowIcon} />
          </View>
        )}
        
        <FlatList
          data={queue.slice(1)}
          renderItem={({ item, index }) => {
            const { title, artist } = parseTrackDetails(item);
            return (
              <View style={styles.queueItem}>
                <Text style={styles.queueItemNumber}>{index + 1}</Text>
                <View style={styles.queueItemInfo}>
                  <Text style={styles.queueItemTitle}>{title}</Text>
                  <Text style={styles.queueItemArtist}>{artist}</Text>
                </View>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => openSoundCloudLink(item)}
                >
                  <Icon name="play-circle-outline" size={28} color="#F0A56C" />
                </TouchableOpacity>
              </View>
            );
          }}
          keyExtractor={(item, index) => index.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#F0A56C']}
              tintColor="#F0A56C"
            />
          }
        />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddButtonPress}>
        <Icon name="add" size={37} color="#4c0080" />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <BlurView intensity={15} style={styles.blurView}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Ajouter une musique</Text>
              <Text style={styles.modalSubtitle}>Entrez l'URL de la musique à ajouter</Text>
              <TextInput
                style={styles.input}
                onChangeText={setSongUrl}
                value={songUrl}
                placeholder="URL de la musique"
                placeholderTextColor="#A0A0A0"
                autoFocus={true}
              />
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.refuserButton]}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.refuserButtonText}>ANNULER</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.accepterButton]}
                  onPress={sendSongUrl}
                >
                  <Text style={styles.accepterButtonText}>AJOUTER</Text>
                  <MaterialIcons name="arrow-forward" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </Modal>

      <Modal
        animationType="none"
        transparent={true}
        visible={cardModalVisible}
        onRequestClose={closeModal}
      >
        <Animated.View style={[styles.blurView, { opacity: cardModalOpacity }]}>
          <BlurView intensity={15} style={styles.blurViewContent}>
            <View style={styles.centeredView}>
              <View style={styles.modalView}>
                <Text style={styles.modalTitle}>Faites votre choix</Text>
                <Text style={styles.modalSubtitle}>{votes}/{totalClients} Personnes veulent passer la musique</Text>
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.refuserButton]}
                    onPress={closeModal}
                  >
                    <Text style={styles.refuserButtonText}>RETOUR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.accepterButton]}
                    onPress={handleVote}
                  >
                    <Text style={styles.accepterButtonText}>
                      {votes === 0 ? "VOTER" : hasVoted ? "ANNULER" : "VOTER"}
                    </Text>
                    <MaterialIcons name="arrow-forward" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: '30%',
  },
  roomNumber: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Krub-Medium',
  },
  roomNumberValue: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'Krub-Bold',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8000ff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 35,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  inviteButtonText: {
    color: '#fff',
    marginRight: 20,
    fontFamily: 'Krub-Bold',
    fontSize: 15,
  },
  queueContainer: {
    marginTop: 40,
    height: '100%',
  },
  queueTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Krub-Bold',
  },
  queueSubtitle: {
    color: '#ccc',
    marginBottom: 20,
    fontFamily: 'Krub-Medium',
  },
  queueList: {
    maxHeight: '60%',
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  queueItemNumber: {
    color: '#F0A56C',
    fontSize: 30,
    fontFamily: 'Krub-Bold',
    marginRight: 15,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Krub-Medium',
  },
  queueItemArtist: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'Krub-Medium',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#fff',
    width: 70,
    height: 70,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: '100%',
    height: 60,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 20,
    fontFamily: 'Krub-Medium',
    color: 'black',
    fontSize: 16,
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
    paddingHorizontal: 20,
  },
  refuserButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'white',
  },
  accepterButton: {
    backgroundColor: '#691587',
    borderWidth: 2,
    borderColor: '#691587',
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
  blurViewContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    top: '30%',
    right: '-50%',
  },
  card2: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    top: '20%',
    right: '-40%',
  },
  cardText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Krub-Bold',
  },
  cardModalView: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: 'rgba(44, 14, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardModalText: {
    color: 'white',
    fontSize: 24,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#8000ff',
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
  nowPlayingText: {
    color: '#F0A56C',
    fontSize: 12,
    marginTop: 5,
    fontFamily: 'Krub-Medium',
  },
  linkButton: {
    padding: 10,
  },
  nowPlayingContainer: {
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    paddingBottom: 15,
  },
  nowPlayingLabel: {
    color: '#F0A56C',
    fontSize: 16,
    fontFamily: 'Krub-Bold',
    marginBottom: 10,
  },
  emptyQueueContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyQueueText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Krub-Medium',
    textAlign: 'center',
    marginBottom: 20,
  },
  arrowIcon: {
    transform: [{ rotate: '-45deg' }],
    marginTop: 20,
  },
  quitButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  arrowContainer: {
    position: 'absolute',
    left: "85%",
    top: '28%',
    zIndex: 10,
  },
});

export default QueueScreen;