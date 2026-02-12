/**
 * TPS 직접 거래용 TLV 인코딩/디코딩
 * psp-api-terminal RequestMessage / ResponseMessage 와이어 형식과 호환
 */
const HEADER_LENGTH = 42;
const MAC_LENGTH = 8;
const MAGIC_TERMINAL = Buffer.from("TRM", "ascii");
const VERSION = 0x01;
const MESSAGE_TYPE_SIGN_ON = 0x01;
const PAYLOAD_TYPE_TLV = 0x01;
const TERMINAL_ID_LENGTH = 32;
// TopsTag (BER-TLV 단일 바이트 태그)
const TAG_REQUEST_TEMPLATE = 0x21;
const TAG_TERMINAL_FW_VERSION = 0x82;
const TAG_TERMINAL_PARAMS_VERSION = 0x83;
const TAG_TERMINAL_DENYLIST_VERSION = 0x84;
const TAG_TERMINAL_BINLIST_VERSION = 0x85;
const TAG_TERMINAL_UTC_UNIX_TIME = 0x86;
const TAG_ORPHAN_FILE = 0xaa;
function writeTlv(tag, value) {
    const len = value.length;
    if (len >= 128)
        throw new Error("TLV length >= 128 not implemented");
    return Buffer.concat([Buffer.from([tag, len]), value]);
}
/**
 * Sign On 요청용 RequestMessage 인코딩
 * Body = RequestHeader(42) + SignOnRequest TLV payload + MAC(8)
 */
export function encodeSignOnRequest(terminalId) {
    const terminalIdBytes = Buffer.alloc(TERMINAL_ID_LENGTH);
    const idSrc = Buffer.from(terminalId.slice(0, TERMINAL_ID_LENGTH), "ascii");
    idSrc.copy(terminalIdBytes, 0);
    const header = Buffer.alloc(HEADER_LENGTH);
    let off = 0;
    MAGIC_TERMINAL.copy(header, off);
    off += 3;
    header[off++] = VERSION;
    header[off++] = MESSAGE_TYPE_SIGN_ON;
    header[off++] = 0x00;
    header[off++] = 0x01;
    header[off++] = PAYLOAD_TYPE_TLV;
    terminalIdBytes.copy(header, off);
    off += TERMINAL_ID_LENGTH;
    header[off++] = 0x00;
    header[off++] = 0x00;
    const zero = Buffer.from("0", "ascii");
    const inner = Buffer.concat([
        writeTlv(TAG_TERMINAL_FW_VERSION, zero),
        writeTlv(TAG_TERMINAL_PARAMS_VERSION, zero),
        writeTlv(TAG_TERMINAL_DENYLIST_VERSION, zero),
        writeTlv(TAG_TERMINAL_BINLIST_VERSION, zero),
        writeTlv(TAG_TERMINAL_UTC_UNIX_TIME, zero),
        writeTlv(TAG_ORPHAN_FILE, Buffer.alloc(0)),
    ]);
    const payload = writeTlv(TAG_REQUEST_TEMPLATE, inner);
    const mac = Buffer.alloc(MAC_LENGTH);
    const body = Buffer.concat([header, payload, mac]);
    return body;
}
/**
 * 2바이트 big-endian length prefix 붙인 프레임으로 반환
 */
export function encodeFrame(body) {
    const lenBuf = Buffer.alloc(2);
    lenBuf.writeUInt16BE(body.length, 0);
    return Buffer.concat([lenBuf, body]);
}
/**
 * ResponseMessage Body 디코딩 (ResponseHeader 42 + payload + MAC 8)
 * 서버 응답: magic 3, version 1, type 1, seq 2, statusCode 2, payloadType 1, terminalId 32 = 42
 */
export function decodeResponseMessage(body) {
    if (body.length < HEADER_LENGTH + MAC_LENGTH) {
        return { success: false, message: `응답 길이 부족: ${body.length}` };
    }
    const statusByte1 = body[7];
    const statusByte2 = body[8];
    const success = statusByte1 === 0x00 && statusByte2 === 0x00;
    const codeHex = Buffer.from([statusByte1, statusByte2]).toString("hex").toUpperCase();
    const message = success ? "Sign On 성공" : `응답 코드: ${codeHex}`;
    return { success, message };
}
