import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, SafeAreaView, StatusBar, FlatList, Linking, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

export default function QueueScreen() {
  const [inputUrl, setInputUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { ws, roomCode, queue, setQueue, clientId } = useWebSocket();

  const sendSong = () => {
    if (ws && ws.readyState === WebSocket.OPEN && roomCode && inputUrl) {
      ws.send(JSON.stringify({ action: 'sendSong', roomCode, soundcloudUrl: inputUrl, clientId }));
      setInputUrl('');
    }
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

  const renderQueueItem = ({ item, index }) => {
    const { title, artist } = parseTrackDetails(item);
    const isPlaying = index === 0;
    return (
      <View style={styles.queueItem}>
        <View style={styles.queueItemInfo}>
          <Text style={styles.queueItemTitle}>
            {isPlaying ? '▶ ' : ''}{title}
          </Text>
          <Text style={styles.queueItemArtist}>{artist}</Text>
          {isPlaying && (
            <Text style={styles.nowPlayingText}>En cours de lecture</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => openSoundCloudLink(item)}
        >
          <Ionicons name="play-circle-outline" size={24} color="#ff5500" />
        </TouchableOpacity>
      </View>
    );
  };

  const sendClipboardContent = async () => {
    const clipboardContent = await Clipboard.getStringAsync();
    if (clipboardContent && clipboardContent.includes('soundcloud.com')) {
      setInputUrl(clipboardContent);
      sendSong();
    } else {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Le contenu du presse-papiers n\'est pas un lien SoundCloud valide.',
      });
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (ws && ws.readyState === WebSocket.OPEN && roomCode && clientId) {
      ws.send(JSON.stringify({ action: 'refreshQueue', roomCode, clientId }));
    }
    console.log('onRefresh');
    setRefreshing(false);
  }, [ws, roomCode]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>File d'attente</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Entrez l'URL SoundCloud"
            placeholderTextColor="#999"
            value={inputUrl}
            onChangeText={setInputUrl}
          />
          <TouchableOpacity style={styles.button} onPress={sendSong}>
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Ajouter</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.clipboardButton} onPress={sendClipboardContent}>
          <Ionicons name="clipboard-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Coller depuis le presse-papiers</Text>
        </TouchableOpacity>
        <FlatList
          data={queue}
          renderItem={renderQueueItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.queueList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#ff5500']}
              tintColor="#ff5500"
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff5500',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginRight: 10,
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
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  queueList: {
    flex: 1,
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  queueItemArtist: {
    color: '#ccc',
    fontSize: 14,
  },
  nowPlayingText: {
    color: '#ff5500',
    fontSize: 12,
    marginTop: 5,
  },
  linkButton: {
    padding: 10,
  },
  clipboardButton: {
    backgroundColor: '#4a4a4a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
});
