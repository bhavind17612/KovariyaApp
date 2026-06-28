import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type { Child } from '../types';

/**
 * Raw row shape returned by GET /api/v1/students.
 * Only the fields the mobile app actually needs are typed here;
 * the backend may return more columns (serial_number, state_code, etc.).
 */
interface StudentApiRow {
  uuid: string;
  full_name: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  grade: string | null;
  class_name: string | null;
  section: string | null;
  school_name: string | null;
  admission_no: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

/** Compute age from an ISO date-of-birth string. Returns 0 when unavailable. */
function ageFromDob(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(age, 0);
}

/**
 * Fields the app can update on a student. All optional — only the keys present
 * are sent in the PATCH body. Keys are snake_case to match the backend.
 */
export interface UpdateStudentPayload {
  full_name?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  class_name?: string;
  section?: string;
  school_name?: string;
  is_active?: boolean;
}

/**
 * Fields required to create a new student. `school_id` is the backend school
 * lookup id (see schoolsService). Field names mirror the onboarding create flow.
 */
export interface CreateStudentPayload {
  full_name: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  grade?: string;
  section?: string;
  school_id: string;
  is_active?: boolean;
}

/** Maps a backend StudentApiRow to the app's Child type. */
function toChild(row: StudentApiRow): Child {
  return {
    id: row.uuid,
    name: row.full_name,
    age: ageFromDob(row.date_of_birth),
    avatar: row.avatar_url ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
    gender: row.gender === 'male' || row.gender === 'female' ? row.gender : undefined,
    grade: row.class_name ?? row.grade ?? undefined,
    section: row.section ?? undefined,
    schoolName: row.school_name ?? undefined,
    admissionNumber: row.admission_no ?? undefined,
    status: row.is_active ? 'active' : 'inactive',
  };
}

class StudentsService {
  /**
   * Fetches the logged-in parent's children.
   * The Axios interceptor injects the Bearer token automatically.
   */
  async getChildren(): Promise<Child[]> {
    const response = await api.get<StudentApiRow[]>(ENDPOINTS.STUDENTS.LIST);
    const list = Array.isArray(response.data.data) ? response.data.data : [];
    return list.map(toChild);
  }

  /** Creates a new child for the logged-in parent and returns the created Child. */
  async createStudent(payload: CreateStudentPayload): Promise<Child> {
    const response = await api.post<StudentApiRow>(ENDPOINTS.STUDENTS.LIST, payload);
    return toChild(response.data.data);
  }

  /** Fetches the full detail for a single child by UUID. */
  async getStudent(uuid: string): Promise<Child> {
    const response = await api.get<StudentApiRow>(ENDPOINTS.STUDENTS.DETAIL(uuid));
    return toChild(response.data.data);
  }

  /** Updates a child's details and returns the refreshed Child. */
  async updateStudent(uuid: string, payload: UpdateStudentPayload): Promise<Child> {
    const response = await api.patch<StudentApiRow>(ENDPOINTS.STUDENTS.UPDATE(uuid), payload);
    return toChild(response.data.data);
  }
}

export const studentsService = new StudentsService();
