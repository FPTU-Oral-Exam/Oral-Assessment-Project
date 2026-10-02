import React, { useRef, useEffect } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="camera-preview camera-preview--empty">
        <div className="camera-preview__placeholder">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
          <span>Camera not available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-preview">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-preview__video"
      />
    </div>
  );
};
