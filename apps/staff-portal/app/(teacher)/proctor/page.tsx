'use client';

import { useState, useEffect } from 'react';
import {
  Radio,
  CheckCircle2,
  AlertCircle,
  Mic,
  Clock,
  Lock,
  RefreshCw,
  Users,
  ShieldCheck,
  HardDriveDownload,
  Search,
  Monitor,
  Volume2
} from 'lucide-react';
import { useUser } from '@/hooks/useUser';

interface Workstation {
  id: number;
  stationCode: string;
  studentId: string;
  studentName: string;
  status: 'SUBMITTED' | 'RECORDING' | 'DEVICE_CHECK' | 'READY' | 'OFFLINE';
  currentQuestion: number;
  totalQuestions: number;
  audioUploadProgress: number; // Percentage
  noiseLevel: string; // dBFS
  lastActive: string;
}

// 35 workstations simulated for the exam lab
const INITIAL_WORKSTATIONS: Workstation[] = Array.from({ length: 35 }, (_, i) => {
  const num = (i + 1).toString().padStart(2, '0');
  const isSubmitted = i < 31;
  const isRecording = i >= 31 && i < 34;
  const isDeviceCheck = i === 34;

  return {
    id: i + 1,
    stationCode: `PC-LAB301-${num}`,
    studentId: `SE18${(1000 + i + 1).toString().slice(1)}`,
    studentName: [
      'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Minh Đức',
      'Đỗ Thanh Giang', 'Vũ Hải Hà', 'Hoàng Gia Huy', 'Bùi Diệu Khánh',
      'Đặng Tuấn Kiệt', 'Ngô Bảo Long', 'Dương Thúy Mai', 'Lý Quốc Nam',
      'Chu Kim Oanh', 'Hồ Tấn Phát', 'Mai Phương Quỳnh', 'Đinh Trọng Sang',
      'Trương Thu Thảo', 'Võ Hoài Uyên', 'Phan Thế Vinh', 'Lâm Tuệ Xuân',
      'Cao Nhật Ánh', 'Tạ Đăng Khoa', 'Quách Minh Quân', 'Lương Bích Thủy',
      'Thái Hữu Trí', 'Hà Vĩnh Thụy', 'Ân Bảo Trân', 'Doãn Hải Đăng',
      'Tôn Nữ Diễm My', 'Diệp Quốc Thái', 'Châu Gia Hân', 'Tạ Hoàng Nam',
      'Trần Quốc Bảo', 'Lê Minh Khang', 'Đoàn Nhật Minh'
    ][i] || `Sinh viên ${i + 1}`,
    status: isSubmitted ? 'SUBMITTED' : isRecording ? 'RECORDING' : isDeviceCheck ? 'DEVICE_CHECK' : 'READY',
    currentQuestion: isSubmitted ? 3 : isRecording ? 3 : 1,
    totalQuestions: 3,
    audioUploadProgress: isSubmitted ? 100 : isRecording ? 75 : 0,
    noiseLevel: '-46 dBFS (Tốt)',
    lastActive: 'Vừa xong'
  };
});

