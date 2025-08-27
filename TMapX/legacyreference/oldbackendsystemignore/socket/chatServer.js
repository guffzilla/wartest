const socketIO = require('socket.io');
const User = require('../models/User');
const ChatMessage = require('../models/ChatMessage');
const OnlineUser = require('../models/OnlineUser');
const Notification = require('../models/Notification');
const ChatRoom = require('../models/ChatRoom');
const Clan = require('../models/Clan');

/**
 * Initialize Socket.IO chat server
 * @param {Object} io - Socket.IO instance
 */
function initChatServer(io) {
  console.log('🚀 Initializing chat server with existing socket.io instance');

  // Function to ensure main chat room exists
  async function ensureMainChatRoom() {
    try {
      // Check if mongoose is connected
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        console.log('⏳ Waiting for database connection before creating main chat room...');
        
        // Wait for database connection
        await new Promise((resolve, reject) => {
          if (mongoose.connection.readyState === 1) {
            resolve();
          } else {
            mongoose.connection.once('connected', resolve);
            mongoose.connection.once('error', reject);
            
            // Timeout after 30 seconds
            setTimeout(() => reject(new Error('Database connection timeout')), 30000);
          }
        });
      }

      const mainRoom = await ChatRoom.findOne({ name: 'Main Chat' });
      if (!mainRoom) {
        // Get or create system user
        let systemUser = await User.findOne({ username: 'System' });
        if (!systemUser) {
          systemUser = await User.create({
            username: 'System',
            email: 'system@warcraftarena.com',
            password: 'system-password-' + Math.random().toString(36).slice(-8),
            role: 'admin'
          });
        }
        
        await ChatRoom.create({
          name: 'Main Chat',
          isPrivate: false,
          createdBy: systemUser._id,
          participants: [systemUser._id]
        });
        console.log('✅ Created main chat room');
      } else {
        console.log('✅ Main chat room already exists');
      }
    } catch (error) {
      console.error('❌ Error ensuring main chat room exists:', error);
    }
  }

  // Ensure main chat room exists (with proper database connection waiting)
  ensureMainChatRoom();

  // Store connected users and their active rooms
  const connectedUsers = new Map();
  const activeRooms = new Map(); // Map of roomId to Set of active socket IDs
  
  // Store voice chat rooms and participants
  const voiceRooms = new Map(); // Map of roomId to voice room data
  const voiceParticipants = new Map(); // Map of socketId to current voice room

  // Function to check and cleanup empty rooms
  async function checkAndCleanupRoom(roomId) {
    try {
      const room = await ChatRoom.findById(roomId);
      if (!room || room.name === 'Main Chat') return;

      // Get active participants count
      const activeCount = activeRooms.has(roomId) ? activeRooms.get(roomId).size : 0;
      const databaseParticipantsCount = room.participants ? room.participants.length : 0;

      // Only delete if no active participants AND no database participants
      // AND room is older than 5 minutes (grace period for newly created rooms)
      const roomAge = Date.now() - room.createdAt.getTime();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (activeCount === 0 && databaseParticipantsCount === 0 && roomAge > fiveMinutes) {
        await ChatRoom.findByIdAndDelete(roomId);
        io.emit('roomDeleted', { roomId });
        activeRooms.delete(roomId);
        console.log(`Room ${roomId} deleted due to no active participants and no database participants (age: ${Math.round(roomAge / 1000)}s)`);
      }
    } catch (error) {
      console.error('Error checking room cleanup:', error);
    }
  }

  // Function to cleanup all empty rooms
  async function cleanupEmptyRooms() {
    try {
      // Delete all rooms except Main Chat that have no active participants AND no database participants
      // AND are older than 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const result = await ChatRoom.deleteMany({
        $and: [
          { name: { $ne: 'Main Chat' } },
          { createdAt: { $lt: fiveMinutesAgo } }, // Only delete rooms older than 5 minutes
          { $or: [
            { participants: { $size: 0 } },
            { participants: { $exists: false } },
            { participants: null },
            { participants: [] }
          ]}
        ]
      });

      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} empty rooms (older than 5 minutes)`);
        // Emit room deleted events for each deleted room
        const deletedRooms = await ChatRoom.find({
          _id: { $in: result.deletedIds }
        });
        deletedRooms.forEach(room => {
          io.emit('roomDeleted', { roomId: room._id });
        });
      }
    } catch (error) {
      console.error('Error cleaning up empty rooms:', error);
    }
  }

  // Set up periodic cleanup of empty rooms
  setInterval(cleanupEmptyRooms, 300000); // Run every 5 minutes instead of 10 seconds

  // Set up Socket.IO connection handler
  io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);

    // Run cleanup immediately on new connection
    await cleanupEmptyRooms();

    // Handle getChatRooms request
    socket.on('getChatRooms', async () => {
      try {
        // Check if user is authenticated
        if (!socket.user || !socket.user.userId) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        // Get all accessible rooms
        const chatRooms = await ChatRoom.find({
          $or: [
            { name: 'Main Chat' }, // Always include main chat
            { 
              $and: [
                { isPrivate: false },
                { participants: { $exists: true, $ne: [] } } // Only include public rooms with participants
              ]
            },
            { 
              $and: [
                { isPrivate: true },
                { participants: socket.user.userId } // Include private rooms where user is a participant
              ]
            }
          ]
        })
        .populate('createdBy', 'username avatar')
        .populate('participants', 'username avatar')
        .sort({ createdAt: -1 }); // Sort by newest first

        // Send rooms list to the client
        socket.emit('chatRoomsList', chatRooms);
      } catch (error) {
        console.error('Error fetching chat rooms:', error);
        socket.emit('error', { message: 'Failed to fetch chat rooms' });
      }
    });

    // Handle user joining chat
    socket.on('join', async (userData) => {
      try {
        const { userId, username, roomId } = userData;
        console.log(`🔗 User joining chat: ${username} (${userId}) - Socket: ${socket.id}`);

        if (!userId || !username) {
          console.error('❌ Invalid user data for join:', userData);
          socket.emit('error', { message: 'Invalid user data' });
          return;
        }

        // Get user from database
        const user = await User.findById(userId).select('username displayName avatar');

        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Store user data in socket for later use
        socket.user = {
          userId: user._id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar
        };

        // Store user data in connected users
        connectedUsers.set(socket.id, socket.user);
        console.log(`✅ Stored user ${username} in connectedUsers map for socket ${socket.id}`);
        console.log(`🔍 Connected users count after join: ${connectedUsers.size}`);

        // Also add/update user in the OnlineUser database collection
        try {
          await OnlineUser.findOneAndUpdate(
            { userId: user._id },
            {
              userId: user._id,
              username: user.username,
              displayName: user.displayName,
              avatar: user.avatar,
              socketId: socket.id,
              status: 'online',
              lastActivity: Date.now()
            },
            { upsert: true, new: true }
          );
          console.log(`✅ Added ${username} to online users database`);
        } catch (dbError) {
          console.error('Error adding user to online users database:', dbError);
        }

        // Join general room
        await socket.join('general');
        
        // Join user's personal notification room
        await socket.join(`user_${userId}`);

        console.log(`✅ Added ${username} to online users`);
        socket.emit('joinedChat', { 
          message: `Welcome to the chat, ${user.displayName || username}!`,
          user: socket.user
        });

        // Broadcast to all clients that a user came online
        socket.broadcast.emit('userOnline', socket.user);

        console.log(`User ${username} joined the chat`);
      } catch (error) {
        console.error('Error handling join:', error);
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Handle getting online users
    socket.on('getOnlineUsers', async (requestData) => {
      try {
        const { context, gameType } = requestData || {};
        
        // Get all connected users
        const onlineUsers = Array.from(connectedUsers.values()).filter(user => 
          user && user.userId && user.username
        );

        console.log(`📡 Sending ${onlineUsers.length} online users to ${socket.user?.username || 'anonymous'}:`);
        console.log('📡 Online users list:', onlineUsers.map(u => `${u.username} (${u.userId})`));
        
        socket.emit('onlineUsers', {
          users: onlineUsers,
          context,
          gameType,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Error getting online users:', error);
        socket.emit('error', { message: 'Failed to get online users' });
      }
    });

    // Handle joining game-specific rooms
    socket.on('joinGameRoom', async (gameData) => {
      try {
        const { gameType } = gameData;
        
        if (!gameType || !['wc1', 'wc2', 'wc3'].includes(gameType)) {
          socket.emit('error', { message: 'Invalid game type' });
          return;
        }
        
        const user = connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        
        const gameRoom = `global-${gameType}`;
        
        // Leave previous game rooms
        const allGameRooms = ['global-wc1', 'global-wc2', 'global-wc3'];
        allGameRooms.forEach(room => {
          socket.leave(room);
        });
        
        // Join the new game room
        socket.join(gameRoom);
        
        console.log(`📡 User ${user.username} joined ${gameType.toUpperCase()} global chat`);
        
        // Get recent messages for this game
        const recentMessages = await ChatMessage.getRecentPublicMessages(50, gameType);
        
        // Send recent messages to the user
        socket.emit('gameMessages', {
          gameType,
          messages: recentMessages.reverse()
        });
        
        // Notify user about successful join
        socket.emit('gameRoomJoined', {
          gameType,
          message: `Joined ${gameType.toUpperCase()} global chat`
        });
        
      } catch (error) {
        console.error('Error in joinGameRoom handler:', error);
        socket.emit('error', { message: 'Failed to join game room' });
      }
    });

    // Handle joining clan rooms
    socket.on('joinClanRoom', async (clanData) => {
      try {
        const { clanId, clanName, clanTag } = clanData;
        
        if (!clanId) {
          socket.emit('error', { message: 'Clan ID is required' });
          return;
        }
        
        const user = connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        
        // Verify user is actually a member of this clan
        const clan = await Clan.findById(clanId);
        
        if (!clan || !clan.isMember(user.userId)) {
          socket.emit('error', { message: 'Access denied to clan room' });
          return;
        }
        
        const clanRoom = `clan-${clanId}`;
        
        // Leave previous clan rooms (user can only be in one clan)
        const allRooms = Array.from(socket.rooms);
        allRooms.forEach(room => {
          if (room.startsWith('clan-')) {
            socket.leave(room);
          }
        });
        
        // Join the clan room
        socket.join(clanRoom);
        
        console.log(`🏰 ${user.username} joined clan room: ${clanName} (${clanTag})`);
        
        // Send confirmation
        socket.emit('clanRoomJoined', {
          clanId,
          clanName,
          clanTag,
          message: `Joined ${clanName} clan chat`
        });
        
      } catch (error) {
        console.error('Error joining clan room:', error);
        socket.emit('error', { message: 'Failed to join clan room' });
      }
    });

    // Handle leaving clan rooms
    socket.on('leaveClanRooms', () => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        
        // Leave all clan rooms
        const allRooms = Array.from(socket.rooms);
        allRooms.forEach(room => {
          if (room.startsWith('clan-')) {
            socket.leave(room);
            console.log(`🏰 ${user.username} left clan room: ${room}`);
          }
        });
        
        // Send confirmation
        socket.emit('clanRoomsLeft', {
          message: 'Left all clan rooms'
        });
        
      } catch (error) {
        console.error('Error leaving clan rooms:', error);
        socket.emit('error', { message: 'Failed to leave clan rooms' });
      }
    });

    // Handle sending messages
    socket.on('sendMessage', async (messageData) => {
      // Gate chat messages by ban/permissions
      try {
        const userMeta = connectedUsers.get(socket.id);
        if (!userMeta) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }
        const dbUser = await User.findById(userMeta.userId).select('permissions banInfo');
        if (!dbUser) return;
        const ban = dbUser.banInfo || {};
        const now = new Date();
        const bannedForChat = ban.isBanned && ((ban.type === 'permanent') || (ban.type === 'temporary' && (!ban.bannedUntil || now < ban.bannedUntil))) && (ban.scope?.chat);
        if (bannedForChat || (dbUser.permissions && dbUser.permissions.canUseChat === false)) {
          socket.emit('chatError', { message: 'Chat is disabled for your account' });
          return;
        }
      } catch (e) {
        socket.emit('chatError', { message: 'Chat error' });
        return;
      }
      try {
        console.log('Received message data:', messageData);
        const { text, type = 'public', recipientId, roomId, room, gameType } = messageData;

        // Get user from connected users map
        const user = connectedUsers.get(socket.id);
        console.log('User from connected users:', user);

        if (!user) {
          console.error('User not found in connected users map');
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        // Create message object
        const messageObj = {
          text,
          sender: {
            userId: user.userId,
            username: user.username,
            avatar: user.avatar
          },
          type,
          createdAt: new Date()
        };
        
        // Add gameType for public messages
        if (type === 'public' && gameType) {
          messageObj.gameType = gameType;
        }

        // Handle private messages
        if (type === 'private' && recipientId) {
          const recipient = await User.findById(recipientId).select('username');

          if (!recipient) {
            console.error('Recipient not found:', recipientId);
            socket.emit('error', { message: 'Recipient not found' });
            return;
          }

          messageObj.recipient = {
            userId: recipient._id,
            username: recipient.username
          };

          // Find recipient's socket
          const recipientSocketId = Array.from(connectedUsers.entries())
            .find(([_, u]) => u.userId && u.userId.toString() === recipientId.toString())
            ?.[0];

          console.log(`Looking for recipient ${recipientId}, found socket: ${recipientSocketId}`);
          
          // Save message to database
          const message = new ChatMessage(messageObj);
          await message.save();

          // Create notification for the recipient if they're not online
          if (!recipientSocketId) {
            console.log(`Creating notification for offline user ${recipientId}`);
            try {
              const notification = new Notification({
                userId: recipientId,
                type: 'privateMessage',
                content: {
                  message: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                  sender: {
                    userId: user.userId,
                    username: user.username,
                    avatar: user.avatar
                  },
                  messageId: message._id
                },
                isRead: false
              });
              await notification.save();
              console.log('Created private message notification:', notification._id);
            } catch (notifError) {
              console.error('Error creating notification:', notifError);
            }
          }

          // Send message to recipient if online
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message', message);
            io.to(recipientSocketId).emit('privateMessageReceived', {
              from: {
                userId: user.userId,
                username: user.username,
                avatar: user.avatar
              },
              message: text,
              timestamp: new Date()
            });
          }

          // Send message back to sender
          socket.emit('message', message);
          socket.emit('privateMessageSent', {
            to: {
              userId: recipientId,
              username: recipient.username
            },
            message: text,
            timestamp: new Date(),
            delivered: !!recipientSocketId
          });
        }
        // Handle room messages
        else if (type === 'room' && roomId) {
          console.log('Processing room message for room:', roomId);
          const room = await ChatRoom.findById(roomId).select('name');
          console.log('Found room:', room);

          if (!room) {
            console.error('Room not found:', roomId);
            socket.emit('error', { message: 'Room not found' });
            return;
          }

          messageObj.room = {
            roomId: room._id,
            name: room.name
          };

          console.log('Created message object:', messageObj);

          // Save message to database
          const message = new ChatMessage(messageObj);
          await message.save();
          console.log('Saved message to database:', message);

          // Get room participants from database to include offline users
          const roomData = await ChatRoom.findById(roomId).select('participants');
          if (!roomData || !roomData.participants) {
            console.error('Room participants not found:', roomId);
            socket.emit('error', { message: 'Room data not found' });
            return;
          }
          
          // Get all active users in the room
          const roomSockets = Array.from(activeRooms.get(roomId) || []);
          const onlineUserIds = new Set();
          
          // For each user in the room, check if they have muted the sender
          for (const socketId of roomSockets) {
            const roomUser = connectedUsers.get(socketId);
            if (roomUser && roomUser.userId) {
              onlineUserIds.add(roomUser.userId.toString());
              const userDoc = await User.findById(roomUser.userId).select('mutedUsers');
              
              // Only send message if user hasn't muted the sender
              if (!userDoc || !userDoc.mutedUsers || !userDoc.mutedUsers.includes(user.userId)) {
                io.to(socketId).emit('message', message);
                io.to(socketId).emit('roomMessageReceived', {
                  roomId,
                  roomName: room.name,
                  message: message
                });
              }
            }
          }
          
          // Create notifications for offline room participants
          for (const participantId of roomData.participants) {
            const participantIdStr = participantId.toString();
            
            // Skip sender and online users
            if (participantIdStr === user.userId.toString() || onlineUserIds.has(participantIdStr)) {
              continue;
            }
            
            // Check if participant has muted the sender
            const participantUser = await User.findById(participantId).select('mutedUsers');
            if (participantUser && participantUser.mutedUsers && participantUser.mutedUsers.includes(user.userId)) {
              continue;
            }
            
            // Create notification for offline user
            try {
              const notification = new Notification({
                userId: participantId,
                type: 'roomMessage',
                content: {
                  message: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                  sender: {
                    userId: user.userId,
                    username: user.username,
                    avatar: user.avatar
                  },
                  room: {
                    roomId: room._id,
                    name: room.name
                  },
                  messageId: message._id
                },
                isRead: false
              });
              await notification.save();
              console.log(`Created room message notification for user ${participantId}`);
            } catch (notifError) {
              console.error(`Error creating notification for user ${participantId}:`, notifError);
            }
          }
        }
        // Handle public messages
        else if (type === 'public') {
          // Save message to database
          const message = new ChatMessage(messageObj);
          await message.save();
          
          console.log(`💬 Saved public message for game: ${gameType || 'general'}`);

          // Determine which room to broadcast to based on gameType
          const targetRoom = gameType ? `global-${gameType}` : 'main';
          
          // Get all users in the target room
          const roomSockets = Array.from(io.sockets.adapter.rooms.get(targetRoom) || []);
          
          console.log(`📡 Broadcasting to ${roomSockets.length} users in room: ${targetRoom}`);
          
          // For each user in the room, check if they have muted the sender
          for (const socketId of roomSockets) {
            const roomUser = connectedUsers.get(socketId);
            if (roomUser) {
              const userDoc = await User.findById(roomUser.userId).select('mutedUsers');
              // Only send message if user hasn't muted the sender
              if (!userDoc || !userDoc.mutedUsers || !userDoc.mutedUsers.includes(user.userId)) {
                io.to(socketId).emit('message', message);
              }
            }
          }
        }
        // Handle clan messages
        else if (type === 'clan' && messageData.clanId) {
          const { clanId } = messageData;
          
          // Verify user is a member of this clan
          const clan = await Clan.findById(clanId);
          if (!clan || !clan.isMember(user.userId)) {
            socket.emit('error', { message: 'Access denied to clan chat' });
            return;
          }
          
          // Add clan information to message
          messageObj.type = 'room';
          messageObj.room = {
            roomId: clan._id,
            name: `${clan.name} Clan Chat`
          };
          
          // Save message to database
          const message = new ChatMessage(messageObj);
          await message.save();
          
          console.log(`🏰 Saved clan message for clan: ${clan.name} (${clan.tag})`);
          
          // Determine clan room
          const clanRoom = `clan-${clanId}`;
          
          // Get all users in the clan room
          const clanSockets = Array.from(io.sockets.adapter.rooms.get(clanRoom) || []);
          
          console.log(`🏰 Broadcasting to ${clanSockets.length} users in clan room: ${clan.name}`);
          
          // For each user in the clan room, check if they have muted the sender
          for (const socketId of clanSockets) {
            const clanUser = connectedUsers.get(socketId);
            if (clanUser) {
              const userDoc = await User.findById(clanUser.userId).select('mutedUsers');
              // Only send message if user hasn't muted the sender
              if (!userDoc || !userDoc.mutedUsers || !userDoc.mutedUsers.includes(user.userId)) {
                io.to(socketId).emit('message', message);
                io.to(socketId).emit('clanMessage', {
                  message,
                  clanId: clan._id,
                  clanName: clan.name,
                  clanTag: clan.tag
                });
              }
            }
          }
          
          // Create notifications for offline clan members
          for (const member of clan.members) {
            const memberIdStr = member.user.toString();
            
            // Skip sender and users who are currently in the clan room
            if (memberIdStr === user.userId.toString()) {
              continue;
            }
            
            // Check if member is currently online in the clan room
            const isOnlineInRoom = clanSockets.some(socketId => {
              const roomUser = connectedUsers.get(socketId);
              return roomUser && roomUser.userId.toString() === memberIdStr;
            });
            
            if (isOnlineInRoom) {
              continue;
            }
            
            // Check if member has muted the sender
            const memberUser = await User.findById(member.user).select('mutedUsers');
            if (memberUser && memberUser.mutedUsers && memberUser.mutedUsers.includes(user.userId)) {
              continue;
            }
            
            // Create notification for offline clan member
            try {
              const notification = new Notification({
                userId: member.user,
                type: 'clanMessage',
                content: {
                  message: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                  sender: {
                    userId: user.userId,
                    username: user.username,
                    avatar: user.avatar
                  },
                  clan: {
                    clanId: clan._id,
                    name: clan.name,
                    tag: clan.tag
                  },
                  messageId: message._id
                },
                isRead: false
              });
              await notification.save();
              console.log(`🏰 Created clan message notification for user ${member.user}`);
            } catch (notifError) {
              console.error(`Error creating clan notification for user ${member.user}:`, notifError);
            }
          }
        }
        else {
          console.error('Invalid message type or missing recipient/room:', { type, recipientId, roomId });
          socket.emit('error', { message: 'Invalid message type or missing recipient/room' });
        }

        // Update user's last activity
        await OnlineUser.updateUserStatus(user.userId, 'online');
      } catch (error) {
        console.error('Error in sendMessage handler:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle status changes
    socket.on('updateStatus', async (statusData) => {
      try {
        const { status } = statusData;

        if (!['online', 'away', 'busy'].includes(status)) {
          socket.emit('error', { message: 'Invalid status' });
          return;
        }

        const user = connectedUsers.get(socket.id);

        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        // Update status in database
        await OnlineUser.updateUserStatus(user.userId, status);

        // Notify all clients about the status change
        io.to('main').emit('userStatusChanged', {
          userId: user.userId,
          status
        });
      } catch (error) {
        console.error('Error in updateStatus handler:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle chat room deletion
    socket.on('deleteRoom', async ({ roomId }) => {
      try {
        const room = await ChatRoom.findById(roomId);
        
        // Only delete if room exists and is not the main chat room
        if (room && room.name !== 'Main Chat') {
          // Double check if room is empty
          if (room.participants.length === 0) {
            await ChatRoom.findByIdAndDelete(roomId);
            io.emit('roomDeleted', { roomId });
          }
        }
      } catch (error) {
        console.error('Error handling room deletion:', error);
      }
    });

    // Handle chat room creation
    socket.on('createChatRoom', async (roomData) => {
      try {
        console.log('🚀 Creating chat room:', roomData);
        console.log('🔍 Socket ID:', socket.id);
        console.log('🔍 Connected users count:', connectedUsers.size);
        console.log('🔍 Connected users:', Array.from(connectedUsers.entries()).map(([id, user]) => `${id}: ${user.username}`));
        
        const user = connectedUsers.get(socket.id);
        if (!user) {
          console.error('❌ User not found in connectedUsers map for socket:', socket.id);
          console.error('❌ Available users:', Array.from(connectedUsers.keys()));
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        const { name, isPrivate = false } = roomData;
        
        if (!name || name.trim().length === 0) {
          socket.emit('error', { message: 'Room name is required' });
          return;
        }

        // Check if room with same name already exists
        const existingRoom = await ChatRoom.findOne({ name: name.trim() });
        if (existingRoom) {
          socket.emit('error', { message: 'Room with this name already exists' });
          return;
        }

        // Check if user already has a custom chat room
        const userExistingRoom = await ChatRoom.findOne({
          createdBy: user.userId,
          name: { $ne: 'Main Chat' } // Exclude the main chat room
        });

        if (userExistingRoom) {
          socket.emit('error', { 
            message: `You can only create one custom chat room. You already have a room called "${userExistingRoom.name}"` 
          });
          return;
        }

        // Create new chat room
        const chatRoom = new ChatRoom({
          name: name.trim(),
          createdBy: user.userId,
          isPrivate: isPrivate,
          participants: [user.userId]
        });

        await chatRoom.save();
        console.log('✅ Chat room created:', chatRoom._id);

        // Populate the room data
        await chatRoom.populate('createdBy', 'username avatar');
        await chatRoom.populate('participants', 'username avatar');

        // Join the creator to the socket room
        socket.join(`room:${chatRoom._id}`);
        
        // Add socket to active rooms
        if (!activeRooms.has(chatRoom._id.toString())) {
          activeRooms.set(chatRoom._id.toString(), new Set());
        }
        activeRooms.get(chatRoom._id.toString()).add(socket.id);

        // Send confirmation to creator
        socket.emit('chatRoomCreated', {
          success: true,
          room: chatRoom,
          message: `Chat room "${name}" created successfully!`
        });

        // Broadcast new room to all users if it's public
        if (!isPrivate) {
          io.emit('newChatRoom', chatRoom);
        }

        // Broadcast updated chat rooms list to all users
        const updatedChatRooms = await ChatRoom.find({
          $or: [
            { name: 'Main Chat' }, // Always include main chat
            { 
              $and: [
                { isPrivate: false },
                { participants: { $exists: true, $ne: [] } } // Only include public rooms with participants
              ]
            }
          ]
        })
        .populate('createdBy', 'username avatar')
        .populate('participants', 'username avatar')
        .sort({ createdAt: -1 }); // Sort by newest first

        // Send updated rooms list to all clients
        io.emit('chatRoomsList', updatedChatRooms);

        // Send system message to the new room
        const welcomeMessage = new ChatMessage({
          text: `Welcome to ${name}! Room created by ${user.username}`,
          sender: {
            userId: user.userId,
            username: user.username,
            avatar: user.avatar
          },
          type: 'system',
          room: {
            roomId: chatRoom._id,
            name: chatRoom.name
          }
        });

        await welcomeMessage.save();
        socket.emit('message', welcomeMessage);

        console.log(`🎉 User ${user.username} created room "${name}"`);
      } catch (error) {
        console.error('Error creating chat room:', error);
        socket.emit('error', { message: 'Failed to create chat room' });
      }
    });

    // Handle user joining a specific room
    socket.on('joinRoom', async ({ roomId }) => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        console.log(`🚪 User ${user.username} attempting to join room: ${roomId}`);

        // Get room from database
        const room = await ChatRoom.findById(roomId).populate('createdBy', 'username avatar').populate('participants', 'username avatar');
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        // Check if user is already a participant
        const isParticipant = room.participants.some(p => p._id.equals(user.userId));
        
        if (!isParticipant) {
          // Add user to room participants
          room.participants.push(user.userId);
          await room.save();
          
          // Refresh room data with populated participants
          await room.populate('participants', 'username avatar');
        }

        // Join socket room
        await socket.join(`room:${roomId}`);
        
        // Add socket to active rooms
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, new Set());
        }
        activeRooms.get(roomId).add(socket.id);

        // Small delay to ensure socket room membership is fully established
        setTimeout(() => {
          // Send success response with room data
          socket.emit('roomJoined', {
            success: true,
            room: room,
            message: `Joined ${room.name}`
          });
        }, 50);

        // Broadcast user joined message to room
        if (!isParticipant) {
          const joinMessage = new ChatMessage({
            text: `${user.username} joined the room`,
            sender: {
              userId: user.userId,
              username: user.username,
              avatar: user.avatar
            },
            type: 'system',
            room: {
              roomId: room._id,
              name: room.name
            }
          });
          await joinMessage.save();
          
          // Send to all users in the room
          io.to(`room:${roomId}`).emit('message', joinMessage);
        }

        // Broadcast updated room info
        io.emit('roomUpdated', {
          roomId,
          activeParticipants: activeRooms.has(roomId) ? activeRooms.get(roomId).size : 0,
          totalParticipants: room.participants.length
        });

        console.log(`✅ User ${user.username} joined room: ${room.name}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Handle user leaving a room
    socket.on('leaveRoom', async ({ roomId, userId }) => {
      try {
        // Get room info
        const room = await ChatRoom.findById(roomId);
        if (!room) return;

        // Remove socket from active rooms
        if (activeRooms.has(roomId)) {
          activeRooms.get(roomId).delete(socket.id);
          if (activeRooms.get(roomId).size === 0) {
            activeRooms.delete(roomId);
          }
        }

        // Remove user from room participants
        room.participants = room.participants.filter(p => !p.equals(userId));
        
        // Only delete room if it's empty AND older than 5 minutes AND not the main chat room
        const roomAge = Date.now() - room.createdAt.getTime();
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        if (room.participants.length === 0 && room.name !== 'Main Chat' && roomAge > fiveMinutes) {
          await ChatRoom.findByIdAndDelete(roomId);
          io.emit('roomDeleted', { roomId });
          console.log(`Room ${roomId} deleted due to no participants (age: ${Math.round(roomAge / 1000)}s)`);
        } else {
          await room.save();
          // Broadcast user left message
          io.to(`room:${roomId}`).emit('message', {
            type: 'system',
            text: `${socket.user.username} left the room`,
            createdAt: new Date()
          });

          // Check if room should be deleted (using the improved cleanup logic)
          await checkAndCleanupRoom(roomId);

          // Broadcast updated room info
          io.emit('roomUpdated', {
            roomId,
            activeParticipants: activeRooms.has(roomId) ? activeRooms.get(roomId).size : 0,
            totalParticipants: room.participants.length
          });
        }
      } catch (error) {
        console.error('Error handling room leave:', error);
      }
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
      try {
        console.log('Client disconnected:', socket.id);
        
        // Get user info before removing from connected users
        const user = connectedUsers.get(socket.id);
        
        // Remove this specific socket from connected users map
        connectedUsers.delete(socket.id);
        
        // Handle OnlineUser database cleanup
        if (user && user.userId) {
          try {
            // Check if this user has other active connections (after removing current one)
            const otherConnections = Array.from(connectedUsers.values())
              .filter(connectedUser => 
                connectedUser.userId && 
                connectedUser.userId.toString() === user.userId.toString()
              );

            // Only remove from database if this was the last connection for this user
            if (otherConnections.length === 0) {
              await OnlineUser.findOneAndDelete({ userId: user.userId });
              console.log(`✅ Removed ${user.username} from online users (last connection)`);
              
              // Broadcast that user went offline
              socket.broadcast.emit('userOffline', user);
            } else {
              // Update the socketId to one of the remaining connections
              const remainingConnection = Array.from(connectedUsers.entries())
                .find(([socketId, connectedUser]) => 
                  connectedUser.userId && 
                  connectedUser.userId.toString() === user.userId.toString()
                );
              
              if (remainingConnection) {
                await OnlineUser.findOneAndUpdate(
                  { userId: user.userId },
                  { socketId: remainingConnection[0], lastActivity: Date.now() }
                );
                console.log(`✅ Updated ${user.username} socketId (still has ${otherConnections.length} other connections)`);
              }
            }
          } catch (error) {
            console.error('Error handling OnlineUser cleanup:', error);
          }
        }

        // Update user's last active timestamp
        if (user && user.userId) {
          await User.findByIdAndUpdate(user.userId, {
            lastActive: new Date()
          });
        }

        // Remove socket from all active rooms and check for cleanup
        for (const [roomId, sockets] of activeRooms.entries()) {
          if (sockets.has(socket.id)) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
              activeRooms.delete(roomId);
              // Check if room should be deleted
              await checkAndCleanupRoom(roomId);
            }
          }
        }

        // Handle rooms the user was in - only if socket.user exists
        if (socket.user && socket.user.userId) {
          const rooms = await ChatRoom.find({
            'participants': socket.user.userId
          });

          for (const room of rooms) {
            // Remove user from room participants
            room.participants = room.participants.filter(p => !p.equals(socket.user.userId));
            
            // Only delete room if it's empty AND older than 5 minutes AND not the main chat room
            const roomAge = Date.now() - room.createdAt.getTime();
            const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
            
            if (room.participants.length === 0 && room.name !== 'Main Chat' && roomAge > fiveMinutes) {
              await ChatRoom.findByIdAndDelete(room._id);
              io.emit('roomDeleted', { roomId: room._id });
              console.log(`Room ${room._id} deleted due to user disconnect (age: ${Math.round(roomAge / 1000)}s)`);
            } else {
              await room.save();
              // Broadcast user left message
              io.to(`room:${room._id}`).emit('message', {
                type: 'system',
                text: `${socket.user.username} left the room`,
                createdAt: new Date()
              });

              // Check if room should be deleted (using the improved cleanup logic)
              await checkAndCleanupRoom(room._id);

              // Broadcast updated room info
              io.emit('roomUpdated', {
                roomId: room._id,
                activeParticipants: activeRooms.has(room._id) ? activeRooms.get(room._id).size : 0,
                totalParticipants: room.participants.length
              });
            }
          }
        } else {
          console.log('Socket disconnected without user authentication');
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });

    // Handle private message sending  
    socket.on('sendPrivateMessage', async (data) => {
      try {
        const { recipientId, text } = data;
        
        if (!text || !text.trim() || !recipientId) {
          socket.emit('error', { message: 'Message text and recipient are required' });
          return;
        }

        const user = connectedUsers.get(socket.id);
        if (!user) {
          socket.emit('error', { message: 'User not authenticated' });
          return;
        }

        console.log(`Private message from ${user.username} to ${recipientId}: ${text}`);

        // Get recipient info
        const recipient = await User.findById(recipientId).select('username displayName');
        if (!recipient) {
          socket.emit('error', { message: 'Recipient not found' });
          return;
        }

        // Create message object
        const messageObj = {
          text: text.trim(),
          sender: {
            userId: user.userId,
            username: user.username,
            avatar: user.avatar
          },
          recipient: {
            userId: recipientId,
            username: recipient.username || recipient.displayName
          },
          type: 'private',
          isRead: false
        };

        // Save message to database
        const message = new ChatMessage(messageObj);
        await message.save();

        // Find recipient's socket
        const recipientSocketId = Array.from(connectedUsers.entries())
          .find(([_, u]) => u.userId && u.userId.toString() === recipientId.toString())
          ?.[0];

        // Send message to recipient if online
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('privateMessage', message);
          
          // Mark message as delivered
          console.log(`Message delivered to online user ${recipientId}`);
        } else {
          console.log(`Recipient ${recipientId} is offline, creating notification`);
        }

        // Always create a notification for private messages
        try {
          await Notification.createMessageNotification(
            recipientId,
            user.userId,
            user.username
          );
          console.log(`Created notification for user ${recipientId}`);
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }

        // Confirm message sent to sender
        socket.emit('privateMessageSent', {
          messageId: message._id,
          recipientId,
          delivered: !!recipientSocketId,
          timestamp: message.createdAt
        });

      } catch (error) {
        console.error('Error handling private message:', error);
        socket.emit('error', { message: 'Failed to send private message' });
      }
    });

    // Handle real-time notification delivery
    socket.on('sendNotification', async (notificationData) => {
      try {
        const { recipientId, type, content, data } = notificationData;
        
        if (!socket.user) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Create notification in database
        const notification = await Notification.create({
          userId: recipientId,
          type,
          content,
          data,
          isRead: false
        });

        // Send real-time notification to recipient if they're online
        io.to(`user_${recipientId}`).emit('newNotification', {
          id: notification._id,
          type: notification.type,
          content: notification.content,
          data: notification.data,
          createdAt: notification.createdAt,
          isRead: false
        });

        console.log(`📬 Sent real-time notification to user ${recipientId}: ${type}`);
        
        // Confirm to sender
        socket.emit('notificationSent', { success: true, notificationId: notification._id });
      } catch (error) {
        console.error('Error sending notification:', error);
        socket.emit('error', { message: 'Failed to send notification' });
      }
    });

    // ===== VOICE CHAT HANDLERS =====
    
    // Handle voice room creation
    socket.on('create-voice-room', async (roomData) => {
      try {
        if (!socket.user) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { name, maxParticipants, clanId } = roomData;
        const roomId = `voice_${Date.now()}_${socket.user.userId}`;
        
        const voiceRoom = {
          id: roomId,
          name: name,
          creator: socket.user.userId,
          participants: [],
          maxParticipants: maxParticipants || 8,
          clanId: clanId,
          createdAt: new Date()
        };

        voiceRooms.set(roomId, voiceRoom);
        
        socket.emit('voice-room-created', { room: voiceRoom });
        
        // Broadcast to clan members if it's a clan room
        if (clanId) {
          socket.broadcast.emit('voice-room-available', { room: voiceRoom });
        }
        
        console.log(`🎙️ Voice room created: ${name} by ${socket.user.username}`);
      } catch (error) {
        console.error('Error creating voice room:', error);
        socket.emit('error', { message: 'Failed to create voice room' });
      }
    });

    // Handle joining voice room
    socket.on('join-voice-room', async (data) => {
      try {
        const { roomId, userId } = data;
        
        if (!socket.user || socket.user.userId.toString() !== userId.toString()) {
          socket.emit('error', { message: 'Authentication mismatch' });
          return;
        }

        const room = voiceRooms.get(roomId);
        if (!room) {
          socket.emit('error', { message: 'Voice room not found' });
          return;
        }

        if (room.participants.length >= room.maxParticipants) {
          socket.emit('error', { message: 'Voice room is full' });
          return;
        }

        // Add user to room
        room.participants.push({
          userId: socket.user.userId,
          username: socket.user.username,
          socketId: socket.id
        });

        voiceParticipants.set(socket.id, roomId);
        
        // Join socket room for voice signaling
        socket.join(`voice_${roomId}`);
        
        // Notify user they joined
        socket.emit('voice-room-joined', { room });
        
        // Notify other participants
        socket.to(`voice_${roomId}`).emit('voice-user-joined', {
          userId: socket.user.userId,
          username: socket.user.username,
          roomId
        });
        
        console.log(`🎙️ ${socket.user.username} joined voice room: ${room.name}`);
      } catch (error) {
        console.error('Error joining voice room:', error);
        socket.emit('error', { message: 'Failed to join voice room' });
      }
    });

    // Handle leaving voice room
    socket.on('leave-voice-room', async (data) => {
      try {
        const { roomId, userId } = data;
        
        if (!socket.user || socket.user.userId.toString() !== userId.toString()) {
          socket.emit('error', { message: 'Authentication mismatch' });
          return;
        }

        const room = voiceRooms.get(roomId);
        if (room) {
          // Remove user from room participants
          room.participants = room.participants.filter(p => p.userId.toString() !== userId.toString());
          
          // Leave socket room
          socket.leave(`voice_${roomId}`);
          voiceParticipants.delete(socket.id);
          
          // Notify user they left
          socket.emit('voice-room-left', { roomId });
          
          // Notify other participants
          socket.to(`voice_${roomId}`).emit('voice-user-left', {
            userId: socket.user.userId,
            roomId
          });
          
          // Delete room if empty
          if (room.participants.length === 0) {
            voiceRooms.delete(roomId);
            console.log(`🎙️ Voice room deleted: ${room.name}`);
          }
          
          console.log(`🎙️ ${socket.user.username} left voice room: ${room.name}`);
        }
      } catch (error) {
        console.error('Error leaving voice room:', error);
      }
    });

    // Handle WebRTC signaling - offer
    socket.on('voice-offer', (data) => {
      const { offer, targetPeerId, roomId } = data;
      const room = voiceRooms.get(roomId);
      
      if (room) {
        const targetParticipant = room.participants.find(p => p.userId.toString() === targetPeerId.toString());
        if (targetParticipant) {
          io.to(targetParticipant.socketId).emit('voice-offer', {
            offer,
            fromPeerId: socket.user.userId,
            roomId
          });
        }
      }
    });

    // Handle WebRTC signaling - answer
    socket.on('voice-answer', (data) => {
      const { answer, targetPeerId, roomId } = data;
      const room = voiceRooms.get(roomId);
      
      if (room) {
        const targetParticipant = room.participants.find(p => p.userId.toString() === targetPeerId.toString());
        if (targetParticipant) {
          io.to(targetParticipant.socketId).emit('voice-answer', {
            answer,
            fromPeerId: socket.user.userId,
            roomId
          });
        }
      }
    });

    // Handle WebRTC signaling - ICE candidate
    socket.on('voice-ice-candidate', (data) => {
      const { candidate, targetPeerId, roomId } = data;
      const room = voiceRooms.get(roomId);
      
      if (room) {
        const targetParticipant = room.participants.find(p => p.userId.toString() === targetPeerId.toString());
        if (targetParticipant) {
          io.to(targetParticipant.socketId).emit('voice-ice-candidate', {
            candidate,
            fromPeerId: socket.user.userId,
            roomId
          });
        }
      }
    });

    // Handle voice room invitations
    socket.on('invite-to-voice-room', async (data) => {
      try {
        const { roomId, invitedUserId, inviterName } = data;
        
        if (!socket.user) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const room = voiceRooms.get(roomId);
        if (!room) {
          socket.emit('error', { message: 'Voice room not found' });
          return;
        }

        // Find invited user's socket
        const invitedUserSocket = Array.from(connectedUsers.entries())
          .find(([_, user]) => user.userId.toString() === invitedUserId.toString());

        if (invitedUserSocket) {
          io.to(invitedUserSocket[0]).emit('voice-room-invite', {
            room,
            inviterName: inviterName || socket.user.username
          });
          console.log(`🎙️ Voice room invitation sent to ${invitedUserId}`);
        }
      } catch (error) {
        console.error('Error sending voice room invitation:', error);
      }
    });

    // ===== FORUM LIVE FEATURES =====
    
    // Store forum room participants
    const forumRooms = new Map(); // Map of roomId to Set of socket IDs
    
    // Handle joining forum room
    socket.on('forum:joinRoom', (data) => {
      try {
        const { room, user } = data;
        
        if (!socket.user) {
          socket.emit('error', { message: 'Not authenticated for forum features' });
          return;
        }
        
        // Join the forum room
        socket.join(room);
        
        // Track room participation
        if (!forumRooms.has(room)) {
          forumRooms.set(room, new Set());
        }
        forumRooms.get(room).add(socket.id);
        
        // Store current forum room on socket
        socket.currentForumRoom = room;
        
        // Notify other users in the room
        socket.to(room).emit('forum:userOnline', {
          user: socket.user
        });
        
        console.log(`📝 ${socket.user.username} joined forum room: ${room}`);
      } catch (error) {
        console.error('Error joining forum room:', error);
      }
    });
    
    // Handle leaving forum room
    socket.on('forum:leaveRoom', (data) => {
      try {
        const { room } = data;
        
        if (socket.currentForumRoom) {
          // Leave the room
          socket.leave(socket.currentForumRoom);
          
          // Remove from tracking
          if (forumRooms.has(socket.currentForumRoom)) {
            forumRooms.get(socket.currentForumRoom).delete(socket.id);
            
            // Clean up empty room tracking
            if (forumRooms.get(socket.currentForumRoom).size === 0) {
              forumRooms.delete(socket.currentForumRoom);
            }
          }
          
          // Notify other users
          if (socket.user) {
            socket.to(socket.currentForumRoom).emit('forum:userOffline', {
              user: socket.user
            });
          }
          
          socket.currentForumRoom = null;
        }
      } catch (error) {
        console.error('Error leaving forum room:', error);
      }
    });
    
    // Handle forum typing indicators
    socket.on('forum:typing', (data) => {
      try {
        const { room, user } = data;
        
        if (!socket.user || !room) return;
        
        // Broadcast typing to other users in the room
        socket.to(room).emit('forum:typing', {
          user: socket.user
        });
        
      } catch (error) {
        console.error('Error handling forum typing:', error);
      }
    });
    
    // Handle stop typing
    socket.on('forum:stopTyping', (data) => {
      try {
        const { room, user } = data;
        
        if (!socket.user || !room) return;
        
        // Broadcast stop typing to other users in the room
        socket.to(room).emit('forum:stopTyping', {
          user: socket.user
        });
        
      } catch (error) {
        console.error('Error handling forum stop typing:', error);
      }
    });
    
    // Handle new forum posts
    socket.on('forum:newPost', (data) => {
      try {
        const { post, gameType } = data;
        
        if (!socket.user) return;
        
        const roomName = `forum_${gameType}`;
        
        // Broadcast new post to all users in the game's forum room
        socket.to(roomName).emit('forum:newPost', {
          post,
          gameType,
          author: socket.user
        });
        
        // Also broadcast to general activity tracking
        io.emit('forum:activity', {
          type: 'newPost',
          user: socket.user,
          content: `Posted in ${gameType.toUpperCase()} forum`,
          timestamp: Date.now()
        });
        
        console.log(`📝 New ${gameType} forum post by ${socket.user.username}`);
      } catch (error) {
        console.error('Error handling new forum post:', error);
      }
    });
    
    // Handle forum post reactions
    socket.on('forum:postReaction', (data) => {
      try {
        const { postId, reaction, gameType } = data;
        
        if (!socket.user) return;
        
        const roomName = `forum_${gameType}`;
        
        // Broadcast reaction to all users in the room
        socket.to(roomName).emit('forum:postReaction', {
          postId,
          reaction,
          user: socket.user
        });
        
        // If it's a celebration, add to live activity
        if (reaction === 'celebrate') {
          io.emit('forum:activity', {
            type: 'celebration',
            user: socket.user,
            content: 'Celebrated an epic post! 🏆',
            timestamp: Date.now()
          });
        }
        
      } catch (error) {
        console.error('Error handling forum post reaction:', error);
      }
    });
    
    // Handle forum activity requests
    socket.on('forum:getActivity', () => {
      try {
        // Generate some sample activities for now
        const sampleActivities = [
          {
            type: 'newPost',
            user: { username: 'StrategyMaster', avatar: '/assets/img/profiles/dragon.png' },
            content: 'Posted in WC2 forum',
            timestamp: Date.now() - 300000 // 5 minutes ago
          },
          {
            type: 'celebration',
            user: { username: 'EpicGamer', avatar: '/assets/img/profiles/elf.png' },
            content: 'Celebrated an epic post! 🏆',
            timestamp: Date.now() - 600000 // 10 minutes ago
          }
        ];
        
        socket.emit('forum:activity', sampleActivities);
      } catch (error) {
        console.error('Error getting forum activity:', error);
      }
    });
    
    // Handle trending topics requests
    socket.on('forum:getTrending', (data) => {
      try {
        const { gameType } = data || {};
        
        // Generate sample trending topics based on game type
        const trendingTopics = {
          wc1: [
            { title: 'Best Early Game Strategies', posts: 45, interactions: 127 },
            { title: 'Human vs Orc Balance', posts: 32, interactions: 89 }
          ],
          wc2: [
            { title: 'Advanced Rush Strategies', posts: 67, interactions: 203 },
            { title: 'Map Control Tactics', posts: 54, interactions: 178 }
          ],
          wc3: [
            { title: 'Hero Tier Lists 2024', posts: 89, interactions: 267 },
            { title: 'Custom Game Modes', posts: 72, interactions: 198 }
          ]
        };
        
        socket.emit('forum:trending', {
          topics: trendingTopics[gameType] || trendingTopics.wc2
        });
      } catch (error) {
        console.error('Error getting trending topics:', error);
      }
    });

    // Clean up voice chat and forum on disconnect
    const originalDisconnectHandler = socket.disconnect;
    socket.on('disconnect', () => {
      // Clean up voice chat on disconnect
      const roomId = voiceParticipants.get(socket.id);
      if (roomId) {
        const room = voiceRooms.get(roomId);
        if (room && socket.user) {
          // Remove user from room participants
          room.participants = room.participants.filter(p => p.socketId !== socket.id);
          
          // Notify other participants
          socket.to(`voice_${roomId}`).emit('voice-user-left', {
            userId: socket.user.userId,
            roomId
          });
          
          // Delete room if empty
          if (room.participants.length === 0) {
            voiceRooms.delete(roomId);
            console.log(`🎙️ Voice room deleted on disconnect: ${room.name}`);
          }
          
          voiceParticipants.delete(socket.id);
        }
      }
      
      // Clean up forum room participation
      if (socket.currentForumRoom && socket.user) {
        // Remove from room tracking
        if (forumRooms.has(socket.currentForumRoom)) {
          forumRooms.get(socket.currentForumRoom).delete(socket.id);
          
          // Clean up empty room tracking
          if (forumRooms.get(socket.currentForumRoom).size === 0) {
            forumRooms.delete(socket.currentForumRoom);
          }
        }
        
        // Notify other users in forum room
        socket.to(socket.currentForumRoom).emit('forum:userOffline', {
          user: socket.user
        });
        
        console.log(`📝 ${socket.user.username} left forum room: ${socket.currentForumRoom}`);
      }
    });
  });
}

module.exports = { initChatServer };