import React from 'react';
import ReactDOM from 'react-dom/client';
import { installProductionConsoleGate } from './services/LoggerService';
import './index.css';
import App from './App';

installProductionConsoleGate();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
