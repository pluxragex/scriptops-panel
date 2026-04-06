import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WSGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'https://222prod.cc',
      'http://222prod.cc'
    ],
    credentials: true,
  },
  namespace: '/',
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private userSockets = new Map<string, Set<string>>();
  private socketToSession = new Map<string, string>();
  private sessionToSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {

      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Клиент ${client.id} подключился без токена`);
        client.disconnect();
        return;
      }


      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });


      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          isBlocked: true,
        },
      });

      if (!user || !user.isActive || user.isBlocked) {
        this.logger.warn(`Недействительный пользователь для клиента ${client.id}`);
        client.disconnect();
        return;
      }


      client.userId = user.id;
      client.user = user;


      const sessionId = client.handshake.query.sessionId as string | undefined;


      if (sessionId) {
        try {

          const session = await this.prisma.session.findFirst({
            where: {
              id: sessionId,
              userId: user.id,
              expiresAt: { gt: new Date() },
            },
          });

          if (session) {

            const refreshToken = await this.prisma.refreshToken.findFirst({
              where: {
                tokenHash: session.tokenHash,
                isRevoked: false,
                expiresAt: { gt: new Date() },
              },
            });

            if (!refreshToken) {

              this.logger.warn(`Сессия ${sessionId} была завершена (refresh token отозван или истек) для сокета ${client.id}`);
              client.disconnect();
              return;
            }


            this.socketToSession.set(client.id, sessionId);


            if (!this.sessionToSockets.has(sessionId)) {
              this.sessionToSockets.set(sessionId, new Set());
            }
            this.sessionToSockets.get(sessionId)!.add(client.id);

          } else {

            this.logger.warn(`Сессия ${sessionId} не найдена или не принадлежит пользователю ${user.id} для сокета ${client.id} - отключаем сокет`);
            client.disconnect();
            return;
          }
        } catch (error) {
          this.logger.error(`Ошибка при проверке сессии для сокета ${client.id}:`, error);
          client.disconnect();
          return;
        }
      } else {


        const activeSession = await this.prisma.session.findFirst({
          where: {
            userId: user.id,
            expiresAt: { gt: new Date() },
          },
        });

        if (activeSession) {

          const refreshToken = await this.prisma.refreshToken.findFirst({
            where: {
              tokenHash: activeSession.tokenHash,
              isRevoked: false,
              expiresAt: { gt: new Date() },
            },
          });

          if (!refreshToken) {

            this.logger.warn(`Все сессии пользователя ${user.id} завершены - отключаем сокет ${client.id}`);
            client.disconnect();
            return;
          }
        } else {

          this.logger.warn(`У пользователя ${user.id} нет активных сессий - отключаем сокет ${client.id}`);
          client.disconnect();
          return;
        }

      }


      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);


      client.emit('connected', {
        message: 'Подключение установлено',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      });

    } catch (error) {

      if (error?.name === 'TokenExpiredError' || error?.message?.includes('jwt expired')) {
        this.logger.warn(`Токен истек для клиента ${client.id} - ожидается переподключение с новым токеном`);
      } else {

        this.logger.error(`Ошибка аутентификации клиента ${client.id}:`, error);
      }
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.userSockets.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }


      const sessionId = this.socketToSession.get(client.id);
      if (sessionId) {
        this.socketToSession.delete(client.id);


        const sessionSockets = this.sessionToSockets.get(sessionId);
        if (sessionSockets) {
          sessionSockets.delete(client.id);
          if (sessionSockets.size === 0) {
            this.sessionToSockets.delete(sessionId);
          }
        }
      }
    }
  }

  @SubscribeMessage('join-script-room')
  async handleJoinScriptRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { scriptId: string },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Не авторизован' });
      return;
    }

    const { scriptId } = data;


    const script = await this.prisma.script.findFirst({
      where: {
        id: scriptId,
        OR: [
          { ownerId: client.userId },
          { owner: { role: 'ADMIN' } },
        ],
      },
    });

    if (!script) {
      client.emit('error', { message: 'Нет доступа к скрипту' });
      return;
    }


    client.join(`script:${scriptId}`);
    client.emit('joined-script-room', { scriptId });


  }

  @SubscribeMessage('leave-script-room')
  async handleLeaveScriptRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { scriptId: string },
  ) {
    const { scriptId } = data;
    client.leave(`script:${scriptId}`);
    client.emit('left-script-room', { scriptId });


  }

  @SubscribeMessage('request-logs')
  async handleRequestLogs(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { scriptId: string, lines?: number },
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'Не авторизован' });
      return;
    }

    const { scriptId, lines = 200 } = data;


    const script = await this.prisma.script.findFirst({
      where: {
        id: scriptId,
        OR: [
          { ownerId: client.userId },
          { owner: { role: 'ADMIN' } },
        ],
      },
      include: { server: true },
    });

    if (!script) {
      client.emit('error', { message: 'Нет доступа к скрипту' });
      return;
    }


    client.emit('logs', {
      scriptId,
      logs: `Логи для скрипта ${scriptId} (${lines} строк)\n[${new Date().toISOString()}] Скрипт запущен\n[${new Date().toISOString()}] Ожидание команд...`,
    });
  }


  emitToSession(sessionId: string, event: string, data: any) {
    if (!this.server) {
      this.logger.warn(`Не удалось отправить сообщение сессии ${sessionId}: WebSocket сервер не инициализирован`);
      return;
    }

    const socketIds = this.sessionToSockets.get(sessionId);
    if (!socketIds || socketIds.size === 0) {
      return;
    }

    let sentCount = 0;
    const serverAny = this.server as any;


    const socketsToCheck = Array.from(socketIds);

    socketsToCheck.forEach(socketId => {
      try {
        let socket: Socket | undefined;


        if (serverAny.sockets?.sockets instanceof Map) {
          socket = serverAny.sockets.sockets.get(socketId);
        }

        else if (serverAny.sockets instanceof Map) {
          socket = serverAny.sockets.get(socketId);
        }

        else if (serverAny.connected && serverAny.connected[socketId]) {
          socket = serverAny.connected[socketId];
        }

        else if (serverAny.sockets?.connected && serverAny.sockets.connected[socketId]) {
          socket = serverAny.sockets.connected[socketId];
        }

        if (socket && socket.connected) {
          socket.emit(event, data);
          sentCount++;
        } else {

          socketIds.delete(socketId);
          this.socketToSession.delete(socketId);
        }
      } catch (error) {
        this.logger.error(`Ошибка при отправке сообщения на сокет ${socketId} (сессия ${sessionId}):`, error);

        socketIds.delete(socketId);
        this.socketToSession.delete(socketId);
      }
    });


    if (socketIds.size === 0) {
      this.sessionToSockets.delete(sessionId);
    }

    if (sentCount > 0) {
    }
  }


  emitToUser(userId: string, event: string, data: any) {
    if (!this.server) {
      this.logger.warn(`Не удалось отправить сообщение пользователю ${userId}: WebSocket сервер не инициализирован`);
      return;
    }

    const userSockets = this.userSockets.get(userId);
    if (userSockets && userSockets.size > 0) {

      const socketsToCheck = Array.from(userSockets);
      let sentCount = 0;

      socketsToCheck.forEach(socketId => {
        try {


          let socket: Socket | undefined;
          const serverAny = this.server as any;


          if (serverAny.sockets?.sockets instanceof Map) {
            socket = serverAny.sockets.sockets.get(socketId);
          }

          else if (serverAny.sockets instanceof Map) {
            socket = serverAny.sockets.get(socketId);
          }

          else if (serverAny.connected && serverAny.connected[socketId]) {
            socket = serverAny.connected[socketId];
          }

          else if (serverAny.sockets?.connected && serverAny.sockets.connected[socketId]) {
            socket = serverAny.sockets.connected[socketId];
          }

          if (socket && socket.connected) {
            socket.emit(event, data);
            sentCount++;
          } else {

            userSockets.delete(socketId);
          }
        } catch (error) {
          this.logger.error(`Ошибка при отправке сообщения на сокет ${socketId}:`, error);

          userSockets.delete(socketId);
        }
      });

      if (sentCount === 0) {
        this.logger.warn(`Не удалось отправить сообщение пользователю ${userId}: ни один сокет не доступен (проверено ${socketsToCheck.length} сокетов)`);

      } else {

      }


      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    } else {
    }
  }


  emitToScriptRoom(scriptId: string, event: string, data: any) {
    if (!this.server) {
      this.logger.warn(`Не удалось отправить сообщение в комнату скрипта ${scriptId}: WebSocket сервер не инициализирован`);
      return;
    }
    this.server.to(`script:${scriptId}`).emit(event, data);
  }


  emitToAll(event: string, data: any) {
    if (!this.server) {
      this.logger.warn(`Не удалось отправить сообщение всем: WebSocket сервер не инициализирован`);
      return;
    }
    this.server.emit(event, data);
  }


  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }


  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }


  private extractTokenFromSocket(client: Socket): string | null {

    const tokenFromQuery = client.handshake.query.token as string;
    if (tokenFromQuery) {
      return tokenFromQuery;
    }


    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
