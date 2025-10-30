import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const timeout = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 60000;

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout,
});

let adminToken = null;

export const setAdminToken = (token) => {
  adminToken = token || null;
};

apiClient.interceptors.request.use((config) => {
  if (adminToken) {
    // ensure headers object exists before assigning
    // eslint-disable-next-line no-param-reassign
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      // eslint-disable-next-line no-param-reassign
      config.headers.Authorization = `Bearer ${adminToken}`;
    }
  }
  return config;
});

export default apiClient;
