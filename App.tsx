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
  },
  {
    id: 'f3',
    name: 'CryptoPulse',
    description: 'Real-time cryptocurrency ticker with interactive price charts and neon aesthetics.',
    author: 'Apper Official',
    timestamp: Date.now() - 259200000,
    code: `const GeneratedApp = () => {
      const coins = [
        { id: 1, name: 'Bitcoin', symbol: 'BTC', price: '$64,210', change: '+2.4%' },
        { id: 2, name: 'Ethereum', symbol: 'ETH', price: '$3,450', change: '-0.8%' },
        { id: 3, name: 'Solana', symbol: 'SOL', price: '$145', change: '+5.1%' },
      ];
      return (
        <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
          <div className="max-w-4xl mx-auto">
            <header className="flex justify-between items-center mb-12">
              <h1 className="text-2xl font-black tracking-tighter italic text-cyan-400">CRYPTOPULSE.</h1>
              <div className="px-4 py-1 bg-cyan-400/10 border border-cyan-400/20 rounded-full text-cyan-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Live Feed</div>
            </header>
            <div className="grid gap-4">
              {coins.map(coin => (
                <div key={coin.id} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center font-bold text-zinc-400">{coin.symbol[0]}</div>
                    <div>
                      <h3 className="font-bold text-lg">{coin.name}</h3>
                      <span className="text-xs text-zinc-500 font-medium uppercase tracking-widest">{coin.symbol}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{coin.price}</div>
                    <div className={coin.change.startsWith('+') ? 'text-cyan-400' : 'text-rose-400'}>{coin.change}</div>
                  </div>
                </div>
              ))}
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
  
  // Set default view based on whether we are loading a specific app
  const [viewMode, setViewMode] = useState<'editor' | 'portal'>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('p') ? 'editor' : 'portal';
  });

  const [prompt, setPrompt] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('You are a helpful assistant specialized in building React web apps.');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewNotification, setPreviewNotification] = useState<string | null>(null);
  const [planetMode, setPlanetMode] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [deployedApps, setDeployedApps] = useState<DeployedApp[]>([]);
  const [portalSearch, setPortalSearch] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('apper-dark-mode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialization & URL Parsing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedCode = params.get('p');
    if (encodedCode) {
      try {
        const decoded = decodeURIComponent(escape(atob(encodedCode)));
        setAppState(prev => ({ ...prev, currentCode: decoded }));
        setPlanetMode(true);
        setViewMode('editor'); // Ensure we go to editor view when an app is provided
      } catch (e) {
        console.error("Failed to decode Planet App:", e);
      }
    }

    const savedApps = localStorage.getItem('apper-deployed-apps');
    if (savedApps) {
      try {
        setDeployedApps(JSON.parse(savedApps));
      } catch (e) {
        console.error("Failed to load deployed apps:", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('apper-dark-mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [appState.messages]);

  useEffect(() => {
    if (appState.messages.length === 0 && !planetMode) {
      setAppState(prev => ({
        ...prev,
        messages: [{
          role: 'assistant',
          content: "Hello! I am Apper, an AI assistant made by MBI Developers. I can help you build, preview, and publish apps for free on Planet. What would you like to build today?",
          timestamp: Date.now()
        }]
      }));
    }
  }, [planetMode]);

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || appState.isGenerating) return;

    const userMessage: Message = {
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setAppState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isGenerating: true,
      status: 'generating',
    }));
    setPrompt('');
    setPublishedUrl(null);

    try {
      const { text, code } = await generateAppCode(prompt, appState.messages, systemInstruction);
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: text,
        code: code,
        timestamp: Date.now(),
      };

      setAppState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        currentCode: code || prev.currentCode,
        isGenerating: false,
        status: 'idle',
      }));

      setPreviewNotification("App updated successfully.");
      setTimeout(() => setPreviewNotification(null), 3000);

    } catch (error) {
      console.error('Error generating app:', error);
      setAppState(prev => ({ ...prev, status: 'error', isGenerating: false }));
    }
  };

  const handlePublish = async () => {
    if (!appState.currentCode) return;
    setAppState(prev => ({ ...prev, status: 'published' }));
    
    try {
      const encoded = btoa(unescape(encodeURIComponent(appState.currentCode)));
      const url = `${window.location.origin}${window.location.pathname}?p=${encoded}`;
      
      setPublishedUrl(url);

      const nameMatch = appState.currentCode.match(/h1.*>(.*)<\/h1/i) || appState.currentCode.match(/title: '(.*)'/i);
      const appName = nameMatch ? nameMatch[1].replace(/<[^>]*>?/gm, '') : `App #${Math.floor(Math.random() * 1000)}`;

      const newApp: DeployedApp = {
        id: Math.random().toString(36).substring(7),
        name: appName.length > 30 ? appName.substring(0, 30) + '...' : appName,
        description: prompt || 'AI Generated Application',
        author: 'Me',
        code: appState.currentCode,
        timestamp: Date.now()
      };

      const updatedApps = [newApp, ...deployedApps.filter(a => a.name !== newApp.name)];
      setDeployedApps(updatedApps);
      localStorage.setItem('apper-deployed-apps', JSON.stringify(updatedApps));

      await navigator.clipboard.writeText(url);
      
      setAppState(prev => ({
        ...prev,
        messages: [...prev.messages, {
          role: 'assistant',
          content: `🚀 App Published! Your unique link is copied to your clipboard. You can also find it anytime in the Planet Explorer portal.`,
          timestamp: Date.now()
        }],
        status: 'idle'
      }));

    } catch (e) {
      console.error("Publishing failed:", e);
      alert("Payload too large for a free Planet link. Try simplifying the app.");
      setAppState(prev => ({ ...prev, status: 'idle' }));
    }
  };

  const filteredPortalApps = useMemo(() => {
    const allApps = [...deployedApps, ...FEATURED_APPS];
    if (!portalSearch.trim()) return allApps;
    return allApps.filter(app => 
      app.name.toLowerCase().includes(portalSearch.toLowerCase()) || 
      app.description.toLowerCase().includes(portalSearch.toLowerCase())
    );
  }, [deployedApps, portalSearch]);

  const visitApp = (app: DeployedApp) => {
    const encoded = btoa(unescape(encodeURIComponent(app.code)));
    const url = `${window.location.origin}${window.location.pathname}?p=${encoded}`;
    window.open(url, '_blank');
  };

  const editApp = (app: DeployedApp) => {
    setAppState(prev => ({
      ...prev,
      currentCode: app.code,
      messages: [{
        role: 'assistant',
        content: `I've loaded your app "${app.name}". What would you like to change?`,
        timestamp: Date.now()
      }]
    }));
    setViewMode('editor');
    setIsChatCollapsed(false);
  };

  const deleteApp = (id: string) => {
    const updated = deployedApps.filter(a => a.id !== id);
    setDeployedApps(updated);
    localStorage.setItem('apper-deployed-apps', JSON.stringify(updated));
  };

  // 1. PLANET MODE (External Viewer)
  if (planetMode) {
    return (
      <div className="flex flex-col h-screen bg-white font-sans">
        <header className="h-14 bg-[#1a73e8] flex items-center justify-between px-6 text-white shadow-xl z-50">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl italic tracking-tighter shadow-inner cursor-pointer" onClick={() => window.location.href = window.location.origin + window.location.pathname}>A</div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-widest uppercase italic">Planet Live</span>
              <span className="text-[10px] font-medium opacity-70">Secured & Distributed by Apper AI</span>
            </div>
          </div>
          <button 
            onClick={() => window.location.href = window.location.origin + window.location.pathname}
            className="text-xs bg-white text-[#1a73e8] px-5 py-2 rounded-full font-black uppercase tracking-widest hover:bg-opacity-90 transition-all shadow-lg"
          >
            Create Your Own
          </button>
        </header>
        <div className="flex-1 overflow-hidden bg-slate-100">
          <AppPreview code={appState.currentCode} />
        </div>
      </div>
    );
  }

  // 2. MAIN EDITOR & PORTAL
  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0b] text-[#e3e3e3]' : 'bg-[#f8f9fa] text-[#1f1f1f]'}`}>
      {/* Header */}
      <header className={`h-16 border-b flex items-center justify-between px-6 z-50 shadow-sm transition-all ${isDarkMode ? 'border-[#2a2a2c] bg-[#121214]/80 backdrop-blur-xl' : 'border-[#dadce0] bg-white/80 backdrop-blur-xl'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setViewMode('portal')}>
            <div className="w-10 h-10 rounded-2xl bg-[#1a73e8] flex items-center justify-center text-white font-black italic text-2xl tracking-tighter shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">A</div>
            <span className={`font-black text-xl italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>APPER <span className="text-[#1a73e8]">AI</span></span>
          </div>
          
          <nav className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/50 p-1 rounded-2xl ml-4">
            <button 
              onClick={() => setViewMode('portal')}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'portal' ? 'bg-white dark:bg-zinc-700 text-[#1a73e8] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              Planet Explorer
            </button>
            <button 
              onClick={() => setViewMode('editor')}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'editor' ? 'bg-white dark:bg-zinc-700 text-[#1a73e8] shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              App Builder
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-2xl transition-all ${isDarkMode ? 'text-amber-400 bg-zinc-800 hover:bg-zinc-700' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
          >
            {isDarkMode ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
          </button>
          {viewMode === 'editor' && (
            <button 
              onClick={handlePublish}
              disabled={!appState.currentCode || appState.isGenerating}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:shadow-none"
            >
              Deploy on Planet
            </button>
          )}
          {viewMode === 'portal' && (
            <button 
              onClick={() => setViewMode('editor')}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30"
            >
              Build New App
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'editor' ? (
          <>
            <main className="flex-1 flex overflow-hidden relative">
              {/* Squeezable Chat Panel */}
              <div className={`border-r flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden relative ${isChatCollapsed ? 'w-0 opacity-0' : 'w-[420px] opacity-100'} ${isDarkMode ? 'border-[#2a2a2c] bg-[#121214]' : 'border-[#dadce0] bg-white'}`}>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar" ref={scrollRef}>
                  {appState.messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black italic ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>
                          {msg.role === 'user' ? 'U' : 'A'}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">{msg.role}</span>
                      </div>
                      <div className={`max-w-[85%] text-sm px-5 py-4 rounded-[1.5rem] leading-relaxed transition-all shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-500 text-white rounded-tr-none' 
                          : (isDarkMode ? 'bg-[#1e1e20] text-slate-200 border border-white/5 rounded-tl-none' : 'bg-slate-100 text-slate-800 rounded-tl-none')
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {appState.isGenerating && (
                    <div className="flex flex-col gap-4 animate-pulse">
                      <div className="w-12 h-2 bg-blue-500/20 rounded-full" />
                      <div className="space-y-2">
                        <div className="w-full h-4 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
                        <div className="w-2/3 h-4 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
                      </div>
                    </div>
                  )}
                </div>

                <div className={`p-6 border-t transition-all ${isDarkMode ? 'border-[#2a2a2c] bg-[#121214]' : 'border-[#dadce0] bg-[#fdfdfd]'}`}>
                  <form onSubmit={handleGenerate} className="relative group">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="E.g. Build a sleek music player..."
                      className={`w-full border-2 rounded-2xl py-4 px-5 pr-14 text-sm focus:outline-none focus:ring-4 transition-all min-h-[100px] resize-none ${isDarkMode ? 'bg-[#1e1e20] text-white border-transparent focus:ring-blue-500/20 focus:border-blue-500/50' : 'bg-white text-slate-900 border-slate-100 focus:ring-blue-500/10 focus:border-blue-500/30 shadow-inner'}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleGenerate();
                        }
                      }}
                    />
                    <button
                      type="submit"
                      disabled={appState.isGenerating || !prompt.trim()}
                      className="absolute bottom-4 right-4 p-2.5 bg-[#1a73e8] text-white rounded-xl shadow-lg disabled:opacity-20 hover:scale-110 active:scale-95 transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </form>
                  <p className="text-[10px] text-center mt-4 opacity-40 font-bold uppercase tracking-widest">Built with Apper Engine v3</p>
                </div>
              </div>

              {/* Squeeze Toggle */}
              <button 
                onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                className={`absolute top-1/2 -translate-y-1/2 z-50 w-6 h-14 flex items-center justify-center rounded-r-2xl border-y border-r shadow-2xl transition-all duration-500 ${isChatCollapsed ? 'left-0' : 'left-[420px]'} ${isDarkMode ? 'bg-[#1e1e20] border-white/5 text-slate-500 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-800'}`}
              >
                <div className={`w-1 h-6 rounded-full bg-current transition-all ${isChatCollapsed ? 'scale-y-50' : 'scale-y-100'}`} />
              </button>

              {/* Preview Panel */}
              <div className={`flex-1 flex flex-col p-6 overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-[#f1f3f4]'}`}>
                <div className="flex items-center justify-between mb-6">
                  <div className={`flex rounded-2xl p-1 border shadow-inner transition-all ${isDarkMode ? 'bg-[#1e1e20] border-white/5' : 'bg-white border-slate-200'}`}>
                    <button 
                      onClick={() => setActiveTab('preview')}
                      className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'preview' ? 'bg-[#1a73e8] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Real Preview
                    </button>
                    <button 
                      onClick={() => setActiveTab('code')}
                      className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'code' ? 'bg-[#1a73e8] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      View Code
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {appState.currentCode && (
                      <button 
                        onClick={() => setIsFullscreen(true)}
                        className={`p-2.5 rounded-xl transition-all border ${isDarkMode ? 'border-white/5 bg-[#1e1e20] text-slate-400' : 'border-slate-200 bg-white text-slate-500'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" /></svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className={`flex-1 rounded-[2rem] shadow-2xl border-4 overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#121214] border-white/5' : 'bg-white border-white'}`}>
                  {activeTab === 'preview' ? (
                    <AppPreview code={appState.currentCode} />
                  ) : (
                    <div className={`h-full overflow-auto p-8 font-mono text-sm leading-relaxed ${isDarkMode ? 'bg-[#0a0a0b] text-blue-400' : 'bg-slate-50 text-blue-600'}`}>
                      <pre className="whitespace-pre-wrap">{appState.currentCode || '// Describe an app to see the code...'}</pre>
                    </div>
                  )}
                </div>

                {/* Notifications */}
                {previewNotification && (
                  <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-8 duration-500">
                    <div className="px-6 py-3 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-2xl flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                      {previewNotification}
                    </div>
                  </div>
                )}
                
                {publishedUrl && (
                  <div className="absolute bottom-12 right-12 z-50 animate-in slide-in-from-bottom-8 duration-500">
                    <div className={`p-6 rounded-[2rem] shadow-2xl border-2 border-emerald-500/30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl flex flex-col gap-4 w-[320px]`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                          <h4 className="font-black text-sm uppercase tracking-tighter">Copied to Clipboard</h4>
                          <p className="text-[10px] opacity-60">Your app is now live on Planet!</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open(publishedUrl, '_blank')}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                      >
                        Visit Site
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </main>
          </>
        ) : (
          /* PLANET EXPLORER PORTAL */
          <main className={`flex-1 flex flex-col transition-all duration-300 overflow-y-auto ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-[#f8f9fa]'}`}>
            <div className="max-w-7xl mx-auto w-full px-12 py-16">
              <div className="text-center mb-16 space-y-4">
                <div className="inline-block px-4 py-1.5 bg-blue-500/10 rounded-full text-blue-500 text-[10px] font-black uppercase tracking-widest mb-4">The Apper Universe</div>
                <h1 className={`text-6xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  PLANET <span className="text-[#1a73e8]">EXPLORER</span>
                </h1>
                <p className={`text-xl font-medium max-w-2xl mx-auto opacity-50`}>
                  Discover every application built and published using Apper AI. Your community, your apps, your planet.
                </p>
                <div className="pt-8 max-w-xl mx-auto">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={portalSearch}
                      onChange={(e) => setPortalSearch(e.target.value)}
                      placeholder="Search for apps, tools, and ideas..."
                      className={`w-full py-5 px-14 rounded-3xl border-2 text-lg focus:outline-none focus:ring-8 transition-all ${isDarkMode ? 'bg-[#121214] border-white/5 text-white focus:ring-blue-500/10 focus:border-blue-500/50' : 'bg-white border-slate-100 text-slate-900 focus:ring-blue-500/5 focus:border-blue-500/20'}`}
                    />
                    <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-24">
                {deployedApps.length > 0 && !portalSearch && (
                  <section>
                    <div className="flex items-center justify-between mb-8 border-b border-slate-200 dark:border-white/5 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-2xl italic shadow-xl shadow-orange-500/20">M</div>
                        <h2 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>My Lab</h2>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{deployedApps.length} Deployed Apps</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                      {deployedApps.map(app => (
                        <div key={app.id} className={`group relative rounded-[2.5rem] border-4 overflow-hidden transition-all hover:-translate-y-2 hover:shadow-2xl ${isDarkMode ? 'bg-[#121214] border-white/5 hover:border-blue-500/30' : 'bg-white border-white hover:border-blue-500/10'}`}>
                          <div className={`h-48 relative overflow-hidden bg-slate-100 flex items-center justify-center`}>
                            <div className="scale-[0.4] w-[250%] h-[250%] pointer-events-none group-hover:scale-[0.45] transition-transform duration-700">
                              <AppPreview code={app.code} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                              <div className="flex gap-2">
                                <button onClick={() => visitApp(app)} className="px-6 py-2.5 bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl hover:scale-105 transition-transform">Visit Live</button>
                                <button onClick={() => editApp(app)} className="px-6 py-2.5 bg-[#1a73e8] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl hover:scale-105 transition-transform">Refine</button>
                              </div>
                            </div>
                            <button onClick={() => deleteApp(app.id)} className="absolute top-4 right-4 p-2 bg-rose-500/20 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <div className="p-8">
                            <h3 className={`text-xl font-black italic tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{app.name}</h3>
                            <p className="text-xs opacity-50 line-clamp-2 h-8 mb-6">{app.description}</p>
                            <div className="flex items-center justify-between mt-auto">
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-20">{new Date(app.timestamp).toLocaleDateString()}</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(s => <div key={s} className="w-1 h-1 rounded-full bg-blue-500/20" />)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex items-center justify-between mb-8 border-b border-slate-200 dark:border-white/5 pb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-black text-2xl italic shadow-xl shadow-blue-500/20">G</div>
                      <h2 className={`text-3xl font-black italic tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Planet Showcase</h2>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Trending Now</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {filteredPortalApps.filter(a => a.author !== 'Me').map(app => (
                      <div key={app.id} className={`group rounded-[2.5rem] border-4 overflow-hidden transition-all hover:shadow-2xl ${isDarkMode ? 'bg-[#121214] border-white/5' : 'bg-white border-white'}`}>
                        <div className={`h-48 relative overflow-hidden bg-slate-100 flex items-center justify-center`}>
                          <div className="scale-[0.4] w-[250%] h-[250%] pointer-events-none group-hover:scale-[0.42] transition-transform duration-700">
                             <AppPreview code={app.code} />
                          </div>
                          <div className="absolute inset-0 bg-black/5 opacity-40 group-hover:opacity-0 transition-opacity" />
                        </div>
                        <div className="p-8">
                          <h3 className={`text-xl font-black italic tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{app.name}</h3>
                          <p className="text-xs opacity-50 line-clamp-2 h-8 mb-6">{app.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center text-[8px] font-black shadow-lg shadow-blue-500/20">AI</div>
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{app.author}</span>
                            </div>
                            <button 
                              onClick={() => visitApp(app)}
                              className="px-6 py-2.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all"
                            >
                              Explore
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </main>
        )}
      </div>
      
      {/* Footer */}
      <footer className={`h-8 border-t px-6 flex items-center justify-between text-[10px] font-black uppercase tracking-widest transition-all ${isDarkMode ? 'border-white/5 bg-[#121214] text-[#4a4a4c]' : 'border-slate-100 bg-white text-slate-400'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${appState.status === 'generating' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span>Apper Engine v3.2</span>
          </div>
          <span className="opacity-40">Deployed via Netlify</span>
        </div>
        <div className="italic tracking-tighter text-blue-500/50">
          Designed by MBI Developers
        </div>
      </footer>
    </div>
  );
};

export default App;