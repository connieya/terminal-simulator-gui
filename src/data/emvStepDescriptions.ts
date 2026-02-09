/**
 * EMV 트랜잭션 단계별 한글 설명
 * 파서에서 추출한 단계 제목(title)과 매칭해 모달에서 표시한다.
 */
export const EMV_STEP_DESCRIPTIONS: Record<string, string> = {
  "Application Selection":
    "PPSE(Proximity Payment System Environment) 선택 후 카드 내 결제 애플리케이션(예: VISA CREDIT)을 선택하는 단계입니다.",
  "Initiate Application Processing":
    "Get Processing Options 명령으로 거래 조건·금액·통화 등 파라미터를 요청하는 단계입니다.",
  "Read Application Data":
    "카드에서 애플리케이션 데이터(인증서, AFL 등)를 읽는 단계입니다.",
  "Processing fDDA":
    "카드 동적 데이터 인증(fDDA)을 수행하여 카드 진위를 검증하는 단계입니다.",
  "Read Record":
    "지정한 SFI(Short File Identifier)의 레코드를 읽는 단계입니다.",
};

/**
 * 단계 제목에 해당하는 한글 설명을 반환한다.
 * 없으면 undefined.
 */
export function getStepDescription(title: string): string | undefined {
  const trimmed = title.trim();
  return EMV_STEP_DESCRIPTIONS[trimmed];
}
