import { WebSocket } from "ws";
interface SocketWithPlayer extends WebSocket {
    playerId?: string;
    sessionId?: string;
    id?: string;
}
export declare function handleConnection(socket: SocketWithPlayer): void;
export declare function registerSocket(socket: SocketWithPlayer): void;
export declare function unregisterSocket(socket: SocketWithPlayer): void;
export {};
