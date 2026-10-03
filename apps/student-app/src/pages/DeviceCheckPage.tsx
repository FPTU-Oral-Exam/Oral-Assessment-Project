import React from 'react';
import { useMediaDevices } from '../hooks/useMediaDevices';
import { useAudioLevel } from '../hooks/useAudioLevel';
import { CameraPreview } from '../components/CameraPreview';
import { AudioLevel } from '../components/AudioLevel';

interface DeviceCheckPageProps {
  sessionId: string;
  onPass: () => void;
  onBack: () => void;
}

export const DeviceCheckPage: React.FC<DeviceCheckPageProps> = ({
  sessionId,
  onPass,
  onBack,
}) => {
  const {
    cameras,
    microphones,
    selectedCamera,
    selectedMicrophone,
    stream,
    error,
    warning,
    hasVideo,
    requestPermissions,
    selectCamera,
    selectMicrophone,
  } = useMediaDevices();

  const { level, isSpeaking } = useAudioLevel(stream);

  const hasAudio = !!stream && stream.getAudioTracks().length > 0;
  const hasPermissions = !!stream;
  const isReady = hasAudio && (microphones.length > 0 || !!selectedMicrophone);

  const handleStartExam = () => {
    if (isReady) {
      onPass();
    }
  };

  return (
    <div className="device-check-page">
      <div className="device-check-page__header">
        <h1>Kiểm tra thiết bị</h1>
        <p className="device-check-page__subtitle">
          Vui lòng cho phép truy cập microphone để làm bài thi vấn đáp (camera khuyến nghị nếu có)
        </p>
      </div>

      {error && (
        <div className="device-check-page__error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {warning && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>ℹ️</span>
          <span>{warning}</span>
        </div>
      )}

      <div className="device-check-page__content">
        <div className="device-check-page__preview">
          <CameraPreview stream={stream} />

          {hasPermissions && (
            <div className="device-check-page__audio">
              <AudioLevel level={level} isSpeaking={isSpeaking} />
            </div>
          )}
        </div>

        <div className="device-check-page__controls">
          {!hasPermissions ? (
            <button
              className="device-check-page__permission-btn"
              onClick={requestPermissions}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Cho phép truy cập thiết bị (Mic & Cam)
            </button>
          ) : (
            <>
              {cameras.length > 0 && (
                <div className="device-check-page__selector">
                  <label htmlFor="camera-select">Camera</label>
                  <select
                    id="camera-select"
                    value={selectedCamera || ''}
                    onChange={(e) => selectCamera(e.target.value)}
                  >
                    {cameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="device-check-page__selector">
                <label htmlFor="mic-select">Microphone (Bắt buộc)</label>
                <select
                  id="mic-select"
                  value={selectedMicrophone || ''}
                  onChange={(e) => selectMicrophone(e.target.value)}
                >
                  {microphones.length === 0 ? (
                    <option value="">Không tìm thấy microphone</option>
                  ) : (
                    microphones.map((mic) => (
                      <option key={mic.deviceId} value={mic.deviceId}>
                        {mic.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="device-check-page__checklist">
          <h3>Trạng thái kiểm tra</h3>
          <ul>
            <li className={hasVideo ? 'checklist-item--success' : (hasPermissions ? 'checklist-item--pending' : 'checklist-item--pending')}>
              <span className="checklist-item__icon">
                {hasVideo ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              Camera {hasVideo ? 'đã sẵn sàng' : (hasPermissions ? 'bỏ qua (chỉ ghi âm mic)' : 'chưa kiểm tra')}
            </li>
            <li className={hasAudio ? 'checklist-item--success' : 'checklist-item--pending'}>
              <span className="checklist-item__icon">
                {hasAudio ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              Microphone {hasAudio ? 'đã sẵn sàng (Bắt buộc)' : 'chưa kiểm tra (Bắt buộc)'}
            </li>
          </ul>
        </div>
      </div>

      <div className="device-check-page__footer">
        <button className="device-check-page__back-btn" onClick={onBack}>
          Quay lại
        </button>
        <button
          className="device-check-page__start-btn"
          onClick={handleStartExam}
          disabled={!isReady}
        >
          Bắt đầu thi
        </button>
      </div>
    </div>
  );
};
