# PTE Speaking Test 1 Student Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable students to take the 6-part PTE Speaking Practice Test 1 with multimedia prompts, automated two-phase countdowns, audio beeps, and chunked recording submission.

**Architecture:** Extend the existing Next.js student examination component with a dedicated PTE Question Card and Dual-Phase Countdown state machine (`PROMPT_AUDIO` -> `PREPARING` -> `BEEP` -> `RECORDING`). Seed the database with a published PTE Core course and exam snapshot containing the 6 PTE questions referencing local media assets in `public/pte/test1/`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Web Audio API, MediaRecorder API, Python 3 / SQLAlchemy, SQLite / PostgreSQL.

**Spec:** [docs/superpowers/specs/2026-10-12-pte-speaking-student-test1-design.md](file:///e:/SEMESTER%205/DuAnKhoa/AI-Oral-Assessment-Platform/docs/superpowers/specs/2026-10-12-pte-speaking-student-test1-design.md)

## Global Constraints

- Preserve 100% of existing media chunk upload (`/uploads/init`, `/uploads/.../chunks`, `/uploads/.../complete`) and exam session submission logic.
- All media assets must be served locally from `apps/admin-web/public/pte/test1/` without external cloud dependencies.
- Audio beep feedback must use native Web Audio API (`AudioContext`) with graceful fallbacks.
- Desktop Electron bridge (`window.oralDesktop`) compatibility must remain intact.

## Review Focus

1. **Auto-play browser policy blocking audio prompt**: User gesture requirement might block audio play before interaction; must resume `AudioContext` on user interaction or provide explicit "Play Audio" button if autoplay fails.
2. **Premature stop or recording failure on transition**: Microphones must start smoothly after prep countdown ends without throwing `NotAllowedError`.
3. **Session timer conflict**: Overall exam session timer (`remaining`) must not expire before individual PTE question timers complete.
4. **Desktop Electron compatibility**: Local file rendering of SVGs and MP3s in Electron webview must resolve cleanly.
5. **Silence timeout logic**: Silence timeout (3s) must not prematurely abort before speech has started.

---

### Task 1: Seed Data and Database Exam Snapshot for PTE Test 1

**Files:**
- Create: `scripts/seed_pte_test1.py`
- Test: `services/api/tests/test_pte_seed.py`

**Interfaces:**
- Consumes: `services/api/app/models.py`, `services/api/app/db.py`
- Produces: `PTE-CORE` Course, `PTE-RUBRIC-1` Rubric, `PTE-TEST-1` Exam (Published) with 6 snapshot questions in SQLite/PostgreSQL database.

- [ ] **Step 1: Write verification test for PTE exam snapshot structure**

```python
# services/api/tests/test_pte_seed.py
import pytest
from app.db import SessionLocal
from app.models import Course, Exam, Rubric

def test_pte_exam_seeded_correctly():
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.code == "PTE-CORE").first()
        assert course is not None, "PTE-CORE course must exist"
        
        exam = db.query(Exam).filter(Exam.name == "PTE Speaking Practice Test 1").first()
        assert exam is not None, "PTE Speaking Practice Test 1 must exist"
        assert exam.status == "PUBLISHED"
        assert len(exam.snapshot["questions"]) == 6
        
        q_types = [q["type"] for q in exam.snapshot["questions"]]
        assert q_types == [
            "READ_ALOUD",
            "REPEAT_SENTENCE",
            "DESCRIBE_IMAGE",
            "RETELL_LECTURE",
            "SUMMARIZE_GROUP_DISCUSSION",
            "RESPOND_TO_SITUATION"
        ]
    finally:
        db.close()
```

- [ ] **Step 2: Run test to verify it fails before seeding**

Run: `python -m pytest services/api/tests/test_pte_seed.py -v`
Expected: FAIL with `PTE-CORE course must exist`

- [ ] **Step 3: Implement seed script `scripts/seed_pte_test1.py`**

Create `scripts/seed_pte_test1.py` using SQLAlchemy session to insert the Course, Rubric, and published Exam with the 6 full questions, and enroll all existing student users.

- [ ] **Step 4: Execute seed script and run test to verify PASS**

Run: `python scripts/seed_pte_test1.py && python -m pytest services/api/tests/test_pte_seed.py -v`
Expected: PASS with 6 questions seeded and verified.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed_pte_test1.py services/api/tests/test_pte_seed.py
git commit -m "feat(seed): add PTE speaking practice test 1 database seeder"
```

---

### Task 2: PTE Web Audio Beeper and Media Components

**Files:**
- Create: `apps/admin-web/lib/pte-audio.ts`
- Create: `apps/admin-web/components/pte-question-card.tsx`

**Interfaces:**
- Consumes: Static files in `/pte/test1/`
- Produces: `playPTEBeep(): Promise<void>`, `<PTEQuestionCard question={...} phase={...} />`

- [ ] **Step 1: Implement `apps/admin-web/lib/pte-audio.ts`**

```typescript
// apps/admin-web/lib/pte-audio.ts
export function playPTEBeep(freq = 880, durationMs = 300): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
      osc.onended = () => {
        void ctx.close();
        resolve();
      };
    } catch {
      resolve();
    }
  });
}
```

- [ ] **Step 2: Implement `apps/admin-web/components/pte-question-card.tsx`**

Create component handling:
1. `instruction` styling (italic header).
2. `prompt_audio` with auto-play audio player and visual progress bar.
3. `prompt_image` rendering SVG/PNG with full responsive view.
4. `READ_ALOUD` passage highlight styling.

- [ ] **Step 3: Verify TypeScript compilation**

Run: `npm --prefix apps/admin-web run build` or `npx tsc --noEmit --project apps/admin-web/tsconfig.json`
Expected: PASS with 0 type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin-web/lib/pte-audio.ts apps/admin-web/components/pte-question-card.tsx
git commit -m "feat(ui): add PTE audio beeper utility and question card component"
```

