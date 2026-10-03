import { requireRole } from "@/lib/auth";
import { api } from "@/lib/api";
import { SettingsClient } from "./SettingsClient";

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

export default async function SettingsPage() {
  await requireRole(["SYSTEM_ADMIN"]);

  const config = await api<PlatformConfig>("/admin/settings/platform");

  return <SettingsClient initialConfig={config} />;
}
