import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';

interface User {
  id: string;
  username: string;
  color: string;
}

@WebSocketGateway(8001, { cors: true })
export class ChatGateway
  implements OnGatewayConnection<any>, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;
  connectedUsers: Map<string, User> = new Map();

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(client: any, message: string): void {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      const { username, color } = user;
      this.server.emit('message', { username, message, color });
    }
  }

  @SubscribeMessage('setUsername')
  handleSetUsername(client: any, username: string) {
    const clientId = client.id;
    let userColor = '';
    const user = this.connectedUsers.get(clientId);
    if (user) {
      userColor = user.color; // Retain the color if the user is already connected
    } else {
      userColor = this.generateRandomColor();
    }
    const newUser: User = {
      id: clientId,
      username,
      color: userColor,
    };
    this.connectedUsers.set(clientId, newUser);
    this.sendConnectedUsersCount();
    this.server.emit('userConnected', { username, color: userColor });
  }

  handleDisconnect(client: any) {
    const user = this.connectedUsers.get(client.id);
    if (user) {
      const { username, color } = user;
      this.connectedUsers.delete(client.id);
      this.sendConnectedUsersCount();
      this.server.emit('userDisconnected', { username, color });
    }
  }

  sendConnectedUsersCount() {
    this.server.emit('connectedUsersCount', this.connectedUsers.size);
  }

  generateRandomColor(): string {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}
