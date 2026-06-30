import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History as HistoryIcon, 
  Calendar, 
  Layers, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { flashcardService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const History = () => {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State to track which sets have their card listings expanded
  const [expandedSetIds, setExpandedSetIds] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await flashcardService.list();
        setSets(data);
      } catch (err) {
        setError('Failed to retrieve your study history. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const toggleExpandSet = (setId) => {
    setExpandedSetIds((prev) => ({
      ...prev,
      [setId]: !prev[setId],
    }));
  };

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-250';
      case 'hard':
        return 'bg-rose-50 text-rose-700 border-rose-250';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-250';
    }
  };

  // Filter sets by search query
  const filteredSets = sets.filter((set) => {
    const query = searchQuery.toLowerCase();
    return (
      set.title?.toLowerCase().includes(query) ||
      set.notes?.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner message="Loading your study history..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <HistoryIcon className="w-8 h-8 text-indigo-600" />
            <span>Study History</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Browse and review your previously generated flashcard sets.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4.5 h-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search sets by title or note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {filteredSets.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-16 text-center shadow-sm space-y-6">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <HistoryIcon className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800">
              {searchQuery ? 'No Matching Study Sets Found' : 'No Study Sets Yet'}
            </h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">
              {searchQuery 
                ? 'Try searching with a different keyword or topic title.'
                : 'Pasted study notes will be stored in your history for future reviews.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => navigate('/create')}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-sm text-sm transition-all"
            >
              <span>Create Your First Set</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSets.map((set) => {
            const isExpanded = !!expandedSetIds[set.id];
            
            return (
              <div 
                key={set.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                {/* Header Row */}
                <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                  <div className="space-y-3 flex-1">
                    <h3 className="text-xl font-extrabold text-slate-850 leading-tight">
                      {set.title}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-semibold text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span>
                          {new Date(set.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Layers className="w-4 h-4 text-violet-500" />
                        <span>{set.card_count} Cards</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => toggleExpandSet(set.id)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide Cards' : 'View Cards'}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    <button
                      onClick={() => navigate(`/review?setId=${set.id}`)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Study</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Card Details Accordion */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-6 sm:p-8 space-y-6">
                    {/* Notes Detail */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/50 space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>Original Notes Source</span>
                      </h4>
                      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line font-medium">
                        {set.notes}
                      </p>
                    </div>

                    {/* Cards grid */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Set Cards List
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {set.cards.map((card, idx) => (
                          <div 
                            key={card.id || idx}
                            className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between gap-4"
                          >
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-slate-400">Card #{idx + 1}</span>
                              <span className={`px-2 py-0.5 border rounded-full ${getDifficultyColor(card.difficulty)}`}>
                                {card.difficulty}
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Question</span>
                                <p className="text-slate-800 font-bold text-sm leading-snug">{card.question}</p>
                              </div>
                              <div className="border-t border-slate-50 pt-2">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide block">Answer</span>
                                <p className="text-indigo-950 font-medium text-xs leading-snug">{card.answer}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 border-t border-slate-50 pt-2">
                              <span>Status: <span className={`font-bold ${card.status === 'known' ? 'text-emerald-600' : 'text-amber-500'}`}>{card.status === 'known' ? 'Known' : 'Needs Practice'}</span></span>
                              <span>Reviews: <span className="text-slate-700 font-bold">{card.reviewCount}</span></span>
                              <span>Priority: <span className="text-slate-700 font-bold">{card.priority}</span></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
