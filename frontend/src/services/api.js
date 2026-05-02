import axios from 'axios';
import { auth } from './firebase';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({ baseURL: API_URL });

// Attach Firebase ID token to every request automatically
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize error responses
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error.response?.data?.error || error)
);

export const askQuestion = (question, language = 'English') =>
  apiClient.post('/ai/chat', { question, language });

export const checkEligibility = (age, state) =>
  apiClient.post('/ai/eligibility', { age, state });

export const getVotingGuide = (age, state, isFirstTime) =>
  apiClient.post('/journey/guide', { age, state, isFirstTime });

export const getMyProfile = () =>
  apiClient.get('/auth/me');

export default apiClient;
