import type {
	CountdownMessage,
	JoinRoomMessage,
	RaceStartedMessage,
	RoomUpdatedMessage,
	TypingProgressMessage,
	WSMessage,
} from "@tactile/types";

export type WebSocketStatus =
	| "connecting"
	| "connected"
	| "disconnected"
	| "error";

export interface ChatMessageData {
	id: string;
	userId: string;
	username: string;
	text: string;
	at: number;
	role?: "racer" | "spectator";
}

export interface RoomJoinedData {
	roomId: string;
	role?: "racer" | "spectator";
	room: {
		id: string;
		name: string;
		status: string;
		hostId?: string;
		testTextId?: string;
		testText?: {
			id: string;
			title: string;
			content: string;
			difficulty: string;
			wordCount: number;
		} | null;
		participants: Array<{
			userId: string;
			username: string;
			progress: number;
			wpm: number;
			accuracy: number;
			errors: number;
			finished: boolean;
		}>;
		spectators?: Array<{ userId: string; username: string }>;
		chat?: ChatMessageData[];
	} | null;
}

export interface RoomLeftData {
	roomId: string;
	reason?: string;
}

export interface ParticipantJoinedData {
	participant: {
		userId: string;
		username: string;
		progress: number;
		wpm: number;
		accuracy: number;
		errors: number;
		finished: boolean;
	};
}

export interface ParticipantLeftData {
	userId: string;
}

export interface RaceFinishedData {
	roomId: string;
}

export interface ParticipantFinishedData {
	userId: string;
	finishedAt: number;
	wpm: number;
	accuracy: number;
}

export interface WebSocketEventHandlers {
	onStatusChange?: (status: WebSocketStatus) => void;
	onRoomJoined?: (data: RoomJoinedData) => void;
	onRoomLeft?: (data: RoomLeftData) => void;
	onRoomUpdated?: (data: RoomUpdatedMessage["data"]) => void;
	onParticipantJoined?: (data: ParticipantJoinedData) => void;
	onParticipantLeft?: (data: ParticipantLeftData) => void;
	onRaceCountdown?: (data: CountdownMessage["data"]) => void;
	onRaceStarted?: (data: RaceStartedMessage["data"]) => void;
	onRaceFinished?: (data: RaceFinishedData) => void;
	onParticipantFinished?: (data: ParticipantFinishedData) => void;
	onChatMessage?: (data: { message: ChatMessageData }) => void;
	onSpectatorJoined?: (data: {
		spectator: { userId: string; username: string };
	}) => void;
	onError?: (error: string) => void;
}

export class WebSocketService {
	private ws: WebSocket | null = null;
	private status: WebSocketStatus = "disconnected";
	private handlers: WebSocketEventHandlers = {};
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;
	private pingInterval: NodeJS.Timeout | null = null;
	private isAuthenticated = false;
	private authToken: string | null = null;
	private wsUrl: string;
	private connecting: Promise<void> | null = null;

	constructor(wsUrl: string) {
		this.wsUrl = wsUrl;
	}

	// Connection management — resolves after authenticate succeeds
	connect(token: string): Promise<void> {
		if (
			this.ws &&
			this.ws.readyState === WebSocket.OPEN &&
			this.isAuthenticated
		) {
			return Promise.resolve();
		}

		// A socket already opening owns the handshake. Without this, a second
		// caller (StrictMode's double effect, or two components mounting at once)
		// replaces this.ws mid-handshake and the first socket's authenticate is
		// sent into the void — "Cannot send message: WebSocket not connected".
		if (this.connecting) {
			return this.connecting;
		}

		this.connecting = this.openSocket(token).finally(() => {
			this.connecting = null;
		});

		return this.connecting;
	}

