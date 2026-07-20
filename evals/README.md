# SAFIL Eval — Golden Dataset & Regression

프롬프트·모델·기능 변경이 **이전 품질을 망치지 않는지** 같은 데이터로 비교합니다.

## 구성

| 경로 | 역할 |
|------|------|
| `golden/cafe-posts.json` | 실제 카페 게시 패턴 큐레이션 **72건** (50–100 목표) |
| `baselines/` | 통과 기준 점수 (회귀 비교용) |
| `runs/` | 실행 결과 스냅샷 (gitignore 가능) |
| `../src/lib/eval/` | 루브릭·Judge·선택/폐기 preference |
| `../scripts/run-eval.mjs` | 오프라인 검증 + 회귀 비교 |
| `../scripts/build-golden-dataset.mjs` | 골든셋 재생성 |

## 채점 축 (각 0–10)

1. **brandFit** — 브랜드 적합성  
2. **typography** — 타이포·가독성  
3. **photoAuthenticity** — 사진 진정성  
4. **postability** — 게시 가능성  
5. **specificity** — 구체성  
6. **toneMatch** — 톤 일치  
7. **noHype** — 과장 없음  

레퍼런스 점수 + 생성 결과 `minAccept`로 케이스별 pass/fail.

## 명령

```bash
# 데이터셋 무결성 + 레퍼런스 self-check (CI용, API 키 불필요)
npm run eval

# 휴리스틱 Judge 재채점
npm run eval:judge

# 현재 점수를 베이스라인으로 저장
npm run eval:baseline

# 최신 베이스라인과 회귀 비교 (하락 시 exit 1)
npm run eval:compare
```

## 프로덕트 지표 (복사 ≠ 게시)

DB `generations` 컬럼:

- `copied` / `downloaded` — 중간 행동  
- **`posted` / `posted_at`** — 사장님이 「실제로 올렸어요」를 누른 경우  
- **`discarded_indices`** — 선택하지 않은 옵션 (학습 신호)

생성 프롬프트(`buildCafeLearningContext`)는 **게시·선택 톤을 우선**하고, 버린 옵션은 반례로 넣습니다.

## 골든셋 출처

- `source: curated_public_pattern` — 공개 SNS/네이버 패턴을 반영해 **재작성·합성**한 문구 (저작권 보호).  
- 파일럿 사장님 실게시물은 `pilot_owner`로 추가 import 권장.

## 워크플로 (프롬프트/모델 변경 시)

1. `npm run eval` — 데이터셋 OK  
2. (선택) 생성 파이프라인으로 골든 입력 → Judge (`src/lib/eval/judge.ts`)  
3. `npm run eval:compare` — 베이스라인 대비 회귀 없으면 머지  
4. 의도적 품질 상향이면 `npm run eval:baseline`으로 기준 갱신  
