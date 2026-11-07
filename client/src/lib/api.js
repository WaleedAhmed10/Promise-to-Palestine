async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'request_failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  campaign: () => request('/campaign'),
  wall: () => request('/wall?limit=12'),
  stories: () => request('/stories'),
  story: (slug) => request(`/stories/${encodeURIComponent(slug)}`),
  pledge: (body) => request('/pledges', { method: 'POST', body }),
  subscribe: (body) => request('/newsletter', { method: 'POST', body }),
  admin: {
    login: (body) => request('/admin/login', { method: 'POST', body }),
    summary: (t) => request('/admin/summary', { token: t }),
    pledges: (t, status) => request(`/admin/pledges${status ? `?status=${status}` : ''}`, { token: t }),
    patchPledge: (t, id, body) => request(`/admin/pledges/${id}`, { method: 'PATCH', body, token: t }),
    stories: (t) => request('/admin/stories', { token: t }),
    createStory: (t, body) => request('/admin/stories', { method: 'POST', body, token: t }),
    updateStory: (t, id, body) => request(`/admin/stories/${id}`, { method: 'PUT', body, token: t }),
    deleteStory: (t, id) => request(`/admin/stories/${id}`, { method: 'DELETE', token: t }),
    campaign: (t, body) => request('/admin/campaign', { method: 'PATCH', body, token: t }),
  },
};
