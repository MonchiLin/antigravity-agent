import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@fontsource/inter';
import '@fontsource/noto-sans-sc';
import './i18n'; // Initialize i18n

ReactDOM.createRoot(document.getElementById('app')).render(
    <App />
);
