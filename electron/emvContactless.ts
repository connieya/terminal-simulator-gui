/**
 * EMV Contactless 트랜잭션: PPSE → AID → GPO → Read Record → ICC Data(Tag 55) 수집
 * 각 단계에서 log(direction, message) 호출로 우측 로그에 출력
 */

export type EmvLog = (direction: "out" | "in" | "info" | "error", message: string) => void;

const SW_SUCCESS = 0x9000;

/** PPSE AID: 2PAY.SYS.DDF01 (14 bytes) */
const PPSE_AID = Buffer.from("2PAY.SYS.DDF01", "ascii");

/** Visa AID (공통) */
const VISA_AID = Buffer.from([0xa0, 0x00, 0x00, 0x00, 0x03, 0x10, 0x10]);

function buildSelectByNameApdu(name: Buffer): Buffer {
  const lc = name.length;
  return Buffer.concat([
    Buffer.from([0x00, 0xa4, 0x04, 0x00, lc]),
    name,
    Buffer.from([0x00]),
  ]);
}

function getSw(resp: Buffer): number {
  if (resp.length < 2) return 0;
  return (resp[resp.length - 2]! << 8) | resp[resp.length - 1]!;
}

function getDataWithoutSw(resp: Buffer): Buffer {
  if (resp.length <= 2) return Buffer.alloc(0);
  return resp.subarray(0, resp.length - 2);
}

/** BER-TLV에서 단일 태그 값 추출 (1바이트 태그) */
function findTlv1(data: Buffer, tag: number): Buffer | null {
  let off = 0;
  while (off < data.length) {
    if (data[off] === tag && off + 1 < data.length) {
      const len = data[off + 1]!;
      if (off + 2 + len <= data.length) return data.subarray(off + 2, off + 2 + len);
      return null;
    }
    if (off + 1 >= data.length) break;
    const len = data[off + 1]!;
    off += 2 + len;
  }
  return null;
}

/** TLV 오프셋 진행: 다음 TLV 시작 위치 반환 (태그 1 또는 2바이트) */
function nextTlvOffset(data: Buffer, off: number): number {
  if (off + 2 > data.length) return data.length;
  const tag1 = data[off]!;
  const lenOff = (tag1 & 0x1f) === 0x1f && off + 3 <= data.length ? off + 2 : off + 1;
  if (lenOff >= data.length) return data.length;
  const len = data[lenOff]!;
  return lenOff + 1 + len;
}

/** BER-TLV 트리에서 2바이트 태그 값 추출 (구조 태그 내부 재귀 검색) */
function findTlv2(data: Buffer, tag1: number, tag2: number): Buffer | null {
  let off = 0;
  while (off + 2 <= data.length) {
    const t1 = data[off]!;
    const isTwoByte = (t1 & 0x1f) === 0x1f && off + 3 <= data.length;
    const lenOff = isTwoByte ? off + 2 : off + 1;
    if (lenOff >= data.length) break;
    const len = data[lenOff]!;
    const valueStart = lenOff + 1;
    if (valueStart + len > data.length) break;
    if (isTwoByte && data[off + 1] === tag2 && t1 === tag1) {
      return data.subarray(valueStart, valueStart + len);
    }
    if (!isTwoByte && t1 === tag1) {
      return data.subarray(valueStart, valueStart + len);
    }
    const constructed = (t1 & 0x20) !== 0;
    if (constructed && len > 0) {
      const inner = findTlv2(data.subarray(valueStart, valueStart + len), tag1, tag2);
      if (inner) return inner;
    }
    off = nextTlvOffset(data, off);
  }
  return null;
}

/** PDOL 항목: 태그(1~2바이트) + 요청 길이 */
interface PdolItem {
  tag: Buffer;
  length: number;
}

/** 9F38 PDOL 바이트에서 (태그, 길이) 목록 파싱 */
function parsePdol(pdolBytes: Buffer): PdolItem[] {
  const items: PdolItem[] = [];
  let off = 0;
  while (off + 2 <= pdolBytes.length) {
    const t1 = pdolBytes[off]!;
    const isTwoByte = (t1 & 0x1f) === 0x1f && off + 3 <= pdolBytes.length;
    const lenOff = isTwoByte ? off + 2 : off + 1;
    if (lenOff >= pdolBytes.length) break;
    const len = pdolBytes[lenOff]!;
    items.push({
      tag: pdolBytes.subarray(off, lenOff),
      length: len,
    });
    off = lenOff + 1;
  }
  return items;
}

