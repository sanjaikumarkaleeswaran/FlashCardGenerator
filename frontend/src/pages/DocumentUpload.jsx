import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle, Loader, Trash2 } from 'lucide-react';
import { flashcardService } from '../services/api';

const DocumentUpload = ({ onUploadSuccess, onUploadStart, onUploadReset }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  
  const inputRef = useRef(null);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;
    
    // Validate type
    const filename = selectedFile.name;
    const ext = filename.split('.').pop().toLowerCase();
    const validExtensions = ['pdf', 'docx', 'txt'];
    
    if (!validExtensions.includes(ext)) {
      setErrorMessage('Unsupported file format. Please upload a PDF, DOCX, or TXT file.');
      setStatus('error');
      return false;
    }
    
    // Validate size (5MB limit)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (selectedFile.size > maxSizeBytes) {
      setErrorMessage('File size exceeds the 5MB limit.');
      setStatus('error');
      return false;
    }
    
    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFileToServer = async (fileToUpload) => {
    setStatus('uploading');
    setErrorMessage('');
    setProgress(0);
    if (onUploadStart) onUploadStart();

    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const data = await flashcardService.uploadDocument(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      });
      
      setFile(fileToUpload);
      setStatus('success');
      if (onUploadSuccess) {
        onUploadSuccess(data.document_id, fileToUpload.name, data.preview);
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      const detail = err.response?.data?.detail || 'Failed to upload and extract text. Please try again.';
      setErrorMessage(detail);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        uploadFileToServer(droppedFile);
      }
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        uploadFileToServer(selectedFile);
      }
    }
  };

  const onButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  const resetUploader = () => {
    setFile(null);
    setProgress(0);
    setStatus('idle');
    setErrorMessage('');
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (onUploadReset) onUploadReset();
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {status === 'idle' && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-200 min-h-[220px] ${
            dragActive 
              ? 'border-indigo-600 bg-indigo-50/50' 
              : 'border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={handleChange}
          />
          <UploadCloud className="w-12 h-12 text-slate-400 group-hover:text-indigo-500 mb-3" />
          <p className="text-sm font-bold text-slate-700 text-center">
            Drag and drop your study file here, or click to browse
          </p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Supports PDF, DOCX, or TXT up to 5MB
          </p>
        </div>
      )}

      {status === 'uploading' && (
        <div className="border border-slate-200 rounded-2xl p-6 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600 animate-pulse">
                <Loader className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Processing Document...</p>
                <p className="text-xs text-slate-400 font-medium">Extracting study notes text</p>
              </div>
            </div>
            <span className="text-sm font-bold text-indigo-600">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-200" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'success' && file && (
        <div className="border border-emerald-100 rounded-2xl p-6 bg-emerald-50/30 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-700">
                <File className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 line-clamp-1">{file.name}</p>
                <p className="text-xs text-slate-400 font-bold">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetUploader}
              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 bg-emerald-100/50 py-2 px-3 rounded-xl w-fit">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Document text extracted successfully!</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start space-x-3 bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-xl text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Extraction Error</p>
              <p className="text-xs leading-normal opacity-90">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetUploader}
            className="w-full text-center py-3 border border-slate-200 hover:border-slate-300 bg-white text-slate-600 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
