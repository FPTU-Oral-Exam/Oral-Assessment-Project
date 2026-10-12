import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { PTEQuestionCard } from '../src/components/PTEQuestionCard';
import type { QuestionAttempt } from '@oralai/shared';

describe('PTEQuestionCard', () => {
  it('renders Read Aloud question with passage text and prep phase correctly', () => {
    const attempt: QuestionAttempt = {
      id: 'att-1',
      sequence: 1,
      type: 'READ_ALOUD',
      instruction: 'In 40 seconds, you must read this text aloud.',
      text: 'Sleep behavior is also known as a sleep disorder.',
      prep_time: 40,
      speak_time: 40,
      status: 'READY',
    };

    const html = renderToString(
      <PTEQuestionCard
        attempt={attempt}
        phase="PREPARING"
        prepTimeRemaining={35}
        speakTimeRemaining={40}
        totalPrepTime={40}
        totalSpeakTime={40}
      />
    );

    expect(html).toContain('Part 1: Read Aloud (RA)');
    expect(html).toContain('In 40 seconds, you must read this text aloud.');
    expect(html).toContain('Sleep behavior is also known as a sleep disorder.');
    expect(html).toContain('CHUẨN BỊ (PREPARATION)');
    expect(html).toContain('35');
  });

  it('renders Describe Image question with SVG diagram correctly', () => {
    const attempt: QuestionAttempt = {
      id: 'att-3',
      sequence: 3,
      type: 'DESCRIBE_IMAGE',
      instruction: 'Describe in detail what the image is showing.',
      prompt_image: '/pte/test1/q3_di.svg',
      text: 'Approximate composition of the air',
      prep_time: 25,
      speak_time: 40,
      status: 'READY',
    };

    const html = renderToString(
      <PTEQuestionCard
        attempt={attempt}
        phase="RECORDING"
        prepTimeRemaining={0}
        speakTimeRemaining={20}
        totalPrepTime={25}
        totalSpeakTime={40}
      />
    );

    expect(html).toContain('Part 3: Describe Image (DI)');
    expect(html).toContain('/pte/test1/q3_di.svg');
    expect(html).toContain('ĐANG GHI ÂM (RECORDING)');
    expect(html).toContain('20');
  });

  it('renders Repeat Sentence question with audio prompt container', () => {
    const attempt: QuestionAttempt = {
      id: 'att-2',
      sequence: 2,
      type: 'REPEAT_SENTENCE',
      instruction: 'Please repeat the sentence exactly as you hear it.',
      prompt_audio: '/pte/test1/q2_rs.mp3',
      text: 'At that time, people moved from towns to villages.',
      prep_time: 0,
      speak_time: 15,
      status: 'READY',
    };

    const html = renderToString(
      <PTEQuestionCard
        attempt={attempt}
        phase="AUDIO_PLAYING"
        prepTimeRemaining={0}
        speakTimeRemaining={15}
        totalPrepTime={0}
        totalSpeakTime={15}
      />
    );

    expect(html).toContain('Part 2: Repeat Sentence (RS)');
    expect(html).toContain('/pte/test1/q2_rs.mp3');
    // Ensure the sentence text is hidden during test so student cannot read the answer
    expect(html).not.toContain('At that time, people moved from towns to villages.');
  });
});
