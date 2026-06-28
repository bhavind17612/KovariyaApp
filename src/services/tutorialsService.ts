import { api } from '../api';
import { ENDPOINTS } from '../api/endpoints';
import type { ApiTutorial, Tutorial } from '../types/tutorial';

/** Fallback glyph when a tutorial has no icon mapped. */
const DEFAULT_ICON = 'play-circle-outline';

function mapTutorial(raw: ApiTutorial): Tutorial {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    duration: raw.duration,
    url: raw.url,
    icon: raw.icon || DEFAULT_ICON,
  };
}

class TutorialsService {
  /** Parent-facing tutorial videos. */
  async getParentTutorials(): Promise<Tutorial[]> {
    const res = await api.get<ApiTutorial[]>(ENDPOINTS.TUTORIALS.PARENT);
    const list = Array.isArray(res.data.data) ? res.data.data : [];
    return list.map(mapTutorial);
  }
}

export const tutorialsService = new TutorialsService();
