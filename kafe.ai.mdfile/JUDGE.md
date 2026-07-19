# SAFIL — Virtual Review Criteria

Use this file after each meaningful feature is implemented.

## AI Judge
Score each category from 0 to 10.

### 1. Requirement Compliance
- Matches the active task
- Does not include out-of-scope features
- Respects documented decisions

### 2. Reliability
- Handles invalid input
- Handles loading and failures
- Preserves user data correctly
- Does not silently fail

### 3. Maintainability
- Clear types
- Minimal duplication
- Reasonable component boundaries
- No unnecessary dependencies

### 4. Security and Privacy
- Secrets remain server-side
- Upload validation exists
- User data access is isolated
- Sensitive café data is not exposed

### 5. Agent Friendliness
- Important behavior is documented
- Structured schemas are explicit
- Files and responsibilities are easy to locate

AI Judge pass threshold: average 8.5/10 and no category below 7.

---

## Human Judge
Review from the perspective of a busy independent café owner.

### 1. First 30 Seconds
- Is the purpose immediately clear?
- Is the next action obvious?
- Does it look trustworthy?

### 2. Effort
- Is typing minimized?
- Are there too many choices?
- Does the owner need to learn marketing terms?

### 3. Output Quality
- Is the result actually usable?
- Does it feel specific to the café?
- Would the owner post or print it today?

### 4. Trust
- Can the owner understand why the output was suggested?
- Is uncertainty stated honestly?
- Does the owner retain final control?

### 5. Visual Taste
- Does it feel calm and professional?
- Does it avoid generic “AI startup” visuals?
- Does it fit a quality independent café?

Human Judge pass threshold: average 8.0/10 and Output Quality at least 8.

---

## Mandatory Review Output
- Overall verdict: Pass / Revise
- AI Judge scores
- Human Judge scores
- Critical issues
- Major issues
- Minor issues
- Recommended next action

Do not modify code during the first review pass.
