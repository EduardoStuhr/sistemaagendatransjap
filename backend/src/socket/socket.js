import jwt from 'jsonwebtoken';
import { config } from '../config.js';

const connectedUsers = new Map();

export function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth error'));
    try {
      const payload = jwt.verify(token, config.jwtSecret);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Auth error'));
    }
  });

  io.on('connection', (socket) => {
    connectedUsers.set(socket.userId, socket.id);
    socket.join(`user:${socket.userId}`);
    io.emit('users:online', [...connectedUsers.keys()]);

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
      io.emit('users:online', [...connectedUsers.keys()]);
    });
  });
}

export function notifyUser(io, userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

export function notifyUsers(io, userIds, event, data) {
  userIds.forEach(id => io.to(`user:${id}`).emit(event, data));
}
