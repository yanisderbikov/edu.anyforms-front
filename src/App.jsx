import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn } from './auth';
import { useSeo } from './shared/seo';
import { fetchProgress, getCachedProgress } from './api/progressApi';
import Login from './components/Login/Login';
import Onboarding from './components/Onboarding/Onboarding';
import Home from './components/Home/Home';
import ModulePage from './components/Module/ModulePage';
import AdminCoursePage from './components/Admin/AdminCoursePage';
import AdminModulePage from './components/Admin/AdminModulePage';
import AdminOnboardingPage from './components/Admin/AdminOnboardingPage';

/* Защита роутов: не залогинен → /login; онбординг не пройден (статус в БД) → /onboarding */
const RequireAuth = ({ children }) => {
  const location = useLocation();
  const [progress, setProgress] = useState(getCachedProgress);

  useEffect(() => {
    if (!isLoggedIn()) return;
    fetchProgress()
      .then(setProgress)
      // Прогресс не отвечает (сеть, бэк лежит) — пускаем в курс, а не запираем
      // в онбординге: иначе «Поехали» вернёт на онбординг по кругу
      .catch((e) => {
        console.error('Не удалось получить прогресс:', e);
        setProgress({ onboardingDone: true, completedLessonIds: [] });
      });
    // Кеш прогресса живёт в progressApi, так что лишних запросов не будет
  }, [location.pathname]);

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  // React переиспользует этот гвард между роутами (у /onboarding и / он в одной
  // точке дерева), поэтому его state отстаёт: сразу после «Поехали» в нём ещё
  // onboardingDone=false — и человека тут же кидало обратно в онбординг.
  // Кеш прогресса обновляется синхронно в момент записи статуса — решаем по нему.
  const actual = getCachedProgress() || progress;

  if (!actual) {
    return null; // короткий момент загрузки статуса из БД
  }
  if (!actual.onboardingDone && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

const App = () => {
  // Title и мета-теги под текущий маршрут (src/shared/pageSeo.js)
  useSeo();

  return (
    <Routes>
      <Route path="/login" element={isLoggedIn() ? <Navigate to="/" replace /> : <Login />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/module/:moduleId"
        element={
          <RequireAuth>
            <ModulePage />
          </RequireAuth>
        }
      />
      {/* Админка: только роль ADMIN (проверяется в AdminLayout и на бэке) */}
      <Route path="/admin" element={<Navigate to="/admin/course" replace />} />
      <Route path="/admin/course" element={<AdminCoursePage />} />
      <Route path="/admin/course/:moduleId" element={<AdminModulePage />} />
      <Route path="/admin/onboarding" element={<AdminOnboardingPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
