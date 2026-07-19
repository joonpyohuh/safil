# SAFIL — Confirmed Architecture (2026-07-19)

이 문서는 Task 2(기술 아키텍처)의 확정본이다. 변경 시 DECISIONS.md에 기록한다.

## 1. 전체 구조

```
[브라우저 (모바일 퍼스트 UI)]
        │  fetch (JSON / multipart)
        ▼
[Next.js App Router — Route Handlers (/api/*)]
        │                         │
        ▼                         ▼
[SQLite (.data/safil.db)]   [AI Layer (src/lib/ai)]
  Drizzle ORM                 OpenAI Structured Output
  프로필·히스토리·업로드        키 없으면 샘플 모드(정직하게 표기)
        │
        ▼
[.data/uploads/*  (사진·로고 파일)]
```

- **런타임**: Next.js 16 App Router, 모든 백엔드는 Route Handler(`src/app/api/**`)로 구현. 서버 액션 대신 Route Handler를 쓰는 이유: 클라이언트 컴포넌트(업로드·생성 폼)에서 호출이 단순하고, 파일럿 이후 모바일 앱/외부 클라이언트 재사용이 쉬움.
- **DB**: 파일럿 단계는 **SQLite(better-sqlite3) + Drizzle ORM**. 단일 파일(`.data/safil.db`), 외부 계정·네트워크 불필요, Windows 로컬 개발과 단일 서버 배포에 즉시 동작. 스키마는 Drizzle로 선언되어 있어 **프로덕션 전환 시 Supabase(Postgres)로 마이그레이션이 기계적**임.
- **AI**: OpenAI SDK + Zod 스키마 기반 Structured Output. 모델은 환경 변수로 교체 가능(`OPENAI_MODEL`). `OPENAI_API_KEY`가 없으면 **샘플 모드**로 동작하고 응답에 `isSample: true`를 명시해 UI가 정직하게 표시할 수 있게 한다(Principle 3·8).
- **이미지 생성 방식(확정)**: **하이브리드 — 원본 사진 보존 + 템플릿 오버레이**. AI는 사진을 변형하지 않고, 문구·배치·팔레트로 구성된 "디자인 스펙(JSON)" 2종을 생성한다. 클라이언트가 스펙을 렌더링해 다운로드한다. MVP_SCOPE의 "원본 사진 보존, 음식 외형 왜곡 금지, 텍스트 수정 가능" 요구를 구조적으로 보장한다.
- **인증**: 파일럿은 **단일 매장 모드(무인증)**. 프로필 테이블은 1행을 사용한다. 다중 사용자 전환 시 Supabase Auth 도입 + `owner_id` 컬럼 추가로 확장한다.
- **파일 저장**: `.data/uploads/`에 저장, `GET /api/files/[name]`으로 서빙. (Next의 `public/`은 빌드 시점 자산만 보장하므로 런타임 업로드에 부적합.)

## 2. 폴더 구조

```
src/
├── app/
│   ├── (기존 UI 페이지들)
│   └── api/
│       ├── profile/route.ts            # GET, PUT — 카페 프로필
│       ├── uploads/route.ts            # POST — 사진/로고 업로드
│       ├── files/[name]/route.ts       # GET — 업로드 파일 서빙
│       ├── generate/
│       │   ├── copy/route.ts           # POST — 홍보 문구 3안
│       │   ├── image/route.ts          # POST — 이미지 디자인 스펙 2안
│       │   └── notice/route.ts         # POST — 매장 안내물 스펙
│       └── history/
│           ├── route.ts                # GET — 목록(타입 필터)
│           └── [id]/route.ts           # GET, PATCH, DELETE
├── lib/
│   ├── db/
│   │   ├── schema.ts                   # Drizzle 테이블 정의
│   │   └── index.ts                    # DB 클라이언트 + 부트스트랩 DDL
│   ├── ai/
│   │   ├── client.ts                   # OpenAI 클라이언트 + 샘플 모드 판단
│   │   ├── prompts.ts                  # 시스템/유저 프롬프트 빌더
│   │   ├── generate.ts                 # 타입별 생성 함수
│   │   └── samples.ts                  # 키 없을 때의 샘플 출력
│   ├── schemas.ts                      # Zod 입력/출력 스키마 (단일 진실)
│   └── api-helpers.ts                  # 공통 에러/응답 헬퍼
└── components/ (기존)
.data/                                   # DB 파일 + 업로드 (gitignore)
```

