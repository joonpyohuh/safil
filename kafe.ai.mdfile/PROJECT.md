# SAFIL — Project Context

## 1. Product Name
- Working name: **SAFIL**
- Category: AI-powered local marketing output app for independent cafés
- Status: MVP planning and implementation
- Primary pilot: 기투커피 로스터스, 송파구 방이동

## 2. One-line Definition
카페 사장님이 사진과 짧은 문장을 입력하면, 바로 게시하거나 인쇄할 수 있는 홍보 문구·홍보 이미지·매장 안내물을 생성해주는 앱.

## 3. Core Problem
Independent café owners know marketing matters, but often lack time, confidence, and practical execution ability.

Existing alternatives leave work or uncertainty:
- Marketing agencies: expensive, opaque, difficult to verify
- Marketing SaaS: owners still need to learn and create
- Design tools: templates exist, but strategy and copy remain the owner's task
- Freelancers: inconsistent quality and hard to sustain

The real problem is not lack of tools. It is:
1. **Execution gap** — owners know they should market, but cannot consistently produce outputs
2. **Trust gap** — owners cannot verify what agencies did or whether it was legitimate

## 4. Product Promise
SAFIL does not sell a tool. It delivers a completed output.

The owner should only need to:
1. Upload a café or menu photo
2. Write one short sentence about what they want to promote
3. Select a preferred result
4. Copy, download, print, or share it

## 5. Target User
### Primary
- Independent café with 1–3 operators
- Not a franchise
- Can post on Instagram, but does so inconsistently
- Has only basic Naver Place information
- Knows marketing is needed, but does not execute regularly
- Distrusts agencies or has had a poor experience with one

### Persona A
Roastery café owner in their 40s.
Strong confidence in coffee quality, weak confidence in social media.
Needs consistent promotion without feeling deceived or overcharged.

### Persona B
New café owner in their 30s.
Posts manually but does not know what to post.
Needs early awareness and relief from recurring content decisions.

## 6. Core Outputs
1. Channel-specific promotional copy
   - Instagram caption and hashtags
   - Naver Place news and introduction
   - Blog draft
2. Promotional image
   - New menu
   - Event
   - Seasonal greeting
3. In-store print material
   - Wi-Fi
   - Restroom
   - Parking
   - Operating hour changes
   - Ordering instructions
4. Weekly marketing guide
   - What to do this week
   - When and where to post
   - Why the recommendation was made

## 7. Core User Loop
1. Input: photo + one short sentence
2. Generate: 3 copy options + 2 image options
3. Select: choose one result
4. Use: copy, share, download, or print
5. Review: see what was created and used

## 8. UX Goal
- From input to usable output within **3 minutes**
- Generation target: within **30 seconds**
- If the user feels they need to “learn the app,” the UX has failed
- Prefer one clear next action over many settings

## 9. Product Positioning
> 대행사의 결과물을, 툴의 가격으로, 대행사가 주지 않는 투명함과 함께.

## 10. MVP Success Metrics
- At least 60% of generated outputs are actually used or posted
- Input-to-use time under 3 minutes
- At least 50% of pilot cafés return weekly
- At least 40% of pilot cafés express willingness to pay

## 11. Initial Tech Direction
Use this unless DECISIONS.md explicitly changes it:
- Next.js
- TypeScript
- Tailwind CSS
- Vercel
- AI API pipeline
- Supabase may be introduced for auth, database, and storage

## 12. Non-goals for Initial MVP
- Full social media scheduling
- Automated posting without user review
- Guaranteed search ranking
- Review manipulation or policy-violating SEO
- Complex analytics dashboard
- Multi-industry support
- Full agency replacement