export default function ProctorPage() {
  const { user } = useUser();
  const [workstations, setWorkstations] = useState<Workstation[]>(INITIAL_WORKSTATIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState<Workstation | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  // Statistics
  const submittedCount = workstations.filter(w => w.status === 'SUBMITTED').length;
  const recordingCount = workstations.filter(w => w.status === 'RECORDING').length;
  const deviceCheckCount = workstations.filter(w => w.status === 'DEVICE_CHECK').length;
  const totalCount = workstations.length;

  const handleLockSession = () => {
    setIsLocking(true);
    setTimeout(() => {
      // Transition remaining to SUBMITTED
      setWorkstations(prev => prev.map(w => ({ ...w, status: 'SUBMITTED', audioUploadProgress: 100 })));
      setIsLocking(false);
      setIsLocked(true);
      setConfirmModal(false);
    }, 1500);
  };

  const filteredWorkstations = workstations.filter(w =>
    w.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.stationCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Session Title & Live Signal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Phòng Thi Đang Hoạt Động (Live Relay)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Phòng Lab 301 — Môn ENG101 (Software Engineering)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Ca thi: <strong>Ca 1 (08:00 - 09:30)</strong> | Cán bộ coi thi: <strong className="text-slate-800">{user?.name || user?.username || 'Giám thị'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setWorkstations([...INITIAL_WORKSTATIONS])}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
          <button
            onClick={() => setConfirmModal(true)}
            disabled={isLocked}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
              isLocked
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25'
            }`}
          >
            <Lock className="w-4 h-4" />
            {isLocked ? 'Ca thi đã được khóa & nộp' : 'Đóng ca thi & Nộp Server'}
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Tổng máy phòng thi</span>
            <Monitor className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount} <span className="text-xs text-slate-400 font-normal">máy</span></p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold uppercase">
            <span>Đã nộp bài (MinIO 100%)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{submittedCount} <span className="text-xs text-slate-400 font-normal">/ {totalCount}</span></p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-amber-600 text-xs font-semibold uppercase">
            <span>Đang trả lời</span>
            <Mic className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">{recordingCount} <span className="text-xs text-slate-400 font-normal">thí sinh</span></p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-indigo-600 text-xs font-semibold uppercase">
            <span>Kiểm tra thiết bị</span>
            <Volume2 className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{deviceCheckCount} <span className="text-xs text-slate-400 font-normal">thí sinh</span></p>
        </div>
      </div>

      {/* Search & Grid Container */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo MSSV, Họ tên hoặc Số máy..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Đã nộp đủ</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> Đang ghi âm</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Check mic</span>
          </div>
        </div>

        {/* 35 Workstations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
          {filteredWorkstations.map(ws => {
            const isSub = ws.status === 'SUBMITTED';
            const isRec = ws.status === 'RECORDING';
            const isDev = ws.status === 'DEVICE_CHECK';

            return (
              <div
                key={ws.id}
                onClick={() => setSelectedStation(ws)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-md select-none ${
                  isSub
                    ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300'
                    : isRec
                    ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/30'
                    : isDev
                    ? 'bg-indigo-50/40 border-indigo-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 tracking-tight font-mono">{ws.stationCode.replace('PC-LAB301-', 'MÁY ')}</span>
                  {isSub ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : isRec ? (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                </div>

                <div className="mt-2.5">
                  <p className="text-xs font-bold text-slate-800 truncate" title={ws.studentName}>
                    {ws.studentName}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500">{ws.studentId}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Tiến độ</span>
                  <span className="font-semibold text-slate-700">
                    {isSub ? 'Đã nộp' : `Câu ${ws.currentQuestion}/${ws.totalQuestions}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Xác nhận đóng ca thi & nộp bài?</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hệ thống sẽ khóa toàn bộ 35 máy tính tại phòng Lab 301. Các bài thi chưa nộp sẽ được thu bài tự động và chuyển sang trạng thái <strong>LOCKED_FOR_GRADING</strong>.
              <br /><br />
              Tiến độ hiện tại: <strong>{submittedCount}/{totalCount}</strong> sinh viên đã hoàn thành.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleLockSession}
                disabled={isLocking}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-rose-600/20"
              >
                {isLocking ? 'Đang khóa ca thi...' : 'Xác nhận Đóng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workstation Detail Drawer */}
      {selectedStation && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-sm h-full p-6 shadow-2xl space-y-6 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h4 className="font-bold text-slate-900">{selectedStation.stationCode}</h4>
                  <p className="text-xs text-slate-500 font-mono">{selectedStation.studentId}</p>
                </div>
                <button
                  onClick={() => setSelectedStation(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Thí sinh</label>
                  <p className="text-base font-bold text-slate-900">{selectedStation.studentName}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Trạng thái làm bài</label>
                  <div className="mt-1">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      selectedStation.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedStation.status === 'SUBMITTED' ? 'Đã nộp bài đầy đủ' : 'Đang thực hiện bài thi'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Tiến độ câu hỏi</label>
                  <p className="text-sm font-medium text-slate-800 mt-1">Câu {selectedStation.currentQuestion} / {selectedStation.totalQuestions}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Audio Upload MinIO</label>
                  <div className="mt-2 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${selectedStation.audioUploadProgress}%` }} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedStation.audioUploadProgress}% hoàn thành</p>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase text-slate-400">Tạp âm môi trường</label>
                  <p className="text-sm font-medium text-slate-800 mt-1">{selectedStation.noiseLevel}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedStation(null)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all"
            >
              Đóng chi tiết
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
