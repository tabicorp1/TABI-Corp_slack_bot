# TABI Corp Slack AI 팀 설정

역할별 Slack 채널에 글을 쓰면 해당 역할의 Claude AI가 답변합니다. 백엔드는 Firebase 프로젝트 `peston-slack-bot`에서 실행됩니다.

## 1. 설치

```bash
cd functions
npm install
```

## 2. Slack 앱 생성

1. [Slack API 앱 관리](https://api.slack.com/apps)에서 `Create New App > From scratch`를 선택합니다.
2. 앱 이름을 `TABI Ops AI`로 정하고 워크스페이스를 선택합니다.
3. `OAuth & Permissions > Bot Token Scopes`에 다음 권한을 추가합니다.

```text
chat:write
chat:write.customize
channels:history
channels:read
```

비공개 채널도 사용하려면 `groups:history`, `groups:read`를 추가합니다.

4. `Install to Workspace`를 누르고 `xoxb-`로 시작하는 Bot User OAuth Token을 보관합니다.
5. `Basic Information`의 Signing Secret도 보관합니다.

## 3. Firebase 비밀키 등록

```bash
firebase login
firebase use peston-slack-bot
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set SLACK_BOT_TOKEN
firebase functions:secrets:set SLACK_SIGNING_SECRET
```

명령이 값을 물으면 각각 Anthropic API 키, Slack Bot Token, Slack Signing Secret을 입력합니다.

## 4. 배포

```bash
firebase deploy --only functions
```

완료 후 출력되는 `slackEvents` 주소를 복사합니다.

## 5. Slack 이벤트 연결

1. Slack 앱의 `Event Subscriptions`에서 `Enable Events`를 켭니다.
2. `Request URL`에 `slackEvents` 주소를 넣고 `Verified`를 확인합니다.
3. `Subscribe to bot events`에 `message.channels`를 추가합니다.
4. 비공개 채널은 `message.groups`도 추가합니다.
5. 앱 권한을 바꿨다면 워크스페이스에 앱을 다시 설치합니다.

## 6. 채널 생성

아래 이름으로 채널을 만들고 각 채널에서 `/invite @TABI Ops AI`를 실행합니다.

```text
#ceo #cfo #coo #product #design #marketing
#content #data #brand #hr #legal
```

## 7. 시험

`#ceo` 채널에 `이번 분기 우선순위는 무엇으로 잡을까요?`라고 입력합니다. 로그는 아래 명령으로 확인합니다.

```bash
firebase functions:log
```

Claude 호출마다 API 비용이 발생합니다. 기본 모델은 `claude-opus-4-8`이며 `functions/lib/anthropicClient.js`에서 변경할 수 있습니다.
