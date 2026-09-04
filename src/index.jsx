import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/base.css';

/* Уведомления справа сверху — в палитре проекта (см. base.css) */
const toastOptions = {
  duration: 2600,
  style: {
    background: 'var(--panel)',
    color: 'var(--text)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '14px',
    padding: '13px 16px',
    fontFamily: 'var(--font)',
    fontSize: '16px',
    fontWeight: 500,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
  },
  success: { iconTheme: { primary: 'var(--accent)', secondary: '#ffffff' } },
  error: { iconTheme: { primary: 'var(--danger)', secondary: '#ffffff' } },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" toastOptions={toastOptions} />
    </BrowserRouter>
  </React.StrictMode>
);
