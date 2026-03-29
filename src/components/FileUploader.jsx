import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const FileUploader = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (file) => {
    setError(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        let workbook = null;
        
        if (file.name.endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'string' });
        } else {
          workbook = XLSX.read(data, { type: 'binary' });
        }
        
        const firstSheetName = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
        
        if (jsonData.length === 0) {
          throw new Error("No data found in file.");
        }
        
        onDataLoaded(jsonData);
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

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <motion.div 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={`bg-slate-800/50 border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer backdrop-blur-xl ${
          isDragging ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-700 hover:border-slate-600'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <input 
          id="fileInput"
          type="file" 
          className="hidden" 
          accept=".csv, .xlsx, .xls"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-slate-900 rounded-full border border-slate-700 text-cyan-400">
            <Upload size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Scientific Ingestion Zone</h3>
            <p className="text-slate-400">Drag & Drop .csv or .xlsx research datasets</p>
          </div>
          <div className="flex gap-4 mt-4">
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <FileText size={16} /> Excel (.xlsx)
            </span>
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <FileText size={16} /> CSV
            </span>
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-950/20 border border-red-500/50 text-red-400 rounded-xl flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default FileUploader;
