'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw, ChevronDown } from 'lucide-react';

interface PTEAudioPlayerProps {
  src: string;
  hasStop?: boolean;
  hasSpeed?: boolean;
  className?: string;
  defaultDuration?: number;
}

export function PTEAudioPlayer({
  src,
  hasStop = false,
  hasSpeed = false,
  className = '',
  defaultDuration = 0,
}: PTEAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(defaultDuration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleReplay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audio) {
      audio.currentTime = time;
    }
  };

  const setSpeed = (rate: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = rate;
    }
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`relative inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-slate-300 bg-white shadow-2xs text-xs font-mono select-none ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Optional Stop button */}
      {hasStop && (
        <button
          type="button"
          onClick={handleStop}
          className="p-1 text-slate-700 hover:text-slate-900 transition-colors"
          title="Dừng"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>
      )}

      {/* Play / Pause button */}
      <button
        type="button"
        onClick={togglePlay}
        className="p-1 text-slate-700 hover:text-slate-900 transition-colors"
        title={isPlaying ? 'Tạm dừng' : 'Phát'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current" />
        )}
      </button>

      {/* Current Time */}
      <span className="text-slate-500 font-medium text-[11px] w-9 text-right">
        {formatTime(currentTime)}
      </span>

      {/* Slider / Scrub Bar */}
      <div className="relative w-28 sm:w-36 flex items-center">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.05}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
          style={{
            background: `linear-gradient(to right, #334155 ${progressPercent}%, #e2e8f0 ${progressPercent}%)`,
          }}
        />
      </div>

      {/* Duration */}
      <span className="text-slate-500 font-medium text-[11px] w-9">
        {formatTime(duration)}
      </span>

      {/* Replay */}
      <button
        type="button"
        onClick={handleReplay}
        className="p-1 text-slate-600 hover:text-slate-900 transition-colors"
        title="Nghe lại từ đầu"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Speed Dropdown */}
      {hasSpeed && (
        <div className="relative border-l border-slate-200 pl-2">
          <button
            type="button"
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-sans font-medium text-slate-700 hover:bg-slate-100"
          >
            x{playbackRate}
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>

          {showSpeedMenu && (
            <div className="absolute right-0 bottom-full mb-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs font-sans min-w-[70px]">
              {[0.8, 1.0, 1.2, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setSpeed(rate)}
                  className={`w-full px-3 py-1 text-left hover:bg-slate-50 ${
                    playbackRate === rate ? 'font-bold text-blue-600' : 'text-slate-700'
                  }`}
                >
                  x{rate}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
