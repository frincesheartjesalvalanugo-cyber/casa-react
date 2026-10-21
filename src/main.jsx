import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.bundle.min.js"
import './index.css'
import App from './App.jsx'
import { registerSW } from './registerServiceWorker'

registerSW();

const style = document.createElement('style');
style.innerHTML = `
  html, body, #root {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
`;
document.head.appendChild(style);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)