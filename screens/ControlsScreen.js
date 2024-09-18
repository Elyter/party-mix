import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, SafeAreaView, StatusBar } from 'react-native';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Ionicons } from '@expo/vector-icons';

export default function ControlsScreen() {
  const [hasVoted, setHasVoted] = useState(false);
  const { ws, roomCode, votes, totalClients } = useWebSocket();

  useEffect(() => {
    if (votes === 0) {
      setHasVoted(false);
    }
  }, [votes]);

  const handleVote = () => {
    if (ws && ws.readyState === WebSocket.OPEN && roomCode) {
      ws.send(JSON.stringify({ action: 'vote', roomCode, vote: !hasVoted }));
    }
    setHasVoted(!hasVoted);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <Text style={styles.title}>Contrôles</Text>
        <TouchableOpacity style={styles.button} onPress={handleVote}>
          <Ionicons name={hasVoted ? "close-circle-outline" : "checkmark-circle-outline"} size={24} color="white" />
          <Text style={styles.buttonText}>
            {hasVoted ? "Annuler le vote" : "Vote pour passer"}
          </Text>
        </TouchableOpacity>
        <View style={styles.voteInfoContainer}>
          <Text style={styles.voteInfoLabel}>Votes :</Text>
          <Text style={styles.voteInfo}>{votes}/{totalClients}</Text>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ff5500',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#ff5500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  voteInfoContainer: {
    backgroundColor: '#222',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff5500',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteInfoLabel: {
    color: '#ccc',
    fontSize: 16,
    marginRight: 5,
  },
  voteInfo: {
    color: '#ff5500',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
