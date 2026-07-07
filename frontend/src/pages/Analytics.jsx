import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, BrainCircuit, Target, Trophy } from 'lucide-react';
import { api } from '../services/api';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/api/analytics');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-20 text-center text-slate-500 animate-pulse font-bold text-xl">Loading Analytics...</div>;
  }

  const STATS = [
    { label: 'Mastery Rate', value: `${data.mastery_rate}%`, icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    { label: 'Cards Learned', value: data.memorized_cards, icon: BrainCircuit, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Documents Processed', value: data.total_documents, icon: BarChart3, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Quizzes Taken', value: data.quizzes_completed, icon: Target, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
          Learning Analytics
        </h1>
        <p className="text-slate-500 mt-2">Track your progress and AI document processing metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {STATS.map((stat, i) => (
          <div key={i} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:-translate-y-1 transition-all">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 font-medium">{stat.label}</h3>
            <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="p-8 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <TrendingUp className="w-32 h-32" />
          </div>
          <h2 className="text-2xl font-bold mb-6 relative z-10">AI Document Quality</h2>
          <div className="space-y-4 relative z-10">
            <div>
              <div className="flex justify-between mb-1"><span className="text-indigo-200 text-sm">Concept Coverage</span><span className="font-bold">{data.document_quality_metrics.concept_coverage}%</span></div>
              <div className="w-full bg-indigo-950 rounded-full h-2"><div className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full" style={{width: `${data.document_quality_metrics.concept_coverage}%`}}></div></div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><span className="text-indigo-200 text-sm">Retrieval Accuracy</span><span className="font-bold">{data.document_quality_metrics.retrieval_accuracy}%</span></div>
              <div className="w-full bg-indigo-950 rounded-full h-2"><div className="bg-gradient-to-r from-emerald-400 to-teal-400 h-2 rounded-full" style={{width: `${data.document_quality_metrics.retrieval_accuracy}%`}}></div></div>
            </div>
            <div>
              <div className="flex justify-between mb-1"><span className="text-indigo-200 text-sm">Context Usage</span><span className="font-bold">{data.document_quality_metrics.context_usage_percentage}%</span></div>
              <div className="w-full bg-indigo-950 rounded-full h-2"><div className="bg-gradient-to-r from-blue-400 to-indigo-400 h-2 rounded-full" style={{width: `${data.document_quality_metrics.context_usage_percentage}%`}}></div></div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">Strengths & Weaknesses</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-emerald-600 font-bold mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Strong Topics</h3>
              <div className="flex flex-wrap gap-2">
                {data.strong_topics?.map((t, i) => (
                  <span key={i} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm font-medium">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-rose-600 font-bold mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Areas to Review</h3>
              <div className="flex flex-wrap gap-2">
                {data.weak_topics?.map((t, i) => (
                  <span key={i} className="px-3 py-1 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 rounded-lg text-sm font-medium">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
