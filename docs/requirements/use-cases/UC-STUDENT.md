# UC-STUDENT: Student Examination Flow

## Use Case: Student Takes Oral Examination

### Brief Description
Student logs into the system, joins an exam session, answers questions by recording audio responses, and submits the completed examination.

### Actors
- **Primary:** Student
- **Secondary:** Examiner (monitoring), AI System (processing)

### Preconditions
1. Student has valid FPT account
2. Student is enrolled in the course
3. Exam session is active
4. Student has microphone access

---

## Main Flow

### 1. Login
```
Student → System: Login with FPT credentials
System → Student: Verify credentials
System → Student: Show available exams
```

### 2. Join Exam Session
```
Student → System: Select exam
System → Student: Show exam info (duration, questions, rules)
Student → System: Confirm joining
System → Student: Create exam session
System → Examiner: Update session status
```

### 3. Device Check
```
System → Student: Request microphone access
Student → System: Grant microphone permission
System → Student: Show audio level indicator
Student → System: Confirm device ready
```

### 4. Answer Questions (Loop)
```
FOR each question:
    System → Student: Display question text
    Student → System: Start recording
    Student → System: Stop recording
    System → Student: Playback recorded audio
    Student → System: Confirm/submit answer
    System → Student: Mark question complete
END FOR
```

### 5. Review & Submit
```
System → Student: Show summary of answers
Student → System: Review answers (optional)
Student → System: Submit exam
System → Examiner: Update session status
System → Student: Show confirmation
```

### 6. Post-Exam
```
System → Student: Show "Results will be available after grading"
System → Student: Allow logout
```

---

## Alternative Flows

### A2: Device Check Failed
```
System → Student: "Microphone not available"
Student → System: Retry with different device
    OR
Student → System: Request examiner assistance
Examiner → System: Resolve device issue
```

### A3: Network Disconnection
```
System → Student: Detect network loss
System → Student: Show "Reconnecting..."
System → Student: Save progress locally
System → Student: Auto-retry connection
System → Student: Resume exam from last question
```

### A4: Time Expired
```
System → Student: "Time expired"
System → Student: Auto-submit current answers
System → Student: Show confirmation
```

---

## Exception Flows

### E1: Cheating Detection
```
Examiner → System: Flag suspicious behavior
System → Examiner: Show evidence
Examiner → System: Take action (pause/stop exam)
```

### E2: System Failure
```
System → Student: "System error occurred"
Examiner → System: Access recovery options
Examiner → Student: Resume or reschedule exam
```

---

## Postconditions

1. Exam session is marked as "Completed"
2. All audio files are stored
3. Examiner can view session status
4. Session is ready for STT processing

---

## Business Rules Applied
- BR-STT-001: Audio stored for server-side STT
- BR-STT-003: Audio format requirements
- BR-STT-005: Confidence scoring
- BR-AI-001: AI grading is advisory only

---

## Success Criteria
- All questions answered
- All audio recorded and uploaded
- Exam session marked complete
- Examiner notified of completion
