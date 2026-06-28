import { io, type Socket } from 'socket.io-client';
import type { LeaderboardEntry } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type SocketEventMap = {
  'location-update': (data: { peserta_id: number; lat: number; lon: number }) => void;
  'peserta_entered_pos': (data: { peserta_id: number; pos_id: number; pos_nama: string }) => void;
  'leaderboard_updated': (data: LeaderboardEntry[]) => void;
  'connect': () => void;
  'disconnect': (reason: string) => void;
  'connect_error': (err: Error) => void;
};

export type TypedSocket = Socket<SocketEventMap>;

class SocketService {
  private socket: TypedSocket | null = null;
  private token: string | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;
    this.token = token;
    this.socket = io(API_URL, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });
    this.socket.connect();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  emit(event: string, ...args: unknown[]): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.socket as any)?.emit(event, ...args);
  }

  on<K extends keyof SocketEventMap>(event: K, handler: SocketEventMap[K]): void {
    this.socket?.on(event, handler as never);
  }

  off<K extends keyof SocketEventMap>(event: K, handler: SocketEventMap[K]): void {
    this.socket?.off(event, handler as never);
  }
}

export const socketService = new SocketService();
export default socketService;
