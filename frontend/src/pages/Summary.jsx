import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, Loader2, Download, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

const Summary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const documentId = location.state?.documentId;

  useEffect(() => {
    if (!documentId) {
      navigate('/library');
      return;
    }
    fetchSummary();
  }, [documentId]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/summary?document_id=${documentId}`);
      setSummary(res.data.summary);
    } catch (err) {
      setError('Summary not generated yet or failed to load.');
    } finally {
      setLoading(false);
    }
  };

  const generateRevisionSheet = async () => {
    try {
      setLoading(true);
      await api.post('/api/revision-sheet', { document_id: documentId, type: 'full' });
      // In a real implementation we would download the sheet or show it
      alert('Revision sheet generated!');
    } catch (err) {
      setError('Failed to generate revision sheet.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-20">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <h2 className="mt-4 text-xl font-bold text-slate-700 dark:text-slate-200">Synthesizing Knowledge...</h2>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            Smart Summary
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">AI-generated executive summary and revision notes.</p>
        </div>
        <button 
          onClick={generateRevisionSheet}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2"
        >
          <Download className="w-5 h-5" />
          <span>Export Revision Sheet</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {summary && (
        <div className="space-y-6">
          <div className="p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center space-x-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              <span>Executive Summary</span>
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
              {summary.executive_summary}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/50">
              <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-300 mb-4">Key Concepts</h3>
              <ul className="space-y-2">
                {summary.key_concepts?.map((c, i) => (
                  <li key={i} className="flex items-start space-x-2 text-indigo-800 dark:text-indigo-400">
                    <span className="mt-1 text-indigo-500">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-3xl border border-pink-100 dark:border-pink-800/50">
              <h3 className="text-xl font-bold text-pink-900 dark:text-pink-300 mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-pink-500" />
                <span>Revision Notes</span>
              </h3>
              <div className="whitespace-pre-wrap text-pink-800 dark:text-pink-400">
                {summary.revision_notes}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Summary;
