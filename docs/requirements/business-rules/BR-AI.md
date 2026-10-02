# BR-AI: Artificial Intelligence System

## Overview

This document outlines the business rules for AI-powered features in the oral examination platform.

---

## BR-AI-001: AI Grading System

### Rule
- AI grading is **advisory only**
- Final grading authority rests with the lecturer
- AI provides initial scoring and feedback suggestions

### Rationale
- AI may misinterpret student responses
- Human judgment is essential for nuanced assessment
- Academic integrity requires lecturer accountability

---

## BR-AI-002: AI Model Selection

### Rule
- **Primary**: Google Gemini API
- AI processes transcripts from STT system
- Grading criteria based on Learning Outcomes (LOs)

### Rationale
- Gemini provides high-quality reasoning
- Transcript-based grading reduces processing requirements
- LO-based criteria ensure curriculum alignment

---

## BR-AI-003: Grading Criteria

### Rule
- Grading criteria are defined by Learning Outcomes (LOs)
- Each question maps to specific LOs
- Weight distribution per LO is configurable

### Rationale
- Curriculum alignment is essential
- LOs define what students should demonstrate
- Enables differentiated scoring

---

## BR-AI-004: Feedback Generation

### Rule
- AI generates feedback per question
- Feedback includes:
  - Strengths identified
  - Areas for improvement
  - Suggested resources
- Feedback is visible to both lecturer and student

### Rationale
- Students benefit from immediate feedback
- Lecturers save time on routine feedback
- Supports learning improvement

---

## BR-AI-005: Human Override

### Rule
- Lecturers can override any AI-generated score
- Override requires a reason
- All overrides are logged for audit

### Rationale
- Human judgment takes precedence
- Accountability must be maintained
- Audit trail is essential for appeals

---

## BR-AI-006: AI Confidence Thresholds

### Rule
- High confidence (≥0.8): Auto-suggest score
- Medium confidence (0.5-0.8): Flag for review
- Low confidence (<0.5): Require human scoring

### Rationale
- Balances automation with oversight
- Low-confidence scores need human judgment
- Thresholds are configurable per exam type

---

## BR-AI-007: Model Updates

### Rule
- AI models are updated periodically
- Major updates require validation testing
- Rollback capability is maintained

### Rationale
- AI quality improves over time
- Changes must not negatively impact grading
- Emergency rollback is essential

---

## Compliance

- AI decisions must be explainable
- Students may request explanation of AI scoring
- Appeals process includes AI decision review
