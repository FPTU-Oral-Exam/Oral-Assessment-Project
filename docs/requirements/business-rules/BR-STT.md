# Business Rules - Speech-to-Text (STT)

## Overview

This document outlines the business rules governing the STT (Speech-to-Text) system for the oral examination platform.

---

## BR-STT-001: STT Processing Location

### Rule
- **Desktop App**: Does NOT perform STT locally
- **Central Server**: Performs STT using Whisper model

### Rationale
- Reduces complexity on student machines
- Ensures consistent STT quality
- Allows for GPU-accelerated processing on server

### Implementation
```
Student App → Audio Upload → Host Machine → Central Server (STT)
```

---

## BR-STT-002: Language Configuration

### Rule
- System supports **English-only** examinations
- Default language: `en`
- Language is configured per exam session

### Rationale
- Simplifies STT model requirements
- English has best accuracy with Whisper-large-v3
- Matches FPT University's English-medium curriculum

---

## BR-STT-003: Audio Format Requirements

### Rule
- **Format**: WebM (Opus codec) or WAV
- **Sample Rate**: 16kHz minimum
- **Channels**: Mono
- **Max Duration**: 10 minutes per question

### Rationale
- WebM is default browser recording format
- 16kHz is minimum for Whisper accuracy
- Prevents excessive file sizes

---

## BR-STT-004: STT Model Selection

### Rule
- **Server-side**: Whisper-large-v3 (non-turbo)
- **Accuracy Priority**: 98-99% WER for English
- **Speed**: Acceptable for batch processing (non-real-time)

### Rationale
- Server has GPU resources for large model
- Batch processing allows slower, more accurate transcription
- No real-time requirement on server

---

## BR-STT-005: Confidence Scoring

### Rule
- Whisper provides per-word confidence scores
- Low confidence words (< 0.7) are flagged for review
- Flagged words do NOT auto-correct

### Rationale
- AI should NOT correct student errors
- Low confidence indicates potential STT error OR student error
- Human reviewer (lecturer) makes final determination

---

## BR-STT-006: Transcript Storage

### Rule
- Transcripts are stored in PostgreSQL
- Each transcript links to:
  - Exam session ID
  - Question sequence
  - Audio file reference
  - STT confidence score
  - Timestamp

### Rationale
- Traceability is essential for academic integrity
- Supports audit requirements
- Enables grading workflow

---

## BR-STT-007: Offline Capability

### Rule
- If internet is unavailable, audio is stored locally on Host Machine
- Once connectivity is restored, batch upload proceeds
- No STT processing occurs offline

### Rationale
- Exam must continue despite network issues
- Centralized STT ensures quality consistency
- Local storage prevents data loss

---

## Compliance

- All STT processing must comply with data retention policies
- Audio files are encrypted at rest
- Transcripts retain student identifiers per FERPA guidelines
