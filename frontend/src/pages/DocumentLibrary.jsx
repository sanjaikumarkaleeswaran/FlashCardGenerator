import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, FileText, Search, Plus, Trash2, 
  ExternalLink, File, Image as ImageIcon, Music,
  Loader2, AlertCircle, FileVolume, Sparkles
} from 'lucide-react';
import { api } from '../services/api';

const DocumentLibrary = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/knowledge');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load knowledge base.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Supported extensions mapping based on backend specs
    const validTypes = ['pdf', 'docx', 'txt', 'pptx', 'png', 'jpg', 'jpeg', 'webp', 'tiff', 'mp3', 'wav', 'm4a'];
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (!validTypes.includes(ext)) {
      setError(`Unsupported file type: .${ext}`);
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', file);
      
      await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await fetchDocuments();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'tiff'].includes(ext)) return <ImageIcon className="w-8 h-8 text-pink-500" />;
    if (['mp3', 'wav', 'm4a'].includes(ext)) return <FileVolume className="w-8 h-8 text-indigo-500" />;
    return <FileText className="w-8 h-8 text-blue-500" />;
  };

  const filteredDocs = documents.filter(doc => 
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.filename?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Knowledge Library
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Upload documents, images, and audio to build your AI knowledge base.
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".pdf,.docx,.txt,.pptx,.png,.jpg,.jpeg,.webp,.tiff,.mp3,.wav,.m4a"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 disabled:opacity-70 disabled:hover:scale-100"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            <span>{uploading ? 'Processing AI...' : 'Upload File'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 text-rose-700 dark:text-rose-400 flex items-center space-x-3 rounded-r-xl">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search your knowledge base..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 text-lg"
        />
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          <p className="font-medium animate-pulse">Loading knowledge base...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-24 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-6 shadow-inner">
            <FileText className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">No documents found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            Upload your first document to start generating AI flashcards, quizzes, and summaries.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center justify-center space-x-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Document</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDocs.map((doc) => (
            <div 
              key={doc._id} 
              className="group relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors">
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>

              <div className="flex items-start space-x-4 mb-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl shadow-inner group-hover:scale-110 transition-transform duration-300">
                  {getFileIcon(doc.filename)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate text-lg" title={doc.title}>
                    {doc.title || doc.filename}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                    {doc.filename}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-6 font-medium bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                <span className="flex items-center space-x-1">
                  <File className="w-3.5 h-3.5" />
                  <span>{doc.chunk_count || 0} chunks</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => navigate('/assistant', { state: { documentId: doc._id } })}
                  className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl text-sm font-bold flex items-center justify-center space-x-1 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>AI Chat</span>
                </button>
                <button 
                  onClick={() => navigate('/summary', { state: { documentId: doc._id } })}
                  className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-xl text-sm font-bold flex items-center justify-center space-x-1 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Summary</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentLibrary;
