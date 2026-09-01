import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Note: intentionally not wrapping in <StrictMode> - its dev-mode double-invoking
// of render functions would inflate the render counts this tool reports.
createRoot(document.getElementById('root')).render(<App />)
