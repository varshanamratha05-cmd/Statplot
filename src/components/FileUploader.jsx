import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, FileText, CheckCircle } from 'lucide-react';

const FileUploader = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [fileName, setFileName] = useState(null);

  const processFile = (file) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const bstr = e.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      setIsSuccess(true);
      setTimeout(() => {
        onDataLoaded(data);
      }, 500);
    };

    reader.readAsBinaryString(file);
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
    <div 
      className={`glass h-48 rounded-xl flex flex-col items-center justify-center border-2 border-dashed transition-all duration-300 w-full cursor-pointer
        ${isDragging ? 'border-scientific-cyan bg-scientific-cyan/10 scale-[1.02]' : 'border-scientific-indigo/30'}
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
        <div className="flex flex-col items-center space-y-2 text-green-400 animate-in zoom-in duration-300">
          <CheckCircle className="w-12 h-12" />
          <span className="font-semibold">{fileName} Loaded!</span>
        </div>
      ) : (
        <>
          <div className="p-3 bg-scientific-indigo/20 rounded-full mb-3">
            <Upload className="w-8 h-8 text-scientific-cyan" />
          </div>
          <p className="text-scientific-cyan font-medium">Click or Drag & Drop File</p>
          <span className="text-slate-500 text-sm mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Excel (.xlsx) or CSV
          </span>
        </>
      )}
    </div>
  );
};

export default FileUploader;
