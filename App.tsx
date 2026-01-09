
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateAppCode } from './services/geminiService';
import { Message, AppState } from './types';
import AppPreview from './components/AppPreview';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    messages: [],
    currentCode: '',
    isGenerating: false,
    status: 'idle',
  });
  
  const [viewMode, setViewMode] = useState<'editor' | 'portal'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('p') ? 'editor' : 'portal';
  });

  const [isLoadingGateway, setIsLoadingGateway] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // DETECT PRODUCTION MODE (When visiting a shared ?p= URL)
  const isProduction = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('p') && params.get('mode') !== 'edit';
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Robust decoding logic
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedCode = params.get('p');
    
    if (encodedCode) {
      if (isProduction) setIsLoadingGateway(true);
      
      try {
        const decoded = decodeURIComponent(escape(atob(encodedCode)));
        setAppState(prev => ({ ...prev, currentCode: decoded }));
        
        const domain = params.get('domain');
        if (domain) document.title = domain;

        if (isProduction) {
          setTimeout(() => setIsLoadingGateway(false), 800);
        }
      } catch (e) {
        console.error("Link Error:", e);
        setIsLoadingGateway(false);
      }
    }
  }, [isProduction]);

  const handleSend = async () => {
    if (!prompt.trim() || appState.isGenerating) return;

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      code: appState.currentCode,
      timestamp: Date.now(),
    };

    setAppState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isGenerating: true,
      status: 'generating',
    }));
    
    const currentPrompt = prompt;
    setPrompt('');

    try {
      const { text, code } = await generateAppCode(currentPrompt, appState.messages);
      
      setAppState(prev => ({
        ...prev,
        messages: [...prev.messages, { role: 'assistant', content: text, code: code || prev.currentCode, timestamp: Date.now() }],
        currentCode: code || prev.currentCode,
        isGenerating: false,
        status: 'idle',
      }));
      
      if (code) setActiveTab('preview');
    } catch (error: any) {
      setAppState(prev => ({ ...prev, isGenerating: false, status: 'error' }));
    }
  };

  const generateStandaloneHTML = (code: string, title: string) => {
    const processedCode = code
      .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '')
      .replace(/export\s+default\s+/g, 'const GeneratedApp = ')
      .replace(/export\s+/g, '');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; min-height: 100vh; font-family: 'Inter', sans-serif; background-color: #ffffff; }
        #root { min-height: 100vh; }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect, useRef, useMemo, useCallback, useContext, useReducer } = React;
        window.useState = useState; window.useEffect = useEffect; window.useRef = useRef;
        window.useMemo = useMemo; window.useCallback = useCallback;
        window.useContext = useContext; window.useReducer = useReducer;

        ${processedCode}

        const App = () => {
            const Target = window.GeneratedApp || (typeof GeneratedApp !== 'undefined' ? GeneratedApp : null);
            if (!Target) return <div style={{padding: '2rem', textAlign: 'center', color: '#666'}}>App Component Not Found</div>;
            return <Target />;
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<App />);
    </script>
</body>
</html>`;
  };

  const handleDownloadHTML = () => {
    const htmlContent = generateStandaloneHTML(appState.currentCode, 'Apper Exported App');
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apper-app-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewLiveInBrowser = () => {
    if (!appState.currentCode) return;
    const htmlContent = generateStandaloneHTML(appState.currentCode, 'Apper Preview');
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (isLoadingGateway) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col items-center justify-center text-slate-900 font-sans overflow-hidden">
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black italic text-3xl shadow-2xl animate-pulse">A</div>
        </div>
        <div className="text-sm font-bold tracking-tight mb-1 text-slate-400">LOADING...</div>
      </div>
    );
  }

  if (isProduction) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-white">
        <AppPreview code={appState.currentCode} minimal={true} />
        <div className="fixed bottom-4 right-4 opacity-0 hover:opacity-100 transition-opacity">
          <button 
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set('mode', 'edit');
              window.location.href = url.toString();
            }}
            className="p-3 bg-slate-900/10 hover:bg-indigo-600 rounded-xl text-slate-400 hover:text-white transition-all backdrop-blur-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'portal') {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'} transition-colors flex flex-col items-center justify-center p-8`}>
        <div className="max-w-2xl w-full text-center space-y-12">
          <div className="flex flex-col items-center gap-6">
             <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white font-black italic text-5xl shadow-2xl">A</div>
             <h1 className="text-6xl font-black tracking-tighter italic">Apper Studio</h1>
             <p className="text-slate-500 max-w-md mx-auto">Generate React applications with AI and export them as standalone HTML files for offline use.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setViewMode('editor')} className="bg-indigo-600 text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">New Project</button>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">{isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden transition-colors ${isDarkMode ? 'dark bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
      <nav className={`h-20 border-b flex items-center px-8 justify-between shrink-0 z-10 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'} backdrop-blur-xl`}>
        <button onClick={() => setViewMode('portal')} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black italic text-xl shadow-lg">A</div>
          <span className="text-2xl font-black tracking-tighter text-indigo-600 italic uppercase">Apper</span>
        </button>
        <div className="flex items-center gap-4">
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
             {isDarkMode ? '☀️' : '🌙'}
           </button>
          <button 
            onClick={handleDownloadHTML}
            disabled={!appState.currentCode || appState.isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download HTML
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        <div className={`w-[450px] flex flex-col border-r shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
            {appState.messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-6 rounded-[1.8rem] text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : `${isDarkMode ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-white border border-slate-200 text-slate-700'} rounded-tl-none`
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {appState.isGenerating && <div className="p-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 animate-pulse text-center">Architecting...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-8 border-t">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Describe your browser app..."
                className={`w-full p-6 pr-16 text-sm rounded-[2rem] border-2 outline-none h-32 resize-none transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-100 text-slate-900 focus:border-indigo-500 shadow-inner'}`}
              />
              <button onClick={handleSend} disabled={!prompt.trim() || appState.isGenerating} className="absolute right-4 bottom-4 p-4 bg-indigo-600 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M14 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        <div className={`flex-1 flex flex-col p-10 transition-colors ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100/40'}`}>
          <div className="mb-6 flex justify-center items-center gap-4">
            <div className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl flex items-center backdrop-blur-sm border border-slate-300/20">
              <button onClick={() => setActiveTab('preview')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'preview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>Live Preview</button>
              <button onClick={() => setActiveTab('code')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'code' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}>Source Code</button>
            </div>
            
            <button 
              onClick={handleViewLiveInBrowser}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all shadow-sm flex items-center gap-2 group"
            >
              <span>View Fullscreen</span>
              <svg className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </button>
          </div>

          <div className={`flex-1 min-h-0 rounded-[3.5rem] border-4 overflow-hidden shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-white'}`}>
            {activeTab === 'preview' ? (
              <AppPreview code={appState.currentCode} />
            ) : (
              <textarea
                value={appState.currentCode}
                onChange={(e) => setAppState(prev => ({ ...prev, currentCode: e.target.value }))}
                className="w-full h-full p-12 font-mono text-sm bg-slate-950 text-indigo-300 outline-none resize-none leading-relaxed overflow-auto no-scrollbar"
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