	private openSocket(token: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this.authToken = token;
			this.setStatus("connecting");

			let settled = false;
			const settleOk = () => {
				if (!settled) {
					settled = true;
					resolve();
				}
			};
			const settleErr = (err: Error) => {
				if (!settled) {
					settled = true;
					reject(err);
				}
			};

			try {
				this.ws = new WebSocket(this.wsUrl);

				this.ws.onopen = () => {
					console.log("WebSocket connected");
					this.setStatus("connected");
					this.reconnectAttempts = 0;
					this.startPingInterval();
					this.authenticate(token);
				};

				this.ws.onmessage = (event) => {
					try {
						const message: WSMessage = JSON.parse(event.data);
						this.handleMessage(message);
						if (message.type === "authenticated") {
							settleOk();
						}
						if (message.type === "error" && !this.isAuthenticated && !settled) {
							settleErr(
								new Error(message.data?.error || "Authentication failed"),
							);
						}
					} catch (error) {
						console.error("Failed to parse WebSocket message:", error);
					}
				};

				this.ws.onclose = (event) => {
					console.log("WebSocket disconnected:", event.code, event.reason);
					this.setStatus("disconnected");
					this.isAuthenticated = false;
					this.stopPingInterval();

					if (!settled) {
						settleErr(new Error("WebSocket closed before auth"));
					}

					if (
						!event.wasClean &&
						this.reconnectAttempts < this.maxReconnectAttempts
					) {
						this.scheduleReconnect();
					}
				};

				this.ws.onerror = () => {
					console.error("WebSocket error");
					this.setStatus("error");
					settleErr(new Error("WebSocket connection failed"));
				};
			} catch (error) {
				this.setStatus("error");
				settleErr(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	disconnect(): void {
		if (this.ws) {
			this.ws.close(1000, "Client disconnect");
			this.ws = null;
		}
		this.stopPingInterval();
		this.setStatus("disconnected");
		this.isAuthenticated = false;
	}

	// Authentication
	private authenticate(token: string): void {
		this.sendMessage({
			type: "authenticate",
			data: { token },
			timestamp: Date.now(),
		});
	}

	// Room management
	joinRoom(
		roomId: string,
		userId: string,
		username: string,
		spectate = false,
	): void {
		if (!this.isAuthenticated) {
			console.error("Cannot join room: not authenticated");
			return;
		}

		const message: JoinRoomMessage = {
			type: "join_room",
			data: { roomId, userId, username, spectate },
			timestamp: Date.now(),
		};

		this.sendMessage(message);
	}

	sendChat(roomId: string, text: string): void {
		this.sendMessage({
			type: "chat_message",
			data: { roomId, text },
			timestamp: Date.now(),
		});
	}

	leaveRoom(): void {
		this.sendMessage({
			type: "leave_room",
			data: {},
			timestamp: Date.now(),
		});
	}

	startRace(): void {
		this.sendMessage({
			type: "start_race",
			data: {},
			timestamp: Date.now(),
		});
	}

	// Typing progress
	sendTypingProgress(
		roomId: string,
		userId: string,
		progress: number,
		wpm: number,
		accuracy: number,
		errors: number,
	): void {
		if (!this.isAuthenticated) return;

		const message: TypingProgressMessage = {
			type: "typing_progress",
			data: { roomId, userId, progress, wpm, accuracy, errors },
			timestamp: Date.now(),
		};

		this.sendMessage(message);
	}

	// Event handlers
	setEventHandlers(handlers: WebSocketEventHandlers): void {
		this.handlers = { ...this.handlers, ...handlers };
	}

	// Message handling
	private handleMessage(message: WSMessage): void {
		switch (message.type) {
			// Server's greeting on socket open, ahead of authentication
			case "connected":
				break;

			case "authenticated":
				this.isAuthenticated = true;
				console.log("WebSocket authenticated");
				break;

			case "room_joined":
				this.handlers.onRoomJoined?.(message.data);
				break;

			case "room_left":
				this.handlers.onRoomLeft?.(message.data);
				break;

			case "room_updated":
				this.handlers.onRoomUpdated?.(message.data);
				break;

			case "participant_joined":
				this.handlers.onParticipantJoined?.(message.data);
				break;

			case "participant_left":
				this.handlers.onParticipantLeft?.(message.data);
				break;

			case "race_countdown":
				this.handlers.onRaceCountdown?.(message.data);
				break;

			case "race_started":
				this.handlers.onRaceStarted?.(message.data);
				break;

			case "race_finished":
				this.handlers.onRaceFinished?.(message.data);
				break;

			case "participant_finished":
				this.handlers.onParticipantFinished?.(message.data);
				break;

			case "chat_message":
				this.handlers.onChatMessage?.(message.data);
				break;

			case "spectator_joined":
				this.handlers.onSpectatorJoined?.(message.data);
				break;

			case "error":
				console.error("WebSocket error:", message.data?.error);
				this.handlers.onError?.(message.data?.error || "Unknown error");
				break;

			case "pong":
				// Handle pong response
				break;

			default:
				console.warn("Unknown WebSocket message type:", message.type);
		}
	}

	private sendMessage(message: WSMessage): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.error("Cannot send message: WebSocket not connected");
		}
	}

	// Status management
	private setStatus(status: WebSocketStatus): void {
		if (this.status !== status) {
			this.status = status;
			this.handlers.onStatusChange?.(status);
		}
	}

	getStatus(): WebSocketStatus {
		return this.status;
	}

	isConnected(): boolean {
		return this.status === "connected" && this.isAuthenticated;
	}

	// Reconnection logic
	private scheduleReconnect(): void {
		this.reconnectAttempts++;
		const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

		console.log(
			`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`,
		);

		setTimeout(() => {
			if (this.authToken) {
				this.connect(this.authToken).catch(console.error);
			}
		}, delay);
	}

	// Ping/Pong for connection health
	private startPingInterval(): void {
		this.pingInterval = setInterval(() => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.sendMessage({
					type: "ping",
					timestamp: Date.now(),
				});
			}
		}, 30000); // Ping every 30 seconds
	}

	private stopPingInterval(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval);
			this.pingInterval = null;
		}
	}
}

// Singleton instance
let wsService: WebSocketService | null = null;

function defaultWsUrl(): string {
	if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL as string;
	const api = import.meta.env.VITE_API_URL || "http://localhost:3021";
	try {
		const u = new URL(api);
		u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
		u.pathname = "/ws";
		u.search = "";
		return u.toString();
	} catch {
		return "ws://localhost:3021/ws";
	}
}

export const getWebSocketService = (): WebSocketService => {
	if (!wsService) {
		wsService = new WebSocketService(defaultWsUrl());
	}
	return wsService;
};

export const useWebSocket = () => {
	return getWebSocketService();
};
