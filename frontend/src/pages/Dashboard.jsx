import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderHeart, 
  Layers, 
  CheckCircle, 
  HelpCircle, 
  Plus, 
  Play, 
  BookOpen, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { flashcardService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await flashcardService.list();
        setSets(data);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Compute Metrics
  const totalSets = sets.length;
  let totalCards = 0;
  let knownCards = 0;
  let notKnownCards = 0;

  sets.forEach((set) => {
    totalCards += set.cards.length;
    set.cards.forEach((card) => {
      if (card.status === 'known') {
        knownCards += 1;
      } else {
        notKnownCards += 1;
      }
    });
  });

  const knownPercentage = totalCards > 0 ? Math.round((knownCards / totalCards) * 100) : 0;

  const MetricCard = ({ title, value, icon: Icon, colorClass, subtitle }) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 flex items-start justify-between">
      <div className="space-y-2">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</span>
        <h3 className="text-3xl font-extrabold text-slate-900">{value}</h3>
        {subtitle && <p className="text-xs font-semibold text-slate-500">{subtitle}</p>}
      </div>
      <div className={`p-3.5 rounded-2xl ${colorClass}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner message="Loading your study workspace..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Study Workspace</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Review metrics and manage your generated flashcards.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/create"
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Cards</span>
          </Link>
          <Link
            to="/review"
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md transition-all text-sm"
          >
            <Play className="w-4 h-4" />
            <span>Review Queue</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total sets"
          value={totalSets}
          icon={FolderHeart}
          colorClass="bg-indigo-50 text-indigo-600"
          subtitle="Study topics organized"
        />
        <MetricCard
          title="Total cards"
          value={totalCards}
          icon={Layers}
          colorClass="bg-violet-50 text-violet-600"
          subtitle="Individual study items"
        />
        <MetricCard
          title="Known cards"
          value={knownCards}
          icon={CheckCircle}
          colorClass="bg-emerald-50 text-emerald-600"
          subtitle={`${knownPercentage}% mastery rate`}
        />
        <MetricCard
          title="Review priority"
          value={notKnownCards}
          icon={HelpCircle}
          colorClass="bg-amber-50 text-amber-600"
          subtitle="Cards left to master"
        />
      </div>

      {/* Main Grid: Recent Sets and Mastery Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Recent Notes/Sets */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-xl font-extrabold text-slate-900">Recent Study Sets</h2>
            <Link 
              to="/history" 
              className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center space-x-1"
            >
              <span>See All History</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {sets.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm space-y-6">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800">No Flashcard Sets Yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  Paste your study notes or textbook text and our AI will automatically parse questions for you.
                </p>
              </div>
              <Link
                to="/create"
                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-sm text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Set</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sets.slice(0, 3).map((set) => (
                <div 
                  key={set.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
                >
                  <div className="space-y-2 max-w-lg flex-1">
                    <h3 className="text-lg font-extrabold text-slate-800 line-clamp-1">{set.title}</h3>
                    <p className="text-slate-400 text-xs font-semibold">
                      Created: {new Date(set.created_at).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })} | Cards: <span className="text-indigo-600 font-bold">{set.card_count}</span>
                    </p>
                    <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
                      {set.notes}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Link
                      to={`/review?setId=${set.id}`}
                      className="flex-1 sm:flex-initial text-center bg-indigo-550 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                    >
                      Study Set
                    </Link>
                    <Link
                      to="/history"
                      className="flex-1 sm:flex-initial text-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Learning Progress / Card Mastery Ring */}
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xl font-extrabold text-slate-900">Learning Insights</h2>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-8 flex flex-col items-center justify-center">
            {/* SVG Circular Mastery Gauge */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                {/* Track Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  className="stroke-slate-100 fill-none"
                  strokeWidth="10"
                />
                {/* Active Mastery Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="64"
                  className="stroke-indigo-600 fill-none transition-all duration-1000 ease-out"
                  strokeWidth="10"
                  strokeDasharray={402.1} // 2 * pi * r = 2 * 3.14159 * 64
                  strokeDashoffset={402.1 - (402.1 * knownPercentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center space-y-1">
                <span className="text-3xl font-extrabold text-slate-900">{knownPercentage}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mastered</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-slate-800 text-base flex items-center justify-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>Spaced Repetition Active</span>
              </h3>
              <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
                Cards tagged as "Not Known" are weighted heavier and will reappear at the front of your review queue.
              </p>
            </div>

            <div className="w-full border-t border-slate-100 pt-6 flex justify-around text-center">
              <div>
                <span className="block text-2xl font-extrabold text-emerald-600">{knownCards}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Known</span>
              </div>
              <div className="border-r border-slate-100" />
              <div>
                <span className="block text-2xl font-extrabold text-amber-600">{notKnownCards}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Needs Practice</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
