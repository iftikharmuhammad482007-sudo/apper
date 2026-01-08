
import React, { useEffect, useRef, useState } from 'react';

interface AppPreviewProps {
  code: string;
}

const AppPreview: React.FC<AppPreviewProps> = ({ code }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !iframeRef.current) {
      setError(null);
      return;
    }

    // Clean code to remove potential dangerous patterns or imports that break Babel Standalone
    const processedCode = code
      .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '') // Remove imports
      .replace(/export\s+default\s+/g, 'const GeneratedApp = ') // Convert export default to const
      .replace(/export\s+/g, ''); // Remove other exports

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
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #f1f1f1; }
            ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #bbb; }
            
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
            // Expose hooks to global scope for AI-generated code
            window.useState = React.useState;
            window.useEffect = React.useEffect;
            window.useContext = React.useContext;
            window.useReducer = React.useReducer;
            window.useCallback = React.useCallback;
            window.useMemo = React.useMemo;
            window.useRef = React.useRef;
            window.useImperativeHandle = React.useImperativeHandle;
            window.useLayoutEffect = React.useLayoutEffect;
            window.useDebugValue = React.useDebugValue;

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
              // The generated code
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
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-slate-600 dark:text-slate-300">Start Building Your Idea</p>
        <p className="text-sm mt-2 max-w-xs text-center">Describe what you want to build and Apper will create a functional app for you.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white dark:bg-[#1e1f20] rounded-xl overflow-hidden shadow-sm flex flex-col border border-[#dadce0] dark:border-[#444746]">
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
          title="Refresh Preview"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>
      
      <iframe 
        ref={iframeRef} 
        key={key}
        className="w-full flex-1 bg-white" 
        title="App Preview"
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
      />
    </div>
  );
};

export default AppPreview;