## 3. 데이터 모델

### cafe_profile (단일 행)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | int PK | 항상 1 |
| name | text | 카페 이름 (필수) |
| location | text | 위치 (필수) |
| concept | text | 카페 콘셉트 |
| introduction | text | 짧은 소개 |
| menus | text(JSON) | 대표 메뉴 배열 |
| tone | text | 톤 선호 (enum: warm/professional/witty/calm) |
| customer_type | text | 주 고객층 |
| logo_path | text | 로고 파일명 |
| photo_paths | text(JSON) | 카페/메뉴 사진 파일명 배열 |
| created_at / updated_at | int(ms) | |

### generations
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text PK | UUID |
| type | text | copy / image / notice |
| input | text(JSON) | 사용자 입력 전체 |
| options | text(JSON) | 생성된 옵션 배열 (이유 포함) |
| selected_index | int null | 사장님이 고른 옵션 |
| copied | int(0/1) | 복사 여부 |
| downloaded | int(0/1) | 다운로드 여부 |
| is_sample | int(0/1) | 샘플 모드 생성 여부 |
| created_at | int(ms) | |

### uploads
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text PK | UUID (저장 파일명에 사용) |
| stored_name | text | 실제 저장 파일명 |
| original_name | text | 원본 파일명 |
| mime | text | image/jpeg 등 |
| size | int | 바이트 |
| created_at | int(ms) | |

## 4. AI 생성 경계 (구조화 스키마)

모든 생성 응답은 Zod로 검증된다. 스키마는 `src/lib/schemas.ts`가 단일 진실.

- **문구(copy)**: `{ options: [{ text, reason, hashtags[] }] × 3 }` — 채널(instagram/naver_place)·목적(new_menu/event/daily/notice)별 프롬프트 분기.
- **이미지(image)**: `{ options: [{ templateId, headline, subline, dateText, palette, textPosition, reason }] × 2 }` — 사진은 변형하지 않음.
- **안내물(notice)**: `{ title, lines[], footer, tone-aligned palette, reason }` — A4/모바일 프리뷰용 스펙.
- 프롬프트에는 항상 카페 프로필(이름·콘셉트·톤·메뉴·고객층)이 컨텍스트로 주입된다 (Principle 6).
- 금지 규칙이 시스템 프롬프트에 포함된다: 과장·보장성 문구 금지, 검색 순위/매출 보장 금지 (Principle 3·4).

## 5. 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| OPENAI_API_KEY | 아니오 | 없으면 샘플 모드로 동작 |
| OPENAI_MODEL | 아니오 | 기본 gpt-4o-mini |
| SAFIL_DATA_DIR | 아니오 | 기본 `<repo>/.data` |

`.env.example` 참고. 키는 서버에서만 사용되며 클라이언트로 노출되지 않는다.

## 6. 보안·프라이버시

- 업로드 검증: 이미지 MIME(jpeg/png/webp)만 허용, 8MB 제한, 저장 파일명은 서버가 UUID로 재부여(경로 조작 차단).
- 파일 서빙은 화이트리스트 이름 패턴(`uuid.ext`)만 허용.
- AI 키는 Route Handler(서버)에서만 사용.
- 파일럿 데이터는 로컬 단일 파일 — 파일럿 종료 시 `.data` 삭제로 완전 파기 가능 (데이터 보관 정책은 DECISIONS.md Open 유지).

## 7. 프로덕션 전환 경로 (파일럿 이후)

1. Supabase 프로젝트 생성 → Drizzle 스키마를 Postgres 방언으로 이전 (테이블 구조 동일).
2. `.data/uploads` → Supabase Storage, `files` 라우트를 스토리지 URL 리다이렉트로 교체.
3. 무인증 단일 매장 → Supabase Auth + `owner_id` 스코프.
4. Vercel 배포 (SQLite는 Vercel 서버리스에서 비영속이므로 이 시점에 반드시 전환).
