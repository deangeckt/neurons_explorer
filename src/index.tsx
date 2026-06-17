import React from 'react';
import ReactDOM from 'react-dom/client';
import ExplorerPage from './explorer/ExplorerPage';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
    <React.StrictMode>
        <ExplorerPage />
    </React.StrictMode>,
);
