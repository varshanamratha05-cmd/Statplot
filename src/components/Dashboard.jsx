import React, { useMemo, useState } from 'react';
import { 
  Database, BarChart3, PieChart, Table as TableIcon, 
  Map as MapIcon, Info, TrendingUp, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, LineChart, Line
} from 'recharts';
import { identifyColumns, runANOVA, runChiSquare } from '../utils/StatsEngine';
import { motion, AnimatePresence } from 'framer-motion';

const TabButton = ({ id, activeTab, setActiveTab, icon: Icon, label }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
      activeTab === id 
        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_-5px_rgba(6,182,212,0.5)]' 
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    }`}
  >
    <Icon size={18} />
    <span className="font-medium">{label}</span>
  </button>
);

const Dashboard = ({ data }) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [searchTerm, setSearchTerm] = useState('');
  
  const columns = useMemo(() => identifyColumns(data), [data]);
  
  const stats = useMemo(() => {
    const totalRows = data.length;
    const totalCols = columns.length;
    const missingValues = columns.reduce((acc, col) => acc + col.missingCount, 0);
    const healthScore = Math.max(0, 100 - (missingValues / (totalRows * totalCols)) * 100);
    
    return { totalRows, totalCols, missingValues, healthScore: healthScore.toFixed(0) };
  }, [data, columns]);

  // Logic for Auto-Stats
  const testResults = useMemo(() => {
    const results = [];
    const catCols = columns.filter(c => c.type === 'categorical').slice(0, 3);
    const numCols = columns.filter(c => c.type === 'numerical').slice(0, 3);
    
    // ANOVA cases
    if (catCols.length > 0 && numCols.length > 0) {
      results.push(runANOVA(data, catCols[0].name, numCols[0].name));
    }
    
    // Chi-Square cases
    if (catCols.length > 1) {
      results.push(runChiSquare(data, catCols[0].name, catCols[1].name));
    }
    
    return results;
  }, [data, columns]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data.slice(0, 100);
    return data.filter(row => 
      Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 100);
  }, [data, searchTerm]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: stats.totalRows, icon: Database, color: 'text-cyan-400' },
          { label: 'Data Health', value: `${stats.healthScore}%`, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Missing Values', value: stats.missingValues, icon: AlertCircle, color: 'text-amber-400' },
          { label: 'Indicators', value: stats.totalCols, icon: TrendingUp, color: 'text-indigo-400' },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass p-6 rounded-2xl flex items-center justify-between border-slate-700/50"
          >
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">{s.label}</p>
              <h2 className={`text-3xl font-bold ${s.color}`}>{s.value}</h2>
            </div>
            <s.icon className={`${s.color} opacity-20`} size={48} />
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
        <TabButton id="summary" activeTab={activeTab} setActiveTab={setActiveTab} icon={BarChart3} label="Dashboard" />
        <TabButton id="raw" activeTab={activeTab} setActiveTab={setActiveTab} icon={TableIcon} label="Raw Data" />
        <TabButton id="stats" activeTab={activeTab} setActiveTab={setActiveTab} icon={Info} label="Statistical Tests" />
        <TabButton id="geo" activeTab={activeTab} setActiveTab={setActiveTab} icon={MapIcon} label="Geospatial" />
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {activeTab === 'summary' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl h-[400px]">
                  <h3 className="text-xl font-bold mb-4">Metric Distribution</h3>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={columns.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                      />
                      <Bar dataKey="uniqueCount" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="glass p-6 rounded-2xl">
                  <h3 className="text-xl font-bold mb-4">Scientific Conclusion</h3>
                  <div className="space-y-4">
                    {testResults.map((res, i) => (
                      <div key={i} className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-cyan-300 underline decoration-cyan-500/30 underline-offset-4">{res.testName}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${res.significant ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                            {res.significant ? 'Significant' : 'Not Significant'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed italic">
                          "{res.interpretation}"
                        </p>
                      </div>
                    ))}
                    {testResults.length === 0 && (
                      <p className="text-slate-400 italic">No valid categorical/numerical pairs found for automatic testing.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'raw' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-2xl overflow-hidden">
               <div className="p-4 border-b border-slate-800 bg-slate-800/20">
                <input 
                  type="text" 
                  placeholder="Search dataset..." 
                  className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-tighter">
                    <tr>
                      {Object.keys(data[0] || {}).map(k => (
                        <th key={k} className="px-6 py-4 font-semibold border-b border-slate-800 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-6 py-3 text-slate-300 max-w-[200px] truncate">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testResults.map((res, i) => (
                <div key={i} className="glass p-6 rounded-2xl border-l-4 border-cyan-500">
                  <h4 className="text-xl font-bold text-cyan-400 mb-4">{res.testName}</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 bg-slate-900 rounded-lg">
                      <span className="text-xs text-slate-500 block">p-Value</span>
                      <span className="text-xl font-mono text-indigo-400">{res.pValue}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg">
                      <span className="text-xs text-slate-500 block">Statistic</span>
                      <span className="text-xl font-mono text-amber-400">{res.fStatistic || res.statistic}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
                    <h5 className="text-sm font-bold text-slate-400 mb-2">Scientific Interpretation</h5>
                    <p className="text-slate-300 text-sm">{res.interpretation}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'geo' && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass p-8 rounded-3xl h-[600px] flex flex-col items-center justify-center">
                <div className="mb-6 text-center">
                  <MapIcon size={64} className="text-cyan-500 opacity-20 mx-auto" />
                  <h3 className="text-2xl font-bold mt-4">Geospatial Distribution</h3>
                  <p className="text-slate-400">Rendering coordinate-based mapping from provided dataset.</p>
                </div>
                <ResponsiveContainer width="100%" height="80%">
                    <ScatterChart>
                      <XAxis type="number" dataKey="Longitude" name="Long" stroke="#334155" hide />
                      <YAxis type="number" dataKey="Latitude" name="Lat" stroke="#334155" hide />
                      <ZAxis type="number" range={[20, 20]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Points" data={data.filter(d => d.Latitude && d.Longitude)} fill="#06b6d4" />
                    </ScatterChart>
                </ResponsiveContainer>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Dashboard;
