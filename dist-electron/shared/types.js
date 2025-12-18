/**
 * Java Terminal Simulator와의 TCP 통신을 위한 타입 정의
 */
// 기본 TCP 설정
export const DEFAULT_TCP_CONFIG = {
    host: 'localhost',
    port: 8080, // Java Terminal Simulator의 기본 포트 (필요시 변경)
    timeout: 5000,
    reconnectInterval: 3000,
};
