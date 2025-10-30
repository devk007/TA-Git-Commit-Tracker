import apiClient from './apiClient.js';

export const verifyAdminToken = async (token) => {
  const { data } = await apiClient.get('/auth/status', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};
