import React from 'react';

interface AudioLevelProps {
  level: number;
  isSpeaking: boolean;
}

export const AudioLevel: React.FC<AudioLevelProps> = ({ level, isSpeaking }) => {
  // Calculate bar widths for a visual meter
  const barCount = 10;
  const activeBars = Math.ceil((level / 100) * barCount);

  return (
    <div className="audio-level">
      <div className="audio-level__meter">
        {Array.from({ length: barCount }).map((_, index) => {
          const isActive = index < activeBars;
          const isHigh = index >= 7;
          const isMedium = index >= 4 && index < 7;

          let barClass = 'audio-level__bar';
          if (isActive) {
            if (isHigh) barClass += ' audio-level__bar--high';
            else if (isMedium) barClass += ' audio-level__bar--medium';
            else barClass += ' audio-level__bar--low';
          }

          return <div key={index} className={barClass} />;
        })}
      </div>
      <div className="audio-level__status">
        {isSpeaking ? (
          <span className="audio-level__status--speaking">Đang nói...</span>
        ) : (
          <span className="audio-level__status--ready">Sẵn sàng</span>
        )}
      </div>
      <div className="audio-level__value">{level}%</div>
    </div>
  );
};
