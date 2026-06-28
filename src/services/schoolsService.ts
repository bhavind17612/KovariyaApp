import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';

/** A selectable school with its backend id. */
export interface School {
  id: string;
  name: string;
}

class SchoolsService {
  /** All schools available for the child form dropdown. */
  async getSchools(): Promise<School[]> {
    const res = await api.get<School[]>(ENDPOINTS.SCHOOLS.LIST);
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    return list.filter((s) => s?.id && s?.name);
  }
}

export const schoolsService = new SchoolsService();
