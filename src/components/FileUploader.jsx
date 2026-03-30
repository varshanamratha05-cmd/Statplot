import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';

const FileUploader = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);

  const processFile = (file) => {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const bstr = e.target.result;
        let wb = null;
        
        if (file.name.endsWith('.csv')) {
          wb = XLSX.read(bstr, { type: 'string' });
        } else {
          wb = XLSX.read(bstr, { type: 'binary' });
        }
        
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          throw new Error("No data found in file.");
        }

        setIsSuccess(true);
        setTimeout(() => {
          onDataLoaded(data);
        }, 500);
      } catch (err) {
        setError(err.message || "Failed to parse file.");
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <motion.div 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={`glass min-h-64 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300 w-full cursor-pointer p-12 text-center backdrop-blur-xl
          ${isDragging ? 'border-scientific-cyan bg-scientific-cyan/10' : 'border-scientific-indigo/30 hover:border-scientific-cyan/50'}
          ${isSuccess ? 'border-green-400 bg-green-400/10' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input 
          id="file-input"
          type="file" 
          accept=".xlsx, .csv" 
          style={{ display: 'none' }} 
          onChange={handleChange}
        />
        
        {isSuccess ? (
          <div className="flex flex-col items-center space-y-4 text-green-400 animate-in zoom-in duration-300">
            <CheckCircle className="w-16 h-16" />
            <h3 className="text-2xl font-bold tracking-tight">{fileName} Synthesized!</h3>
            <p className="text-green-400/70 text-sm uppercase tracking-widest font-bold">Injecting data into research suite...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-scientific-indigo/20 rounded-full border border-scientific-indigo/30 text-scientific-cyan">
              <Upload size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold tracking-tight text-white">Scientific Ingestion Zone</h3>
              <p className="text-slate-400">Drag & Drop research datasets (.csv, .xlsx)</p>
            </div>
            <div className="flex gap-6 mt-4">
              <span className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <FileSpreadsheet size={18} className="text-emerald-500" /> Excel (.xlsx)
              </span>
              <span className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <FileText size={18} className="text-indigo-400" /> CSV
              </span>
            </div>
          </div>
        )}
      </motion.div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-950/20 border border-red-500/50 text-red-400 rounded-xl flex items-center gap-3"
        >
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </motion.div>
      )}
    </div>
  );
};

export default FileUploader;
