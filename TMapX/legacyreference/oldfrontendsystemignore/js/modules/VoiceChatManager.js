/**
 * P2P Voice Chat Manager for Clan Garrison
 * Handles WebRTC peer-to-peer voice connections, room management, and UI
 */
export class VoiceChatManager {
  constructor() {
    this.socket = null;
    this.localStream = null;
    this.peers = new Map(); // Map of peerId -> RTCPeerConnection
    this.voiceRooms = new Map(); // Map of roomId -> room data
    this.currentRoom = null;
    this.currentUser = null;
    this.isInitialized = false;
    this.isMuted = false;
    this.isDeafened = false;
    
    // WebRTC configuration
    this.rtcConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    console.log('🎙️ VoiceChatManager initialized');
  }

  /**
   * Initialize voice chat system
   */
  async initialize(socket, currentUser) {
    if (this.isInitialized) return;this.socket = socket;
    this.currentUser = currentUser;
    
    // Set up socket event listeners for voice chat signaling
    this.setupSocketListeners();
    
    this.isInitialized = true;
    console.log('🎙️ Voice chat system initialized');
  }

  /**
   * Set up socket event listeners for voice chat signaling
   */
  setupSocketListeners() {
    if (!this.socket) return;this.socket.on('voice-room-created', (data) => this.handleRoomCreated(data));
    this.socket.on('voice-room-joined', (data) => this.handleRoomJoined(data));
    this.socket.on('voice-room-left', (data) => this.handleRoomLeft(data));
    this.socket.on('voice-room-invite', (data) => this.handleRoomInvite(data));
    
    // WebRTC signaling events
    this.socket.on('voice-offer', (data) => this.handleOffer(data));
    this.socket.on('voice-answer', (data) => this.handleAnswer(data));
    this.socket.on('voice-ice-candidate', (data) => this.handleIceCandidate(data));
    this.socket.on('voice-user-joined', (data) => this.handleUserJoined(data));
    this.socket.on('voice-user-left', (data) => this.handleUserLeft(data));
    
    console.log('🎙️ Socket listeners set up for voice chat');
  }

  /**
   * Create a new voice chat room
   */
  async createVoiceRoom(roomName, maxParticipants = 8) {
    if (!this.socket || !this.currentUser) return;const roomData = {
      name: roomName,
      creator: this.currentUser._id,
      maxParticipants: maxParticipants,
      clanId: this.currentUser.clanId,
      isPrivate: false
    };

    this.socket.emit('create-voice-room', roomData);
    console.log('🎙️ Creating voice room:', roomName);
  }

  /**
   * Join a voice chat room
   */
  async joinVoiceRoom(roomId) {
    try {
      // Get user media first
      await this.getUserMedia();
      
      // Join the room via socket
      this.socket.emit('join-voice-room', { 
        roomId: roomId,
        userId: this.currentUser._id 
      });
      
      console.log('🎙️ Joining voice room:', roomId);
    } catch (error) {
      console.error('❌ Failed to join voice room:', error);
      this.showError('Failed to access microphone. Please check permissions.');
    }
  }

  /**
   * Leave current voice room
   */
  leaveVoiceRoom() {
    if (this.currentRoom) {
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close all peer connections
      this.peers.forEach((peer, peerId) => {
        peer.close();
      });
      this.peers.clear();

      // Notify server
      this.socket.emit('leave-voice-room', { 
        roomId: this.currentRoom.id,
        userId: this.currentUser._id 
      });

      this.currentRoom = null;
      this.updateVoiceUI();
      
      console.log('🎙️ Left voice room');
    }
  }

  /**
   * Invite players to voice room
   */
  inviteToVoiceRoom(playerIds) {
    if (!this.currentRoom || !this.socket) return;playerIds.forEach(playerId => {
      this.socket.emit('invite-to-voice-room', {
        roomId: this.currentRoom.id,
        invitedUserId: playerId,
        inviterName: this.currentUser.displayName || this.currentUser.username
      });
    });

    console.log('🎙️ Invited players to voice room:', playerIds);
  }

