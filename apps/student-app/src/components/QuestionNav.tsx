import React from 'react';

interface QuestionNavProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: number[];
  onSelectQuestion: (sequence: number) => void;
}

export const QuestionNav: React.FC<QuestionNavProps> = ({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  onSelectQuestion,
}) => {
  // Generate array of question numbers from 1 to totalQuestions
  const questions = Array.from({ length: totalQuestions }, (_, i) => i + 1);

  const getQuestionStyle = (sequence: number): React.CSSProperties => {
    const isCurrent = sequence === currentQuestion;
    const isAnswered = answeredQuestions.includes(sequence);

    if (isCurrent) {
      return {
        ...styles.questionButton,
        backgroundColor: '#2563eb',
        color: 'white',
        border: '2px solid #1d4ed8',
      };
    }

    if (isAnswered) {
      return {
        ...styles.questionButton,
        backgroundColor: '#10b981',
        color: 'white',
        border: '2px solid #059669',
      };
    }

    return {
      ...styles.questionButton,
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '2px solid #d1d5db',
    };
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Questions</h3>

      {/* Question Grid */}
      <div style={styles.grid}>
        {questions.map((num) => (
          <button
            key={num}
            style={getQuestionStyle(num)}
            onClick={() => onSelectQuestion(num)}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={styles.legendColorCurrent} />
          <span style={styles.legendText}>Current</span>
        </div>
        <div style={styles.legendItem}>
          <span style={styles.legendColorAnswered} />
          <span style={styles.legendText}>Answered</span>
        </div>
        <div style={styles.legendItem}>
          <span style={styles.legendColorUnanswered} />
          <span style={styles.legendText}>Unanswered</span>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  questionButton: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #e5e7eb',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendColorCurrent: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    backgroundColor: '#2563eb',
  },
  legendColorAnswered: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    backgroundColor: '#10b981',
  },
  legendColorUnanswered: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
  },
  legendText: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default QuestionNav;
