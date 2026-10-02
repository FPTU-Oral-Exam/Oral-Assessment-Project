import React from 'react';

interface RecordingControlsProps {
  isRecording: boolean;
  duration: number;
  disabled?: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  duration,
  disabled = false,
  onStartRecording,
  onStopRecording,
}) => {
  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      {/* Timer Display */}
      <div style={styles.timer}>
        <span style={styles.timerLabel}>Recording: </span>
        <span style={{ ...styles.timerValue, color: isRecording ? '#dc2626' : '#6b7280' }}>
          {formatDuration(duration)}
        </span>
      </div>

      {/* Record/Stop Button */}
      <button
        style={{
          ...styles.button,
          backgroundColor: isRecording ? '#374151' : '#dc2626',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
        onClick={isRecording ? onStopRecording : onStartRecording}
        disabled={disabled}
      >
        {isRecording ? (
          <span style={styles.buttonContent}>Stop</span>
        ) : (
          <span style={styles.buttonContent}>Record</span>
        )}
      </button>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timerLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  timerValue: {
    fontSize: '32px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  button: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default RecordingControls;
