import { Socket } from 'net';
/**
 * Java Terminal Simulator와의 TCP 통신을 담당하는 클라이언트
 */
export class TcpClient {
    socket = null;
    config;
    isConnecting = false;
    reconnectTimer = null;
    messageBuffer = '';
    constructor(config) {
        this.config = config;
    }
    /**
     * TCP 서버에 연결
     */
    async connect() {
        if (this.socket?.readyState === 'open' || this.isConnecting) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.isConnecting = true;
            this.socket = new Socket();
            const timeout = setTimeout(() => {
                this.socket?.destroy();
                this.isConnecting = false;
                reject(new Error('Connection timeout'));
            }, this.config.timeout || 5000);
            this.socket.on('connect', () => {
                clearTimeout(timeout);
                this.isConnecting = false;
                this.clearReconnectTimer();
                console.log(`TCP Connected to ${this.config.host}:${this.config.port}`);
                resolve();
            });
            this.socket.on('error', (error) => {
                clearTimeout(timeout);
                this.isConnecting = false;
                console.error('TCP Connection error:', error);
                reject(error);
                this.scheduleReconnect();
            });
            this.socket.on('close', () => {
                console.log('TCP Connection closed');
                this.socket = null;
                this.scheduleReconnect();
            });
            this.socket.on('data', (data) => {
                this.handleData(data);
            });
            this.socket.connect(this.config.port, this.config.host);
        });
    }
    /**
     * TCP 서버 연결 해제
     */
    disconnect() {
        this.clearReconnectTimer();
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
    }
    /**
     * 명령어를 CLI 문자열로 변환
     */
    commandToCliString(command) {
        switch (command.type) {
            case 'signon':
                return 'signon-tps';
            case 'signoff':
                return 'signoff-tps';
            case 'echo-test':
                return 'echo-test-tps';
            case 'sync':
                return 'sync-tps';
            case 'card_tap':
                // 카드 탭 명령어는 추가 파라미터가 필요할 수 있음
                return 'card-tap-tps'; // 필요시 수정
            case 'ping':
                return 'ping-tps';
            case 'status':
                return 'status-tps';
            case 'reset':
                return 'reset-tps';
            default:
                throw new Error(`Unknown command type: ${command.type}`);
        }
    }
    /**
     * Java Terminal Simulator에 CLI 명령 전송
     */
    async sendCommand(command) {
        if (!this.socket || this.socket.readyState !== 'open') {
            throw new Error('Not connected to terminal simulator');
        }
        return new Promise((resolve, reject) => {
            // CLI 명령어 문자열로 변환
            const cliCommand = this.commandToCliString(command);
            const message = cliCommand + '\n'; // 줄바꿈으로 메시지 구분
            console.log(`Sending CLI command: ${cliCommand}`);
            const timeout = setTimeout(() => {
                reject(new Error('Command timeout'));
            }, 10000); // 10초 타임아웃
            // 응답을 기다리는 리스너 (일회성)
            const responseHandler = (response) => {
                clearTimeout(timeout);
                resolve(response);
            };
            // 임시로 응답 핸들러 등록 (실제 구현은 handleData에서 처리)
            this.onceResponse(responseHandler);
            this.socket.write(message, (error) => {
                if (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        });
    }
    /**
     * 연결 상태 확인
     */
    isConnected() {
        return this.socket?.readyState === 'open';
    }
    /**
     * 데이터 수신 처리
     * Java 서버가 JSON 또는 텍스트 응답을 보낼 수 있음
     */
    handleData(data) {
        this.messageBuffer += data.toString();
        // 줄바꿈으로 메시지 구분
        const lines = this.messageBuffer.split('\n');
        this.messageBuffer = lines.pop() || ''; // 마지막 불완전한 메시지는 버퍼에 보관
        for (const line of lines) {
            if (line.trim()) {
                try {
                    // 먼저 JSON으로 파싱 시도
                    const parsed = JSON.parse(line);
                    const response = {
                        success: parsed.success !== false,
                        message: parsed.message || line,
                        data: parsed.data,
                        timestamp: parsed.timestamp || Date.now(),
                    };
                    this.emitResponse(response);
                }
                catch (error) {
                    // JSON이 아니면 텍스트 응답으로 처리
                    const response = {
                        success: true, // 텍스트 응답은 기본적으로 성공으로 간주
                        message: line.trim(),
                        timestamp: Date.now(),
                    };
                    console.log('Received text response:', line);
                    this.emitResponse(response);
                }
            }
        }
    }
    responseListeners = [];
    onceResponse(listener) {
        this.responseListeners.push(listener);
    }
    emitResponse(response) {
        const listeners = [...this.responseListeners];
        this.responseListeners = [];
        listeners.forEach(listener => listener(response));
    }
    /**
     * 재연결 스케줄링
     */
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (!this.isConnected() && !this.isConnecting) {
                console.log('Attempting to reconnect...');
                this.connect().catch(console.error);
            }
        }, this.config.reconnectInterval || 3000);
    }
    /**
     * 재연결 타이머 클리어
     */
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}
