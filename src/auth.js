/**
 * Авторизация через бэкенд: код на почту → JWT (живёт месяц).
 * У клиентов вход с нового устройства гасит старые токены (решает бэкенд).
 */
const AUTH_KEY = 'edu_af_auth';
const ONBOARDING_KEY = 'edu_af_onboarding_done';

const handle = async (res) => {
  if (res.ok) return res.json();
  let message = `Ошибка ${res.status}`;
  try {
    const body = await res.json();
    if (body.message) message = body.message;
  } catch {
    /* тело не JSON */
  }
  throw new Error(message);
};

export const requestCode = (email) =>
  fetch('/api/public/auth/request-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  }).then(handle);

export const verifyCode = async (email, code) => {
  const result = await fetch('/api/public/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  }).then(handle);
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({ email: result.email, role: result.role, token: result.token })
  );
  return result;
};

export const getAuth = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
};

export const getToken = () => getAuth()?.token || null;

export const isAdmin = () => getAuth()?.role === 'ADMIN';

export const isLoggedIn = () => Boolean(getToken());

export const logout = () => {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
};

/** Токен протух/отозван (401 с бэка) — чистим сессию и уводим на логин */
export const dropSession = () => {
  logout();
  window.location.assign('/login');
};

export const isOnboardingDone = () => localStorage.getItem(ONBOARDING_KEY) === '1';

export const finishOnboarding = () => localStorage.setItem(ONBOARDING_KEY, '1');