---

### Task 3: Dual-Phase Countdown & State Machine in Student Exam Flow

**Files:**
- Modify: `apps/admin-web/components/student.tsx`
- Modify: `apps/admin-web/app/globals.css`

**Interfaces:**
- Consumes: `<PTEQuestionCard />`, `playPTEBeep()`
- Produces: Integrated PTE countdown and auto-recording trigger in `<Student />`

- [ ] **Step 1: Add PTE state machine & timers in `student.tsx`**

1. Parse question type and PTE metadata (`prep_time`, `speak_time`, `prompt_audio`, `prompt_image`).
2. Implement phases:
   - `AUDIO_PLAYING`: When `prompt_audio` exists, wait for audio playback to end before entering prep.
   - `PREPARING`: Countdown `prep_time`.
   - `BEEP`: Trigger `playPTEBeep()` and immediately transition to recording.
   - `RECORDING`: Trigger MediaRecorder `start()`. Countdown `speak_time`. When reaches 0, call `stopRef.current()`.
3. Add "Skip Preparation" button so student can start answering immediately if ready.

- [ ] **Step 2: Add CSS styling in `globals.css`**

Add CSS for:
- `.pte-card`, `.pte-instruction`, `.pte-passage`
- `.pte-phase-indicator` (blue badge for Prep, pulsing red badge for Recording)
- `.pte-countdown-bar` with animated fill
- `.pte-image-container` and `.pte-audio-player`

- [ ] **Step 3: Test build & typecheck**

Run: `npx tsc --noEmit --project apps/admin-web/tsconfig.json`
Expected: PASS with no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/admin-web/components/student.tsx apps/admin-web/app/globals.css
git commit -m "feat(student): integrate PTE dual-phase countdown engine and question card"
```

---

### Task 4: End-to-End Test and Verification

**Files:**
- Verify: `apps/admin-web` running locally
- Run through Questions 1 to 6 as a student.

- [ ] **Step 1: Run seed script to ensure test data is populated**

Run: `python scripts/seed_pte_test1.py`

- [ ] **Step 2: Start frontend & backend and verify questions render**

Run student exam session:
- Q1: Read Aloud passage displays, 40s countdown works.
- Q2: Repeat Sentence plays audio `q2_rs.mp3`, transitions to recording.
- Q3: Describe Image shows `q3_di.svg`, 25s prep countdown works.
- Q4: Re-tell Lecture plays `q4_rl.mp3`, 10s prep, 40s speak.
- Q5: Group Discussion plays `q5_sgd.mp3`, 10s prep, 120s speak.
- Q6: Situation plays `q6_rts.mp3`, 10s prep, 40s speak.

- [ ] **Step 3: Verify answer submission and chunk uploads**

Ensure each question records audio/video evidence and uploads to server successfully.

- [ ] **Step 4: Final commit and summary**

```bash
git commit --allow-empty -m "chore: complete and verify PTE speaking student test 1 flow"
```
