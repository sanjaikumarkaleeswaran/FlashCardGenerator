import React, { useState } from 'react';
import { Calendar, Loader2, ArrowRight, Target, Clock, BookOpen } from 'lucide-react';
import { api } from '../services/api';

const Planner = () => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [formData, setFormData] = useState({
    exam_date: '',
    study_hours: 2,
    target_score: 90,
    weak_subjects: ''
  });

  const generatePlan = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.post('/api/study-plan', {
        ...formData,
        weak_subjects: formData.weak_subjects.split(',').map(s => s.trim())
      });
      setPlan(res.data.plan);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="bg-indigo-100 dark:bg-indigo-900/30 w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 rotate-3">
          <Calendar className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
          AI Study Planner
        </h1>
        <p className="text-slate-500 mt-4 text-lg">Generate a personalized revision schedule optimized for memory retention and exam success.</p>
      </div>

      {!plan ? (
        <div className="max-w-xl mx-auto bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
          <form onSubmit={generatePlan} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Exam Date</label>
              <input type="date" required value={formData.exam_date} onChange={e => setFormData({...formData, exam_date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Daily Study Hours</label>
                <input type="number" required min="1" max="16" value={formData.study_hours} onChange={e => setFormData({...formData, study_hours: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Target Score (%)</label>
                <input type="number" required min="50" max="100" value={formData.target_score} onChange={e => setFormData({...formData, target_score: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Weak Subjects (comma separated)</label>
              <input type="text" placeholder="e.g. Memory Management, Deadlocks" required value={formData.weak_subjects} onChange={e => setFormData({...formData, weak_subjects: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center space-x-2">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Generate Custom Plan</span>}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><Target className="text-rose-500" /> Daily Schedule</h2>
            <div className="space-y-3">
              {plan.daily_schedule?.map((item, i) => (
                <div key={i} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center gap-4 hover:border-indigo-500 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">{i+1}</div>
                  <p className="font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="text-emerald-500" /> Weekly Master Plan</h2>
            <div className="space-y-3">
              {plan.weekly_plan?.map((item, i) => (
                <div key={i} className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="font-medium text-emerald-900 dark:text-emerald-200">{item}</p>
                </div>
              ))}
            </div>

            <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30 rounded-2xl mt-8">
              <h3 className="font-bold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                <Clock className="w-5 h-5" /> SM-2 Spaced Repetition Intervals
              </h3>
              <div className="flex gap-2 mt-4">
                {plan.suggested_review_intervals?.map((interval, i) => (
                  <div key={i} className="px-3 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-sm font-bold text-slate-700 dark:text-slate-300">
                    Day {interval}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planner;
