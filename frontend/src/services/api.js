import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;

export const authService = {
  login:         (data)  => api.post('/auth/login', data).then(r => r.data),
  me:            ()      => api.get('/auth/me').then(r => r.data),
  updateProfile: (data)  => api.put('/auth/profile', data).then(r => r.data),
  updateColor:   (color) => api.put('/auth/profile/color', { color }).then(r => r.data),
};

export const partService = {
  list:   () => api.get('/parts').then(r => r.data),
  create: (data) => api.post('/parts', data).then(r => r.data),
  update: (id, data) => api.put(`/parts/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/parts/${id}`).then(r => r.data),
};

export const userService = {
  list:   () => api.get('/users').then(r => r.data),
  update: (id, data) => api.put(`/users/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/users/${id}`).then(r => r.data),
};

export const taskService = {
  list:         ()         => api.get('/tasks').then(r => r.data),
  get:          (id)       => api.get(`/tasks/${id}`).then(r => r.data),
  create:       (data)     => api.post('/tasks', data).then(r => r.data),
  update:       (id, data) => api.put(`/tasks/${id}`, data).then(r => r.data),
  remove:       (id)       => api.delete(`/tasks/${id}`).then(r => r.data),
  changeStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }).then(r => r.data),
  addComment:   (id, text)   => api.post(`/tasks/${id}/comments`, { text }).then(r => r.data),
  cobrar:       (id)         => api.post(`/tasks/${id}/cobrar`).then(r => r.data),
};

export const despesaService = {
  upload:    (formData)    => api.post('/despesas/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  listar:    (params)      => api.get('/despesas', { params }).then(r => r.data),
  historico: ()            => api.get('/despesas/historico').then(r => r.data),
  remover:   (id)          => api.delete(`/despesas/${id}`).then(r => r.data),
  removerLote: (ids)       => api.delete('/despesas/lote', { data: { ids } }).then(r => r.data),
};

export const notifService = {
  list:       () => api.get('/notifications').then(r => r.data),
  markRead:   (id) => api.patch(`/notifications/${id}`).then(r => r.data),
  markAllRead: () => api.patch('/notifications').then(r => r.data),
};
