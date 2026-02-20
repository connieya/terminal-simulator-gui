/**
 * CLIB 바이너리 프로토콜 코덱.
 * terminal-transaction-server Java 구현을 TypeScript로 포팅.
 * 프레임: 2바이트 little-endian 길이 프리픽스 + 페이로드.
 */

// ─── 상수 (ClibConstants.java 미러) ───────────────────────────────

export const TRANSMISSION_PLAIN = 0x41; // 'A'

// 패킷 오프셋
export const OFFSET_TRANSMISSION_TYPE = 0;
export const OFFSET_COMMAND_TYPE = 1;
export const OFFSET_TOKEN = 2;

// CommandType (production / test)
export const CMD_TRANSACTION = 0x30; // '0'
export const CMD_TRANSACTION_TEST = 0x56; // 'V'
export const CMD_LIST_UPDATE = 0x31; // '1'
export const CMD_LIST_UPDATE_TEST = 0x57; // 'W'
export const CMD_QR_CODE = 0x33; // '3'
export const CMD_QR_CODE_TEST = 0x59; // 'Y'
export const CMD_ONLINE_RETAIL = 0x36; // '6'
export const CMD_ONLINE_RETAIL_TEST = 0x62; // 'b'

// Transaction Token (16 bytes)
export const TOKEN_SIZE = 16;
export const TOKEN_ATC_OFFSET = 0;
export const TOKEN_ATC_SIZE = 3;
export const TOKEN_UID_OFFSET = 3;
export const TOKEN_UID_SIZE = 5;
export const TOKEN_DATETIME_OFFSET = 8;
export const TOKEN_DATETIME_SIZE = 4;
export const TOKEN_CRC_OFFSET = 12;
export const TOKEN_CRC_SIZE = 4;

// Transaction data offsets
export const OFFSET_PAN_HASH = OFFSET_TOKEN + TOKEN_SIZE; // 18
export const PAN_HASH_SIZE = 16;
export const OFFSET_TAG_DATA = OFFSET_PAN_HASH + PAN_HASH_SIZE; // 34

// Transaction Reply (16 bytes)
export const REPLY_SIZE = 16;
export const REPLY_ATC_OFFSET = 0;
export const REPLY_ATC_SIZE = 3;
export const REPLY_UID_OFFSET = 3;
export const REPLY_UID_SIZE = 5;
export const REPLY_STATUS_OFFSET = 8;
export const REPLY_STATUS_SIZE = 4;
export const REPLY_RFU_OFFSET = 12;
export const REPLY_RFU_SIZE = 4;

// Status[0] Response Codes
export const STATUS_OK_DEFERRED = 0x00;
export const STATUS_OK_ONLINE = 0x02;
export const STATUS_ERR_GENERIC = 0x80;
export const STATUS_ERR_ONLINE_DENIED = 0x81;
export const STATUS_ERR_DENY_LIST = 0x82;
export const STATUS_ERR_INVALID_REQUEST = 0x83;
export const STATUS_ERR_CRC_MISMATCH = 0x84;
export const STATUS_ERR_SERVER_DENY_LIST = 0x85;
export const STATUS_ERR_DENIED_UNKNOWN = 0x86;
export const STATUS_ERR_DENIED_OK_SERVER = 0x87;
export const STATUS_ERR_TOO_MANY_RECOVER = 0x88;
export const STATUS_ERR_TOO_MANY_SUPERTAP = 0x89;
export const STATUS_ERR_ABORT_COMBO = 0x8a;
export const STATUS_ERR_UNREGISTERED = 0x8b;
export const STATUS_ERR_NOT_PROCESSED = 0x8c;
export const STATUS_ERR_RETRY = 0x8d;

// Status[1] Card Validation Level
export const CARD_FIRST_USE = 0x00;
export const CARD_KNOWN = 0x01;

// Status[2] Sync Flags
export const SYNC_CONFIG_UPDATE = 0x08;
export const SYNC_UNIFIED_LIST = 0x10;
export const SYNC_PAR_LIST = 0x20;

// List IDs
export const LIST_ID_UNIFIED = 0x1818;
export const LIST_ID_PAR = 0x1a1a;

