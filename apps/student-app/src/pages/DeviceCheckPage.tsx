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
    requestPermissions,
    selectCamera,
    selectMicrophone,
  } = useMediaDevices();

  const { level, isSpeaking } = useAudioLevel(stream);

  const hasPermissions = !!stream;
  const isReady = hasPermissions && selectedCamera && selectedMicrophone;

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
          Vui lòng cho phép truy cập camera và microphone để bắt đầu bài thi
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
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Cho phép truy cập thiết bị
            </button>
          ) : (
            <>
              <div className="device-check-page__selector">
                <label htmlFor="camera-select">Camera</label>
                <select
                  id="camera-select"
                  value={selectedCamera || ''}
                  onChange={(e) => selectCamera(e.target.value)}
                >
                  {cameras.length === 0 ? (
                    <option value="">Không tìm thấy camera</option>
                  ) : (
                    cameras.map((camera) => (
                      <option key={camera.deviceId} value={camera.deviceId}>
                        {camera.label}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="device-check-page__selector">
                <label htmlFor="mic-select">Microphone</label>
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
            <li className={hasPermissions ? 'checklist-item--success' : 'checklist-item--pending'}>
              <span className="checklist-item__icon">
                {hasPermissions ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              Camera {hasPermissions ? 'đã sẵn sàng' : 'chưa kiểm tra'}
            </li>
            <li className={hasPermissions ? 'checklist-item--success' : 'checklist-item--pending'}>
              <span className="checklist-item__icon">
                {hasPermissions ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </span>
              Microphone {hasPermissions ? 'đã sẵn sàng' : 'chưa kiểm tra'}
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
