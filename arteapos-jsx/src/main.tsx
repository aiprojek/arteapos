import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// The html2canvas, JsBarcode, and Html5Qrcode libraries are now managed via npm 
// and will be bundled by Vite. We can still declare them globally for components
// that use them via script-tag logic, or import them directly in those components.
import 'html2canvas';
import 'jsbarcode';
import 'html5-qrcode';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker for PWA offline capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}
