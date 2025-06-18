import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import { BorrowProvider } from './context/BorrowContext';
import { ReadingProvider } from './context/ReadingContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <BorrowProvider>
        <ReadingProvider>
          <App />
        </ReadingProvider>
      </BorrowProvider>
    </AuthProvider>
  </BrowserRouter>
);