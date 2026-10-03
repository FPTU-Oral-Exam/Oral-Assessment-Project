"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  initialConfig: PlatformConfig;
}

export function SettingsClient({ initialConfig }: SettingsClientProps) {
  const [config, setConfig] = useState<PlatformConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<TabId>("ai");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Secret fields
  const [geminiKey, setGeminiKey] = useState("");
  const [googleSecret, setGoogleSecret] = useState("");
  const [clearGeminiKey, setClearGeminiKey] = useState(false);
  const [clearGoogleSecret, setClearGoogleSecret] = useState(false);

  const handleUpdate = useCallback(
    <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setSaved(false);
    },
    []
  );

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);

    try {
      // Exclude read-only fields from payload
      const {
        gemini_key_configured: _,
        google_secret_configured: __,
        google_redirect_uri: ___,
        ai_config_source: ____,
        ...values
      } = config;

      const payload = {
        ...values,
        gemini_api_key: geminiKey || null,
        google_client_secret: googleSecret || null,
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
      toast.success("Đã lưu cấu hình hệ thống");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Lỗi không xác định";
      toast.error("Không thể lưu cấu hình", { description: message });
    } finally {
      setIsSaving(false);
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "ai", label: "AI & Mô hình" },
    { id: "google", label: "Google OAuth" },
    { id: "network", label: "Mạng" },
  ];

  const isEnvSource = config.ai_config_source === "env";

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Cấu hình hệ thống</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {activeTab === "ai" && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Cấu hình AI Engine</h2>

            {isEnvSource ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-4">
                  Cấu hình AI được đọc từ file <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs">.env</code> của server. Desktop chỉ gửi transcript và minh chứng; API key không được đưa vào bộ cài.
                </p>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Nhà cung cấp</dt>
                    <dd className="font-medium text-slate-800">
                      {config.ai_provider === "local" ? "Ollama local" : config.ai_provider}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Model chấm điểm</dt>
                    <dd className="font-medium text-slate-800">{config.llm_model}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Model embedding</dt>
                    <dd className="font-medium text-slate-800">{config.embedding_model}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Gemini API Key</dt>
                    <dd className="font-medium text-slate-800">
                      {config.gemini_key_configured ? "Đã cấu hình" : "Chưa cấu hình"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <>
                {/* AI Provider */}
                <div className="space-y-2">
                  <label htmlFor="ai_provider" className="block text-sm font-medium text-slate-700">
                    Nhà cung cấp AI
                  </label>
                  <select
                    id="ai_provider"
                    value={config.ai_provider}
                    onChange={(e) => handleUpdate("ai_provider", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="demo">Demo — không chấm điểm AI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="local">Ollama local trên server</option>
                  </select>
                </div>

                {config.ai_provider === "demo" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                    Demo không gọi AI chấm điểm, kể cả khi đã nhập API key. Để chấm điểm, chọn Google Gemini và lưu cấu hình.
                  </div>
                )}

                {/* Gemini API Key */}
                <div className="space-y-2">
                  <label htmlFor="gemini_key" className="block text-sm font-medium text-slate-700">
                    Gemini API Key
                  </label>
                  <input
                    id="gemini_key"
                    type="password"
                    autoComplete="new-password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder={
                      config.gemini_key_configured
                        ? "Đã cấu hình — bỏ trống để giữ nguyên"
                        : "Nhập API key"
                    }
                    maxLength={500}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={clearGeminiKey}
                      onChange={(e) => setClearGeminiKey(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Xóa Gemini API key đã lưu
                  </label>
                </div>

                {/* LLM Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="llm_model" className="block text-sm font-medium text-slate-700">
                      Model chấm điểm
                    </label>
                    <input
                      id="llm_model"
                      type="text"
                      required
                      value={config.llm_model}
                      onChange={(e) => handleUpdate("llm_model", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="embedding_model" className="block text-sm font-medium text-slate-700">
                      Model embedding
                    </label>
                    <input
                      id="embedding_model"
                      type="text"
                      required
                      value={config.embedding_model}
                      onChange={(e) => handleUpdate("embedding_model", e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* STT Model */}
                <div className="space-y-2">
                  <label htmlFor="stt_model" className="block text-sm font-medium text-slate-700">
                    Model Whisper trên server
                  </label>
                  <select
                    id="stt_model"
                    value={config.stt_model}
                    onChange={(e) => handleUpdate("stt_model", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {STT_MODELS.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-xs text-slate-500">
                  Thay đổi provider/model ảnh hưởng đề mới. Đề đã công bố giữ cấu hình cũ.
                </p>
              </>
            )}
          </div>
        )}

        {activeTab === "google" && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Đăng nhập Google</h2>

            {/* Enable Google Login */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.google_login_enabled}
                onChange={(e) => handleUpdate("google_login_enabled", e.target.checked)}
                className="rounded border-slate-300 text-blue-600 h-5 w-5 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700">
                Cho phép đăng nhập bằng Google
              </span>
            </label>

            {/* Public Origin */}
            <div className="space-y-2">
              <label htmlFor="public_origin" className="block text-sm font-medium text-slate-700">
                Domain gốc của ứng dụng
              </label>
              <input
                id="public_origin"
                type="url"
                required
                value={config.public_origin}
                onChange={(e) => handleUpdate("public_origin", e.target.value)}
                placeholder="https://oral.example.edu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Google Client ID */}
            <div className="space-y-2">
              <label htmlFor="google_client_id" className="block text-sm font-medium text-slate-700">
                Google OAuth Client ID
              </label>
              <input
                id="google_client_id"
                type="text"
                value={config.google_client_id}
                onChange={(e) => handleUpdate("google_client_id", e.target.value)}
                autoComplete="off"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Google Client Secret */}
            <div className="space-y-2">
              <label htmlFor="google_secret" className="block text-sm font-medium text-slate-700">
                Google OAuth Client Secret
              </label>
              <input
                id="google_secret"
                type="password"
                autoComplete="new-password"
                value={googleSecret}
                onChange={(e) => setGoogleSecret(e.target.value)}
                placeholder={
                  config.google_secret_configured
                    ? "Đã cấu hình — bỏ trống để giữ nguyên"
                    : "Nhập Client Secret"
                }
                maxLength={500}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={clearGoogleSecret}
                  onChange={(e) => setClearGoogleSecret(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Xóa Google Client Secret đã lưu
              </label>
            </div>

            {/* Redirect URI */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-2">Redirect URI cần cấu hình trong Google Cloud Console:</p>
              <code className="text-xs bg-slate-200 px-2 py-1 rounded break-all">
                {config.public_origin.replace(/\/$/, "")}/api/auth/google/callback
              </code>
            </div>

            <p className="text-xs text-slate-500">
              Chỉ xin thông tin đăng nhập cơ bản; không đọc hoặc gửi email.
            </p>
          </div>
        )}

        {activeTab === "network" && (
          <div className="p-6 space-y-6">
            <h2 className="text-lg font-semibold text-slate-800">Cấu hình Mạng</h2>

            <div className="space-y-2">
              <label htmlFor="public_origin_display" className="block text-sm font-medium text-slate-700">
                Domain gốc (Public Origin)
              </label>
              <input
                id="public_origin_display"
                type="url"
                required
                value={config.public_origin}
                onChange={(e) => handleUpdate("public_origin", e.target.value)}
                placeholder="https://oral.example.edu"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-slate-500">
                Domain này được sử dụng cho OAuth callback và các liên kết trong email.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-medium text-slate-700">Redirect URI</h3>
              <code className="text-xs bg-slate-200 px-2 py-1 rounded break-all">
                {config.public_origin.replace(/\/$/, "")}/api/auth/google/callback
              </code>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center justify-between">
          {saved && (
            <span className="text-sm text-green-600 font-medium">✓ Đã lưu cấu hình</span>
          )}
          {!saved && <span />}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </div>
    </div>
  );
}
