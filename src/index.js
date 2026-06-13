import React from 'react';
import ReactDOM from 'react-dom/client';
// Bundle the UI font (Inter) so it loads for everyone, not just machines that
// happen to have it installed. Weights: regular/medium/semibold/bold.
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
// Design tokens must load before any other stylesheet so var(--…) resolve.
import './styles/tokens.css';
import './styles/index.css';
// Shared design-system primitives (cc-* classes), available app-wide.
import './components/ui/ui.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
