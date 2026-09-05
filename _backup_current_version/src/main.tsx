import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { WorkProvider } from './context/WorkContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WorkProvider>
      <App />
    </WorkProvider>
  </React.StrictMode>,
)
