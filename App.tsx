
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { generateAppCode } from './services/geminiService';
import { Message, AppState, DeployedApp } from './types';
import AppPreview from './components/AppPreview';

const FEATURED_APPS: DeployedApp[] = [
  {
    id: 'f1',
    name: 'Task Flow Pro',
    description: 'A minimalist productivity dashboard with kanban boards and pomodoro timers.',
    author: 'Apper Official',
    timestamp: Date.now() - 86400000,
    code: `const GeneratedApp = () => {
      const [tasks, setTasks] = useState([{id: 1, text: 'Design UI', status: 'todo'}, {id: 2, text: 'Implement State', status: 'done'}]);
      return (
        <div className="p-8 bg-slate-50 min-h-screen font-sans">
          <h1 className="text-3xl font-bold mb-6 text-slate-800 tracking-tight">Task Flow Pro</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['todo', 'in-progress', 'done'].map(status => (
              <div key={status} className="bg-slate-200/50 p-4 rounded-2xl border border-slate-300/50 backdrop-blur-sm">
                <h2 className="uppercase text-[10px] font-black text-slate-400 mb-4 tracking-widest">{status}</h2>
                {tasks.filter(t => t.status === status).map(t => (
                  <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-3 hover:shadow-md transition-shadow cursor-pointer">{t.text}</div>
                ))}
                <button className="w-full py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-bold hover:bg-slate-100 transition-colors">+ Add Task</button>
              </div>
            ))}
          </div>
        </div>
      );
    };`
  },
  {
    id: 'f2',
    name: 'Aether Weather',
    description: 'Glassmorphic weather forecast application with dynamic background effects.',
    author: 'Apper Official',
    timestamp: Date.now() - 172800000,
    code: `const GeneratedApp = () => {
      return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-6 font-sans">
          <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-[2.5rem] p-10 text-white w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold mb-1">London</h1>
                <p className="opacity-80">Monday, 12:45 PM</p>
              </div>
              <div className="text-6xl">☀️</div>
            </div>
            <div className="text-8xl font-black mb-8 tracking-tighter">24°</div>
            <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-8">
              <div className="text-center"><div className="opacity-60 text-xs uppercase mb-1">Wind</div><div className="font-bold">12km/h</div></div>
              <div className="text-center"><div className="opacity-60 text-xs uppercase mb-1">Hum</div><div className="font-bold">45%</div></div>
              <div className="text-center"><div className="opacity-60 text-xs uppercase mb-1">Rain</div><div className="font-bold">0%</div></div>
            </div>
          </div>
        </div>
      );
    };`
  }
];

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

  const [prompt, setPrompt] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('You are a helpful assistant specialized in building React web apps.');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [engineError, setEngineError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [appState.messages]);

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
    setEngineError(null);

    try {
      const { text, code } = await generateAppCode(currentPrompt, appState.messages, systemInstruction);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: text,
        code: code || appState.currentCode,
        timestamp: Date.now(),
      };

      setAppState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        currentCode: code || prev.currentCode,
        isGenerating: false,
        status: 'idle',
      }));
      
      if (code) {
        setActiveTab('preview');
      }
    } catch (error: any) {
      console.error(error);
      setEngineError(error.message || "An unexpected error occurred.");
      setAppState(prev => ({
        ...prev,
        isGenerating: false,
        status: 'error',
      }));
    }
  };

  const loadApp = (app: DeployedApp) => {
    setAppState({
      messages: [
        {
          role: 'assistant',
          content: `Loaded app: ${app.name}. You can now modify it by describing changes.`,
          code: app.code,
          timestamp: Date.now()
        }
      ],
      currentCode: app.code,
      isGenerating: false,
      status: 'idle'
    });
    setViewMode('editor');
    setActiveTab('preview');
  };

  if (viewMode === 'portal') {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h1 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Apper Portal</h1>
              <p className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Explore community creations or build your own.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full border ${isDarkMode ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}
              >
                {isDarkMode ? '🌙' : '☀️'}
              </button>
              <button 
                onClick={() => setViewMode('editor')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
              >
                Create New App
              </button>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURED_APPS.map(app => (
              <div 
                key={app.id} 
                className={`group rounded-[2rem] border transition-all hover:shadow-2xl overflow-hidden cursor-pointer ${
                  isDarkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-500'
                }`}
                onClick={() => loadApp(app)}
              >
                <div className="h-48 bg-slate-100 dark:bg-slate-800 relative">
                  <div className="absolute inset-0 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">
                    {app.name.includes('Weather') ? '🌤️' : '📝'}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{app.name}</h3>
                  <p className={`text-sm mb-4 line-clamp-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{app.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{app.author}</span>
                    <button className="text-indigo-600 font-bold text-sm">Open →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isDarkMode ? 'dark bg-slate-950' : 'bg-white'}`}>
      <nav className={`h-14 border-b flex items-center px-4 justify-between shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <button onClick={() => setViewMode('portal')} className="text-lg font-black tracking-tighter text-indigo-600">APPER</button>
          <div className={`h-4 w-px ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
          <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {appState.messages.length > 0 ? 'Editing Project' : 'New Project'}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            {isDarkMode ? '🌙' : '☀️'}
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm">
            Publish
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Chat Sidebar */}
        <div className={`w-80 flex flex-col border-r shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {appState.messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl">✨</div>
                <h2 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Start a Project</h2>
                <p className="text-xs text-slate-500 mt-2 px-4">Describe the application you want to build in plain English.</p>
              </div>
            )}
            {appState.messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[90%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : `${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-white border border-slate-200 text-slate-700'} rounded-tl-none`
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {appState.isGenerating && (
              <div className="flex gap-2 items-center text-indigo-500 text-xs font-bold animate-pulse">
                <span className="w-2 h-2 bg-indigo-500 rounded-full" />
                Apper is building...
              </div>
            )}
            {engineError && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl">
                <strong>Error:</strong> {engineError}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={`p-4 border-t ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Make it blue and add a login form..."
                className={`w-full p-3 pr-10 text-sm rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none h-24 ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <button 
                onClick={handleSend}
                disabled={!prompt.trim() || appState.isGenerating}
                className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9-7-9-7V19z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Preview Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100 dark:bg-slate-950 p-4">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <button 
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'preview' 
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' 
                  : 'text-slate-500 hover:bg-white/50'
              }`}
            >
              Preview
            </button>
            <button 
              onClick={() => setActiveTab('code')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'code' 
                  ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' 
                  : 'text-slate-500 hover:bg-white/50'
              }`}
            >
              Code
            </button>
          </div>
          
          <div className="flex-1 min-h-0">
            {activeTab === 'preview' ? (
              <AppPreview code={appState.currentCode} />
            ) : (
              <div className={`w-full h-full rounded-xl border p-4 font-mono text-sm overflow-auto ${
                isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <pre>{appState.currentCode || '// No code generated yet'}</pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Fix for index.tsx: Module '"file:///App"' has no default export.
export default App;
