import React, { useState, useEffect } from 'react';
import { Search, Loader2, BookOpen, ExternalLink, ChevronRight, GraduationCap, Bookmark, FolderPlus, Download, Trash2, Library, Sparkles, X, History, Settings, LogOut, Sun, Moon, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { scholarSearch, deepDive, synthesizeChat, advancedScholarChat, type SearchResponse, type SearchSource } from './lib/gemini';
import { cn } from './lib/utils';

interface Project {
  id: string;
  name: string;
  createdAt: number;
}

interface SavedSource extends SearchSource {
  projectId: string;
  savedAt: number;
}

export default function App() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // App Profile & Personalization
  const [profile, setProfile] = useState<{ name: string, institution: string, avatarColor: string } | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', institution: '' });
  
  const [searchHistory, setSearchHistory] = useState<{ query: string, timestamp: number }[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Projects and Saved Sources
  const [projects, setProjects] = useState<Project[]>([]);
  const [savedSources, setSavedSources] = useState<SavedSource[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('all');
  const [view, setView] = useState<'search' | 'library' | 'ai-chat'>('search');

  // Deep Dive State
  const [analyzingSource, setAnalyzingSource] = useState<SearchSource | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Synthesis Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isMessageLoading, setIsMessageLoading] = useState(false);

  const [citationExportSources, setCitationExportSources] = useState<SearchSource[] | null>(null);
  const [exportFormat, setExportFormat] = useState<'APA' | 'MLA' | 'Chicago'>('APA');

  // Advanced AI Chat State
  const [advChatMessages, setAdvChatMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [advChatInput, setAdvChatInput] = useState('');
  const [isAdvLoading, setIsAdvLoading] = useState(false);

  // Persistence (Local Storage Only)
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem('sm_projects');
      const storedSources = localStorage.getItem('sm_sources');
      const storedHistory = localStorage.getItem('sm_history');
      const storedTheme = localStorage.getItem('sm_theme');
      const storedProfile = localStorage.getItem('sm_profile');

      if (storedProjects) setProjects(JSON.parse(storedProjects));
      if (storedSources) setSavedSources(JSON.parse(storedSources));
      if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
      if (storedTheme) setTheme(storedTheme as 'light' | 'dark');
      if (storedProfile) setProfile(JSON.parse(storedProfile));
      
      setIsInitialized(true);
    } catch (e) {
      console.error("Failed to load workspace:", e);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    localStorage.setItem('sm_projects', JSON.stringify(projects));
    localStorage.setItem('sm_sources', JSON.stringify(savedSources));
    localStorage.setItem('sm_history', JSON.stringify(searchHistory));
    localStorage.setItem('sm_theme', theme);
    if (profile) localStorage.setItem('sm_profile', JSON.stringify(profile));
    else localStorage.removeItem('sm_profile');
  }, [projects, savedSources, searchHistory, theme, profile, isInitialized]);

  // Dark Mode Class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setView('search');
    
    try {
      setSearchHistory(prev => [{ query, timestamp: Date.now() }, ...prev].slice(0, 20));
      
      const data = await scholarSearch(query);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      let msg = "An error occurred while performing research.";
      if (err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        msg = "The neural engines are cooling down (Rate Limit). Please wait 60 seconds and try again.";
      } else if (err?.message?.includes('400') || err?.message?.includes('API_KEY_INVALID')) {
        msg = "Configuration Error: The API Key is invalid or expired. Please check your Vercel settings.";
      }
      setError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeepDive = async (source: SearchSource) => {
    setAnalyzingSource(source);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await deepDive(source);
      setAnalysisResult(res);
    } catch (err: any) {
      let msg = "Failed to analyze source deeply.";
      if (err?.message?.includes('429')) {
        msg = "Deep Dive engines are resting (Rate Limit). Please wait a moment.";
      }
      setAnalysisResult(`Error: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveSource = (source: SearchSource) => {
    const sourceData: SavedSource = {
      ...source,
      projectId: activeProjectId === 'all' ? 'default' : activeProjectId,
      savedAt: Date.now()
    };

    if (!savedSources.find(s => s.url === source.url)) {
      setSavedSources([...savedSources, sourceData]);
    }
  };

  const formatCitation = (source: SavedSource, format: 'APA' | 'MLA' | 'Chicago') => {
    const domain = new URL(source.url).hostname;
    const year = new Date(source.savedAt).getFullYear();
    const title = source.title;
    
    switch (format) {
      case 'APA':
        return `${domain}. (${year}). ${title}. Retrieved from ${source.url}`;
      case 'MLA':
        return `"${title}." ${domain}, ${year}, ${source.url}.`;
      case 'Chicago':
        return `${domain}. "${title}." Last modified ${year}. ${source.url}.`;
      default:
        return source.url;
    }
  };

  const downloadCitations = (format: 'APA' | 'MLA' | 'Chicago') => {
    const filtered = activeProjectId === 'all' 
      ? savedSources 
      : savedSources.filter(s => s.projectId === activeProjectId);
    
    const text = filtered.map(s => formatCitation(s, format)).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholar_citations_${format.toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const generateEssay = async () => {
    const filtered = activeProjectId === 'all' 
      ? savedSources 
      : savedSources.filter(s => s.projectId === activeProjectId);
    
    if (filtered.length === 0) {
      alert("Please save some sources first to generate an essay.");
      return;
    }

    setAnalyzingSource({ title: "Drafting Scholarly Essay", url: "internal://essay-draft" });
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const sourcesContext = filtered.map((s, i) => `[${i+1}] ${s.title} (${s.url})`).join('\n');
    
    try {
      const res = await deepDive({ 
        title: "Scholarly Essay Synthesis", 
        url: `Drafting based on ${filtered.length} sources: \n${sourcesContext}` 
      });
      setAnalysisResult(res);
    } catch (err) {
      setAnalysisResult("Failed to generate essay.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !result) return;

    const userMsg = chatInput;
    setChatMessages([...chatMessages, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsMessageLoading(true);

    try {
      const history = chatMessages.map(m => ({ 
        role: m.role, 
        parts: [{ text: m.content }] 
      }));
      const response = await synthesizeChat(result.answer, userMsg, history);
      setChatMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', content: "Research link failed. Please retry." }]);
    } finally {
      setIsMessageLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Citations copied to clipboard.");
  };

  const handleCiteAll = (sources: SearchSource[]) => {
    // Also save them automatically for the user
    sources.forEach(s => saveSource(s));
    setCitationExportSources(sources);
  };

  const handleAdvChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advChatInput.trim()) return;

    const userMsg = advChatInput;
    setAdvChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAdvChatInput('');
    setIsAdvLoading(true);

    try {
      const history = advChatMessages.map(m => ({ 
        role: m.role, 
        parts: [{ text: m.content }] 
      }));
      const response = await advancedScholarChat(userMsg, history);
      setAdvChatMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (err) {
      setAdvChatMessages(prev => [...prev, { role: 'model', content: "Advanced analysis failed. Please verify your connection." }]);
    } finally {
      setIsAdvLoading(false);
    }
  };

  const createProject = () => {
    const name = prompt("Project Name?");
    if (name) {
      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        createdAt: Date.now()
      };
      setProjects([...projects, newProject]);
    }
  };

  const toggleTheme = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return;
    
    const colors = ['#007AFF', '#34C759', '#FF3B30', '#AF52DE', '#FFCC00'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    setProfile({
      name: profileForm.name,
      institution: profileForm.institution || 'Independent Researcher',
      avatarColor: randomColor
    });
    setProfileForm({ name: '', institution: '' });
    setIsProfileModalOpen(false);
  };

  const handleLogout = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (window.confirm("Sign out of your local workspace? Library data will stay on this device.")) {
      setProfile(null);
      setIsSettingsOpen(false);
      // Brief visual feedback if needed
    }
  };

  const exportWorkspace = () => {
    const data = {
      projects,
      savedSources,
      searchHistory,
      theme,
      profile,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ScholarMind_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.scholar`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const importWorkspace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.projects && data.savedSources) {
          setProjects(data.projects);
          setSavedSources(data.savedSources);
          setSearchHistory(data.searchHistory || []);
          setTheme(data.theme || 'light');
          setProfile(data.profile || null);
          alert("Workspace restored successfully!");
          setIsSettingsOpen(false);
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#000000] text-black dark:text-white transition-colors duration-300 font-sans">
      {!process.env.GEMINI_API_KEY && (
        <div className="bg-red-500 text-white text-[10px] py-1.5 px-4 text-center font-black uppercase tracking-[0.2em] sticky top-0 z-[100] animate-pulse">
          Critical: GEMINI_API_KEY Missing • Research functions disabled • Configure in Deployment Settings
        </div>
      )}
      <header className="px-6 h-16 flex items-center justify-between sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-apple-gray-100 dark:border-[#222]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => { setHasSearched(false); setView('search'); }}>
            <GraduationCap className="text-black dark:text-white w-6 h-6" />
            <span className="font-semibold text-lg hover:text-apple-blue transition-colors">ScholarMind</span>
          </div>
          
          <nav className="flex items-center gap-4">
            <button 
              onClick={() => setView('search')}
              className={cn("text-sm font-semibold px-4 py-1.5 rounded-full transition-all", 
                view === 'search' ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/5" : "text-apple-gray-400 hover:text-black dark:hover:text-white hover:bg-apple-gray-50 dark:hover:bg-white/5")}
            >
              Search
            </button>
            <button 
              onClick={() => setView('ai-chat')}
              className={cn("text-sm font-semibold px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5", 
                view === 'ai-chat' ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/5" : "text-apple-gray-400 hover:text-apple-blue hover:bg-apple-blue/5")}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Search with AI
            </button>
            <button 
              onClick={() => setView('library')}
              className={cn("text-sm font-semibold px-4 py-1.5 rounded-full flex items-center gap-2 transition-all", 
                view === 'library' ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/5" : "text-apple-gray-400 hover:text-black dark:hover:text-white hover:bg-apple-gray-50 dark:hover:bg-white/5")}
            >
              <Library className="w-4 h-4" />
              Library
            </button>
          </nav>
        </div>

        {hasSearched && view === 'search' && (
          <form onSubmit={handleSearch} className="flex-1 max-w-lg mx-12 relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search academic sources..."
              className="w-full bg-apple-gray-50 dark:bg-[#111] border-none rounded-2xl py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-apple-blue/10 outline-none transition-all group-hover:bg-apple-gray-100 dark:group-hover:bg-[#1a1a1a] dark:text-white"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-apple-gray-400" />
          </form>
        )}

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 text-apple-gray-400 hover:text-black dark:hover:text-white transition-colors rounded-full hover:bg-apple-gray-50 dark:hover:bg-[#111]"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="h-8 w-[1px] bg-apple-gray-100 dark:bg-[#222] mx-1" />
          
          <div className="flex items-center gap-3">
            {profile ? (
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg transition-transform active:scale-95 overflow-hidden"
                style={{ backgroundColor: profile.avatarColor }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="text-[11px] font-black uppercase tracking-widest bg-apple-blue text-white px-4 py-2 rounded-xl transition-all active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-20 right-6 w-72 ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] p-6 shadow-2xl z-[100]"
            >
              <div className="space-y-6">
                {profile && (
                  <div className="flex items-center gap-3 pb-4 border-b border-apple-gray-50 dark:border-[#222]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: profile.avatarColor }}>
                      {profile.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{profile.name}</p>
                      <p className="text-[10px] text-apple-gray-400 font-bold uppercase tracking-widest truncate">{profile.institution}</p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-apple-gray-400">Environment</h3>
                <div className="flex items-center justify-between p-3.5 bg-apple-gray-50 dark:bg-[#151515] rounded-[24px] border border-apple-gray-100 dark:border-[#222]">
                  <span className="text-xs font-bold text-apple-gray-500 dark:text-apple-gray-400">Appearance</span>
                  <button 
                    type="button"
                    onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    className="flex items-center gap-2 text-[11px] font-black bg-white dark:bg-[#252525] px-4 py-2 rounded-xl shadow-sm border border-apple-gray-100 dark:border-[#333] hover:scale-105 active:scale-95 transition-all text-black dark:text-white uppercase tracking-wider"
                  >
                    {theme === 'light' ? <Sun className="w-3 h-3 text-orange-400" /> : <Moon className="w-3 h-3 text-blue-400" />}
                    {theme} Mode
                  </button>
                </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={exportWorkspace}
                      className="flex-1 flex items-center justify-center gap-2 bg-apple-gray-50 dark:bg-[#151515] py-3.5 rounded-[20px] border border-apple-gray-100 dark:border-[#222] text-[10px] font-black uppercase tracking-widest text-apple-gray-500 hover:text-black dark:hover:text-white transition-all active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Backup
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-2 bg-apple-gray-50 dark:bg-[#151515] py-3.5 rounded-[20px] border border-apple-gray-100 dark:border-[#222] text-[10px] font-black uppercase tracking-widest text-apple-gray-500 hover:text-apple-blue transition-all active:scale-95 cursor-pointer">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Restore
                      <input type="file" accept=".scholar" onChange={importWorkspace} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-apple-gray-400">History</h3>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-2">
                    {searchHistory.length === 0 ? (
                      <p className="text-[10px] text-apple-gray-400 italic px-2">No history yet.</p>
                    ) : (
                      searchHistory.slice(0, 10).map((h, i) => (
                        <button 
                          key={i} 
                          onClick={() => { setQuery(h.query); handleSearch(); setIsSettingsOpen(false); }}
                          className="w-full text-left text-[11px] font-medium text-apple-gray-500 hover:text-apple-blue dark:text-apple-gray-400 dark:hover:text-apple-blue flex items-center gap-2.5 p-2 hover:bg-apple-gray-50 dark:hover:bg-[#151515] rounded-xl transition-all truncate"
                        >
                          <History className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{h.query}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-apple-gray-100 dark:border-[#222] flex flex-col gap-3">
                  <div className="text-[9px] text-apple-gray-400 font-extrabold uppercase tracking-[0.25em] leading-relaxed text-center">
                    ScholarMind Research <br /> Final Release 1.2.0
                  </div>
                  {profile && (
                    <button 
                      type="button"
                      onClick={handleLogout}
                      className="text-[11px] font-black uppercase tracking-[0.1em] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 py-3 rounded-2xl transition-all active:scale-95 border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
                    >
                      Deactivate Identity
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 flex flex-col relative overflow-hidden dark:bg-[#000000]">
        <AnimatePresence>
          {isProfileModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white dark:bg-[#0a0a0a] dark:border-[#222] rounded-[32px] shadow-2xl p-8 border border-apple-gray-100"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight mb-2 dark:text-white">Profile Setup</h2>
                    <p className="text-sm text-apple-gray-400 font-medium">Create your permanent scholarly identity on this browser.</p>
                  </div>
                  <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-apple-gray-50 dark:hover:bg-[#111] rounded-full">
                    <X className="w-6 h-6 dark:text-white" />
                  </button>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-gray-400 ml-4">Full Name</label>
                    <input 
                      required
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                      placeholder="e.g. Dr. Julian Archer"
                      className="w-full bg-apple-gray-50 dark:bg-[#111] border-none rounded-2xl py-4 px-6 text-sm focus:ring-2 focus:ring-apple-blue/20 outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-gray-400 ml-4">Institution</label>
                    <input 
                      type="text"
                      value={profileForm.institution}
                      onChange={e => setProfileForm({...profileForm, institution: e.target.value})}
                      placeholder="e.g. Stanford University"
                      className="w-full bg-apple-gray-50 dark:bg-[#111] border-none rounded-2xl py-4 px-6 text-sm focus:ring-2 focus:ring-apple-blue/20 outline-none dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col items-center gap-4 pt-4">
                    <button type="submit" className="ios-button-primary w-full py-4 text-sm">
                      Initialize Workspace
                    </button>
                    <p className="text-[9px] text-apple-gray-400 font-bold uppercase tracking-widest text-center">
                      No sign-up required • Stored 100% locally
                    </p>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {view === 'search' ? (
            <motion.div 
              key="search-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center"
            >
              {!hasSearched ? (
                <Hero onSearch={handleSearch} query={query} setQuery={setQuery} onOpenAiChat={() => setView('ai-chat')} />
              ) : (
                <SearchResults 
                  isSearching={isSearching} 
                  result={result} 
                  error={error} 
                  onSave={saveSource}
                  onDeepDive={handleDeepDive}
                  onOpenChat={() => setIsChatOpen(true)}
                  onCiteAll={handleCiteAll}
                />
              )}
            </motion.div>
          ) : view === 'ai-chat' ? (
            <motion.div 
              key="ai-chat-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center bg-apple-gray-50/30"
            >
              <AdvancedChatView 
                messages={advChatMessages}
                input={advChatInput}
                setInput={setAdvChatInput}
                onSend={handleAdvChat}
                isLoading={isAdvLoading}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="library-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 max-w-7xl mx-auto w-full"
            >
              <LibraryView 
                profile={profile}
                projects={projects} 
                savedSources={savedSources} 
                onCreateProject={createProject}
                onDownload={downloadCitations}
                onGenerateEssay={generateEssay}
                activeProject={activeProjectId}
                setActiveProject={setActiveProjectId}
                onRemoveSource={(url) => setSavedSources(savedSources.filter(s => s.url !== url))}
                formatCitation={formatCitation}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Citation Export Overlay */}
        <AnimatePresence>
          {citationExportSources && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-2xl bg-white rounded-[32px] shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
              >
                <div className="p-8 border-b border-apple-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Generate Citations</h2>
                    <p className="text-sm text-apple-gray-400 font-medium">Select a format and copy your bibliography.</p>
                  </div>
                  <button onClick={() => setCitationExportSources(null)} className="p-2 hover:bg-apple-gray-50 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  <div className="flex gap-2">
                    {(['APA', 'MLA', 'Chicago'] as const).map(f => (
                      <button 
                        key={f}
                        onClick={() => setExportFormat(f)}
                        className={cn("px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all", 
                          exportFormat === f ? "bg-apple-blue text-white shadow-lg shadow-apple-blue/20" : "bg-apple-gray-50 text-apple-gray-400 hover:bg-apple-gray-100")}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <div className="bg-apple-gray-50 p-6 rounded-[24px] border border-apple-gray-100 font-mono text-sm leading-relaxed whitespace-pre-wrap select-all">
                    {citationExportSources.map(s => {
                      const pseudoSaved: SavedSource = { ...s, savedAt: Date.now(), projectId: 'temp' };
                      return formatCitation(pseudoSaved, exportFormat);
                    }).join('\n\n')}
                  </div>
                </div>

                <div className="p-8 bg-apple-gray-50/50 border-t border-apple-gray-100 flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      const text = citationExportSources.map(s => {
                        const pseudoSaved: SavedSource = { ...s, savedAt: Date.now(), projectId: 'temp' };
                        return formatCitation(pseudoSaved, exportFormat);
                      }).join('\n\n');
                      copyToClipboard(text);
                    }}
                    className="ios-button-primary flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Copy All to Clipboard
                  </button>
                  <button onClick={() => setCitationExportSources(null)} className="ios-button-secondary">Done</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Synthesis Mode Chat Overlay */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed top-16 right-0 bottom-0 w-full max-w-md bg-white border-l border-apple-gray-100 shadow-2xl flex flex-col z-[50]"
            >
              <div className="p-6 border-b border-apple-gray-100 flex items-center justify-between bg-apple-gray-50/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Synthesis Chat</h3>
                    <p className="text-[10px] text-apple-gray-400 uppercase tracking-widest font-black">Interactive Analysis</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-apple-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col items-start bg-gradient-to-b from-white to-apple-gray-50/30">
                {chatMessages.length === 0 && (
                  <div className="w-full text-center py-12 space-y-4">
                    <p className="text-apple-gray-400 text-sm font-medium">Research analysis active. <br />What would you like to explore?</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Summarize key points', 'Find contradictions', 'Explain methodology'].map(t => (
                        <button 
                          key={t}
                          onClick={() => { setChatInput(t); }}
                          className="text-[10px] font-bold bg-white border border-apple-gray-100 px-3 py-1.5 rounded-full hover:border-apple-blue transition-colors"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={cn("max-w-[85%] p-4 rounded-[20px] text-sm leading-relaxed", 
                      msg.role === 'user' 
                        ? "bg-apple-blue text-white ml-auto rounded-tr-none" 
                        : "bg-white border border-apple-gray-100 text-[#1d1d1f] shadow-sm rounded-tl-none")}
                  >
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ))}
                {isMessageLoading && (
                  <div className="flex items-center gap-2 text-apple-gray-400 animate-pulse bg-white border border-apple-gray-100 p-4 rounded-[20px] rounded-tl-none">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing context...</span>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-apple-gray-100">
                <form onSubmit={handleSendMessage} className="relative group">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about this research..."
                    className="w-full bg-apple-gray-50 border-none rounded-2xl py-4 pl-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-apple-blue/10 transition-all group-hover:bg-apple-gray-100"
                  />
                  <button 
                    disabled={!chatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black text-white rounded-xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deep Analysis Overlay */}
        <AnimatePresence>
          {analyzingSource && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-3xl h-[80vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-apple-gray-100"
              >
                <div className="p-6 border-b border-apple-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="text-apple-blue w-6 h-6" />
                    <div>
                      <h3 className="font-bold text-lg">AI Deep Analysis</h3>
                      <p className="text-xs text-apple-gray-400 truncate max-w-[400px]">{analyzingSource.title}</p>
                    </div>
                  </div>
                  <button onClick={() => setAnalyzingSource(null)} className="p-2 hover:bg-apple-gray-50 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex-1 p-8 overflow-y-auto">
                  {isAnalyzing ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-6">
                      <Loader2 className="w-12 h-12 animate-spin text-apple-blue" />
                      <div className="text-center space-y-2">
                        <p className="font-medium">Contextualizing source data...</p>
                        <p className="text-sm text-apple-gray-400">Gemini is diving deep into the methodology and claims.</p>
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="prose prose-neutral max-w-none"
                    >
                      <ReactMarkdown>{analysisResult || ''}</ReactMarkdown>
                    </motion.div>
                  )}
                </div>

                <div className="p-6 bg-apple-gray-50 border-t border-apple-gray-100 flex justify-end gap-3">
                  <button 
                    onClick={() => { saveSource(analyzingSource); setAnalyzingSource(null); }}
                    className="ios-button-secondary border border-apple-gray-200"
                  >
                    Save for Reference
                  </button>
                  <button 
                    onClick={() => setAnalyzingSource(null)}
                    className="ios-button-primary"
                  >
                    Close Analysis
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="h-14 flex items-center justify-between px-8 border-t border-apple-gray-50 bg-apple-gray-50/30 text-[10px] text-apple-gray-400 uppercase tracking-widest font-black">
        <div className="flex gap-6">
          <span>Think Different Research</span>
          <span>© 2026 ScholarMind Pro</span>
        </div>
        <div className="flex gap-6">
          <span className="hover:text-black cursor-pointer transition-colors">Methodology</span>
          <span className="hover:text-black cursor-pointer transition-colors">Privacy & Rigor</span>
        </div>
      </footer>
    </div>
  );
}

function Hero({ onSearch, query, setQuery, onOpenAiChat }: { onSearch: (e: React.FormEvent) => void, query: string, setQuery: (v: string) => void, onOpenAiChat: () => void }) {
  const suggestions = [
    "Economic impact of Large Language Models 2024",
    "Physics of quantum decoherence in cold atoms",
    "Sociology of early Silicon Valley garage culture",
    "Neuroplasticity in the age of algorithmic attention"
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-6 py-24 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] dark:text-white text-apple-gray-900">
          ScholarMind. <br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-apple-blue to-emerald-500">Pro.</span>
        </h1>
        <p className="text-xl text-apple-gray-400 font-medium max-w-xl mx-auto dark:text-apple-gray-400">
          The world's most powerful academic search engine. Minimalist by design, rigorous by nature.
        </p>
      </motion.div>

      <form 
        onSubmit={onSearch}
        className="w-full relative max-w-2xl group"
      >
        <div className="ios-card overflow-hidden p-1 bg-white dark:bg-[#111] dark:border-[#222]">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scholarly archives..."
            className="w-full bg-transparent py-6 px-14 text-2xl font-medium outline-none placeholder:text-apple-gray-200 dark:text-white"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-apple-gray-200 dark:text-[#444]" />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black dark:bg-white text-white dark:text-black p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </form>

      <div className="mt-8">
        <button 
          onClick={onOpenAiChat}
          className="flex items-center gap-2 px-6 py-3 bg-apple-blue/5 dark:bg-apple-blue/10 text-apple-blue rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-apple-blue/10 dark:hover:bg-apple-blue/20 transition-all active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          Pro Advanced Research Chat
        </button>
      </div>

      <div className="mt-16 flex flex-wrap justify-center gap-3 max-w-2xl">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => { setQuery(suggestion); }}
            className="text-[12px] font-bold uppercase tracking-wider px-5 py-2.5 bg-apple-gray-50 dark:bg-[#111] rounded-full hover:bg-apple-gray-100 dark:hover:bg-[#1a1a1a] transition-colors text-apple-gray-400 dark:text-[#666] hover:text-black dark:hover:text-white"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function SearchResults({ isSearching, result, error, onSave, onDeepDive, onOpenChat, onCiteAll }: { isSearching: boolean, result: SearchResponse | null, error: string | null, onSave: (s: SearchSource) => void, onDeepDive: (s: SearchSource) => void, onOpenChat: () => void, onCiteAll: (sources: SearchSource[]) => void }) {
  return (
    <div className="w-full max-w-5xl px-8 py-12 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-12">
      <div className="min-w-0">
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <div className="flex items-center gap-4 text-apple-blue font-bold tracking-tight text-3xl">
                <Loader2 className="w-8 h-8 animate-spin" />
                Synthesizing...
              </div>
              <div className="space-y-6">
                <div className="h-4 bg-apple-gray-50 rounded-full w-3/4 animate-pulse" />
                <div className="h-4 bg-apple-gray-50 rounded-full w-full animate-pulse" />
                <div className="h-4 bg-apple-gray-50 rounded-full w-5/6 animate-pulse" />
                <div className="h-4 bg-apple-gray-50 rounded-full w-2/3 animate-pulse" />
              </div>
            </motion.div>
          ) : error ? (
            <div className="p-8 ios-card bg-red-50/30 border-red-100 text-red-600 font-medium">
              {error}
            </div>
          ) : result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={onOpenChat}
                    className="text-[12px] bg-emerald-500 text-white font-black px-5 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Synthesis Mode
                  </button>
                </div>
                <button 
                  onClick={() => {
                    if (result?.sources && result.sources.length > 0) {
                      onCiteAll(result.sources);
                    }
                  }}
                  className="text-[12px] font-black uppercase tracking-widest text-[#1d1d1f] dark:text-white hover:text-apple-blue flex items-center gap-2 transition-colors border border-apple-gray-200 dark:border-[#222] px-6 py-2.5 rounded-full hover:bg-apple-blue/5 bg-white dark:bg-black shadow-sm"
                >
                  <Bookmark className="w-4 h-4" />
                  Cite All Sources
                </button>
              </div>
              <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-xl prose-p:leading-relaxed prose-headings:tracking-tighter prose-headings:font-black 
                prose-strong:text-apple-blue prose-strong:font-black prose-a:text-apple-blue prose-a:font-bold prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <aside className="space-y-10">
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-apple-gray-400 mb-6 flex items-center gap-3">
            <BookOpen className="w-3.5 h-3.5" />
            Primary Sources
          </h3>
          <div className="space-y-4">
            {isSearching ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-24 ios-card animate-pulse" />
              ))
            ) : result?.sources.length ? (
              result.sources.map((source, i) => (
                <div key={i} className="ios-card dark:bg-[#0a0a0a] dark:border-[#222] p-5 group flex flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-black text-apple-blue bg-apple-blue/5 dark:bg-apple-blue/10 px-2 py-0.5 rounded">[{i + 1}]</span>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-apple-gray-50 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors">
                        <ExternalLink className="w-3.5 h-3.5 text-apple-gray-400" />
                      </a>
                    </div>
                    <h4 className="font-bold text-sm leading-tight text-black dark:text-white line-clamp-3">
                      {source.title}
                    </h4>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-apple-gray-50 dark:border-[#222]">
                    <button 
                      onClick={() => onSave(source)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-[#6c6c6c] dark:text-[#999] hover:text-apple-blue transition-colors rounded-xl hover:bg-apple-blue/5 dark:hover:bg-apple-blue/10"
                    >
                      <Bookmark className="w-3 h-3" />
                      Save
                    </button>
                    <button 
                      onClick={() => onDeepDive(source)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-apple-blue transition-colors rounded-xl bg-apple-blue/5 dark:bg-apple-blue/10 hover:bg-apple-blue/10 dark:hover:bg-apple-blue/20"
                    >
                      <Sparkles className="w-3 h-3" />
                      Dive
                    </button>
                  </div>
                </div>
              ))
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function LibraryView({ profile, projects, savedSources, onCreateProject, onDownload, onGenerateEssay, activeProject, setActiveProject, onRemoveSource, formatCitation }: { 
  profile: { name: string, institution: string, avatarColor: string } | null,
  projects: Project[], 
  savedSources: SavedSource[], 
  onCreateProject: () => void, 
  onDownload: (f: 'APA' | 'MLA' | 'Chicago') => void,
  onGenerateEssay: () => void,
  activeProject: string,
  setActiveProject: (id: string) => void,
  onRemoveSource: (url: string) => void,
  formatCitation: (s: SavedSource, f: any) => string
}) {
  const filteredSources = activeProject === 'all' 
    ? savedSources 
    : savedSources.filter(s => s.projectId === activeProject);

  return (
    <div className="grid grid-cols-[240px_1fr] gap-12 h-screen max-h-[80vh]">
      <aside className="space-y-8 flex flex-col">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-apple-gray-400 mb-4">Projects</h3>
          <div className="space-y-1">
            <button 
              onClick={() => setActiveProject('all')}
              className={cn("w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all", 
                activeProject === 'all' ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-apple-gray-50 dark:hover:bg-[#111] text-apple-gray-500 dark:text-apple-gray-400")}
            >
              All Sources
            </button>
            <button 
              onClick={() => setActiveProject('default')}
              className={cn("w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all", 
                activeProject === 'default' ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-apple-gray-50 dark:hover:bg-[#111] text-apple-gray-500 dark:text-apple-gray-400")}
            >
              Inbox
            </button>
            {projects.map(p => (
              <button 
                key={p.id}
                onClick={() => setActiveProject(p.id)}
                className={cn("w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all", 
                  activeProject === p.id ? "bg-black text-white dark:bg-white dark:text-black" : "hover:bg-apple-gray-50 dark:hover:bg-[#111] text-apple-gray-500 dark:text-apple-gray-400")}
              >
                {p.name}
              </button>
            ))}
          </div>
          <button 
            onClick={onCreateProject}
            className="w-full mt-4 flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-apple-blue hover:bg-apple-blue/5 rounded-xl transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            New Project
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-end gap-2 pb-12">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-apple-gray-400 mb-2">AI Tools</h3>
          <button 
            onClick={onGenerateEssay}
            className="ios-button-primary w-full text-xs py-3 flex items-center justify-center gap-2 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Make Essay
          </button>

          <h3 className="text-[10px] font-black uppercase tracking-widest text-apple-gray-400 mb-2">Export Library</h3>
          <button onClick={() => onDownload('APA')} className="ios-button-secondary w-full text-xs py-3">Export APA</button>
          <button onClick={() => onDownload('MLA')} className="ios-button-secondary w-full text-xs py-3">Export MLA</button>
          <button onClick={() => onDownload('Chicago')} className="ios-button-secondary w-full text-xs py-3">Export Chicago</button>
        </div>
      </aside>

      <div className="space-y-6 overflow-y-auto pr-4 custom-scrollbar">
        <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-black py-2 z-10 border-b border-apple-gray-100 dark:border-[#222]">
          <h2 className="text-3xl font-black tracking-tight dark:text-white">
            {profile ? `${profile.name.split(' ')[0]}'s Workspace` : activeProject === 'all' ? 'Research Library' : projects.find(p => p.id === activeProject)?.name || 'Inbox'}
          </h2>
          <span className="text-xs font-bold text-apple-gray-400">{filteredSources.length} Citations</span>
        </div>

        {filteredSources.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center space-y-4 ios-card bg-apple-gray-50/50 border-dashed border-2">
            <Bookmark className="w-12 h-12 text-apple-gray-200" />
            <div className="text-center">
              <p className="font-bold text-apple-gray-400 underline underline-offset-4 pointer-events-none">No sources saved yet.</p>
              <p className="text-sm text-apple-gray-400">Save sources from your research to see them here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSources.map((source, i) => (
              <div key={i} className="ios-card p-6 flex flex-col gap-4 bg-white dark:bg-[#0a0a0a] dark:border-[#222]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg leading-tight mb-2 dark:text-white uppercase tracking-tight">{source.title}</h4>
                    <p className="text-xs text-apple-blue font-medium truncate mb-4">{source.url}</p>
                    
                    <div className="flex flex-col gap-2 p-4 bg-apple-gray-50 dark:bg-[#111] rounded-2xl text-[11px] font-medium text-apple-gray-500 dark:text-apple-gray-400 border border-apple-gray-100 dark:border-transparent">
                      <div className="flex gap-4">
                        <span className="w-16 text-apple-gray-400 uppercase tracking-widest text-[9px] font-black">APA</span>
                        <span className="flex-1 italic">{formatCitation(source, 'APA')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => onRemoveSource(source.url)}
                      className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="p-3 text-apple-gray-400 hover:bg-apple-gray-50 dark:hover:bg-[#111] rounded-2xl transition-all">
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdvancedChatView({ messages, input, setInput, onSend, isLoading }: { 
  messages: { role: 'user' | 'model', content: string }[], 
  input: string, 
  setInput: (v: string) => void, 
  onSend: (e: React.FormEvent) => void,
  isLoading: boolean
}) {
  return (
    <div className="w-full max-w-4xl flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-black">
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-[32px] bg-black dark:bg-white flex items-center justify-center shadow-2xl">
              <Sparkles className="w-10 h-10 text-white dark:text-black" />
            </div>
            <div className="max-w-md">
              <h2 className="text-3xl font-black tracking-tight mb-4 dark:text-white">Advanced Scholar Chat</h2>
              <p className="text-apple-gray-400 font-medium leading-relaxed dark:text-[#444]">
                Powered by Gemini 3.1 Pro. Integrated with Google Search and deep data analysis tools.
                Ask about complex datasets, academic methodology, or code synthesis.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {[
                "Analyze recent trends in room-temperature superconductivity",
                "Generate a Python script for multivariate regression analysis",
                "Synthesize current consensus on the Voyager 1 data anomaly",
                "Evaluate the statistical significance of recent longevity studies"
              ].map(t => (
                <button 
                  key={t}
                  onClick={() => setInput(t)}
                  className="text-[11px] font-bold bg-white dark:bg-[#111] border border-apple-gray-100 dark:border-[#222] px-4 py-2 rounded-xl hover:border-apple-blue transition-colors px-4 truncate max-w-[300px] dark:text-apple-gray-400"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex gap-6 items-start", msg.role === 'user' ? "flex-row-reverse" : "")}
          >
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold", 
              msg.role === 'user' ? "bg-apple-blue text-white" : "bg-black dark:bg-white text-white dark:text-black")}>
              {msg.role === 'user' ? 'U' : 'AI'}
            </div>
            <div className={cn("flex-1 p-6 rounded-[28px] text-lg leading-relaxed shadow-sm border", 
              msg.role === 'user' ? "bg-apple-blue/5 dark:bg-apple-blue/10 border-apple-blue/10 text-[#1d1d1f] dark:text-white" : "bg-white dark:bg-[#0a0a0a] border-apple-gray-100 dark:border-[#222] text-[#1d1d1f] dark:text-white")}>
              <div className="prose prose-neutral dark:prose-invert max-w-none prose-strong:text-apple-blue prose-strong:font-black prose-pre:bg-apple-gray-900 prose-pre:text-apple-gray-50 prose-pre:p-6 prose-pre:rounded-3xl">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-6 items-start animate-pulse">
            <div className="w-8 h-8 rounded-full bg-apple-gray-100 dark:bg-[#222] flex items-center justify-center text-apple-gray-200">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex-1 p-6 rounded-[28px] bg-apple-gray-50 dark:bg-[#0a0a0a] border border-apple-gray-100 dark:border-[#222] h-32" />
          </div>
        )}
      </div>

      <div className="p-8 bg-gradient-to-t from-white via-white dark:from-black dark:via-black to-transparent">
        <form onSubmit={onSend} className="max-w-3xl mx-auto relative group">
          <div className="ios-card bg-white dark:bg-[#151515] dark:border-[#222] shadow-2xl shadow-black/5 dark:shadow-none p-1 ring-1 ring-apple-gray-100 dark:ring-[#333] hover:ring-apple-blue/20 transition-all">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend(e as any);
                }
              }}
              placeholder="Deep analysis, data synthesis, coding..."
              className="w-full bg-transparent p-4 pr-16 text-lg outline-none resize-none placeholder:text-apple-gray-300 dark:placeholder:text-[#444] dark:text-white"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black dark:bg-white text-white dark:text-black p-3 rounded-2xl disabled:opacity-30 disabled:scale-100 transition-all hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          <p className="text-center mt-3 text-[10px] uppercase font-black tracking-widest text-apple-gray-400">
            Advanced Scholarly Interface • Grounded by Google Search
          </p>
        </form>
      </div>
    </div>
  );
}

