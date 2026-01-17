import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'; // Initialize i18n
import { migrateLocalStorageKeys } from './utils/migration';

// Run one-time migration from old key prefix (aiModelDBPro_) to new (aiModelDB_)
migrateLocalStorageKeys();

// Create and mount the React application
const rootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(rootElement);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

console.log('[AI Model DB] Application mounted successfully');

