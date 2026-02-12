/**
 * Java Terminal Simulator와의 TCP 통신을 위한 타입 정의
 */
/** 직접 거래(TPS) 서버 기본 포트. electron tcpClient에서 TLV 모드 판별에 사용 */
export const DIRECT_TRADE_PORT = 21000;
// 기본 TCP 설정
export const DEFAULT_TCP_CONFIG = {
    host: 'localhost',
    port: 9999, // Java Terminal Simulator 소켓 서버 포트
    timeout: 5000,
    reconnectInterval: 3000,
};
