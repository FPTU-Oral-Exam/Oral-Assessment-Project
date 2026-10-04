export interface Semester {
  id: string;
  name: string;
  year: number;
  term: "SPRING" | "SUMMER" | "FALL";
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  start_date: number;
  end_date: number;
  course_count: number;
  created_at: number;
}

export interface Section {
  id: string;
  course_id: string;
  semester_id: string;
  name: string;
  code: string;
  teacher_id: string;
  teacher?: { id: string; name: string } | null;
  day_of_week: number;
  time_slot: "MORNING" | "AFTERNOON" | "EVENING";
  max_students: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  student_count: number;
}

export interface StudentEnrollment {
  student_id: string;
  username: string;
  name: string;
  section_id: string;
  status: "PENDING" | "ACTIVE" | "DROPPED";
}
