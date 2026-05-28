# Kuro 실행 가이드

## 1. 사전 요구사항

### 필수 설치

| 도구 | 최소 버전 | 설치 확인 |
|------|-----------|-----------|
| Node.js | 18+ | `node --version` |
| Claude Code CLI | 최신 | `claude --version` |
| Antigravity CLI (agy) | 최신 | `agy --version` |

### Claude Code 설치

```powershell
npm install -g @anthropic-ai/claude-code
claude login   # Anthropic 계정으로 인증
```

### Antigravity CLI (agy) 설치

Antigravity CLI는 별도 설치 방법을 따른다. `agy --help`로 설치 여부를 확인한다.

---

## 2. Kuro 설치

```powershell
cd C:\Dev\DevAgent\Kuro
npm install
```

`npm install` 실행 시 `node-pty`가 현재 Electron 버전에 맞게 자동 네이티브 빌드됨.  
빌드 도구(`Visual Studio Build Tools`)가 없으면 아래 오류 발생:

```
gyp ERR! find VS
```

해결:
```powershell
npm install -g windows-build-tools   # 관리자 권한 필요
# 또는 Visual Studio Installer에서 "C++ 빌드 도구" 설치
```

---

## 3. 개발 모드 실행

```powershell
cd C:\Dev\DevAgent\Kuro
npm run dev
```

- Electron 앱이 바로 열림
- 코드 수정 시 renderer(React)는 핫리로드
- main process(electron/) 수정 시 앱 재시작 필요
- DevTools가 별도 창으로 자동 오픈됨

---

## 4. 프로젝트 열기

1. 앱 실행 → 검은 고양이 화면
2. **프로젝트 열기** 클릭 → 개발할 폴더 선택
3. 자동으로 처리되는 것들:
   - `package.json` 스크립트에서 `dev` 명령어 감지
   - `.claude/settings.json`에 Playwright MCP 주입
   - Claude Code 터미널 자동 시작 + `claude` 명령어 실행
   - Dev Server 자동 실행 (감지된 경우)

---

## 5. 각 패널 사용법

### Claude Code 패널 (왼쪽)
- PowerShell PTY에서 `claude`가 자동 실행됨
- 평소 Claude Code 사용하듯 그대로 대화
- **Playwright MCP 디버깅 예시:**
  ```
  > 로컬 개발서버 열어서 로그인 버튼 눌러봐
  ```
  → Claude가 `browser_navigate`, `browser_click` 등을 직접 사용

- **스니펫 주입** (하단 버튼):
  1. `스니펫` 버튼 클릭
  2. 코드 붙여넣기
  3. 질문 입력 후 Enter

- **자동 래핑**: 툴바 `스니펫` 토글이 켜진 상태에서 코드처럼 생긴 텍스트를 Ctrl+V하면 `<snippet>` 자동 감싸기

### Antigravity 패널 (우상단)
- **Review 모드**: 코드/변경사항 붙여넣기 → SHIP / NEEDS-FIX / DISCUSS 평결
- **Research 모드**: 기술 질문 → 팩트 답변 + 출처
- Enter 또는 전송 버튼으로 요청
- 응답은 스트리밍으로 실시간 표시

### Dev Server 패널 (우하단)
- 감지된 명령어가 자동 실행됨 (`npm run dev` 등)
- `restart` 버튼으로 프로세스 재시작
- 인터랙티브 터미널이라 직접 명령어 입력 가능

### Console 패널 (하단)
- 앱 내부 이벤트 로그 (MCP 주입, 에러 수신, Antigravity 요청 등)
- `clear` 버튼으로 초기화

---

## 6. 툴바 버튼

| 버튼 | 동작 |
|------|------|
| `변경` | 프로젝트 폴더 변경 (PTY 종료 후 초기화면으로) |
| `스니펫` (발바닥) | 자동 snippet 래핑 ON/OFF 토글 |
| `compact` | Claude에 `/compact` 전송 → 컨텍스트 압축 |
| `:7890 ●` | Kuro HTTP 서버 상태 (Cursor 확장 연결 포트) |

---

## 7. Cursor 확장 설치

에러를 Kuro로 바로 보내는 확장.

### 빌드 및 설치

```powershell
cd C:\Dev\DevAgent\Kuro\cursor-extension
npm install
npm run build
npx @vscode/vsce package --no-dependencies
```

→ `kuro-cursor-0.1.0.vsix` 생성됨

**Cursor에 설치:**
```
Extensions 패널 (Ctrl+Shift+X)
  → 우상단 ··· 메뉴
  → Install from VSIX
  → kuro-cursor-0.1.0.vsix 선택
```

### 사용법

| 방법 | 동작 |
|------|------|
| `Ctrl+Shift+K` | 커서 위치 에러 + 주변 코드 자동 전송 |
| 에러 위 lightbulb → **Fix with Kuro** | Quick Fix 메뉴에서 선택 |
| 코드 선택 후 `Ctrl+Shift+K` | 선택 영역만 전송 (에러 없어도 가능) |

> **주의**: Kuro 앱이 먼저 실행 중이어야 합니다.  
> 전송 성공 시 오른쪽 하단에 "Kuro로 전송 완료" 알림 표시.

---

## 8. Antigravity CLI (agy) 동작 확인

Antigravity 패널이 응답하지 않으면 스크립트 직접 테스트:

```powershell
# 테스트
echo '{"mode":"research","input":"Node.js 최신 LTS 버전은?","context":""}' | powershell -File C:\Dev\DevAgent\Kuro\scripts\ask-agy.ps1
```

응답이 없으면 `scripts/ask-agy.ps1` 마지막 줄의 `agy` 호출 방식 확인:

```powershell
# agy CLI 플래그 확인
agy --help

# 일반적인 변형들
agy -p $prompt
$prompt | agy
```

---

## 9. 패키징 (배포용 .exe)

```powershell
cd C:\Dev\DevAgent\Kuro
npm run package
```

→ `dist/Kuro Setup 0.1.0.exe` 생성  
→ NSIS 인스톨러 방식, 설치 경로 직접 지정 가능

---

## 10. 트러블슈팅

### Claude 터미널이 안 열림
```powershell
# PATH에 claude가 있는지 확인
where claude
# 없으면 전체 경로로 수동 실행
& "C:\Users\<user>\AppData\Roaming\npm\claude.cmd"
```

### node-pty 빌드 실패
```powershell
npm install -g node-gyp
npm install --save-optional bufferutil utf-8-validate
npm run postinstall
```

### Playwright MCP npx 설치 느림
첫 실행 시 `@playwright/mcp` 다운로드로 느릴 수 있음.  
미리 설치해두면 빠름:
```powershell
npx @playwright/mcp@latest --version
```

### 포트 7890 충돌
다른 프로세스가 점유 중인 경우:
```powershell
netstat -ano | findstr :7890
taskkill /PID <PID> /F
```
또는 `electron/main.ts`의 `KURO_PORT` 값 변경 후 재빌드, Cursor 확장 설정(`kuro.port`)도 동일하게 변경.
