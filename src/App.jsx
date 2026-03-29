import React, { useState } from 'react';
import { 
  FlaskConical, LayoutDashboard, Database, 
  Settings, HelpCircle, LogOut 
} from 'lucide-react';
import FileUploader from './components/FileUploader';
import Dashboard from './components/Dashboard';

const App = () => {
  const [data, setData] = useState(null);

  const handleDataLoaded = (jsonData) => {
    setData(jsonData);
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-slate-50">
      {/* Fixed Sidebar */}
      <aside className="w-20 lg:w-64 border-r border-slate-800 flex flex-col items-center lg:items-start p-4 lg:p-6 fixed inset-y-0 z-50 bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-12">
          <div className="p-2 bg-cyan-600 rounded-xl shadow-[0_0_20px_rgba(8,145,178,0.4)]">
            <FlaskConical size={24} className="text-white" />
          </div>
          <span className="hidden lg:block text-xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            StatPlot IQ
          </span>
        </div>

        <nav className="flex-1 space-y-2 w-full">
          {[
            { icon: LayoutDashboard, label: 'Scientific Suite', active: true },
            { icon: Database, label: 'Data Lab' },
            { icon: Settings, label: 'Suite Settings' },
            { icon: HelpCircle, label: 'Research Guide' },
          ].map((item, i) => (
            <button
              key={i}
              className={`flex items-center gap-4 p-3 rounded-xl w-full transition-all ${
                item.active 
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/50' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} />
              <span className="hidden lg:block font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-800 pt-6 w-full mt-auto">
           <button className="flex items-center gap-4 p-3 rounded-xl w-full text-slate-500 hover:text-red-400 transition-colors">
            <LogOut size={20} />
            <span className="hidden lg:block font-medium">Exit Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-20 lg:ml-64 p-4 lg:p-8 overflow-y-auto">
        {!data ? (
          <div className="flex flex-col items-center justify-center min-h-[80svh] space-y-12">
            <header className="text-center space-y-4 max-w-2xl px-4">
              <h1 className="text-4xl lg:text-7xl font-black tracking-tighter leading-none">
                Statistical Intelligence <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">Starts Here.</span>
              </h1>
              <p className="text-lg text-slate-400 max-w-lg mx-auto leading-relaxed uppercase tracking-widest text-xs font-bold opacity-60">
                Senior Full-Stack Research Engine v1.0.2
              </p>
            </header>
            <FileUploader onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          <Dashboard data={data} onClear={() => setData(null)} />
        )}
      </main>
    </div>
  );
};

export default App;
