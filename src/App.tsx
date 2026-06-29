import React, { useState, useEffect } from 'react';
import { Search, Loader2, BookOpen, ExternalLink, ChevronRight, ChevronLeft, GraduationCap, Bookmark, FolderPlus, Download, Trash2, Library, Sparkles, X, History, Settings, LogOut, Sun, Moon, User, HelpCircle, Info, Globe, Palette, Shield, Eye, Type, Maximize2, Zap, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { scholarSearch, deepDive, synthesizeChat, advancedScholarChat, type SearchResponse, type SearchSource } from './lib/gemini';
import { cn } from './lib/utils';

interface Project {
  id: string;
  name: string;
  createdAt: number;
}

interface SavedResearch {
  id: string;
  title: string;
  content: string;
  projectId: string;
  savedAt: number;
  query: string;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [savedResearch, setSavedResearch] = useState<SavedResearch[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('all');
  const [view, setView] = useState<'search' | 'library' | 'ai-chat' | 'essay-builder' | 'settings'>('search');

  // Advanced Settings State
  const [searchStrictness, setSearchStrictness] = useState<'loose' | 'balanced' | 'strict'>('balanced');
  const [autoSaveResearch, setAutoSaveResearch] = useState(false);
  const [contentWidth, setContentWidth] = useState<'compact' | 'standard' | 'wide'>('standard');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [aiPersonality, setAiPersonality] = useState<'objective' | 'creative' | 'analytical'>('objective');

  // Tutorial State
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Advanced AI Chat State
  const [advChatMessages, setAdvChatMessages] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [advChatInput, setAdvChatInput] = useState('');
  const [isAdvLoading, setIsAdvLoading] = useState(false);

  const [isConfigured, setIsConfigured] = useState<boolean>(true);

  // Essay Builder State
  const [essayContent, setEssayContent] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [essayStep, setEssayStep] = useState<'topic' | 'structure' | 'draft'>('topic');

  // Persistence (Local Storage Only)
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    import('./lib/gemini').then(lib => {
      lib.checkConfig().then(configured => setIsConfigured(configured));
    });

    try {
      const storedProjects = localStorage.getItem('sm_projects');
      const storedResearch = localStorage.getItem('sm_research');
      const storedHistory = localStorage.getItem('sm_history');
      const storedTheme = localStorage.getItem('sm_theme');
      const storedProfile = localStorage.getItem('sm_profile');
      
      // New Settings
      const storedStrictness = localStorage.getItem('sm_strictness');
      const storedAutoSave = localStorage.getItem('sm_autosave');
      const storedWidth = localStorage.getItem('sm_width');
      const storedFontSize = localStorage.getItem('sm_fontsize');
      const storedPersonality = localStorage.getItem('sm_personality');

      if (storedProjects) setProjects(JSON.parse(storedProjects));
      if (storedResearch) setSavedResearch(JSON.parse(storedResearch));
      if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
      if (storedTheme) setTheme(storedTheme as 'light' | 'dark');
      if (storedProfile) setProfile(JSON.parse(storedProfile));
      
      if (storedStrictness) setSearchStrictness(storedStrictness as any);
      if (storedAutoSave) setAutoSaveResearch(storedAutoSave === 'true');
      if (storedWidth) setContentWidth(storedWidth as any);
      if (storedFontSize) setFontSize(storedFontSize as any);
      if (storedPersonality) setAiPersonality(storedPersonality as any);
      
      setIsInitialized(true);
    } catch (e) {
      console.error("Failed to load workspace:", e);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    
    localStorage.setItem('sm_projects', JSON.stringify(projects));
    localStorage.setItem('sm_research', JSON.stringify(savedResearch));
    localStorage.setItem('sm_history', JSON.stringify(searchHistory));
    localStorage.setItem('sm_theme', theme);
    localStorage.setItem('sm_strictness', searchStrictness);
    localStorage.setItem('sm_autosave', String(autoSaveResearch));
    localStorage.setItem('sm_width', contentWidth);
    localStorage.setItem('sm_fontsize', fontSize);
    localStorage.setItem('sm_personality', aiPersonality);

    if (profile) localStorage.setItem('sm_profile', JSON.stringify(profile));
    else localStorage.removeItem('sm_profile');
  }, [projects, savedResearch, searchHistory, theme, profile, isInitialized]);

  // Dark Mode Class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    e?.preventDefault();
    const targetQuery = overrideQuery || query;
    if (!targetQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);
    setView('search');
    
    try {
      setSearchHistory(prev => [{ query: targetQuery, timestamp: Date.now() }, ...prev].slice(0, 20));
      
      // Strict sanitization of query to prevent ByteString errors on Vercel
      const sanitizedQuery = targetQuery.replace(/[^\x00-\x7F]/g, " ").trim();
      
      const data = await scholarSearch(sanitizedQuery, { strictness: searchStrictness, personality: aiPersonality });
      setResult(data);

      if (autoSaveResearch) {
        handleSaveResearch(`Automated Research: ${targetQuery}`, data.answer);
      }
    } catch (err: any) {
      console.error(err);
      let msg = err?.message || "An error occurred while performing research.";
      const errStr = err?.message?.toLowerCase() || "";
      
      if (errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('429')) {
        msg = "Gemini Inference is cooling down. Please wait a moment.";
      } else if (errStr.includes('401') || errStr.includes('api_key_invalid') || errStr.includes('unauthorized')) {
        msg = "Gemini Error: The API Key is invalid or expired. Please check your AI Studio secrets.";
      }
      setError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveResearch = (title: string, content: string) => {
    const newResearch: SavedResearch = {
      id: Math.random().toString(36).substring(7),
      title,
      content,
      query: query || "General Research",
      projectId: activeProjectId === 'all' ? (projects[0]?.id || 'inbox') : activeProjectId,
      savedAt: Date.now()
    };
    setSavedResearch(prev => [newResearch, ...prev]);
    alert("Research snapshot saved to your Library.");
  };

  const handleRemoveResearch = (id: string) => {
    setSavedResearch(prev => prev.filter(r => r.id !== id));
  };

  const handleClearHistory = () => {
    if (window.confirm("Delete all search history?")) {
      setSearchHistory([]);
      localStorage.removeItem('sm_history');
    }
  };

  const startTutorial = () => {
    setView('search');
    setHasSearched(false);
    setTutorialStep(0);
    setShowTutorial(true);
  };

  const handleCreateProject = () => {
    const name = prompt("Project Name?");
    if (name) {
      const newProject: Project = {
        id: Math.random().toString(36).substring(7),
        name,
        createdAt: Date.now()
      };
      setProjects([...projects, newProject]);
    }
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
      // Sanitize input
      const sanitizedMsg = userMsg.replace(/[^\x00-\x7F]/g, " ").trim();
      const response = await advancedScholarChat(sanitizedMsg, history);
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
      // Brief visual feedback if needed
    }
  };

  const exportWorkspace = () => {
    const data = {
      projects,
      savedResearch,
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
        if (data.projects && data.savedResearch) {
          setProjects(data.projects);
          setSavedResearch(data.savedResearch);
          setSearchHistory(data.searchHistory || []);
          setTheme(data.theme || 'light');
          setProfile(data.profile || null);
          alert("Workspace restored successfully!");
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
      {!isConfigured && (
        <div className="bg-red-500 text-white text-[10px] py-1.5 px-4 text-center font-black uppercase tracking-[0.2em] sticky top-0 z-[100] animate-pulse">
          Critical: GEMINI_API_KEY Missing - Add it to "Secrets" in the AI Studio Settings menu to enable research.
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
              id="search-nav"
              onClick={() => setView('search')}
              className={cn("text-sm font-semibold px-4 py-1.5 rounded-full transition-all", 
                view === 'search' ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/5" : "text-apple-gray-400 hover:text-black dark:hover:text-white hover:bg-apple-gray-50 dark:hover:bg-white/5")}
            >
              Search
            </button>
            <button 
              id="ai-chat-nav"
              onClick={() => setView('ai-chat')}
              className={cn("text-sm font-semibold px-4 py-1.5 rounded-full transition-all flex items-center gap-1.5", 
                view === 'ai-chat' ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/5" : "text-apple-gray-400 hover:text-apple-blue hover:bg-apple-blue/5")}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Search with AI
            </button>
            <button 
              id="library-nav"
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
            id="tutorial-btn"
            onClick={startTutorial}
            className="p-2 text-apple-gray-400 hover:text-apple-blue transition-colors rounded-full hover:bg-apple-blue/5"
            title="Open Walkthrough"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          <button 
            id="settings-btn"
            onClick={() => setView('settings')}
            className={cn("p-2 transition-colors rounded-full", 
              view === 'settings' ? "bg-black text-white dark:bg-white dark:text-black" : "text-apple-gray-400 hover:text-black dark:hover:text-white hover:bg-apple-gray-50 dark:hover:bg-[#111]")}
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="h-8 w-[1px] bg-apple-gray-100 dark:bg-[#222] mx-1" />
          
          <div className="flex items-center gap-3">
            {profile ? (
              <button 
                id="profile-btn"
                onClick={() => setView('settings')}
                className="group relative flex items-center gap-2 pr-1 pl-3 py-1 bg-apple-gray-50 dark:bg-[#111] hover:bg-apple-gray-100 dark:hover:bg-[#1a1a1a] rounded-full transition-all active:scale-95 border border-apple-gray-100 dark:border-[#222]"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-apple-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">
                  {profile.name.split(' ')[0]}
                </span>
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-2 ring-white dark:ring-black translate-x-0.5"
                  style={{ backgroundColor: profile.avatarColor }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
              </button>
            ) : (
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="group flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {showTutorial && (
        <TutorialOverlay 
          step={tutorialStep} 
          setStep={setTutorialStep} 
          onClose={() => setShowTutorial(false)} 
        />
      )}

      <main className={cn(
        "flex-1 flex flex-col relative overflow-hidden dark:bg-[#000000]",
        fontSize === 'sm' && "text-sm",
        fontSize === 'lg' && "text-lg"
      )}>
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
                      No sign-up required - Stored 100% locally
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
              className={cn(
                "flex-1 flex flex-col items-center overflow-y-auto",
                contentWidth === 'compact' && "max-w-2xl mx-auto",
                contentWidth === 'wide' && "max-w-7xl mx-auto"
              )}
            >
              {!hasSearched ? (
                <Hero onSearch={handleSearch} query={query} setQuery={setQuery} onOpenAiChat={() => setView('ai-chat')} />
              ) : (
                <SearchResults 
                  isSearching={isSearching} 
                  result={result} 
                  error={error} 
                  onSaveSnapshot={() => result && handleSaveResearch(`Research: ${query}`, result.answer)}
                  onBack={() => setHasSearched(false)}
                />
              )}
            </motion.div>
          ) : view === 'library' ? (
            <div className={cn(
               "flex-1 flex flex-col",
               contentWidth === 'compact' && "max-w-2xl mx-auto w-full",
               contentWidth === 'wide' && "max-w-7xl mx-auto w-full"
            )}>
              <LibraryView 
                projects={projects}
                savedResearch={savedResearch}
                activeProject={activeProjectId}
                setActiveProject={setActiveProjectId}
                onRemoveResearch={handleRemoveResearch}
                onCreateProject={handleCreateProject}
                onOpenEssayBuilder={() => setView('essay-builder')}
              />
            </div>
          ) : view === 'essay-builder' ? (
            <div className={cn(
               "flex-1 flex flex-col",
               contentWidth === 'compact' && "max-w-2xl mx-auto w-full",
               contentWidth === 'wide' && "max-w-7xl mx-auto w-full"
            )}>
              <EssayBuilderView 
                researchItems={savedResearch}
                content={essayContent}
                setContent={setEssayContent}
                isDrafting={isDrafting}
                setIsDrafting={setIsDrafting}
              />
            </div>
          ) : view === 'settings' ? (
            <div className={cn(
               "flex-1 flex flex-col",
               contentWidth === 'compact' && "max-w-2xl mx-auto w-full",
               contentWidth === 'wide' && "max-w-7xl mx-auto w-full"
            )}>
              <SettingsView 
                theme={theme}
                setTheme={setTheme}
                profile={profile}
                setProfile={setProfile}
                onOpenProfileModal={() => setIsProfileModalOpen(true)}
                searchHistory={searchHistory}
                onClearHistory={handleClearHistory}
                onSearchHistoryItem={(q) => { setQuery(q); handleSearch(undefined, q); }}
                exportWorkspace={exportWorkspace}
                importWorkspace={importWorkspace}
                startTutorial={startTutorial}
                // New Settings props
                strictness={searchStrictness}
                setStrictness={setSearchStrictness}
                autoSave={autoSaveResearch}
                setAutoSave={setAutoSaveResearch}
                contentWidth={contentWidth}
                setContentWidth={setContentWidth}
                fontSize={fontSize}
                setFontSize={setFontSize}
                personality={aiPersonality}
                setPersonality={setAiPersonality}
              />
            </div>
          ) : (
            <div className={cn(
               "flex-1 flex flex-col",
               contentWidth === 'compact' && "max-w-2xl mx-auto w-full",
               contentWidth === 'wide' && "max-w-7xl mx-auto w-full"
            )}>
              <AdvancedChatView 
                messages={advChatMessages}
                input={advChatInput}
                setInput={setAdvChatInput}
                isLoading={isAdvLoading}
                onSend={handleAdvChat}
              />
            </div>
          )}
        </AnimatePresence>
      </main>

      <footer className="h-14 flex items-center justify-between px-8 border-t border-apple-gray-50 bg-apple-gray-50/30 text-[10px] text-apple-gray-400 uppercase tracking-widest font-black">
        <div className="flex gap-6">
          <span>Think Different Research</span>
          <span>(c) 2026 ScholarMind Pro</span>
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
            id="search-input"
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
          id="pro-chat-btn"
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

function SearchResults({ isSearching, result, error, onSaveSnapshot, onBack }: { isSearching: boolean, result: SearchResponse | null, error: string | null, onSaveSnapshot: () => void, onBack: () => void }) {
  return (
    <div className="w-full max-w-4xl px-8 py-12 mx-auto">
      <div className="mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-apple-gray-400 hover:text-black dark:hover:text-white transition-colors text-xs font-black uppercase tracking-widest group"
        >
          <div className="w-8 h-8 rounded-full border border-apple-gray-100 dark:border-[#222] flex items-center justify-center group-hover:bg-apple-gray-50 dark:group-hover:bg-[#111] transition-all">
            <ChevronLeft className="w-4 h-4" />
          </div>
          Back to Research Home
        </button>
      </div>
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-12 py-20"
          >
            <div className="flex flex-col items-center gap-6">
              <Loader2 className="w-12 h-12 animate-spin text-apple-blue" />
              <h2 className="text-3xl font-black tracking-tight">Synthesizing Intel...</h2>
            </div>
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="h-3 bg-apple-gray-50 dark:bg-[#111] rounded-full w-3/4 animate-pulse" />
              <div className="h-3 bg-apple-gray-50 dark:bg-[#111] rounded-full w-full animate-pulse" />
              <div className="h-3 bg-apple-gray-50 dark:bg-[#111] rounded-full w-5/6 animate-pulse" />
            </div>
          </motion.div>
        ) : error ? (
          <div className="p-12 ios-card bg-red-50/10 border-red-200/20 text-red-500 font-bold text-center">
            {error}
          </div>
        ) : result ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-end">
              <button 
                onClick={onSaveSnapshot}
                className="px-6 py-3 bg-apple-blue text-white font-black rounded-2xl text-[12px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-apple-blue/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Bookmark className="w-4 h-4" />
                Save Snapshot
              </button>
            </div>

            <div className="p-12 ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] shadow-2xl shadow-black/[0.02]">
              <div className="prose prose-neutral dark:prose-invert max-w-none 
                prose-p:text-xl prose-p:leading-relaxed prose-p:font-medium
                prose-headings:font-black prose-headings:tracking-tighter
                prose-strong:text-apple-blue prose-strong:font-black
                prose-blockquote:border-l-4 prose-blockquote:border-apple-blue prose-blockquote:bg-apple-blue/5 prose-blockquote:p-6 prose-blockquote:rounded-r-3xl">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-apple-gray-400 font-extrabold uppercase tracking-[0.2em] justify-center pt-8 border-t border-apple-gray-50 dark:border-[#222]">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Source: Internal Scholarly Gemini-3.1-Flash-Lite Logic
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function LibraryView({ projects, savedResearch, activeProject, setActiveProject, onRemoveResearch, onCreateProject, onOpenEssayBuilder }: { 
  projects: Project[], 
  savedResearch: SavedResearch[], 
  activeProject: string,
  setActiveProject: (id: string) => void,
  onRemoveResearch: (id: string) => void,
  onCreateProject: () => void,
  onOpenEssayBuilder: () => void
}) {
  const filtered = activeProject === 'all' ? savedResearch : savedResearch.filter(r => r.projectId === activeProject);

  return (
    <div className="flex-1 flex flex-col h-full bg-apple-gray-50/30 dark:bg-black overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar */}
        <aside className="w-72 border-r border-apple-gray-100 dark:border-[#222] p-8 space-y-10 bg-white dark:bg-[#050505]">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black tracking-[0.2em] text-apple-gray-400 uppercase ml-2">Collections</h3>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveProject('all')}
                className={cn("w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all", 
                  activeProject === 'all' ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "text-apple-gray-400 hover:bg-apple-gray-50 dark:hover:bg-[#111]")}
              >
                All Research
              </button>
              {projects.map(p => (
                <button 
                  key={p.id}
                  onClick={() => setActiveProject(p.id)}
                  className={cn("w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all", 
                    activeProject === p.id ? "bg-black text-white dark:bg-white dark:text-black shadow-lg" : "text-apple-gray-400 hover:bg-apple-gray-50 dark:hover:bg-[#111]")}
                >
                  {p.name}
                </button>
              ))}
              <button 
                onClick={onCreateProject}
                className="w-full text-left px-4 py-3 rounded-2xl text-sm font-bold text-apple-blue hover:bg-apple-blue/5 transition-all flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                New Collection
              </button>
            </div>
          </div>

          <div className="pt-8 border-t border-apple-gray-50 dark:border-[#222]">
            <button 
              id="builder-nav"
              onClick={onOpenEssayBuilder}
              disabled={savedResearch.length === 0}
              className="w-full ios-button-primary py-4 text-xs flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <GraduationCap className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              Build Research Essay
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-12 space-y-12 scroll-smooth bg-white dark:bg-black">
          <div className="w-full">
            <header className="mb-12">
              <h2 className="text-4xl font-black tracking-tight dark:text-white">
                {activeProject === 'all' ? 'Research Archive' : projects.find(p => p.id === activeProject)?.name}
              </h2>
              <p className="text-apple-gray-400 font-medium">{filtered.length} saved scholarly snapshots</p>
            </header>

            <div className="space-y-8">
              {filtered.length === 0 ? (
                <div className="py-32 text-center space-y-4">
                  <Library className="w-16 h-16 text-apple-gray-100 mx-auto" />
                  <p className="text-apple-gray-300 font-medium">Your research collection is empty.</p>
                </div>
              ) : (
                filtered.map(item => (
                  <motion.div 
                    layout
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] p-8 space-y-6 group relative"
                  >
                    <button 
                      onClick={() => onRemoveResearch(item.id)}
                      className="absolute top-8 right-8 p-2 text-apple-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-apple-blue">
                      <Sparkles className="w-3 h-3" />
                      Scholarly Snapshot - {new Date(item.savedAt).toLocaleDateString()}
                    </div>
                    
                    <h4 className="text-2xl font-black tracking-tight dark:text-white line-clamp-2">{item.title}</h4>
                    
                    <div className="prose prose-neutral dark:prose-invert max-w-none line-clamp-4 text-sm opacity-60">
                      <ReactMarkdown>{item.content}</ReactMarkdown>
                    </div>

                    <div className="pt-6 border-t border-apple-gray-50 dark:border-[#222] flex items-center justify-between">
                      <span className="text-[10px] text-apple-gray-400 font-bold italic">Query: "{item.query}"</span>
                      <button className="text-[10px] font-black uppercase tracking-widest text-[#1d1d1f] dark:text-white underline decoration-apple-blue decoration-2 underline-offset-4">
                        Read Full Findings
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function EssayBuilderView({ researchItems, content, setContent, isDrafting, setIsDrafting }: {
  researchItems: SavedResearch[],
  content: string,
  setContent: (v: string) => void,
  isDrafting: boolean,
  setIsDrafting: (v: boolean) => void
}) {
  const handleDraft = async () => {
    setIsDrafting(true);
    // Sanitize context and query
    const cleanContext = researchItems.map(r => `SOURCE: ${r.title}\nCONTENT: ${r.content}`).join('\n\n').replace(/[^\x00-\x7F]/g, " ");
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `Using these research snapshots, write a structured scholarly essay: \n\n${cleanContext}`.replace(/[^\x00-\x7F]/g, " ") })
      });
      const data = await res.json();
      setContent(data.answer);
    } catch {
      alert("Drafting failed.");
    } finally {
      setIsDrafting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-hidden px-8 py-12">
      <div className="w-full grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-12 h-full overflow-hidden">
        {/* Selection Area */}
        <div className="space-y-8 flex flex-col overflow-hidden">
          <header>
            <h2 className="text-3xl font-black tracking-tight dark:text-white">Essay Builder</h2>
            <p className="text-sm text-apple-gray-400 font-medium">Synthesizing {researchItems.length} research units</p>
          </header>

          <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
            {researchItems.map(item => (
              <div key={item.id} className="p-5 ios-card bg-apple-gray-50/50 dark:bg-[#111] dark:border-[#222]">
                <h4 className="text-[11px] font-black uppercase tracking-widest mb-2 dark:text-white">{item.title}</h4>
                <p className="text-[10px] text-apple-gray-400 line-clamp-2">{item.query}</p>
              </div>
            ))}
          </div>

          <button 
            onClick={handleDraft}
            disabled={isDrafting || researchItems.length === 0}
            className="w-full ios-button-primary py-5 text-sm flex items-center justify-center gap-3 shadow-2xl shadow-apple-blue/20"
          >
            {isDrafting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Generate Intelligence Draft
          </button>
        </div>

        {/* Writing Area */}
        <div className="ios-card dark:bg-[#0a0a0a] dark:border-[#222] shadow-2xl flex flex-col overflow-hidden border border-apple-gray-100">
          <div className="p-6 bg-apple-gray-50 dark:bg-[#111] border-b border-apple-gray-200 dark:border-[#222] flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-apple-gray-400">Scholarly Workspace</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setContent('')}
                className="p-2 hover:bg-apple-gray-200 dark:hover:bg-[#222] rounded-lg transition-colors text-apple-gray-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your scholarly draft will appear here..."
            className="flex-1 w-full bg-transparent p-12 text-lg font-medium leading-relaxed outline-none resize-none dark:text-white placeholder:text-apple-gray-100"
          />
        </div>
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
    <div className="w-full flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-black mx-auto">
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-20">
            <div className="w-20 h-20 rounded-[32px] bg-black dark:bg-white flex items-center justify-center shadow-2xl">
              <Sparkles className="w-10 h-10 text-white dark:text-black" />
            </div>
            <div className="max-w-md">
              <h2 className="text-3xl font-black tracking-tight mb-4 dark:text-white">Advanced AI Reasoning</h2>
              <p className="text-apple-gray-400 font-medium leading-relaxed dark:text-[#444]">
                Direct neural interface with ScholarMind's Gemini-3.1-Flash-Lite edge processing.
              </p>
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
              <div className="prose prose-neutral dark:prose-invert max-w-none">
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
          <div className="ios-card bg-white dark:bg-[#151515] dark:border-[#222] shadow-2xl p-1">
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
              placeholder="Deep analysis..."
              className="w-full bg-transparent p-4 pr-16 text-lg outline-none resize-none dark:text-white"
            />
            <button 
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black dark:bg-white text-white dark:text-black p-3 rounded-2xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsView({ 
  theme, setTheme, profile, setProfile, onOpenProfileModal, searchHistory, onClearHistory, onSearchHistoryItem, exportWorkspace, importWorkspace, startTutorial,
  strictness, setStrictness, autoSave, setAutoSave, contentWidth, setContentWidth, fontSize, setFontSize, personality, setPersonality 
}: { 
  theme: 'light' | 'dark', 
  setTheme: (t: 'light' | 'dark') => void, 
  profile: any, 
  setProfile: (p: any) => void, 
  onOpenProfileModal: () => void,
  searchHistory: { query: string, timestamp: number }[],
  onClearHistory: () => void,
  onSearchHistoryItem: (q: string) => void,
  exportWorkspace: () => void,
  importWorkspace: (e: any) => void,
  startTutorial: () => void,
  strictness: string,
  setStrictness: (s: any) => void,
  autoSave: boolean,
  setAutoSave: (b: boolean) => void,
  contentWidth: string,
  setContentWidth: (w: any) => void,
  fontSize: string,
  setFontSize: (s: any) => void,
  personality: string,
  setPersonality: (p: any) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-apple-gray-50/30 dark:bg-black p-8">
      <div className="w-full space-y-12 pb-24">
        {/* Header */}
        <div className="flex items-end justify-between border-b border-apple-gray-100 dark:border-[#222] pb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight dark:text-white">Settings</h1>
            <p className="text-apple-gray-400 font-medium mt-1">Personalize your research workstation.</p>
          </div>
          <button 
            onClick={startTutorial}
            className="px-6 py-3 bg-apple-blue text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-apple-blue/20 flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4" />
            Launch Tutorial
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Identity Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-gray-400 flex items-center gap-2">
              <User className="w-3 h-3" /> Identity
            </h3>
            <div className="ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] p-6 space-y-6">
              {profile ? (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl font-black text-white shadow-xl" style={{ backgroundColor: profile.avatarColor }}>
                    {profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-lg font-black dark:text-white">{profile.name}</h4>
                    <p className="text-xs text-apple-gray-400 font-bold uppercase tracking-widest">{profile.institution}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-apple-gray-400 mb-4 font-medium">No scholarship identity initialized.</p>
                  <button onClick={onOpenProfileModal} className="ios-button-primary w-full py-3">Initialize Identity</button>
                </div>
              )}
              {profile && (
                <div className="flex gap-2 pt-2 border-t border-apple-gray-50 dark:border-[#151515]">
                  <button onClick={onOpenProfileModal} className="flex-1 text-[10px] font-black uppercase tracking-widest py-3 text-apple-gray-400 hover:text-black dark:hover:text-white transition-colors">Edit Profile</button>
                  <button onClick={() => setProfile(null)} className="flex-1 text-[10px] font-black uppercase tracking-widest py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all">De-authorize</button>
                </div>
              )}
            </div>
          </section>

          {/* Appearance Section */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-gray-400 flex items-center gap-2">
              <Palette className="w-3 h-3" /> Appearance
            </h3>
            <div className="ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-apple-gray-500">Theme</span>
                <button 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="flex items-center gap-2 text-[11px] font-black bg-apple-gray-50 dark:bg-[#151515] px-4 py-2 rounded-xl transition-all hover:scale-105 uppercase tracking-wider"
                >
                  {theme === 'light' ? <Sun className="w-3 h-3 text-orange-400" /> : <Moon className="w-3 h-3 text-blue-400" />}
                  {theme}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-apple-gray-500">Font Size</span>
                <div className="flex gap-1 bg-apple-gray-50 dark:bg-[#151515] p-1 rounded-xl">
                  {['sm', 'md', 'lg'].map(s => (
                    <button 
                      key={s}
                      onClick={() => setFontSize(s)}
                      className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all", 
                        fontSize === s ? "bg-white dark:bg-[#252525] shadow-sm text-black dark:text-white" : "text-apple-gray-400")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-apple-gray-500">Layout Width</span>
                <div className="flex gap-1 bg-apple-gray-50 dark:bg-[#151515] p-1 rounded-xl">
                  {['compact', 'standard', 'wide'].map(w => (
                    <button 
                      key={w}
                      onClick={() => setContentWidth(w)}
                      className={cn("px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all", 
                        contentWidth === w ? "bg-white dark:bg-[#252525] shadow-sm text-black dark:text-white" : "text-apple-gray-400")}
                    >
                      {w === 'compact' ? 'Comp' : w === 'wide' ? 'Wide' : 'Std'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Research Preferences */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-gray-400 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Research Engines
            </h3>
            <div className="ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-apple-gray-500 block">Search Strictness</span>
                  <span className="text-[9px] text-apple-gray-400 uppercase tracking-widest font-bold">Gemini Filtering</span>
                </div>
                <select 
                  value={strictness}
                  onChange={(e) => setStrictness(e.target.value as any)}
                  className="bg-apple-gray-50 dark:bg-[#151515] text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none"
                >
                  <option value="loose">Loose</option>
                  <option value="balanced">Balanced</option>
                  <option value="strict">Strict</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-apple-gray-500 block">AI Personality</span>
                  <span className="text-[9px] text-apple-gray-400 uppercase tracking-widest font-bold">Synthesis Tone</span>
                </div>
                <select 
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value as any)}
                  className="bg-apple-gray-50 dark:bg-[#151515] text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl outline-none"
                >
                  <option value="objective">Objective</option>
                  <option value="analytical">Analytical</option>
                  <option value="creative">Creative</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-apple-gray-50 dark:border-[#151515]">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-apple-gray-500 block">Auto-save Snapshots</span>
                  <span className="text-[9px] text-apple-gray-400 uppercase tracking-widest font-bold">Direct to Hub</span>
                </div>
                <button 
                  onClick={() => setAutoSave(!autoSave)}
                  className={cn("w-12 h-6 rounded-full transition-all flex items-center px-1", 
                    autoSave ? "bg-apple-blue" : "bg-apple-gray-200 dark:bg-[#333]")}
                >
                  <div className={cn("w-4 h-4 rounded-full bg-white transition-all shadow-sm", 
                    autoSave ? "translate-x-6" : "translate-x-0")} />
                </button>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-gray-400 flex items-center gap-2">
              <Shield className="w-3 h-3" /> Data & Sync
            </h3>
            <div className="ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] p-6 space-y-4">
              <div className="flex gap-2">
                <button onClick={exportWorkspace} className="flex-1 flex items-center justify-center gap-2 bg-apple-gray-50 dark:bg-[#151515] py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-apple-gray-100 dark:hover:bg-[#222] transition-all">
                  <Download className="w-3 h-3" /> Backup
                </button>
                <label className="flex-1 flex items-center justify-center gap-2 bg-apple-gray-50 dark:bg-[#151515] py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-apple-gray-100 dark:hover:bg-[#222] transition-all cursor-pointer">
                  <ExternalLink className="w-3 h-3" /> Restore
                  <input type="file" accept=".scholar" onChange={importWorkspace} className="hidden" />
                </label>
              </div>
              <button 
                onClick={onClearHistory}
                className="w-full flex items-center justify-center gap-2 border border-red-500/20 text-red-500 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear History
              </button>
              <p className="text-[9px] text-apple-gray-400 font-bold uppercase tracking-widest text-center px-4 leading-relaxed">
                ScholarMind data is only stored in your browser's private indexedDB/storage.
              </p>
            </div>
          </section>
        </div>

        {/* History Preview */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-apple-gray-400 flex items-center gap-2">
            <History className="w-3 h-3" /> Full History
          </h3>
          <div className="ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] p-4">
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
              {searchHistory.length === 0 ? (
                <div className="py-12 text-center text-apple-gray-400 italic text-sm">No research sessions recorded.</div>
              ) : (
                searchHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-apple-gray-50 dark:hover:bg-[#151515] rounded-xl transition-all group">
                    <button 
                      onClick={() => onSearchHistoryItem(h.query)}
                      className="text-sm font-bold text-apple-gray-600 dark:text-apple-gray-400 hover:text-apple-blue transition-colors truncate flex-1 text-left"
                    >
                      {h.query}
                    </button>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Search className="w-3.5 h-3.5 text-apple-gray-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Footer info */}
        <div className="pt-12 flex flex-col items-center gap-4 border-t border-apple-gray-100 dark:border-[#222]">
          <div className="p-3 bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-xl shadow-black/5 dark:shadow-white/5 border border-apple-gray-100 dark:border-[#222]">
            <GraduationCap className="w-10 h-10" />
          </div>
          <div className="text-center">
            <h4 className="text-sm font-black dark:text-white">ScholarMind Pro v1.4.2</h4>
            <p className="text-[10px] text-apple-gray-400 font-bold uppercase tracking-[0.3em] mt-1">Local Edge Distribution</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TutorialOverlay({ step, setStep, onClose }: { step: number, setStep: (s: number) => void, onClose: () => void }) {
  const steps = [
    {
      title: "Welcome to the Lab",
      content: "ScholarMind Pro is a high-rigor academic workstation. Let's walk through your new capabilities.",
      target: null // Center modal
    },
    {
      title: "Objective Search",
      content: "Start your research here. Our engine is grounded like a library index -- no 'AI small talk', just direct, synthesized facts.",
      target: "search-input"
    },
    {
      title: "Search with AI",
      content: "Need deep reasoning? Switch to the AI Research Chat for open-ended analysis and source cross-referencing.",
      target: "ai-chat-nav"
    },
    {
      title: "The Research Hub",
      content: "Organize your findings into projects. Every 'Snapshot' you save lives here permanently in your local archive.",
      target: "library-nav"
    },
    {
      title: "Interactive Essay Builder",
      content: "Turn your saved snapshots into publication-ready drafts using the built-in synthesizing workspace.",
      target: "builder-nav"
    },
    {
      title: "Personalize",
      content: "Use Settings to adjust synthesis strictness, AI personality, and your scholarly identity.",
      target: "settings-btn"
    }
  ];

  const current = steps[step];
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (current.target) {
      const el = document.getElementById(current.target);
      if (el) {
        setHighlightRect(el.getBoundingClientRect());
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      
      {highlightRect && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute border-4 border-apple-blue rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] z-[1001]"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16
          }}
        />
      )}

      <motion.div 
        key={step}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-[1002] w-full max-w-sm ios-card bg-white dark:bg-[#0a0a0a] dark:border-[#222] p-8 shadow-2xl pointer-events-auto m-6"
      >
        <div className="mb-6">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-apple-blue mb-2">Step {step + 1} of {steps.length}</div>
          <h2 className="text-2xl font-black tracking-tight dark:text-white leading-tight">{current.title}</h2>
        </div>
        
        <p className="text-apple-gray-500 dark:text-apple-gray-400 font-medium leading-relaxed mb-8">
          {current.content}
        </p>

        <div className="flex items-center justify-between">
          <button 
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-apple-gray-400 hover:text-black dark:hover:text-white"
          >
            Skip Tour
          </button>
          
          <div className="flex gap-2">
            {step > 0 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="p-3 bg-apple-gray-50 dark:bg-[#151515] rounded-xl hover:scale-105 transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-black dark:text-white" />
              </button>
            )}
            <button 
              onClick={() => {
                if (step === steps.length - 1) {
                  onClose();
                } else {
                  setStep(step + 1);
                }
              }}
              className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/10"
            >
              {step === steps.length - 1 ? "Get Started" : "Next Step"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

