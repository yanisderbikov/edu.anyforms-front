import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { isLoggedIn, isOnboardingDone } from './auth';
import Login from './components/Login/Login';
import Onboarding from './components/Onboarding/Onboarding';
import Home from './components/Home/Home';
import ModulePage from './components/Module/ModulePage';

/* Защита роутов: не залогинен → /login, залогинен без онбординга → /onboarding */
const RequireAuth = ({ children }) => {
  const location = useLocation();
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isOnboardingDone() && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

const App = () => (
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
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
