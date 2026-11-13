import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Clean up any corrupted localStorage values (e.g. string "undefined" or "null") before React mounts
try {
  ['systech_user', 'systech_token', 'systech_cart', 'systech_theme'].forEach(key => {
    const val = localStorage.getItem(key);
    if (val === 'undefined' || val === 'null') {
      localStorage.removeItem(key);
    }
  });
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
