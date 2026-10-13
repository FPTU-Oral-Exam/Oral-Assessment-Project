/**
 * Services Index - Re-export tất cả service modules
 *
 * Sử dụng:
 * import { authService } from '@/services';
 * import { examinerService } from '@/services';
 * import { teacherService } from '@/services';
 * import { adminService } from '@/services';
 */

// Re-export từng service module
export { authService } from './auth.service';
export { adminService } from './admin.service';
export { examinerService } from './examiner.service';
export { teacherService } from './teacher.service';
export { academyService } from './academy.service';

// Re-export types thường dùng
export type {
  LoginRequest,
  LoginResponse,
  LogoutResponse,
} from './auth.service';

export type {
  AdminUser,
  PlatformConfig,
} from './admin.service';

export type {
  CreateSemesterRequest,
  AddCourseRequest,
  CourseDetail,
  MasterCourse,
  CreateExamRequest,
  CreateBatchRequest,
  GenerateVariantsResponse,
  CandidateImportResult,
  CandidatePoolResponse,
  CourseCandidate,
  SlotResultsResponse,
  SlotStudentResult,
  BatchStudentsResponse,
  ReEvaluationRequest,
} from './examiner.service';

export type {
  TeacherScheduleSlot,
  ProctorRoomDetail,
  CandidateRosterItem,
  GradingSessionDetail,
  ResultDetail,
  AttemptItemDetail,
  ScoreOverrideRequest,
  RegradeTranscriptRequest,
  ReEvaluationItem,
  CourseWorkspace,
  Rubric,
  RubricCriterion,
  CreateRubricRequest,
  UpdateRubricRequest,
  CreateOutcomeRequest,
  UpdateOutcomeRequest,
  CreateTopicRequest,
  UpdateTopicRequest,
  RagSearchResponse,
  ExamBlueprintRequest,
  SemesterGroup,
  AssignedCourse,
} from './teacher.service';

export type {
  QuestionFilterParams,
  CreateQuestionPayload,
  CreateMatrixPayload,
} from './academy.service';
