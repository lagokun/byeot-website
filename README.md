# 볕 공식 안내 웹사이트

HTML/CSS 정적 웹사이트입니다. 앱 소개, 개인정보처리방침, 이용약관, 문의 페이지를 한국어·영어로 제공합니다.
로그인, 폼, DB 연결, 분석 스크립트, 광고, 외부 폰트 또는 API 키가 없습니다.
비공개 앱 저장소의 코드·이력·키를 포함하지 않는 독립 공개 문서 저장소입니다.

## 로컬 실행

Node.js 22 이상이 필요하며 패키지 설치는 필요 없습니다.

```sh
npm run build
npm run check
npm run preview
```

브라우저에서 `http://127.0.0.1:4173/`을 엽니다.

## 공개 페이지

GitHub Pages 설정 후 사용할 주소:

- 한국어 소개: `https://lagokun.github.io/byeot-website/`
- 개인정보: `https://lagokun.github.io/byeot-website/privacy/`
- 이용약관: `https://lagokun.github.io/byeot-website/terms/`
- 문의/지원: `https://lagokun.github.io/byeot-website/support/`
- 영어: 위 주소에 `/en/`을 먼저 붙입니다. 예: `/byeot-website/en/privacy/`

모든 내부 링크는 상대 경로이므로 프로젝트 사이트 하위 경로에서도 동작합니다.
없는 페이지의 404 안내는 위 배포 주소로 연결되므로 저장소 이름을 바꾸면 함께 수정합니다.

## GitHub Pages 배포

1. 이 디렉터리만 별도 공개 저장소 `lagokun/byeot-website`에 올립니다.
2. 저장소 Settings → Pages → Build and deployment → Source에서 **GitHub Actions**를 선택합니다.
3. `main`에 push하면 `.github/workflows/pages.yml`이 빌드·검증 후 `dist/`만 배포합니다.
4. Actions의 성공 상태와 Pages의 실제 HTTPS URL을 확인합니다.

기존 `lagokun/GiftShop`의 공개 범위를 변경하지 않습니다. 커스텀 도메인은 설정하지 않았습니다.
`dist/`는 빌드 결과여서 Git에 포함하지 않습니다.

## 문서 갱신

`content/legal-documents.json`은 앱의 공개 문구와 연락처만 추출한 스냅샷입니다.
원문 수정 후 비공개 앱 체크아웃에서 `dart tool/export_legal_documents.dart`를 실행하여 이 파일을 갱신합니다.
공개 웹사이트 저장소는 비공개 앱 저장소에 접근하거나 앱 환경 설정을 읽지 않습니다.
JSON 갱신 후 빌드·검증하고 변경분을 검토한 다음 push합니다.

개인정보 문서는 **기술 검증 중인 공개 준비본**입니다. `isDraft: true` 상태를 앱과 동일하게 표시하며,
페이지에 아직 시행되지 않았음을 고지합니다. 운영 DB 정리 작업 배포·외부 처리/백업 검증을 마친 뒤
실제 시행일과 변경 이력을 넣고 `isDraft` 상태를 변경합니다. App Store 최종 개인정보 URL로
제출하기 전에 내용과 실제 운영이 일치하는지 확인합니다.

공개 준비 동안 검색엔진 색인을 막기 위해 `noindex, nofollow`와 `robots.txt`를 사용합니다.
정식 공개 후 검색 노출을 원하면 두 설정을 함께 검토합니다.

문의 이메일은 `eugenekim24730@gmail.com`, 운영자는 볕 운영팀, 개인정보 보호책임자는 김유진입니다.
메일 링크는 메일 앱을 열 뿐이며 실제 문의는 사용자가 전송해야 접수됩니다.
