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
  AlertCircle,
  Check,
  Pencil,
  Trash2,
  X,
  Plus,
  Save,
  HelpCircle,
  Download,
  BookOpen,
  Folder
} from 'lucide-react';
import { flashcardService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmationModal from '../components/ConfirmationModal';

const History = () => {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion open/close state
  const [expandedSetIds, setExpandedSetIds] = useState({});

  // Set Rename / Delete CRUD state
  const [editingSetId, setEditingSetId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState('');
  const [setToDelete, setSetToDelete] = useState(null);

  // Card CRUD state
  const [editingCardId, setEditingCardId] = useState(null);
  const [editCardData, setEditCardData] = useState({
    type: 'qa',
    question: '',
    answer: '',
    options: ['', '', '', ''],
    difficulty: 'medium'
  });
  const [cardToDelete, setCardToDelete] = useState(null);

  // New Card addition state
  const [addingToSetId, setAddingToSetId] = useState(null);
  const [newCardData, setNewCardData] = useState({
    type: 'qa',
    question: '',
    answer: '',
    options: ['', '', '', ''],
    difficulty: 'medium'
  });

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
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'hard':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // --- CRUD Event Handlers ---

  // 1. Rename Set
  const startRenameSet = (set) => {
    setEditingSetId(set.id);
    setEditTitleValue(set.title);
  };

  const cancelRenameSet = () => {
    setEditingSetId(null);
    setEditTitleValue('');
  };

  const saveRenameSet = async (setId) => {
    if (!editTitleValue.trim()) return;
    try {
      await flashcardService.renameSet(setId, editTitleValue);
      setSets((prev) =>
        prev.map((s) => (s.id === setId ? { ...s, title: editTitleValue.trim() } : s))
      );
      setEditingSetId(null);
    } catch (err) {
      setError('Failed to rename study set. Please try again.');
    }
  };

  const confirmDeleteSet = async (setId) => {
    try {
      await flashcardService.deleteSet(setId);
      setSets((prev) => prev.filter((s) => s.id !== setId));
      setSetToDelete(null);
    } catch (err) {
      setError('Failed to delete study set. Please try again.');
    }
  };

  const handleExportCSV = async (setId, title) => {
    try {
      const blob = await flashcardService.exportSetCsv(setId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      const safeFilename = title.replace(/[^a-zA-Z0-9_\-]/g, '_');
      link.setAttribute('download', `${safeFilename}_flashcards.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to export study set CSV. Please try again.');
    }
  };

  // 3. Add Card
  const handleNewCardChange = (field, val, index = null) => {
    if (index !== null) {
      const updatedOpts = [...newCardData.options];
      updatedOpts[index] = val;
      setNewCardData((prev) => ({ ...prev, options: updatedOpts }));
    } else {
      setNewCardData((prev) => ({ ...prev, [field]: val }));
    }
  };

  const saveNewCard = async (setId) => {
    if (!newCardData.question.trim() || !newCardData.answer.trim()) return;
    
    // Validate MCQ options
    if (newCardData.type === 'mcq') {
      const validOpts = newCardData.options.filter(o => o.trim() !== '');
      if (validOpts.length < 2) {
        setError('MCQs require at least 2 non-empty options.');
        return;
      }
      if (!validOpts.includes(newCardData.answer.trim())) {
        setError('The correct answer must be one of the choice options.');
        return;
      }
    }

    try {
      const payload = {
        type: newCardData.type,
        question: newCardData.question.trim(),
        answer: newCardData.answer.trim(),
        difficulty: newCardData.difficulty,
        options: newCardData.type === 'mcq' ? newCardData.options.filter(o => o.trim() !== '') : []
      };

      const addedCard = await flashcardService.addCard(setId, payload);
      setSets((prev) =>
        prev.map((s) => {
          if (s.id === setId) {
            return {
              ...s,
              cards: [...s.cards, addedCard],
              card_count: s.card_count + 1
            };
          }
          return s;
        })
      );
      setAddingToSetId(null);
      setNewCardData({
        type: 'qa',
        question: '',
        answer: '',
        options: ['', '', '', ''],
        difficulty: 'medium'
      });
      setError('');
    } catch (err) {
      setError('Failed to add manual card. Please try again.');
    }
  };

  // 4. Edit Card
  const startEditCard = (card) => {
    setEditingCardId(card.id);
    setEditCardData({
      type: card.type || 'qa',
      question: card.question,
      answer: card.answer,
      options: card.options && card.options.length > 0 ? [...card.options] : ['', '', '', ''],
      difficulty: card.difficulty || 'medium'
    });
  };

  const handleEditCardChange = (field, val, index = null) => {
    if (index !== null) {
      const updatedOpts = [...editCardData.options];
      updatedOpts[index] = val;
      setEditCardData((prev) => ({ ...prev, options: updatedOpts }));
    } else {
      setEditCardData((prev) => ({ ...prev, [field]: val }));
    }
  };

  const saveEditCard = async (setId, cardId) => {
    if (!editCardData.question.trim() || !editCardData.answer.trim()) return;

    // Validate MCQ options
    if (editCardData.type === 'mcq') {
      const validOpts = editCardData.options.filter(o => o.trim() !== '');
      if (validOpts.length < 2) {
        setError('MCQs require at least 2 choices.');
        return;
      }
      if (!validOpts.includes(editCardData.answer.trim())) {
        setError('The correct answer must match one of the choice options.');
        return;
      }
    }

    try {
      const payload = {
        question: editCardData.question.trim(),
        answer: editCardData.answer.trim(),
        difficulty: editCardData.difficulty,
        options: editCardData.type === 'mcq' ? editCardData.options.filter(o => o.trim() !== '') : []
      };

      await flashcardService.editCard(setId, cardId, payload);
      setSets((prev) =>
        prev.map((s) => {
          if (s.id === setId) {
            return {
              ...s,
              cards: s.cards.map((c) => (c.id === cardId ? { ...c, ...payload } : c))
            };
          }
          return s;
        })
      );
      setEditingCardId(null);
      setError('');
    } catch (err) {
      setError('Failed to update flashcard. Please try again.');
    }
  };

  // 5. Delete Card
  const confirmDeleteCard = async (setId, cardId) => {
    try {
      await flashcardService.deleteCard(setId, cardId);
      setSets((prev) =>
        prev.map((s) => {
          if (s.id === setId) {
            return {
              ...s,
              cards: s.cards.filter((c) => c.id !== cardId),
              card_count: s.card_count - 1
            };
          }
          return s;
        })
      );
      setCardToDelete(null);
    } catch (err) {
      setError('Failed to delete card. Please try again.');
    }
  };

  // Filter sets by search query
  const filteredSets = sets.filter((set) => {
    const query = searchQuery.toLowerCase();
    return (
      set.title?.toLowerCase().includes(query) ||
      set.notes?.toLowerCase().includes(query) ||
      set.source_type?.toLowerCase().includes(query) ||
      set.flashcard_type?.toLowerCase().includes(query)
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
            Browse, manage, and edit your previously generated study sets.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4.5 h-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search sets by title, note, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
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
                ? 'Try searching with a different keyword, source, or card type.'
                : 'Study notes and uploaded files will be stored in your history here.'}
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={() => navigate('/create')}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-sm text-sm transition-all cursor-pointer"
            >
              <span>Create Your First Set</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {(() => {
            const setsBySubject = filteredSets.reduce((acc, s) => {
              const subj = s.subject || 'General';
              if (!acc[subj]) acc[subj] = [];
              acc[subj].push(s);
              return acc;
            }, {});

            return Object.keys(setsBySubject).sort().map((subj) => (
              <div key={subj} className="space-y-4">
                <div className="flex items-center gap-2 px-1 border-b border-slate-100 pb-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">{subj}</h2>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-bold">
                    {setsBySubject[subj].length} {setsBySubject[subj].length === 1 ? 'set' : 'sets'}
                  </span>
                </div>

                <div className="space-y-6">
                  {setsBySubject[subj].map((set) => {
                    const isExpanded = !!expandedSetIds[set.id];
                    const sourceLabel = set.source_type?.toUpperCase() || 'TEXT';
                    const typeLabel = set.flashcard_type === 'mcq' ? 'MCQ' : set.flashcard_type === 'fillup' ? 'FILLUP' : 'QA';
                    
                    return (
                      <div 
                        key={set.id}
                        className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
                      >
                        {/* Header Row */}
                        <div className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                          <div className="space-y-2.5 flex-1 w-full">
                            <div className="flex items-center gap-3 w-full">
                              
                              {/* Set Title Edit Mode Toggle */}
                              {editingSetId === set.id ? (
                                <div className="flex items-center gap-2 flex-1 max-w-lg">
                                  <input 
                                    type="text"
                                    value={editTitleValue}
                                    onChange={(e) => setEditTitleValue(e.target.value)}
                                    className="block w-full px-3 py-1.5 border border-indigo-300 rounded-xl text-slate-800 text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Set Title"
                                  />
                                  <button 
                                    onClick={() => saveRenameSet(set.id)}
                                    className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={cancelRenameSet}
                                    className="p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-xl font-extrabold text-slate-850 leading-tight">
                                    {set.title}
                                  </h3>
                                  <button 
                                    onClick={() => startRenameSet(set)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                                    title="Rename study set"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-550 font-bold rounded">
                                    {sourceLabel}
                                  </span>
                                  <span className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded">
                                    {typeLabel}
                                  </span>
                                  {set.folder_name && (
                                    <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 bg-pink-50 text-pink-705 font-bold rounded border border-pink-100/50">
                                      <Folder className="w-2.5 h-2.5" />
                                      <span>{set.folder_name}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
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
                              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md cursor-pointer"
                            >
                              <Play className="w-4 h-4 fill-white" />
                              <span>Study</span>
                            </button>

                            <button
                              onClick={() => handleExportCSV(set.id, set.title)}
                              className="p-2.5 border border-slate-250 hover:bg-indigo-50 text-slate-400 hover:text-indigo-650 rounded-xl transition-all cursor-pointer"
                              title="Export CSV (Anki compatible)"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => setSetToDelete(set)}
                              className="p-2.5 border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                              title="Delete study set"
                            >
                              <Trash2 className="w-4 h-4" />
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
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold text-slate-450 uppercase tracking-wider">
                          Set Cards List
                        </h4>
                        
                        {addingToSetId !== set.id && (
                          <button
                            onClick={() => setAddingToSetId(set.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Flashcard</span>
                          </button>
                        )}
                      </div>

                      {/* Manual Add Card Form panel */}
                      {addingToSetId === set.id && (
                        <div className="bg-indigo-50/40 p-6 rounded-2xl border border-indigo-100/80 space-y-4 animate-fade-in">
                          <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                            <h5 className="text-sm font-bold text-indigo-900 flex items-center gap-1.5">
                              <HelpCircle className="w-4 h-4" />
                              <span>Add Custom Flashcard</span>
                            </h5>
                            <button 
                              onClick={() => setAddingToSetId(null)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Card Type</label>
                              <select 
                                value={newCardData.type}
                                onChange={(e) => handleNewCardChange('type', e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="qa">Question & Answer</option>
                                <option value="fillup">Fill in the Blank</option>
                                <option value="mcq">Multiple Choice (MCQ)</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 mb-1">Difficulty</label>
                              <select 
                                value={newCardData.difficulty}
                                onChange={(e) => handleNewCardChange('difficulty', e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-1">
                                {newCardData.type === 'fillup' ? 'Statement (use ______ for blank)' : 'Question Text'}
                              </label>
                              <textarea 
                                value={newCardData.question}
                                onChange={(e) => handleNewCardChange('question', e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 h-16"
                                placeholder={newCardData.type === 'fillup' ? "Example: Photosynthesis occurs in ______." : "Example: What is cellular energy?"}
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-slate-500 mb-1">Correct Answer</label>
                              <input 
                                type="text"
                                value={newCardData.answer}
                                onChange={(e) => handleNewCardChange('answer', e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Example: chloroplasts"
                              />
                            </div>

                            {/* MCQ Options inputs */}
                            {newCardData.type === 'mcq' && (
                              <div className="md:col-span-2 space-y-2 bg-white p-4 rounded-xl border border-slate-150">
                                <label className="block text-xs font-bold text-slate-500">Choice Options (must include the correct answer)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {newCardData.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-extrabold text-slate-400">{String.fromCharCode(65 + oIdx)}.</span>
                                      <input 
                                        type="text"
                                        value={opt}
                                        onChange={(e) => handleNewCardChange('options', e.target.value, oIdx)}
                                        className="block w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium"
                                        placeholder={`Option ${oIdx + 1}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => saveNewCard(set.id)}
                              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Card</span>
                            </button>
                            <button 
                              onClick={() => setAddingToSetId(null)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {set.cards.map((card, idx) => {
                          const isEditingCard = editingCardId === card.id;
                          const isDeletingCard = deletingCardId === card.id;

                          return (
                            <div 
                              key={card.id || idx}
                              className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between gap-4 transition-all ${
                                isEditingCard ? 'border-indigo-300 ring-1 ring-indigo-50/50' : 'border-slate-200/60'
                              }`}
                            >
                              {isEditingCard ? (
                                /* Card Edit Inputs Form */
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                                    <span className="text-[10px] font-bold text-indigo-600">Editing Card #{idx + 1}</span>
                                    <select
                                      value={editCardData.difficulty}
                                      onChange={(e) => handleEditCardChange('difficulty', e.target.value)}
                                      className="px-1.5 py-0.5 border border-slate-200 rounded text-[9px] font-bold bg-white"
                                    >
                                      <option value="easy">Easy</option>
                                      <option value="medium">Medium</option>
                                      <option value="hard">Hard</option>
                                    </select>
                                  </div>

                                  <div className="space-y-2">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Question / Prompt</label>
                                      <textarea 
                                        value={editCardData.question}
                                        onChange={(e) => handleEditCardChange('question', e.target.value)}
                                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-slate-800 text-xs font-medium h-12 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                      />
                                    </div>

                                    {/* Edit MCQ options if MCQ */}
                                    {editCardData.type === 'mcq' && (
                                      <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <label className="block text-[8px] font-bold text-slate-400 uppercase">Choice Options</label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          {editCardData.options.map((opt, oIdx) => (
                                            <input 
                                              key={oIdx}
                                              type="text"
                                              value={opt}
                                              onChange={(e) => handleEditCardChange('options', e.target.value, oIdx)}
                                              className="px-1.5 py-1 border border-slate-200 rounded text-[10px] bg-white font-medium"
                                              placeholder={`Choice ${String.fromCharCode(65 + oIdx)}`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase">Correct Answer</label>
                                      <input 
                                        type="text"
                                        value={editCardData.answer}
                                        onChange={(e) => handleEditCardChange('answer', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-indigo-955 text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex gap-2 justify-end border-t border-slate-50 pt-2">
                                    <button 
                                      onClick={() => saveEditCard(set.id, card.id)}
                                      className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all cursor-pointer"
                                      title="Save changes"
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => setEditingCardId(null)}
                                      className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg transition-all cursor-pointer"
                                      title="Discard changes"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Normal Card View */
                                <>
                                  <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-slate-400">Card #{idx + 1}</span>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 border rounded-full ${getDifficultyColor(card.difficulty)}`}>
                                        {card.difficulty}
                                      </span>
                                      
                                      <button 
                                        onClick={() => startEditCard(card)}
                                        className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-50 transition-all cursor-pointer"
                                        title="Edit card content"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => setCardToDelete({ setId: set.id, cardId: card.id, question: card.question })}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 transition-all cursor-pointer"
                                        title="Delete card"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Question</span>
                                      <p className="text-slate-800 font-bold text-sm leading-snug">{card.question}</p>
                                    </div>
                                    
                                    {/* MCQ Option Listing inside Accordion */}
                                    {card.options && card.options.length > 0 && (
                                      <div className="mt-2 grid grid-cols-1 gap-1 border-t border-slate-50 pt-2">
                                        {card.options.map((opt, oIdx) => {
                                          const letter = String.fromCharCode(65 + oIdx);
                                          const isCorrect = opt === card.answer;
                                          return (
                                            <div 
                                              key={oIdx}
                                              className={`flex items-center space-x-2 py-1 px-2 border rounded-lg text-[11px] font-bold ${
                                                isCorrect 
                                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                                  : 'bg-slate-50/50 border-slate-100 text-slate-500'
                                              }`}
                                            >
                                              <span className="font-extrabold mr-1">{letter}.</span>
                                              <span>{opt}</span>
                                              {isCorrect && <Check className="w-3 h-3 text-emerald-600 ml-auto flex-shrink-0" />}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    <div className="border-t border-slate-50 pt-2">
                                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide block">Answer</span>
                                      <p className="text-indigo-950 font-bold text-xs leading-snug">{card.answer}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 border-t border-slate-50 pt-2">
                                    <span>Status: <span className={`font-bold ${card.status === 'known' ? 'text-emerald-600' : 'text-amber-500'}`}>{card.status === 'known' ? 'Known' : 'Needs Practice'}</span></span>
                                    <span>Reviews: <span className="text-slate-700 font-bold">{card.reviewCount}</span></span>
                                    <span>Priority: <span className="text-slate-700 font-bold">{card.priority}</span></span>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ));
  })()}
        </div>
      )}

      {/* Reusable Confirmation Modals */}
      <ConfirmationModal
        isOpen={!!setToDelete}
        title="Delete Study Set"
        message={`Are you sure you want to delete "${setToDelete?.title}"? All cards in this set will be permanently removed.`}
        confirmText="Delete Set"
        onConfirm={() => confirmDeleteSet(setToDelete.id)}
        onCancel={() => setSetToDelete(null)}
      />

      <ConfirmationModal
        isOpen={!!cardToDelete}
        title="Delete Flashcard"
        message={`Are you sure you want to delete this card? "${cardToDelete?.question ? (cardToDelete.question.length > 60 ? cardToDelete.question.slice(0, 60) + '...' : cardToDelete.question) : ''}"`}
        confirmText="Delete Card"
        onConfirm={() => confirmDeleteCard(cardToDelete.setId, cardToDelete.cardId)}
        onCancel={() => setCardToDelete(null)}
      />
    </div>
  );
};

export default History;
