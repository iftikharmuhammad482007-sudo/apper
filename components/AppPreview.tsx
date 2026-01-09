
import React, { useEffect, useRef, useState } from 'react';

interface AppPreviewProps {
  code: string;
  minimal?: boolean;
}

const AppPreview: React.FC<AppPreviewProps> = ({ code, minimal = false }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !iframeRef.current) {
      setError(null);
      return;
    }

    const processedCode = code
      .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '')
      .replace(/export\s+default\s+/g, 'const GeneratedApp = ')
      .replace(/export\s+/g, '');

    const template = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              min-height: 100vh; 
              background: #ffffff; 
              color: #1a1a1a; 
              font-family: 'Inter', sans-serif; 
            }
            #preview-root { min-height: 100vh; display: flex; flex-direction: column; }
            ::-webkit-scrollbar { width: 0px; background: transparent; }
            
            #error-overlay {
              position: fixed;
              inset: 0;
              background: #fff;
              padding: 2rem;
              color: #ef4444;
              z-index: 9999;
              display: none;
              overflow: auto;
            }
          </style>
        </head>
        <body>
          <div id="preview-root"></div>
          <div id="error-overlay"></div>
          
          <script type="text/babel">
            const { useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef, useImperativeHandle, useLayoutEffect, useDebugValue } = React;
            window.useState = useState;
            window.useEffect = useEffect;
            window.useContext = useContext;
            window.useReducer = useReducer;
            window.useCallback = useCallback;
            window.useMemo = useMemo;
            window.useRef = useRef;
            window.useImperativeHandle = useImperativeHandle;
            window.useLayoutEffect = useLayoutEffect;
            window.useDebugValue = useDebugValue;

            const showError = (msg) => {
              const overlay = document.getElementById('error-overlay');
              overlay.style.display = 'block';
              overlay.innerHTML = '<h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Runtime Error</h1><pre style="white-space: pre-wrap; font-family: monospace;">' + msg + '</pre>';
            };

            window.onerror = (message, source, lineno, colno, error) => {
              showError(message + (error ? '\\n' + error.stack : ''));
              return true;
            };

            try {
              ${processedCode}

              const AppWrapper = () => {
                const [mountError, setMountError] = React.useState(null);

                if (mountError) {
                  return (
                    <div style={{ padding: '2rem', color: '#ef4444', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.5rem' }}>
                      <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Mount Error</h1>
                      <pre>{mountError}</pre>
                    </div>
                  );
                }

                try {
                  const TargetComponent = window.GeneratedApp || (typeof GeneratedApp !== 'undefined' ? GeneratedApp : null);
                  if (!TargetComponent) {
                    return (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Component Not Found</h1>
                        <p>The AI failed to export a component named <b>GeneratedApp</b>.</p>
                      </div>
                    );
                  }
                  return <TargetComponent />;
                } catch (err) {
                  setMountError(err.toString());
                  return null;
                }
              };

              const root = ReactDOM.createRoot(document.getElementById('preview-root'));
              root.render(<AppWrapper />);
            } catch (err) {
              showError(err.toString());
            }
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([template], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;

    return () => URL.revokeObjectURL(url);
  }, [code, key]);

  const handleRefresh = () => setKey(prev => prev + 1);

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors">
        <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">Ready to Launch</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-white overflow-hidden flex flex-col ${minimal ? '' : 'rounded-xl shadow-sm border border-[#dadce0] dark:border-[#444746]'}`}>
      {!minimal && (
        <div className="h-10 bg-[#f1f3f4] dark:bg-[#2d2e30] border-b border-[#dadce0] dark:border-[#444746] flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 mr-4">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="h-6 w-64 bg-white dark:bg-[#1e1f20] border border-[#dadce0] dark:border-[#444746] rounded-md flex items-center px-2 text-[10px] text-slate-400 truncate">
              https://local.apper-preview.internal/app
            </div>
          </div>
          <button 
            onClick={handleRefresh}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md text-slate-500 dark:text-slate-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      )}
      
      <iframe 
        ref={iframeRef} 
        key={key}
        className="w-full flex-1 bg-white border-none" 
        title="App Preview"
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
      />
    </div>
  );
};

export default AppPreview;