/** PDOL 항목 1개에 대한 테스트용 값 생성 (태그·길이에 맞춤) */
function buildPdolValueForItem(item: PdolItem): Buffer {
  const { tag, length } = item;
  const t1 = tag[0]!;
  const t2 = tag.length >= 2 ? tag[1]! : null;
  const pad = (n: number) => Buffer.alloc(n, 0);

  if (t1 === 0x9f && t2 === 0x66) {
    // TTQ (Terminal Transaction Qualifiers): 카드가 단말의 컨택리스 지원 여부를 판단하는 핵심 값
    // 36 00 00 00 (payWave 예시): qVSDC 지원 + EMV contact chip 지원 + Signature + ODA 지원
    const b = pad(length);
    const ttq = Buffer.from([0x36, 0x00, 0x00, 0x00]);
    ttq.copy(b, 0, 0, Math.min(ttq.length, b.length));
    return b;
  }
  if (t1 === 0x9f && t2 === 0x02) return pad(length); // Amount Authorized (BCD) 0
  if (t1 === 0x9f && t2 === 0x03) return pad(length); // Amount Other
  if (t1 === 0x9f && t2 === 0x1a) {
    const b = pad(length);
    b[0] = 0x04;
    if (length >= 2) b[1] = 0x10;
    return b;
  }
  if (t1 === 0x95) return pad(length); // TVR
  if (t1 === 0x5f && t2 === 0x2a) {
    const b = pad(length);
    b[0] = 0x04;
    if (length >= 2) b[1] = 0x10;
    return b;
  }
  if (t1 === 0x9a) {
    const now = new Date();
    const yy = now.getFullYear() % 100;
    const mm = now.getMonth() + 1;
    const dd = now.getDate();
    const bcd = (n: number) => ((Math.floor(n / 10) % 10) << 4) | (n % 10);
    if (length === 3) return Buffer.from([bcd(yy), bcd(mm), bcd(dd)]); // YYMMdd
    if (length >= 6) {
      const hh = now.getHours();
      const min = now.getMinutes();
      const ss = now.getSeconds();
      return Buffer.from([bcd(yy), bcd(mm), bcd(dd), bcd(hh), bcd(min), bcd(ss)]);
    }
    return pad(length);
  }
  if (t1 === 0x9c) return Buffer.from([0x00]); // Transaction Type: Purchase (일반 결제)
  if (t1 === 0x9f && t2 === 0x37) {
    const buf = Buffer.alloc(length);
    for (let i = 0; i < length; i++) buf[i] = Math.floor(Math.random() * 256);
    return buf;
  }
  if (t1 === 0x5f && t2 === 0x2d) {
    const lang = Buffer.alloc(length, 0x20);
    "koen".split("").forEach((c, i) => { if (i < length) lang[i] = c.charCodeAt(0); });
    return lang;
  }
  if (t1 === 0x9f && t2 === 0x11) return Buffer.from([0x01]);
  if (t1 === 0x9f && t2 === 0x12) {
    const name = "HyundaiCard";
    const buf = Buffer.alloc(length, 0x20);
    Buffer.from(name, "ascii").copy(buf, 0, 0, Math.min(name.length, length));
    return buf;
  }
  return pad(length);
}

/** PDOL 항목 목록으로 PDOL 값(연결된 바이트) 생성 */
function buildPdolValue(items: PdolItem[]): Buffer {
  return Buffer.concat(items.map(buildPdolValueForItem));
}


/** FCI에서 AID 목록 추출 (4F 또는 61 내부 4F) */
function extractAidsFromFci(fci: Buffer): Buffer[] {
  const aids: Buffer[] = [];
  let off = 0;
  while (off + 2 <= fci.length) {
    const tag = fci[off]!;
    const len = fci[off + 1]!;
    if (off + 2 + len > fci.length) break;
    if (tag === 0x4f && len >= 5 && len <= 16) {
      aids.push(fci.subarray(off + 2, off + 2 + len));
    }
    if (tag === 0x61) {
      const inner = fci.subarray(off + 2, off + 2 + len);
      const inner4f = findTlv1(inner, 0x4f);
      if (inner4f && inner4f.length >= 5) aids.push(inner4f);
    }
    off += 2 + len;
  }
  return aids;
}

