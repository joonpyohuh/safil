# SAFIL — MVP Scope

## MVP Goal
Validate whether independent café owners will repeatedly use AI-generated marketing outputs and whether they are willing to pay.

The MVP is not a complete marketing platform.
It is a narrow product that proves the core loop.

## P0 — Must Build

### 1. Café Profile
Required fields:
- Café name
- Location
- Café concept
- Short introduction
- Representative menu
- Tone preference
- Main customer type
- Logo, if available
- Café and menu photos

Behavior:
- Saved profile is automatically used as context for future generations
- User can edit profile later
- First-time setup should take less than 5 minutes

### 2. Promotional Copy Generation
Input:
- Purpose: new menu / event / daily update / notice
- One short sentence
- Optional photo
- Target channel

Output:
- 3 distinct copy options
- Brief reason for each
- Suggested hashtags where appropriate
- Copy button

Initial channels:
- Instagram
- Naver Place news

### 3. Promotional Image Generation
Input:
- Uploaded photo
- Promotion purpose
- Optional title and date

Output:
- 2 visual options
- Mobile feed-friendly ratio
- Text overlay that remains readable
- Download button

Important:
- Preserve the original café or menu photo
- Avoid changing food appearance in a misleading way
- Generated text must be editable before final export

### 4. In-store Notice Generation
Initial notice types:
- Wi-Fi
- Restroom
- Parking
- Operating hour change
- Order guide

Output:
- Café-tone-aligned printable design
- A4 and mobile preview
- Editable key text
- Download as image or PDF later; image export is enough for the first implementation

### 5. Creation History
Store:
- Input
- Generated outputs
- Selected result
- Created date
- Whether copied or downloaded

Purpose:
- Let the owner find previous work
- Prepare for later transparent reporting

## P1 — Build After Core Loop Validation
- Weekly marketing guide
- Naver Place completeness checklist
- Transparent monthly report
- Seasonal and local event suggestions
- Basic subscription and usage limits

## P2 — Do Not Build Yet
- Automatic social posting
- Team accounts
- Agency dashboard
- Multi-location brand management
- Advanced performance attribution
- Printing vendor integration
- Local event marketplace
- Other F&B categories

## Core Screens
1. Landing page
2. Sign in / onboarding
3. Café profile setup
4. Home dashboard
5. Create promotional copy
6. Create promotional image
7. Create in-store notice
8. Result selection
9. Creation history
10. Settings / café profile edit

## Primary Home Screen
The home screen should answer only:
- What do you want to make today?
- What did you make recently?

Primary action cards:
- 홍보 문구 만들기
- 홍보 이미지 만들기
- 매장 안내물 만들기

## MVP Acceptance Criteria
A pilot café owner can:
1. Register café information
2. Enter a single promotional sentence
3. Receive 3 usable copy options
4. Copy one option
5. Upload one photo
6. Receive a promotional visual
7. Download one result
8. Find the result again in history

All without developer assistance.
