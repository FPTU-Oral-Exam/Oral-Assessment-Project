# Actors Specification

## System Actors

### 1. Student

**Description:** Enrolled student taking oral examinations

**Responsibilities:**
- Login to examination system
- Take oral examinations
- Record audio responses
- Submit examination
- View results (after release)

**Access Level:** Student portal only

---

### 2. Lecturer (Teacher)

**Description:** Course instructor who creates and manages exams

**Responsibilities:**
- Create/edit course content
- Create exam questions
- Define rubric criteria
- Review and grade submissions
- Release results to students

**Access Level:** Teacher portal + Grading interface

---

### 3. Examiner (Invigilator)

**Description:** Exam supervisor monitoring examination sessions

**Responsibilities:**
- Monitor exam sessions
- View real-time submission status
- Handle technical issues
- Verify student identity
- Push completed sessions to server

**Access Level:** Examiner dashboard

---

### 4. Admin

**Description:** System administrator

**Responsibilities:**
- Manage user accounts
- Configure system settings
- Manage courses and enrollments
- View system logs
- Handle system backups

**Access Level:** Full admin panel

---

### 5. AI System

**Description:** Automated grading and feedback system

**Responsibilities:**
- Transcribe audio to text (via STT)
- Generate initial grading scores
- Provide feedback suggestions
- Flag low-confidence items for review

**Access Level:** Internal system only

---

## Actor Relationships

```
Admin ────────► Manages ────────► Lecturer
                                    │
Admin ────────► Manages ────────► Examiner
                                    │
Lecturer ─────► Creates ─────────► Exam
                                    │
Student ──────► Takes ───────────► Exam
                                    │
Examiner ────► Monitors ─────────► Session
                                    │
AI ──────────► Grades ───────────► Transcript
```

---

## Access Matrix

| Feature | Student | Lecturer | Examiner | Admin |
|---------|---------|----------|----------|-------|
| View Exams | ✅ | ✅ | ✅ | ✅ |
| Take Exam | ✅ | ❌ | ❌ | ❌ |
| Create Exam | ❌ | ✅ | ❌ | ✅ |
| Grade | ❌ | ✅ | ❌ | ✅ |
| Review Grades | ❌ | ✅ | ❌ | ✅ |
| Monitor Session | ❌ | ❌ | ✅ | ✅ |
| Push to Server | ❌ | ❌ | ✅ | ❌ |
| System Config | ❌ | ❌ | ❌ | ✅ |
