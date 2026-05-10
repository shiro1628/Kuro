# Kuro — Agent 운영 규칙

## 역할 분담

| Agent | 역할 | 호출 방법 |
|---|---|---|
| **Claude (너)** | 메인 코더 — 설계, 구현, 리팩터링 | 직접 수행 |
| **Gemini** | 리뷰어 + 리서처 | UI의 Gemini 패널에서 요청 |

Claude는 코드를 직접 작성한다. Gemini는 리뷰와 팩트 조사만 담당한다.

---

## Gemini 호출 기준

### Review 요청 (코드 리뷰)
다음 상황에서 Gemini Review를 권장한다:
- PR 머지 전 변경사항 검토
- 새 기능/모듈 완성 후 품질 검토
- 보안에 민감한 코드 (인증, 권한, 입력 처리)
- 사용자가 명시적으로 리뷰 요청

### Research 요청 (팩트 조사)
다음 상황에서 Gemini Research를 권장한다:
- 라이브러리 최신 버전 / Breaking change 확인
- API 사양, 옵션 이름, 기본값 확인
- 특정 에러의 원인 및 해결법 조사
- 패키지 호환성 확인

---

## 토큰 절약 규칙 (필수)

### 스니펫 우선 원칙
사용자가 `<snippet>` 태그로 코드를 제공하면 **파일을 열지 않는다**.
스니펫에 있는 정보만으로 작업하고, 전체 맥락이 반드시 필요한 경우에만
`Read` 도구의 `offset` + `limit` 파라미터로 해당 줄 범위만 읽는다.

```
# 금지: 파일 전체 읽기
Read("src/auth/login.ts")

# 허용: 필요한 줄만 읽기
Read("src/auth/login.ts", offset=40, limit=20)
```

### 파일 탐색 규칙
- 파일 존재 여부 확인 → `Glob` 사용 (Read 금지)
- 특정 함수/변수 위치 확인 → `Grep` 사용 (파일 전체 Read 금지)
- 여러 파일에서 패턴 검색 → `Grep(pattern, glob="*.ts")` 사용
- 파일을 읽어야 한다면 반드시 필요한 줄 범위만 `offset/limit`으로 지정

### 컨텍스트 관리
- 대화가 길어지면 `/compact` 명령어로 히스토리 압축
- 새 작업 시작 시 이전 작업과 무관하면 `/clear` 후 시작
- 작업 범위를 작게 유지 — 한 번에 하나의 파일/기능에 집중

---

## 코딩 규칙

1. **추측 금지** — 불확실한 사실은 Gemini Research로 확인 후 사용
2. **단계적 구현** — 큰 변경은 논리적 단위로 나눠서 진행
3. **테스트 먼저** — 변경 후 영향 범위 확인
4. **보안 우선** — 입력 검증, 인증 처리, 비밀값 노출 방지
5. **브라우저 MCP 활용** — UI 디버깅은 Playwright MCP 도구 사용
   - `browser_navigate` → 페이지 열기
   - `browser_screenshot` → 화면 확인
   - `browser_console_messages` → 콘솔 에러 확인
   - `browser_click`, `browser_fill` → 인터랙션 테스트

---

## Playwright MCP 설정

프로젝트 열 때 자동으로 `.claude/settings.json`에 주입됨:
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless"]
    }
  }
}
```

---

## 작업 시작 체크리스트

프로젝트를 처음 열 때:
1. `README.md` 또는 `CLAUDE.md` 읽기
2. `package.json` scripts 확인
3. 현재 git 상태 확인 (`git status`)
4. 작업 시작 전 목표 명확히 재확인
