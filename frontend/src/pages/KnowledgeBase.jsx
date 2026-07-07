import React, { useState } from 'react';
import { Search, BrainCircuit, FileText, Bot, Loader2, Link as LinkIcon, Sparkles } from 'lucide-react';
import { api } from '../services/api';

const KnowledgeBase = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setSearched(true);
      const res = await api.post('/api/search', { query, top_k: 5, document_id: 'all' });
      setResults(res.data.results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-bold mb-6">
          <Sparkles className="w-4 h-4" />
          <span>Vector Embeddings Active</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-6">
          Semantic Global Search
        </h1>
        
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
            <Search className="h-6 w-6 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question or search for concepts..."
            className="w-full pl-16 pr-32 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-full focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all shadow-lg text-lg text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
          <button 
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold transition-colors flex items-center space-x-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Search</span>}
          </button>
        </form>
      </div>

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-20 text-slate-500">
          <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl font-medium">No semantic matches found.</p>
        </div>
      )}

      <div className="space-y-4">
        {results.map((result, i) => (
          <div key={i} className="p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1 rounded-full">
                <Bot className="w-4 h-4" />
                <span>{(result.score * 100).toFixed(1)}% Match</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <FileText className="w-4 h-4" />
                <span>Page {result.page_number}</span>
              </div>
            </div>
            
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              ...{result.text}...
            </p>
            
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center text-sm font-medium text-slate-400 hover:text-indigo-500 cursor-pointer w-max transition-colors">
              <LinkIcon className="w-4 h-4 mr-2" />
              <span>View Source Context</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KnowledgeBase;
