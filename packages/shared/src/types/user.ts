export type UserRole = "STUDENT" | "TEACHER" | "EXAMINER" | "SYSTEM_ADMIN";

export interface User {
  id: string;
  username: string;
  email?: string;
  name: string;
  role: UserRole;
  created_at?: number;
}

export interface Student extends User {
  role: "STUDENT";
  student_id?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at?: number;
  refresh_token?: string;
  roles: UserRole[];
}
