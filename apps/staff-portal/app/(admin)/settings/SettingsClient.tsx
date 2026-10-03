"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Key,
  Globe,
  Info,
  Copy,
  Check,
  Save,
} from "lucide-react";

interface PlatformConfig {
  ai_provider: string;
  ai_config_source?: "env" | "admin";
  llm_model: string;
  embedding_model: string;
  stt_model: string;
  google_login_enabled: boolean;
  google_client_id: string;
  public_origin: string;
  gemini_key_configured: boolean;
  google_secret_configured: boolean;
  google_redirect_uri: string;
}

type TabId = "ai" | "google" | "network";

const STT_MODELS = ["tiny", "base", "small", "medium", "large-v3", "turbo"] as const;

interface SettingsClientProps {
  initialConfig?: PlatformConfig;
}

export function SettingsClient({ initialConfig }: SettingsClientProps) {
  const [config, setConfig] = useState<PlatformConfig | null>(initialConfig || null);
  const [loading, setLoading] = useState(!initialConfig);
  const [activeTab, setActiveTab] = useState<TabId>("ai");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  // Secret fields
  const [geminiKey, setGeminiKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [clearGeminiKey, setClearGeminiKey] = useState(false);

  const [googleSecret, setGoogleSecret] = useState("");
  const [showGoogleSecret, setShowGoogleSecret] = useState(false);
  const [clearGoogleSecret, setClearGoogleSecret] = useState(false);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api<PlatformConfig>("/admin/settings/platform");
      setConfig(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi khi tải cấu hình";
      toast.error("Không thể tải cấu hình", { description: message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialConfig) {
      fetchConfig();
    }
  }, [initialConfig, fetchConfig]);

  const handleUpdate = useCallback(
    <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => {
      setConfig((prev) => (prev ? { ...prev, [key]: value } : prev));
      setSaved(false);
    },
    []
  );

  const handleCopyUri = () => {
    if (!config?.google_redirect_uri) return;
    navigator.clipboard.writeText(config.google_redirect_uri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
    toast.success("Đã sao chép Redirect URI vào clipboard");
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;
    setIsSaving(true);
    setSaved(false);

    try {
      // Exclude read-only metadata fields from payload
      const {
        gemini_key_configured: _,
        google_secret_configured: __,
        google_redirect_uri: ___,
        ai_config_source: ____,
        ...values
      } = config;

      const payload = {
        ...values,
        gemini_api_key: geminiKey.trim() || null,
        google_client_secret: googleSecret.trim() || null,
        clear_gemini_key: clearGeminiKey,
        clear_google_secret: clearGoogleSecret,
      };

      const updated = await api<PlatformConfig>("/admin/settings/platform", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setConfig(updated);
      setSaved(true);
      setGeminiKey("");
      setGoogleSecret("");
      setClearGeminiKey(false);
      setClearGoogleSecret(false);
      toast.success("Đã lưu cấu hình hệ thống thành công");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi không xác định";
      toast.error("Không thể lưu cấu hình", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: typeof Sparkles }[] = [
    { id: "ai", label: "AI & Mô hình", icon: Sparkles },
    { id: "google", label: "Google OAuth", icon: Key },
    { id: "network", label: "Cấu hình Mạng", icon: Globe },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <div className="text-slate-500 font-medium text-sm">Đang tải cấu hình hệ thống...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-8">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-red-900">Không thể tải dữ liệu cấu hình hệ thống</h3>
        <p className="text-xs text-red-600 mt-1">Vui lòng kiểm tra lại kết nối đến máy chủ backend.</p>
        <button
          onClick={fetchConfig}
          className="mt-4 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const isEnvSource = config.ai_config_source === "env";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cấu hình hệ thống</h1>
        </div>

        <button
          type="button"
          onClick={fetchConfig}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Tải lại
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* TAB 1: AI & PIPELINE */}
        {activeTab === "ai" && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cấu hình AI Engine & Pipeline Chấm điểm</h2>
            </div>

            {isEnvSource && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <strong>Thông báo môi trường:</strong> Server đang đặt <code className="bg-amber-100 font-mono px-1">AI_CONFIG_SOURCE=env</code>. Các tham số AI hiện tại đang được ưu tiên đọc từ file <code className="bg-amber-100 font-mono px-1">.env</code>.
                </div>
              </div>
            )}

            {/* AI Provider */}
            <div className="space-y-2">
              <label htmlFor="ai_provider" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Nhà cung cấp AI (Provider) <span className="text-red-500">*</span>
              </label>
              <select
                id="ai_provider"
                value={config.ai_provider}
                onChange={(e) => handleUpdate("ai_provider", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="demo">Demo — không gọi AI chấm điểm (Thử nghiệm quy trình)</option>
                <option value="gemini">Google Gemini — Cloud LLM & Multimodal</option>
                <option value="local">Ollama local — Máy chủ AI cục bộ (Qwen / Llama)</option>
              </select>
            </div>

            {config.ai_provider === "demo" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
                ⚠️ <strong>Chế độ Demo:</strong> Không gọi AI chấm điểm, kể cả khi đã nhập API key. Để chấm điểm thật, chọn <strong>Google Gemini</strong> hoặc <strong>Ollama local</strong> và lưu cấu hình.
              </div>
            )}

            {/* Gemini API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="gemini_key" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Gemini API Key
                </label>
                {config.gemini_key_configured ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ✓ Đã cấu hình Key
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">Chưa cấu hình</span>
                )}
              </div>
              <div className="relative">
                <input
                  id="gemini_key"
                  type={showGeminiKey ? "text" : "password"}
                  autoComplete="new-password"
                  value={geminiKey}
                  disabled={clearGeminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder={
                    config.gemini_key_configured
                      ? "•••••••••••••••••••••••••••••••• (Đã lưu — để trống nếu không đổi)"
                      : "Nhập Gemini API Key (AIzaSy...)"
                  }
                  maxLength={500}
                  className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {config.gemini_key_configured && (
                <label className="flex items-center gap-2 text-xs text-rose-600 font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={clearGeminiKey}
                    onChange={(e) => setClearGeminiKey(e.target.checked)}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  Xóa Gemini API key đã lưu trong hệ thống
                </label>
              )}
            </div>

            {/* LLM & Embedding Models */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="llm_model" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Model LLM chấm điểm <span className="text-red-500">*</span>
                </label>
                <input
                  id="llm_model"
                  type="text"
                  required
                  value={config.llm_model}
                  onChange={(e) => handleUpdate("llm_model", e.target.value)}
                  placeholder="gemini-2.5-flash"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {["gemini-2.5-flash", "gemini-1.5-pro", "qwen3:8b"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleUpdate("llm_model", m)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="embedding_model" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Model Embedding (768 chiều) <span className="text-red-500">*</span>
                </label>
                <input
                  id="embedding_model"
                  type="text"
                  required
                  value={config.embedding_model}
                  onChange={(e) => handleUpdate("embedding_model", e.target.value)}
                  placeholder="gemini-embedding-001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {["gemini-embedding-001", "nomic-embed-text"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleUpdate("embedding_model", m)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* STT Model */}
            <div className="space-y-2">
              <label htmlFor="stt_model" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Mô hình Whisper STT trên Server <span className="text-red-500">*</span>
              </label>
              <select
                id="stt_model"
                value={config.stt_model}
                onChange={(e) => handleUpdate("stt_model", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {STT_MODELS.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* TAB 2: GOOGLE OAUTH */}
        {activeTab === "google" && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Đăng nhập Google OAuth 2.0</h2>
            </div>

            {/* Enable Google Login */}
            <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={config.google_login_enabled}
                onChange={(e) => handleUpdate("google_login_enabled", e.target.checked)}
                className="rounded border-slate-300 text-blue-600 h-5 w-5 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <span className="text-sm font-bold text-slate-800 block">Cho phép đăng nhập bằng Google</span>
              </div>
            </label>

            {/* Google Client ID */}
            <div className="space-y-2">
              <label htmlFor="google_client_id" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Google OAuth Client ID
              </label>
              <input
                id="google_client_id"
                type="text"
                value={config.google_client_id}
                onChange={(e) => handleUpdate("google_client_id", e.target.value)}
                placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                autoComplete="off"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Google Client Secret */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="google_secret" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Google OAuth Client Secret
                </label>
                {config.google_secret_configured ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ✓ Đã lưu Secret
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">Chưa cấu hình</span>
                )}
              </div>
              <div className="relative">
                <input
                  id="google_secret"
                  type={showGoogleSecret ? "text" : "password"}
                  autoComplete="new-password"
                  value={googleSecret}
                  disabled={clearGoogleSecret}
                  onChange={(e) => setGoogleSecret(e.target.value)}
                  placeholder={
                    config.google_secret_configured
                      ? "•••••••••••••••••••••••••••••••• (Đã lưu — để trống nếu không đổi)"
                      : "Nhập Client Secret (GOCSPX-...)"
                  }
                  maxLength={500}
                  className="w-full pl-3.5 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowGoogleSecret(!showGoogleSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showGoogleSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {config.google_secret_configured && (
                <label className="flex items-center gap-2 text-xs text-rose-600 font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={clearGoogleSecret}
                    onChange={(e) => setClearGoogleSecret(e.target.checked)}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  Xóa Google Client Secret đã lưu trong hệ thống
                </label>
              )}
            </div>

            {/* Redirect URI Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Authorized Redirect URI (Google Console):</span>
                <button
                  type="button"
                  onClick={handleCopyUri}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
                >
                  {copiedUri ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUri ? "Đã sao chép" : "Sao chép"}
                </button>
              </div>
              <code className="text-xs font-mono bg-slate-900 text-slate-100 p-2.5 rounded-lg block break-all select-all">
                {config.google_redirect_uri}
              </code>
            </div>
          </div>
        )}

        {/* TAB 3: NETWORK & DOMAIN */}
        {activeTab === "network" && (
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Cấu hình Tên miền & Mạng</h2>
            </div>

            <div className="space-y-2">
              <label htmlFor="public_origin" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Domain gốc (Public Origin) <span className="text-red-500">*</span>
              </label>
              <input
                id="public_origin"
                type="url"
                required
                value={config.public_origin}
                onChange={(e) => handleUpdate("public_origin", e.target.value)}
                placeholder="http://localhost:3000 hoặc https://oral.example.edu"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {saved && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                ✓ Đã lưu cấu hình thành công
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Lưu cấu hình</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
