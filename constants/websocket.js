export const MessageTypes = {
  CLIENT_ID: 'clientId',
  ROOM_CREATED: 'roomCreated',
  ROOM_JOINED: 'roomJoined',
  CLIENT_JOINED: 'clientJoined',
  SONG_ADDED: 'songAdded',
  VOTE_UPDATE: 'voteUpdate',
  VOTE_COMPLETED: 'voteCompleted',
  QUEUE_UPDATE: 'queueUpdate',
  ERROR: 'error'
};

export const Actions = {
  CREATE_ROOM: 'createRoom',
  JOIN_ROOM: 'joinRoom',
  SEND_SONG: 'sendSong',
  VOTE: 'vote'
};

export const createMessage = (action, data = {}) => ({
  action,
  ...data
});

export const sendVote = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const message = createMessage(Actions.VOTE, {
      roomCode,
      value: !hasVoted
    });
    ws.send(JSON.stringify(message));
  }
}; 