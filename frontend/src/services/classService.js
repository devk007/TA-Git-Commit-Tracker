import apiClient from './apiClient.js';

export const listClasses = async () => {
  const { data } = await apiClient.get('/classes');
  return data;
};

export const createClass = async (payload) => {
  const { data } = await apiClient.post('/classes', payload);
  return data;
};

export const fetchClassById = async (classId, { includeStudents = false } = {}) => {
  const params = includeStudents ? { includeStudents: true } : undefined;
  const { data } = await apiClient.get(`/classes/${classId}`, { params });
  return data;
};

export const uploadRoster = async (classId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post(`/classes/${classId}/students/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const addStudent = async (classId, payload) => {
  const { data } = await apiClient.post(`/classes/${classId}/students`, payload);
  return data;
};

export const updateStudent = async (classId, studentId, payload) => {
  const { data } = await apiClient.put(`/classes/${classId}/students/${studentId}`, payload);
  return data;
};

export const deleteStudent = async (classId, studentId) => {
  const { data } = await apiClient.delete(`/classes/${classId}/students/${studentId}`);
  return data;
};

export const triggerSync = async (classId, payload) => {
  const { data } = await apiClient.post(`/classes/${classId}/sync`, payload);
  return data;
};

export const fetchDashboard = async (classId, params) => {
  const { data } = await apiClient.get(`/classes/${classId}/dashboard`, { params });
  return data;
};

export const downloadRoster = async (classId) => {
  const response = await apiClient.get(`/classes/${classId}/students/export`, {
    responseType: 'blob',
  });
  return response;
};

export const downloadDashboard = async (classId, params) => {
  const response = await apiClient.get(`/classes/${classId}/dashboard/export`, {
    params,
    responseType: 'blob',
  });
  return response;
};