  /**
   * Get user media (microphone)
   */
  async getUserMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      console.log('🎙️ Got user media');
      return this.localStream;} catch (error) {
      console.error('❌ Failed to get user media:', error);
      throw error;
    }
  }

  /**
   * Create peer connection for a specific user
   */
  async createPeerConnection(peerId) {
    const peerConnection = new RTCPeerConnection(this.rtcConfiguration);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle incoming streams
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.handleRemoteStream(peerId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('voice-ice-candidate', {
          candidate: event.candidate,
          targetPeerId: peerId,
          roomId: this.currentRoom.id
        });
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`🎙️ Connection state with ${peerId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        this.removePeer(peerId);
      }
    };

    this.peers.set(peerId, peerConnection);
    return peerConnection;}

  /**
   * Handle incoming offer
   */
  async handleOffer(data) {
    const { offer, fromPeerId, roomId } = data;
    
    if (roomId !== this.currentRoom?.id) return;try {
      const peerConnection = await this.createPeerConnection(fromPeerId);
      await peerConnection.setRemoteDescription(offer);
      
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.socket.emit('voice-answer', {
        answer: answer,
        targetPeerId: fromPeerId,
        roomId: roomId
      });
      
      console.log('🎙️ Sent answer to:', fromPeerId);
    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(data) {
    const { answer, fromPeerId, roomId } = data;
    
    if (roomId !== this.currentRoom?.id) return;try {
      const peerConnection = this.peers.get(fromPeerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
        console.log('🎙️ Received answer from:', fromPeerId);
      }
    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(data) {
    const { candidate, fromPeerId, roomId } = data;
    
    if (roomId !== this.currentRoom?.id) return;try {
      const peerConnection = this.peers.get(fromPeerId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  }

  /**
   * Handle user joined voice room
   */
  async handleUserJoined(data) {
    const { userId, roomId } = data;
    
    if (roomId !== this.currentRoom?.id || userId === this.currentUser._id) return;try {
      // Create offer for new user
      const peerConnection = await this.createPeerConnection(userId);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.socket.emit('voice-offer', {
        offer: offer,
        targetPeerId: userId,
        roomId: roomId
      });
      
      console.log('🎙️ Sent offer to new user:', userId);
      this.updateVoiceUI();
    } catch (error) {
      console.error('❌ Failed to handle user joined:', error);
    }
  }

  /**
   * Handle user left voice room
   */
  handleUserLeft(data) {
    const { userId, roomId } = data;
    
    if (roomId !== this.currentRoom?.id) return;this.removePeer(userId);
    this.updateVoiceUI();
    console.log('🎙️ User left voice room:', userId);
  }

  /**
   * Remove peer connection
   */
  removePeer(peerId) {
    const peerConnection = this.peers.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.peers.delete(peerId);
    }

    // Remove audio element
    const audioElement = document.getElementById(`voice-audio-${peerId}`);
    if (audioElement) {
      audioElement.remove();
    }
  }

  /**
   * Handle remote stream
   */
  handleRemoteStream(peerId, remoteStream) {
    // Create or update audio element for this peer
    let audioElement = document.getElementById(`voice-audio-${peerId}`);
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = `voice-audio-${peerId}`;
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
    }
    
    audioElement.srcObject = remoteStream;
    console.log('🎙️ Playing remote stream from:', peerId);
  }

  /**
   * Handle room created
   */
  handleRoomCreated(data) {
    const { room } = data;
    this.voiceRooms.set(room.id, room);
    this.updateVoiceRoomsUI();
    console.log('🎙️ Voice room created:', room.name);
  }

  /**
   * Handle room joined
   */
  handleRoomJoined(data) {
    const { room } = data;
    this.currentRoom = room;
    this.updateVoiceUI();
    console.log('🎙️ Joined voice room:', room.name);
  }

  /**
   * Handle room left
   */
  handleRoomLeft(data) {
    this.currentRoom = null;
    this.updateVoiceUI();
    console.log('🎙️ Left voice room');
  }

  /**
   * Handle room invite
   */
  handleRoomInvite(data) {
    const { room, inviterName } = data;
    this.showVoiceInvite(room, inviterName);
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (!this.localStream) return;this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });

    this.updateVoiceControls();
    console.log('🎙️ Microphone', this.isMuted ? 'muted' : 'unmuted');
  }

  /**
   * Toggle deafen (mute others)
   */
  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    
    // Mute/unmute all remote audio elements
    document.querySelectorAll('[id^="voice-audio-"]').forEach(audio => {
      audio.muted = this.isDeafened;
    });

    this.updateVoiceControls();
    console.log('🎙️ Audio', this.isDeafened ? 'deafened' : 'undeafened');
  }

  /**
   * Show voice chat UI in clan garrison
   */
  showVoiceChatUI() {
    const container = document.getElementById('clan-chat-container');
    if (!container) return;const voiceChatHTML = `
      <div class="voice-chat-section">
        <div class="voice-chat-header">
          <h4><i class="fas fa-microphone"></i> Voice Channels</h4>
          <button class="btn btn-sm btn-primary" onclick="voiceChatManager.showCreateRoomModal()">
            <i class="fas fa-plus"></i> Create Room
          </button>
        </div>
        
        <div class="voice-rooms-list" id="voice-rooms-list">
          ${this.renderVoiceRooms()}
        </div>
        
        ${this.currentRoom ? `
          <div class="current-voice-room">
            <div class="voice-room-info">
              <h5>${this.currentRoom.name}</h5>
              <span class="participant-count">${this.currentRoom.participants?.length || 0} participants</span>
            </div>
            
            <div class="voice-controls">
              <button class="voice-control-btn ${this.isMuted ? 'muted' : ''}" onclick="voiceChatManager.toggleMute()" title="Toggle Microphone">
                <i class="fas fa-${this.isMuted ? 'microphone-slash' : 'microphone'}"></i>
              </button>
              <button class="voice-control-btn ${this.isDeafened ? 'deafened' : ''}" onclick="voiceChatManager.toggleDeafen()" title="Toggle Audio">
                <i class="fas fa-${this.isDeafened ? 'volume-mute' : 'volume-up'}"></i>
              </button>
              <button class="voice-control-btn invite-btn" onclick="voiceChatManager.showInviteModal()" title="Invite Players">
                <i class="fas fa-user-plus"></i>
              </button>
              <button class="voice-control-btn leave-btn" onclick="voiceChatManager.leaveVoiceRoom()" title="Leave Room">
                <i class="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Insert voice chat UI before the existing chat integration
    const chatIntegration = container.querySelector('.clan-chat-integration');
    if (chatIntegration) {
      chatIntegration.insertAdjacentHTML('beforebegin', voiceChatHTML);
    } else {
      container.innerHTML = voiceChatHTML;
    }
  }

  /**
   * Render voice rooms
   */
  renderVoiceRooms() {
    const rooms = Array.from(this.voiceRooms.values());
    
    if (rooms.length === 0) {
      return `
        <div class="no-voice-rooms">
          <i class="fas fa-microphone-slash"></i>
          <p>No voice rooms available. Create one to get started!</p>
        </div>
      `;}

    return rooms.map(room => `
      <div class="voice-room-item ${this.currentRoom?.id === room.id ? 'active' : ''}" onclick="voiceChatManager.joinVoiceRoom('${room.id}')">
        <div class="voice-room-info">
          <i class="fas fa-microphone"></i>
          <span class="room-name">${room.name}</span>
        </div>
        <div class="voice-room-participants">
          <span class="participant-count">${room.participants?.length || 0}/${room.maxParticipants}</span>
        </div>
      </div>
    `).join('');}

  /**
   * Show create room modal
   */
  showCreateRoomModal() {
    const modal = document.createElement('div');
    modal.className = 'voice-modal-overlay';
    modal.innerHTML = `
      <div class="voice-modal">
        <div class="voice-modal-header">
          <h3>Create Voice Room</h3>
          <button class="voice-modal-close" onclick="this.closest('.voice-modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="voice-modal-content">
          <div class="form-group">
            <label for="room-name">Room Name:</label>
            <input type="text" id="room-name" maxlength="30" placeholder="Enter room name...">
          </div>
          
          <div class="form-group">
            <label for="max-participants">Max Participants:</label>
            <select id="max-participants">
              <option value="2">2 participants</option>
              <option value="4">4 participants</option>
              <option value="8" selected>8 participants</option>
              <option value="12">12 participants</option>
            </select>
          </div>
        </div>
        
        <div class="voice-modal-actions">
          <button class="btn btn-secondary" onclick="this.closest('.voice-modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="voiceChatManager.handleCreateRoom()">Create Room</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  /**
   * Handle create room from modal
   */
  handleCreateRoom() {
    const roomName = document.getElementById('room-name').value.trim();
    const maxParticipants = parseInt(document.getElementById('max-participants').value);

    if (!roomName) {
      alert('Please enter a room name');
      return;}

    this.createVoiceRoom(roomName, maxParticipants);
    document.querySelector('.voice-modal-overlay').remove();
  }

  /**
   * Show invite modal
   */
  showInviteModal() {
    // This would show a modal to select clan members to invite
    console.log('🎙️ Showing invite modal');
    // Implementation would integrate with clan member list
  }

  /**
   * Show voice invite notification
   */
  showVoiceInvite(room, inviterName) {
    const notification = document.createElement('div');
    notification.className = 'voice-invite-notification';
    notification.innerHTML = `
      <div class="voice-invite-content">
        <h4>Voice Chat Invite</h4>
        <p><strong>${inviterName}</strong> invited you to join <strong>${room.name}</strong></p>
        <div class="voice-invite-actions">
          <button class="btn btn-primary" onclick="voiceChatManager.joinVoiceRoom('${room.id}'); this.closest('.voice-invite-notification').remove();">
            Join
          </button>
          <button class="btn btn-secondary" onclick="this.closest('.voice-invite-notification').remove();">
            Decline
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 30000);
  }

  /**
   * Update voice UI
   */
  updateVoiceUI() {
    const container = document.getElementById('voice-rooms-list');
    if (container) {
      container.innerHTML = this.renderVoiceRooms();
    }
    
    // Update current room info
    const currentRoomInfo = document.querySelector('.current-voice-room');
    if (this.currentRoom && currentRoomInfo) {
      currentRoomInfo.style.display = 'block';
    } else if (currentRoomInfo) {
      currentRoomInfo.style.display = 'none';
    }
  }

  /**
   * Update voice rooms UI
   */
  updateVoiceRoomsUI() {
    this.updateVoiceUI();
  }

  /**
   * Update voice controls
   */
  updateVoiceControls() {
    const muteBtn = document.querySelector('.voice-control-btn:nth-child(1)');
    const deafenBtn = document.querySelector('.voice-control-btn:nth-child(2)');
    
    if (muteBtn) {
      muteBtn.classList.toggle('muted', this.isMuted);
      muteBtn.innerHTML = `<i class="fas fa-${this.isMuted ? 'microphone-slash' : 'microphone'}"></i>`;
    }
    
    if (deafenBtn) {
      deafenBtn.classList.toggle('deafened', this.isDeafened);
      deafenBtn.innerHTML = `<i class="fas fa-${this.isDeafened ? 'volume-mute' : 'volume-up'}"></i>`;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    console.error('🎙️ Voice Chat Error:', message);
    // Could integrate with existing notification system
    alert(message);
  }

  /**
   * Cleanup on page unload
   */
  cleanup() {
    this.leaveVoiceRoom();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    console.log('🎙️ Voice chat cleaned up');
  }
}

// Create global instance
window.voiceChatManager = new VoiceChatManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.voiceChatManager) {
    window.voiceChatManager.cleanup();
  }
});

console.log('VoiceChatManager module loaded'); 