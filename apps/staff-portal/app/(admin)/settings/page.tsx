import { requireRole } from "@/lib/auth";
import { SettingsClient } from "./SettingsClient";

export const metadata = {
  title: "Cấu hình hệ thống | OralAI Staff Portal",
  description: "Quản trị thông số AI, Google OAuth và cài đặt mạng nền tảng",
};

export default async function SettingsPage() {
  await requireRole(["SYSTEM_ADMIN"]);

  return <SettingsClient />;
}
