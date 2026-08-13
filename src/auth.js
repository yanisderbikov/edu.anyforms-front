/**
 * Временная «авторизация» без бэкенда: состояние храним в localStorage.
 * Когда появится бэкенд — заменить на реальные запросы (email → код → JWT).
 */
const AUTH_KEY = 'edu_af_auth';
const ONBOARDING_KEY = 'edu_af_onboarding_done';

export const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
};

export const isLoggedIn = () => Boolean(getAuth()?.email);

export const login = (email) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ email, loggedInAt: Date.now() }));
};

export const logout = () => {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
};

export const isOnboardingDone = () => localStorage.getItem(ONBOARDING_KEY) === '1';

export const finishOnboarding = () => localStorage.setItem(ONBOARDING_KEY, '1');
