/**
 * EMV 트랜잭션 로그 파서
 * 카드 탭 응답 메시지(response.message)를 단계별로 분리한다.
 * Java TCP 서버에서 "LOG: " 접두사가 붙은 줄을 제거하고,
 * "===== ... =====" 형태의 구간으로 단계를 나눈다.
 */

export interface EmvStep {
  title: string;
  lines: string[];
}

export interface ParsedEmvLog {
  steps: EmvStep[];
  rawLines: string[];
}

/** 줄 단위로 "LOG: " 접두사 제거 후 trim */
function normalizeLines(rawMessage: string): string[] {
  return rawMessage
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("LOG: ")) return trimmed.slice(5).trim();
      return trimmed;
    })
    .filter((line) => line.length > 0);
}

/** 한 줄이 구간 구분선(등호만)인지 */
function isSeparatorLine(line: string): boolean {
  return /^=+\s*$/.test(line);
}

/**
 * EMV 로그 문자열을 파싱하여 단계 배열과 원본 줄 배열을 반환한다.
 * 구간 제목은 "===== ... =====" 다음에 오는 한 줄로 인식한다.
 */
export function parseEmvLog(rawMessage: string): ParsedEmvLog {
  const rawLines = normalizeLines(rawMessage ?? "");
  const steps: EmvStep[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    if (isSeparatorLine(line) && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      if (!isSeparatorLine(nextLine)) {
        const title = nextLine.trim();
        i += 2;
        const stepLines: string[] = [];
        while (i < rawLines.length && !isSeparatorLine(rawLines[i])) {
          stepLines.push(rawLines[i]);
          i++;
        }
        if (title) steps.push({ title, lines: stepLines });
        continue;
      }
    }
    i++;
  }

  return { steps, rawLines };
}
