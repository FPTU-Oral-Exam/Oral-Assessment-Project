import React from 'react';
import { UploadProgress as UploadProgressType } from '@oralai/shared';

interface UploadProgressProps {
  progress: UploadProgressType | null;
  error: string | null;
  isUploading: boolean;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  error,
  isUploading,
}) => {
  if (!isUploading && !progress && !error) {
    return null;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <span style={styles.errorIcon}>!</span>
          <span style={styles.errorText}>Upload Failed: {error}</span>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div style={styles.container}>
        <div style={styles.pendingContainer}>
          <span style={styles.pendingText}>Preparing upload...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Progress Bar */}
      <div style={styles.progressContainer}>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width: `${progress.percentage}%`,
            }}
          />
        </div>
        <span style={styles.percentageText}>{progress.percentage}%</span>
      </div>

      {/* Chunk Counter */}
      <div style={styles.chunkCounter}>
        <span>
          Uploading chunk {progress.currentChunk} of {progress.totalChunks}
        </span>
      </div>

      {/* Bytes Info */}
      <div style={styles.bytesInfo}>
        <span>
          {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
        </span>
      </div>
    </div>
  );
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '400px',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  percentageText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#2563eb',
    minWidth: '45px',
    textAlign: 'right',
  },
  chunkCounter: {
    fontSize: '14px',
    color: '#6b7280',
  },
  bytesInfo: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
    border: '1px solid #fecaca',
  },
  errorIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: '14px',
    color: '#dc2626',
  },
  pendingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
  },
  pendingText: {
    fontSize: '14px',
    color: '#6b7280',
  },
};

export default UploadProgress;