// List Request
export const LIST_ID_SIZE = 2;
export const TABLE_REQUEST_CONTROL_SIZE = 8;
export const LIST_REQUEST_SIZE = LIST_ID_SIZE + TABLE_REQUEST_CONTROL_SIZE; // 10

// ─── CRC-32 (Appendix A) ──────────────────────────────────────────

const CRC32_TABLE = new Uint32Array([
  0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3,
  0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91,
  0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7,
  0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5,
  0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b,
  0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59,
  0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f,
  0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924, 0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d,
  0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433,
  0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01,
  0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457,
  0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65,
  0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb,
  0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9,
  0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
  0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad,
  0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683,
  0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1,
  0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7,
  0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5,
  0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
  0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef, 0x4669be79,
  0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236, 0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f,
  0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d,
  0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713,
  0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21,
  0x86d3d2d4, 0xf1d4e242, 0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777,
  0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45,
  0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db,
  0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
  0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693, 0x54de5729, 0x23d967bf,
  0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d,
]);

export function clibCrc32(data: Buffer, offset = 0, length?: number): number {
  const len = length ?? data.length - offset;
  let crc = 0xffffffff;
  for (let i = offset; i < offset + len; i++) {
    crc = CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function clibCrc32ToLE(crc: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(crc >>> 0, 0);
  return buf;
}

export function clibCrc32Verify(packet: Buffer, crcFieldOffset: number): boolean {
  const storedCrc = packet.readUInt32LE(crcFieldOffset);
  const temp = Buffer.from(packet);
  temp[crcFieldOffset] = 0;
  temp[crcFieldOffset + 1] = 0;
  temp[crcFieldOffset + 2] = 0;
  temp[crcFieldOffset + 3] = 0;
  const computed = clibCrc32(temp);
  return computed === storedCrc;
}

// ─── DateTime (32비트 압축) ────────────────────────────────────────

export function encodeDateTime(date: Date = new Date()): Buffer {
  const year = (date.getFullYear() - 2000) & 0x7f;
  const month = date.getMonth() & 0x0f; // 0-based
  const day = (date.getDate() - 1) & 0x1f;
  const hour = date.getHours() & 0x1f;
  const minute = date.getMinutes() & 0x3f;
  const second = (Math.floor(date.getSeconds() / 2)) & 0x1f;

  const packed =
    (year << 25) | (month << 21) | (day << 16) |
    (hour << 11) | (minute << 5) | second;

  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(packed >>> 0, 0);
  return buf;
}

export function decodeDateTime(buf: Buffer, offset = 0): Date {
  const packed = buf.readUInt32LE(offset);
  const year = ((packed >>> 25) & 0x7f) + 2000;
  const month = ((packed >>> 21) & 0x0f) + 1;
  const day = ((packed >>> 16) & 0x1f) + 1;
  const hour = (packed >>> 11) & 0x1f;
  const minute = (packed >>> 5) & 0x3f;
  const second = (packed & 0x1f) * 2;
  return new Date(year, month - 1, day, hour, minute, second);
}

// ─── 프레임 (2바이트 LE 길이 프리픽스) ────────────────────────────

export function encodeClibFrame(payload: Buffer): Buffer {
  const frame = Buffer.alloc(2 + payload.length);
  frame.writeUInt16LE(payload.length, 0);
  payload.copy(frame, 2);
  return frame;
}

export function tryDecodeClibFrame(buffer: Buffer): { payload: Buffer; consumed: number } | null {
  if (buffer.length < 2) return null;
  const len = buffer.readUInt16LE(0);
  if (len <= 0 || len > 0xffff) return null;
  if (buffer.length < 2 + len) return null;
  return {
    payload: buffer.subarray(2, 2 + len),
    consumed: 2 + len,
  };
}

// ─── Transaction Token 빌더 ────────────────────────────────────────

export function buildTransactionToken(atc: number, uidSam: Buffer, date?: Date): Buffer {
  const token = Buffer.alloc(TOKEN_SIZE);

  // ATC_SAM (3 bytes LE)
  token[TOKEN_ATC_OFFSET] = atc & 0xff;
  token[TOKEN_ATC_OFFSET + 1] = (atc >>> 8) & 0xff;
  token[TOKEN_ATC_OFFSET + 2] = (atc >>> 16) & 0xff;

  // UID_SAM (5 bytes)
  uidSam.copy(token, TOKEN_UID_OFFSET, 0, Math.min(uidSam.length, TOKEN_UID_SIZE));

  // DATE_TIME (4 bytes LE)
  const dtBuf = encodeDateTime(date);
  dtBuf.copy(token, TOKEN_DATETIME_OFFSET);

  // CRC placeholder (0으로 남기고 나중에 전체 패킷 기준으로 계산)
  return token;
}

// ─── 패킷 빌더 ────────────────────────────────────────────────────

/**
 * LIST_UPDATE 요청 패킷 빌드.
 * 구조: [TransmissionType(1)][CommandType(1)][Token(16)][ListId(2)][TableRequestControl(8)]
 */
export function buildListRequestPacket(
  atc: number,
  uidSam: Buffer,
  listId: number,
  control?: Buffer,
  testMode = false,
): Buffer {
  const cmdByte = testMode ? CMD_LIST_UPDATE_TEST : CMD_LIST_UPDATE;
  const token = buildTransactionToken(atc, uidSam);

  const payload = Buffer.alloc(2 + TOKEN_SIZE + LIST_REQUEST_SIZE);
  payload[OFFSET_TRANSMISSION_TYPE] = TRANSMISSION_PLAIN;
  payload[OFFSET_COMMAND_TYPE] = cmdByte;
  token.copy(payload, OFFSET_TOKEN);

  // List ID (2 bytes, as-is from constant)
  const listReqOffset = OFFSET_TOKEN + TOKEN_SIZE;
  payload.writeUInt16LE(listId, listReqOffset);

  // Table Request Control (8 bytes)
  if (control && control.length >= TABLE_REQUEST_CONTROL_SIZE) {
    control.copy(payload, listReqOffset + LIST_ID_SIZE, 0, TABLE_REQUEST_CONTROL_SIZE);
  }
  // else zeros (initial request)

  // CRC 계산: 전체 payload에서 CRC 필드 = offset OFFSET_TOKEN + TOKEN_CRC_OFFSET
  const crcFieldOffset = OFFSET_TOKEN + TOKEN_CRC_OFFSET;
  const crc = clibCrc32(payload); // CRC 필드는 이미 0
  const crcBytes = clibCrc32ToLE(crc);
  crcBytes.copy(payload, crcFieldOffset);

  return payload;
}

/**
 * TRANSACTION 요청 패킷 빌드.
 * 구조: [TransmissionType(1)][CommandType(1)][Token(16)][PanHash(16)][TlvData...]
 */
export function buildTransactionPacket(
  atc: number,
  uidSam: Buffer,
  panHash: Buffer,
  tlvData?: Buffer,
  testMode = false,
): Buffer {
  const cmdByte = testMode ? CMD_TRANSACTION_TEST : CMD_TRANSACTION;
  const token = buildTransactionToken(atc, uidSam);
  const tagLen = tlvData?.length ?? 0;

  const payload = Buffer.alloc(2 + TOKEN_SIZE + PAN_HASH_SIZE + tagLen);
  payload[OFFSET_TRANSMISSION_TYPE] = TRANSMISSION_PLAIN;
  payload[OFFSET_COMMAND_TYPE] = cmdByte;
  token.copy(payload, OFFSET_TOKEN);
  panHash.copy(payload, OFFSET_PAN_HASH, 0, Math.min(panHash.length, PAN_HASH_SIZE));
  if (tlvData && tagLen > 0) {
    tlvData.copy(payload, OFFSET_TAG_DATA);
  }

  // CRC 계산
  const crcFieldOffset = OFFSET_TOKEN + TOKEN_CRC_OFFSET;
  const crc = clibCrc32(payload);
  const crcBytes = clibCrc32ToLE(crc);
  crcBytes.copy(payload, crcFieldOffset);

  return payload;
}

// ─── 응답 파서 ─────────────────────────────────────────────────────

export interface ClibReply {
  atcSam: Buffer;
  uidSam: Buffer;
  statusCode: number;
  validationLevel: number;
  syncFlags: number;
  receiptJson?: string;
}

export function parseReply(payload: Buffer): ClibReply {
  if (payload.length < REPLY_SIZE) {
    throw new Error(`Reply too short: ${payload.length} bytes (minimum ${REPLY_SIZE})`);
  }

  const atcSam = payload.subarray(REPLY_ATC_OFFSET, REPLY_ATC_OFFSET + REPLY_ATC_SIZE);
  const uidSam = payload.subarray(REPLY_UID_OFFSET, REPLY_UID_OFFSET + REPLY_UID_SIZE);
  const statusCode = payload[REPLY_STATUS_OFFSET];
  const validationLevel = payload[REPLY_STATUS_OFFSET + 1];
  const syncFlags = payload[REPLY_STATUS_OFFSET + 2];

  let receiptJson: string | undefined;
  if (payload.length > REPLY_SIZE) {
    receiptJson = payload.subarray(REPLY_SIZE).toString("utf8");
  }

  return { atcSam, uidSam, statusCode, validationLevel, syncFlags, receiptJson };
}

export interface ListSyncReply {
  token: Buffer;
  newRequestControl: Buffer;
  items: Buffer[];
  isEmpty: boolean;
}

export function parseListReply(payload: Buffer): ListSyncReply {
  // 최소: 16 (token) + 8 (new request control) = 24
  if (payload.length < TOKEN_SIZE + TABLE_REQUEST_CONTROL_SIZE) {
    throw new Error(`List reply too short: ${payload.length} bytes`);
  }

  const token = payload.subarray(0, TOKEN_SIZE);
  const newRequestControl = payload.subarray(TOKEN_SIZE, TOKEN_SIZE + TABLE_REQUEST_CONTROL_SIZE);
  const itemsData = payload.subarray(TOKEN_SIZE + TABLE_REQUEST_CONTROL_SIZE);

  // Unified list item = 1 (action) + 16 (pan hash) + 1 (entry_id) + 8 (pan_status) + 7 (rfu) = 33 bytes
  const UNIFIED_ITEM_SIZE = 33;
  const items: Buffer[] = [];
  let offset = 0;
  while (offset + UNIFIED_ITEM_SIZE <= itemsData.length) {
    items.push(itemsData.subarray(offset, offset + UNIFIED_ITEM_SIZE));
    offset += UNIFIED_ITEM_SIZE;
  }

  return {
    token,
    newRequestControl,
    items,
    isEmpty: items.length === 0,
  };
}

// ─── 상태 코드 문자열 매핑 ─────────────────────────────────────────

export function statusCodeToString(code: number): string {
  switch (code) {
    case STATUS_OK_DEFERRED: return "OK (deferred)";
    case STATUS_OK_ONLINE: return "OK (online approved)";
    case STATUS_ERR_GENERIC: return "Server error";
    case STATUS_ERR_ONLINE_DENIED: return "Online denied";
    case STATUS_ERR_DENY_LIST: return "Card on deny list";
    case STATUS_ERR_INVALID_REQUEST: return "Invalid request";
    case STATUS_ERR_CRC_MISMATCH: return "CRC mismatch";
    case STATUS_ERR_SERVER_DENY_LIST: return "Server deny list";
    case STATUS_ERR_DENIED_UNKNOWN: return "Denied (unknown on server)";
    case STATUS_ERR_DENIED_OK_SERVER: return "Denied (OK on server)";
    case STATUS_ERR_TOO_MANY_RECOVER: return "Too many recover attempts";
    case STATUS_ERR_TOO_MANY_SUPERTAP: return "Too many super TAP";
    case STATUS_ERR_ABORT_COMBO: return "Abort combo";
    case STATUS_ERR_UNREGISTERED: return "Unregistered device";
    case STATUS_ERR_NOT_PROCESSED: return "Not processed";
    case STATUS_ERR_RETRY: return "Retry";
    default: return `Unknown (0x${code.toString(16)})`;
  }
}