/** GPO 응답에서 AFL(94) 추출 - 80 또는 77 내부의 94 */
function extractAflFromGpoResponse(gpoResp: Buffer): { sfi: number; firstRecord: number; lastRecord: number }[] {
  const entries: { sfi: number; firstRecord: number; lastRecord: number }[] = [];
  let tag94: Buffer | null = findTlv1(gpoResp, 0x94);
  if (!tag94) {
    const tag80 = findTlv1(gpoResp, 0x80);
    if (tag80) tag94 = findTlv1(tag80, 0x94);
  }
  if (!tag94) {
    const tag77 = findTlv1(gpoResp, 0x77);
    if (tag77) tag94 = findTlv1(tag77, 0x94);
  }
  if (!tag94 || tag94.length < 4) return entries;
  for (let i = 0; i + 4 <= tag94.length; i += 4) {
    const sfi = tag94[i]! >> 3;
    const firstRecord = tag94[i + 1]!;
    const lastRecord = tag94[i + 2]!;
    if (sfi > 0 && firstRecord > 0 && lastRecord >= firstRecord) {
      entries.push({ sfi, firstRecord, lastRecord });
    }
  }
  return entries;
}

/** READ RECORD APDU: SFI, record number. P2 = (SFI << 3) | 4 */
function buildReadRecordApdu(recordNumber: number, sfi: number): Buffer {
  const p2 = (sfi << 3) | 4;
  return Buffer.from([0x00, 0xb2, recordNumber, p2, 0x00]);
}

/** ICC Data에 넣을 태그 (1바이트 또는 2바이트). 수집 시 중복 제거용 키 생성 */
function tlvKey(tag1: number, tag2?: number): string {
  return tag2 == null ? `${tag1}` : `${tag1}.${tag2}`;
}

const ICC_TAG_SET = new Set<string>([
  "9f26", "9f27", "57", "9f36", "9f10", "9a", "9c", "95", "9f37", "82",
  "9f02", "9f03", "9f1a", "5f2a", "9f13", "9f34", "9f35", "9f1e", "84",
]);

/** 레코드 버퍼들에서 EMV TLV 파싱 (1/2바이트 태그) 후 ICC용 태그만 수집 */
function collectTagsForIcc(records: Buffer[]): Buffer[] {
  const collected: Buffer[] = [];
  const seen = new Set<string>();

  function parseTlv(data: Buffer, start: number): { tag1: number; tag2?: number; len: number; value: Buffer } | null {
    if (start + 2 > data.length) return null;
    const tag1 = data[start]!;
    let tag2: number | undefined;
    let lenOff = start + 1;
    if ((tag1 & 0x1f) === 0x1f && start + 3 <= data.length) {
      tag2 = data[start + 1]!;
      lenOff = start + 2;
    }
    if (lenOff >= data.length) return null;
    const len = data[lenOff]!;
    const valueStart = lenOff + 1;
    if (valueStart + len > data.length) return null;
    return {
      tag1,
      tag2,
      len,
      value: data.subarray(valueStart, valueStart + len),
    };
  }

  function advanceOffset(data: Buffer, start: number): number {
    const t = parseTlv(data, start);
    if (!t) return start + 1;
    const lenOff = t.tag2 == null ? start + 2 : start + 3;
    return lenOff + 1 + t.len;
  }

  for (const rec of records) {
    let off = 0;
    while (off < rec.length) {
      const t = parseTlv(rec, off);
      if (!t) {
        off++;
        continue;
      }
      const key = tlvKey(t.tag1, t.tag2);
      const keyNorm = (t.tag2 != null ? `${t.tag1.toString(16)}${t.tag2.toString(16)}` : t.tag1.toString(16)).toLowerCase();
      if (ICC_TAG_SET.has(keyNorm) && !seen.has(key)) {
        seen.add(key);
        if (t.tag2 == null) {
          collected.push(Buffer.concat([Buffer.from([t.tag1, t.len]), t.value]));
        } else {
          collected.push(Buffer.concat([Buffer.from([t.tag1, t.tag2, t.len]), t.value]));
        }
      }
      off = advanceOffset(rec, off);
    }
  }
  return collected;
}

