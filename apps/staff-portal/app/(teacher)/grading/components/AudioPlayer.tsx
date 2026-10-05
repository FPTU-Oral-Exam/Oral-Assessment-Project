'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Download, Loader2, Music } from 'lucide-react';

interface AudioPlayerProps {
  evidenceId: string;
  sha256?: string;
  size?: number;
  apiBaseUrl?: string;
}

export function AudioPlayer({ evidenceId, sha256, size, apiBaseUrl = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string>('');

  const streamUrl = `${apiBaseUrl}/api/evidence/${evidenceId}/content`;

  // Fetch audio with credentials to create local blob URL (bypasses any cross-origin audio cookie limits)
  useEffect(() => {
    let isCancelled = false;
    let blobUrl = '';

    async function loadAudio() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(streamUrl, { credentials: 'include' });
        if (!res.ok) {
          throw new Error(`Không thể tải file âm thanh (HTTP ${res.status})`);
        }
        const blob = await res.blob();
        if (isCancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setAudioSrc(blobUrl);
      } catch (err) {
        if (!isCancelled) {
          // Fallback to direct stream URL
          setAudioSrc(streamUrl);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadAudio();

    return () => {
      isCancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [evidenceId, streamUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setError('Lỗi khi phát âm thanh'));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) setIsMuted(true);
      else if (isMuted) setIsMuted(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-xl p-3.5 shadow-md border border-slate-800">
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setError('Không thể phát file minh chứng âm thanh')}
        preload="metadata"
      />

      {loading ? (
        <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>Đang tải minh chứng âm thanh...</span>
        </div>
      ) : error ? (
        <div className="text-xs text-rose-400 p-2 bg-rose-950/40 rounded-lg border border-rose-900/60 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setAudioSrc(streamUrl)}
            className="text-[11px] underline hover:text-rose-300 ml-2"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top Row: Play/Pause, Seekbar, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              type="button"
              className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-md shadow-blue-600/30 flex-shrink-0 cursor-pointer"
              title={isPlaying ? 'Tạm dừng' : 'Phát'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Speed buttons, Volume, Checksum */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800 text-xs">
            {/* Speed options */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 mr-1">Tốc độ:</span>
              {[0.75, 1, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    playbackRate === rate
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-slate-200"
                title={isMuted ? 'Bật âm' : 'Tắt âm'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>

          {sha256 && (
            <div className="text-[10px] text-slate-500 font-mono truncate" title={`SHA256: ${sha256}`}>
              SHA256: {sha256.slice(0, 16)}...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
