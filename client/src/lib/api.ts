const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export const api = {
  auth: {
    setupStatus: () => request<{ needsSetup: boolean }>('/auth/setup-status'),
    register: (data: { username: string; password: string; displayName: string }) =>
      request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data: { username: string; password: string }) =>
      request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    logout: () => request<any>('/auth/logout', { method: 'POST' }),
    me: () => request<any>('/auth/me'),
    users: () => request<any[]>('/auth/users'),
    updateUser: (id: string, data: any) =>
      request<any>(`/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  spaces: {
    list: () => request<any[]>('/spaces'),
    create: (data: { name: string; icon?: string }) =>
      request<any>('/spaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; icon?: string }) =>
      request<any>(`/spaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/spaces/${id}`, { method: 'DELETE' }),
  },

  projects: {
    list: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<any[]>(`/projects${query}`);
    },
    get: (id: string) => request<any>(`/projects/${id}`),
    create: (data: any) =>
      request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<any>(`/projects/${id}`, { method: 'DELETE' }),

    uploadPhotos: async (projectId: string, files: File[], photoType: string = 'general', caption: string = '') => {
      const formData = new FormData();
      files.forEach(f => formData.append('photos', f));
      formData.append('photoType', photoType);
      formData.append('caption', caption);

      const res = await fetch(`${BASE}/projects/${projectId}/photos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(body.error);
      }
      return res.json();
    },

    deletePhoto: (projectId: string, photoId: string) =>
      request<any>(`/projects/${projectId}/photos/${photoId}`, { method: 'DELETE' }),

    addComment: (projectId: string, text: string) =>
      request<any>(`/projects/${projectId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),

    activity: () => request<any[]>('/projects/activity/recent'),
  },

  designBoard: {
    list: (projectId: string) => request<any[]>(`/projects/${projectId}/design-board`),
    addLink: (projectId: string, data: { title: string; url: string; content?: string }) =>
      request<any>(`/projects/${projectId}/design-board/link`, { method: 'POST', body: JSON.stringify(data) }),
    addNote: (projectId: string, data: { title?: string; content: string }) =>
      request<any>(`/projects/${projectId}/design-board/note`, { method: 'POST', body: JSON.stringify(data) }),
    addPhoto: async (projectId: string, file: File, title?: string, content?: string) => {
      const formData = new FormData();
      formData.append('photo', file);
      if (title) formData.append('title', title);
      if (content) formData.append('content', content);

      const res = await fetch(`${BASE}/projects/${projectId}/design-board/photo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(body.error);
      }
      return res.json();
    },
    deleteItem: (projectId: string, itemId: string) =>
      request<any>(`/projects/${projectId}/design-board/${itemId}`, { method: 'DELETE' }),
    addComment: (projectId: string, itemId: string, text: string) =>
      request<any>(`/projects/${projectId}/design-board/${itemId}/comments`, {
        method: 'POST', body: JSON.stringify({ text }),
      }),
  },

  stats: () => request<any>('/stats'),
};