function buildTag55(parts: Buffer[]): Buffer {
  const body = Buffer.concat(parts);
  if (body.length >= 128) throw new Error("ICC Data length >= 128 not implemented");
  return Buffer.concat([Buffer.from([0x55, body.length]), body]);
}

export async function runEmvContactless(
  transmitApdu: (cmd: Buffer) => Promise<Buffer>,
  log: EmvLog
): Promise<{ success: boolean; iccData?: Buffer; error?: string }> {
  const allRecords: Buffer[] = [];

  try {
    log("info", "1. PPSE 선택 중...");
    const ppseApdu = buildSelectByNameApdu(PPSE_AID);
    log("out", ppseApdu.toString("hex"));
    let resp = await transmitApdu(ppseApdu);
    log("in", resp.toString("hex"));
    if (getSw(resp) !== SW_SUCCESS) {
      log("error", `PPSE 선택 실패 SW: ${getSw(resp).toString(16)}`);
      return { success: false, error: `PPSE 선택 실패 (SW=${getSw(resp).toString(16)})` };
    }
    const ppseFci = getDataWithoutSw(resp);
    const aids = extractAidsFromFci(ppseFci);
    let selectedAid: Buffer = VISA_AID;
    if (aids.length > 0) {
      selectedAid = aids[0]!;
      log("info", `AID 추출됨: ${selectedAid.toString("hex")}`);
    }

    log("info", "2. AID 선택 중...");
    const aidApdu = buildSelectByNameApdu(selectedAid);
    log("out", aidApdu.toString("hex"));
    resp = await transmitApdu(aidApdu);
    log("in", resp.toString("hex"));
    if (getSw(resp) !== SW_SUCCESS) {
      log("error", `AID 선택 실패 SW: ${getSw(resp).toString(16)}`);
      return { success: false, error: `AID 선택 실패 (SW=${getSw(resp).toString(16)})` };
    }
    const aidFci = getDataWithoutSw(resp);
    const pdolRaw = findTlv2(aidFci, 0x9f, 0x38);
    let pdolValue = Buffer.alloc(0);
    if (pdolRaw && pdolRaw.length > 0) {
      const pdolItems = parsePdol(pdolRaw);
      pdolValue = Buffer.from(buildPdolValue(pdolItems));
      log("info", `PDOL 파싱됨: ${pdolItems.length}항목, 값 ${pdolValue.length}바이트`);
    }

    log("info", "3. GPO 실행 중...");
    const gpoDataBlock = Buffer.concat([
      Buffer.from([0x83, pdolValue.length]),
      pdolValue,
    ]);
    const gpoApdu = Buffer.concat([
      Buffer.from([0x80, 0xa8, 0x00, 0x00, gpoDataBlock.length]),
      gpoDataBlock,
      Buffer.from([0x00]),
    ]);
    log("out", gpoApdu.toString("hex"));
    resp = await transmitApdu(gpoApdu);
    log("in", resp.toString("hex"));
    if (getSw(resp) !== SW_SUCCESS) {
      log("error", `GPO 실패 SW: ${getSw(resp).toString(16)}`);
      return { success: false, error: `GPO 실패 (SW=${getSw(resp).toString(16)})` };
    }
    const gpoData = getDataWithoutSw(resp);
    const aflEntries = extractAflFromGpoResponse(gpoData);

    log("info", "4. Read Record 중...");
    if (aflEntries.length === 0) {
      aflEntries.push({ sfi: 1, firstRecord: 1, lastRecord: 3 });
    }
    for (const { sfi, firstRecord, lastRecord } of aflEntries) {
      for (let rec = firstRecord; rec <= lastRecord; rec++) {
        const readApdu = buildReadRecordApdu(rec, sfi);
        log("out", readApdu.toString("hex"));
        resp = await transmitApdu(readApdu);
        log("in", resp.toString("hex"));
        if (getSw(resp) === SW_SUCCESS) {
          allRecords.push(getDataWithoutSw(resp));
        }
      }
    }

    log("info", "5. ICC Data(Tag 55) 구성 중...");
    const tagParts = collectTagsForIcc(allRecords);
    const tag55 = buildTag55(tagParts);
    log("info", `ICC Data 수집 완료 (${tag55.length} bytes)`);
    return { success: true, iccData: tag55 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("error", msg);
    return { success: false, error: msg };
  }
}
