import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, 
  ResponsiveContainer, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { 
  LayoutDashboard, FileText, BarChart3, MapPin, Database, 
  Activity, Info, Search, BrainCircuit, Microscope, Sparkles,
  Zap, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import FileUploader from './components/FileUploader';
import { categorizeColumns, runANOVA, runChiSquare, summarizeData } from './utils/StatsEngine';
import { getAIInsights } from './utils/OpenAIClient';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
      ${active ? 'bg-indigo-600/30 text-scientific-cyan border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
    `}
  >
    <Icon className={`w-5 h-5 ${active ? 'text-scientific-cyan' : 'group-hover:text-scientific-cyan transition-colors'}`} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const Card = ({ title, children, icon: Icon, className = "" }) => (
  <div className={`glass rounded-2xl p-6 relative overflow-hidden group hover:bg-slate-800/60 transition-colors ${className}`}>
    <div className="absolute -top-6 -right-6 text-slate-700/20 group-hover:text-scientific-indigo/10 transition-colors">
      {Icon && <Icon className="w-24 h-24" />}
    </div>
    <div className="relative z-10">
      {title && <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-scientific-cyan" />} {title}
      </h3>}
      {children}
    </div>
  </div>
);

const StatsBadge = ({ label, value, colorClass = "text-scientific-cyan" }) => (
  <div className="flex flex-col">
    <span className="text-slate-400 text-xs font-medium uppercase">{label}</span>
    <span className={`text-2xl font-bold tracking-tighter ${colorClass}`}>{value}</span>
  </div>
);

export default function App() {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [summary, setSummary] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const handleDataLoaded = (newData) => {
    setData(newData);
    const cats = categorizeColumns(newData);
    setCategories(cats);
    setSummary(summarizeData(newData));
    setActiveTab('dashboard');
  };

  useEffect(() => {
    if (data && !aiInsights && !loadingAI) {
      generateAIInsights();
    }
  }, [data]);

  const generateAIInsights = async () => {
    if (!data) return;
    setLoadingAI(true);
    try {
      const insights = await getAIInsights(data.slice(0, 50)); // Only send a sample
      setAiInsights(insights);
    } catch (err) {
      console.error("AI Insight Error:", err);
      setAiInsights("AI Analysis currently unavailable. Please verify API configuration.");
    } finally {
      setLoadingAI(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm) return data.slice(0, 100);
    return data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    ).slice(0, 50);
  }, [data, searchTerm]);

  // Automated Statistical Tests
  const statsTests = useMemo(() => {
    if (!data) return [];
    const results = [];
    const cols = Object.keys(categories);
    const numerical = cols.filter(c => categories[c] === 'numerical');
    const categorical = cols.filter(c => categories[c] === 'categorical');

    // ANOVA: Numerical vs Categorical
    if (numerical.length && categorical.length) {
      const res = runANOVA(data, categorical[0], numerical[0]);
      if (res) results.push({ name: 'One-Way ANOVA', type: 'ANOVA', cols: [categorical[0], numerical[0]], ...res });
    }

    // Chi-Square: Categorical vs Categorical
    if (categorical.length >= 2) {
      const res = runChiSquare(data, categorical[0], categorical[1]);
      if (res) results.push({ name: 'Pearson Chi-Square', type: 'Chi-Square', cols: [categorical[0], categorical[1]], ...res });
    }

    return results;
  }, [data, categories]);

  const visualizationData = useMemo(() => {
    if (!data) return null;
    const cols = Object.keys(categories);
    const numCols = cols.filter(c => categories[c] === 'numerical');
    const catCols = cols.filter(c => categories[c] === 'categorical');

    // Aggregate for Bar Chart
    const barData = [];
    if (catCols.length) {
      const counts = {};
      data.forEach(row => {
        const val = row[catCols[0]];
        counts[val] = (counts[val] || 0) + 1;
      });
      Object.entries(counts).slice(0, 10).forEach(([name, count]) => barData.push({ name, count }));
    }

    return { barData, numCols, catCols };
  }, [data, categories]);

  const mapData = useMemo(() => {
    if (!data) return [];
    const latCol = Object.keys(data[0]).find(c => /lat/i.test(c));
    const lngCol = Object.keys(data[0]).find(c => /lon|lng/i.test(c));
    if (latCol && lngCol) {
      return data.slice(0, 200).map(r => ({ lat: parseFloat(r[latCol]), lng: parseFloat(r[lngCol]) })).filter(p => !isNaN(p.lat));
    }
    return [];
  }, [data]);

  const renderContent = () => {
    if (!data) return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-6 max-w-xl">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-scientific-cyan to-scientific-indigo rounded-full blur opacity-40 animate-pulse"></div>
              <div className="relative bg-slate-900 rounded-full p-6 border border-slate-800">
                <Microscope className="w-16 h-16 text-scientific-cyan" />
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Scientific Data Suite <span className="text-scientific-cyan text-sm uppercase font-mono bg-slate-800 px-3 py-1 rounded-full ml-2">v2.0 AI</span></h1>
          <p className="text-slate-400 text-lg">Sophisticated AI-driven statistical analysis. Ingest your raw data to begin processing with OpenAI integration.</p>
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl mt-12">
            <FileUploader onDataLoaded={handleDataLoaded} />
          </div>
        </motion.div>
      </div>
    );

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card title="Repository Overview" icon={Database}>
              <div className="grid grid-cols-2 gap-8 my-4">
                <StatsBadge label="Observations" value={summary?.rows.toLocaleString()} />
                <StatsBadge label="Variables" value={summary?.cols} />
                <StatsBadge label="Data Integrity" value={`${summary?.healthScore}%`} colorClass="text-emerald-400" />
                <StatsBadge label="Null Vectors" value={summary?.missing} colorClass="text-rose-400" />
              </div>
            </Card>

            <Card title="AI Intelligence Agent" className="md:col-span-2 glass-indigo" icon={BrainCircuit}>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                  <Sparkles className={`w-6 h-6 text-scientific-cyan ${loadingAI ? 'animate-spin' : 'animate-pulse'}`} />
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-tighter flex items-center gap-2">
                       {loadingAI ? "Agent is processing vectors..." : "OpenAI Synthesis Complete"}
                       {!loadingAI && <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                    </h4>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                      {loadingAI ? "Initiating deep neural analysis of data patterns and correlations. Please hold while we synthesize insights..." : (aiInsights || "No insights generated yet.")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {statsTests.map((test, index) => (
                    <div key={index} className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase font-mono">{test.type}: {test.cols.join(' vs ')}</span>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-2 italic">"{test.interpretation}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="Quick Distribution" className="md:col-span-3 h-80" icon={BarChart3}>
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visualizationData.barData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Bar dataKey="count" fill="url(#colorCyan)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Activity className="w-6 h-6 text-scientific-cyan" /> Hypothesis Testing Suite
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {statsTests.map((test, i) => (
                <Card key={i} className="border-l-4 border-scientific-cyan">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="text-scientific-cyan font-bold text-lg">{test.name} Results</h4>
                      <p className="text-slate-500 text-sm">Target Variables: <span className="text-indigo-400 font-mono">{test.cols.join(', ')}</span></p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg font-mono text-sm ${test.pValue < 0.05 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                      P-VALUE: {test.pValue.toFixed(6)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4 bg-slate-900/50 rounded-2xl border border-slate-800 mb-4">
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block uppercase">F / Chi² Stat</span>
                      <span className="text-lg font-mono text-white">{(test.fStat || test.chiSq).toFixed(4)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 block uppercase">Degrees of Freedom</span>
                      <span className="text-lg font-mono text-white">{test.df || `${test.df1}, ${test.df2}`}</span>
                    </div>
                    <div className="text-center">
                       <span className="text-[10px] text-slate-500 block uppercase">Significance Level</span>
                       <span className="text-lg font-mono text-white">α = 0.05</span>
                    </div>
                    <div className="text-center">
                       <span className="text-[10px] text-slate-500 block uppercase">Confidence</span>
                       <span className="text-lg font-mono text-emerald-400">95%</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 glass-indigo rounded-2xl">
                    <div className="bg-scientific-cyan/20 p-2 rounded-lg"><Info className="w-5 h-5 text-scientific-cyan" /></div>
                    <div>
                      <h5 className="font-bold text-white text-sm mb-1">Scientific Conclusion</h5>
                      <p className="text-slate-300 text-sm italic">"{test.interpretation}"</p>
                    </div>
                  </div>
                </Card>
              ))}
              {statsTests.length === 0 && <div className="text-center p-12 glass rounded-3xl text-slate-500">No automatic tests could be safely parameterized for this data structure.</div>}
            </div>
          </div>
        );

      case 'raw':
        return (
          <div className="glass rounded-2xl overflow-hidden flex flex-col h-[70vh]">
            <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-slate-900/50">
              <Search className="w-5 h-5 text-slate-500" />
              <input 
                placeholder="Query observations..." 
                className="bg-transparent border-none outline-none text-slate-200 text-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="overflow-auto scroll-smooth">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-900 shadow-xl z-20">
                  <tr>
                    {Object.keys(data[0]).map(col => (
                      <th key={col} className="px-6 py-4 font-semibold text-slate-400 border-b border-white/5 uppercase tracking-wide text-[10px]">
                        <div className="flex items-center gap-2">
                          {categories[col] === 'numerical' ? <Activity className="w-3 h-3 text-emerald-500" /> : <Database className="w-3 h-3 text-indigo-400" />}
                          {col}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredData.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition-colors group">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-6 py-4 text-slate-400 group-hover:text-slate-200 transition-colors">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="glass rounded-2xl p-6 h-[70vh] flex flex-col items-center justify-center animate-in zoom-in duration-500">
            {mapData.length > 0 ? (
              <div className="relative w-full h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="p-4 relative z-10 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                   <h3 className="text-lg font-bold flex items-center gap-2"><MapPin className="text-rose-500" /> Geospatial Distribution</h3>
                   <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-1 rounded-full uppercase tracking-tighter">{mapData.length} Coordinates</span>
                </div>
                <div className="relative w-full h-full p-20">
                   {/* Simplified Visualization: Scatter of Lat/Long normalized to panel */}
                   <svg viewBox="-180 -90 360 180" className="w-full h-full transform scale-y-[-1]">
                      {mapData.map((p, i) => (
                        <circle key={i} cx={p.lng} cy={p.lat} r="1.5" fill="#22d3ee" opacity="0.4" className="animate-pulse" />
                      ))}
                   </svg>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No geospatial vectors (Lat/Long) detected in the dataset.</p>
              </div>
            )}
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex font-sans">
      {/* Sidebar */}
      {data && (
        <div className="w-72 fixed h-screen border-r border-white/5 bg-slate-900/80 backdrop-blur-xl z-50 p-6 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-3 px-2">
              <div className="bg-scientific-cyan p-2 rounded-lg shadow-lg shadow-cyan-500/20">
                <Microscope className="w-6 h-6 text-slate-900" />
              </div>
              <h1 className="font-bold text-lg tracking-tight">STATPLOT</h1>
            </div>

            <nav className="space-y-2">
              <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
              <SidebarItem icon={Database} label="Raw Data" active={activeTab === 'raw'} onClick={() => setActiveTab('raw')} />
              <SidebarItem icon={Activity} label="Statistical Tests" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
              <SidebarItem icon={BarChart3} label="Visualizations" active={activeTab === 'visual'} onClick={() => setActiveTab('dashboard')} />
              <SidebarItem icon={MapPin} label="Geospatial" active={activeTab === 'map'} onClick={() => setActiveTab('map')} />
            </nav>
          </div>

          <div className="p-4 rounded-2xl glass-indigo flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-800 border border-scientific-indigo/30 flex items-center justify-center font-bold text-scientific-cyan text-sm">VA</div>
             <div className="flex flex-col">
                <span className="text-xs text-white font-bold leading-none">V. Amratha</span>
                <span className="text-[10px] text-indigo-400">Chief Researcher</span>
             </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${data ? 'ml-72' : ''}`}>
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 sticky top-0 bg-slate-900/60 backdrop-blur-lg z-40">
           <div className="flex items-center gap-2">
              <span className="text-slate-500 text-xs font-mono uppercase tracking-widest">{activeTab}</span>
           </div>
           {data && (
             <div className="flex items-center gap-4">
               <button onClick={generateAIInsights} className="text-scientific-cyan hover:text-white transition-colors text-xs font-semibold uppercase flex items-center gap-2">
                 <Zap className="w-4 h-4" /> Refresh AI
               </button>
               <button onClick={() => setData(null)} className="text-slate-400 hover:text-white transition-colors text-xs font-semibold uppercase flex items-center gap-2">
                 <FileText className="w-4 h-4" /> Reset Environment
               </button>
             </div>
           )}
        </header>

        <section className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </section>
      </main>

      <div className="fixed bottom-4 right-4 pointer-events-none z-50 animate-bounce">
         <div className="glass px-4 py-2 rounded-full text-[10px] text-scientific-cyan font-mono border border-scientific-cyan/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-scientific-cyan animate-pulse"></span>
            CONNECTED: STATISTICAL_NODE_B
         </div>
      </div>
    </div>
  );
}

const Tooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-3 rounded-lg border border-white/10 shadow-2xl">
        <p className="text-xs font-bold text-scientific-cyan uppercase mb-1">{label}</p>
        <p className="text-sm font-mono text-white">{payload[0].value} <span className="text-slate-500 ml-1 font-sans">Observations</span></p>
      </div>
    );
  }
  return null;
};
