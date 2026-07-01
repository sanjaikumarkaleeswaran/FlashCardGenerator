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
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

const History = () => {
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search query state
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Subject Chip Filter
  const [selectedSubject, setSelectedSubject] = useState('All Decks');

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

  const getDifficultyBadge = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'easy';
      case 'medium': return 'medium';
      case 'hard': return 'hard';
      default: return 'secondary';
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

  // Unique Subjects List for Chips
  const uniqueSubjects = ['All Decks', ...new Set(sets.map(s => s.subject || 'General'))];

  // Filter sets by search query and selected subject chip
  const filteredSets = sets.filter((set) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      set.title?.toLowerCase().includes(query) ||
      set.notes?.toLowerCase().includes(query) ||
      set.source_type?.toLowerCase().includes(query) ||
      set.flashcard_type?.toLowerCase().includes(query)
    );

    const matchesSubject = selectedSubject === 'All Decks' || (set.subject || 'General') === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner message="Loading your study history..." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in text-slate-805 dark:text-slate-200">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <HistoryIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            <span>Library Archives</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Browse, manage, and edit your previously generated study sets.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Input
            type="text"
            placeholder="Search sets by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 p-4 rounded-2xl text-sm font-semibold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tag-Based Subject Filtering Chips */}
      <div className="space-y-2">
        <span className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest">
          Filter by Subject
        </span>
        <div className="flex flex-wrap gap-2">
          {uniqueSubjects.map((subj) => (
            <button
              key={subj}
              onClick={() => setSelectedSubject(subj)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-gradient-to-r from-indigo-650 to-violet-650 border-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {filteredSets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-16 text-center shadow-md space-y-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950/40 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <HistoryIcon className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-200">
              {searchQuery || selectedSubject !== 'All Decks' ? 'No Matching Study Sets Found' : 'No Study Sets Yet'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
              {searchQuery || selectedSubject !== 'All Decks'
                ? 'Try adjusting your subject filter or search keyword.'
                : 'Study notes and uploaded files will be stored in your history here.'}
            </p>
          </div>
          {(!searchQuery && selectedSubject === 'All Decks') && (
            <Button
              onClick={() => navigate('/create')}
              variant="primary"
              icon={Plus}
            >
              Create Your First Set
            </Button>
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
                <div className="flex items-center gap-2 px-1 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  <h2 className="text-xs font-extrabold text-slate-700 dark:text-slate-400 uppercase tracking-widest">{subj}</h2>
                  <Badge variant="info">
                    {setsBySubject[subj].length} {setsBySubject[subj].length === 1 ? 'set' : 'sets'}
                  </Badge>
                </div>

                <div className="space-y-6">
                  {setsBySubject[subj].map((set) => {
                    const isExpanded = !!expandedSetIds[set.id];
                    const sourceLabel = set.source_type?.toUpperCase() || 'TEXT';
                    const typeLabel = set.flashcard_type === 'mcq' ? 'MCQ' : set.flashcard_type === 'fillup' ? 'FILLUP' : 'QA';
                    
                    return (
                      <Card 
                        key={set.id}
                        className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
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
                                    className="block w-full px-3 py-1.5 border border-indigo-300 dark:border-indigo-900 rounded-xl text-slate-850 dark:text-white bg-white dark:bg-slate-950 text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Set Title"
                                  />
                                  <button 
                                    onClick={() => saveRenameSet(set.id)}
                                    className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={cancelRenameSet}
                                    className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-extrabold text-slate-850 dark:text-white leading-tight">
                                    {set.title}
                                  </h3>
                                  <button 
                                    onClick={() => startRenameSet(set)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-all cursor-pointer"
                                    title="Rename study set"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <Badge variant="secondary">{sourceLabel}</Badge>
                                  <Badge variant="info">{typeLabel}</Badge>
                                  {set.folder_name && (
                                    <Badge variant="warning" className="normal-case">
                                      <Folder className="w-2.5 h-2.5 mr-1 inline" />
                                      {set.folder_name}
                                    </Badge>
                                  )}
                                  {set.generation_method && (
                                    <Badge variant="info" className="bg-violet-50 dark:bg-violet-950/30 text-violet-650 dark:text-violet-400 border-violet-100 dark:border-violet-900/50 normal-case">
                                      Generated by: {set.generation_method === 'groq' ? 'SmartFlash AI (Groq)' : 'spaCy (Fallback)'}
                                    </Badge>
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

                          <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <Button
                              onClick={() => toggleExpandSet(set.id)}
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-initial h-10 px-4"
                            >
                              <span>{isExpanded ? 'Hide' : 'Cards'}</span>
                              {isExpanded ? <ChevronUp className="w-4 h-4 ml-1.5" /> : <ChevronDown className="w-4 h-4 ml-1.5" />}
                            </Button>
                            
                            <Button
                              onClick={() => navigate(`/review?setId=${set.id}`)}
                              variant="success"
                              size="sm"
                              className="flex-1 sm:flex-initial h-10 px-4"
                              icon={Play}
                            >
                              Study
                            </Button>

                            <button
                              onClick={() => handleExportCSV(set.id, set.title)}
                              className="p-2.5 border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-xl transition-all cursor-pointer"
                              title="Export CSV (Anki compatible)"
                            >
                              <Download className="w-4.5 h-4.5" />
                            </button>
                            
                            <button 
                              onClick={() => setSetToDelete(set)}
                              className="p-2.5 border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                              title="Delete study set"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded Card Details Accordion */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 dark:border-slate-850/80 bg-slate-50/50 dark:bg-slate-950/10 p-6 sm:p-8 space-y-6">
                            {/* Notes Detail */}
                            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/60 space-y-2">
                              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <span>Original Notes Source</span>
                              </h4>
                              <p className="text-slate-655 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium">
                                {set.notes}
                              </p>
                            </div>

                            {/* Cards grid */}
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <h4 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">
                                  Set Cards List
                                </h4>
                                
                                {addingToSetId !== set.id && (
                                  <button
                                    onClick={() => setAddingToSetId(set.id)}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-650 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Flashcard</span>
                                  </button>
                                )}
                              </div>

                              {/* Manual Add Card Form panel */}
                              {addingToSetId === set.id && (
                                <div className="bg-indigo-50/20 dark:bg-indigo-950/15 p-6 rounded-2xl border border-indigo-150 dark:border-indigo-900/50 space-y-4 animate-fade-in">
                                  <div className="flex justify-between items-center border-b border-indigo-100 dark:border-indigo-900/40 pb-2">
                                    <h5 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
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
                                    <div className="space-y-1">
                                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Card Type</label>
                                      <select 
                                        value={newCardData.type}
                                        onChange={(e) => handleNewCardChange('type', e.target.value)}
                                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-705 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                                      >
                                        <option value="qa">Question & Answer</option>
                                        <option value="fillup">Fill in the Blank</option>
                                        <option value="mcq">Multiple Choice (MCQ)</option>
                                      </select>
                                    </div>
                                    <div className="space-y-1">
                                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Difficulty</label>
                                      <select 
                                        value={newCardData.difficulty}
                                        onChange={(e) => handleNewCardChange('difficulty', e.target.value)}
                                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-705 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                                      >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                      </select>
                                    </div>

                                    <div className="md:col-span-2 space-y-1">
                                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                                        {newCardData.type === 'fillup' ? 'Statement (use ______ for blank)' : 'Question Text'}
                                      </label>
                                      <textarea 
                                        value={newCardData.question}
                                        onChange={(e) => handleNewCardChange('question', e.target.value)}
                                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/25 h-16"
                                        placeholder={newCardData.type === 'fillup' ? "Example: Photosynthesis occurs in ______." : "Example: What is cellular energy?"}
                                      />
                                    </div>

                                    <div className="md:col-span-2 space-y-1">
                                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Correct Answer</label>
                                      <input 
                                        type="text"
                                        value={newCardData.answer}
                                        onChange={(e) => handleNewCardChange('answer', e.target.value)}
                                        className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl text-slate-800 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
                                        placeholder="Example: chloroplasts"
                                      />
                                    </div>

                                    {/* MCQ Options inputs */}
                                    {newCardData.type === 'mcq' && (
                                      <div className="md:col-span-2 space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Choice Options (must include correct answer)</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {newCardData.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-1.5">
                                              <span className="text-[10px] font-extrabold text-slate-400">{String.fromCharCode(65 + oIdx)}.</span>
                                              <input 
                                                type="text"
                                                value={opt}
                                                onChange={(e) => handleNewCardChange('options', e.target.value, oIdx)}
                                                className="block w-full px-2 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-250 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder={`Option ${oIdx + 1}`}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex gap-2 justify-end">
                                    <Button 
                                      onClick={() => saveNewCard(set.id)}
                                      variant="success"
                                      size="sm"
                                      icon={Save}
                                    >
                                      Save Card
                                    </Button>
                                    <Button 
                                      onClick={() => setAddingToSetId(null)}
                                      variant="outline"
                                      size="sm"
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {set.cards.map((card, idx) => {
                                  const isEditingCard = editingCardId === card.id;

                                  return (
                                    <Card 
                                      key={card.id || idx}
                                      className={`p-5 bg-white dark:bg-slate-900 border shadow-sm flex flex-col justify-between gap-4 transition-all ${
                                        isEditingCard ? 'border-indigo-400 dark:border-indigo-700/80 ring-1 ring-indigo-500/20' : 'border-slate-200/60 dark:border-slate-800/80'
                                      }`}
                                    >
                                      {isEditingCard ? (
                                        /* Card Edit Inputs Form */
                                        <div className="space-y-3">
                                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-1.5">
                                            <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-455">Editing Card #{idx + 1}</span>
                                            <select
                                              value={editCardData.difficulty}
                                              onChange={(e) => handleEditCardChange('difficulty', e.target.value)}
                                              className="px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded text-[9px] font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                                            >
                                              <option value="easy">Easy</option>
                                              <option value="medium">Medium</option>
                                              <option value="hard">Hard</option>
                                            </select>
                                          </div>

                                          <div className="space-y-2">
                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Question / Prompt</label>
                                              <textarea 
                                                value={editCardData.question}
                                                onChange={(e) => handleEditCardChange('question', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 rounded-lg text-slate-800 dark:text-slate-100 text-xs font-medium h-12 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                              />
                                            </div>

                                            {/* Edit MCQ options if MCQ */}
                                            {editCardData.type === 'mcq' && (
                                              <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-100 dark:border-slate-850">
                                                <label className="block text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase">Choice Options</label>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                  {editCardData.options.map((opt, oIdx) => (
                                                    <input 
                                                      key={oIdx}
                                                      type="text"
                                                      value={opt}
                                                      onChange={(e) => handleEditCardChange('options', e.target.value, oIdx)}
                                                      className="px-1.5 py-1 border border-slate-200 dark:border-slate-800 rounded text-[10px] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-250 font-medium"
                                                      placeholder={`Choice ${String.fromCharCode(65 + oIdx)}`}
                                                    />
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            <div>
                                              <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Correct Answer</label>
                                              <input 
                                                type="text"
                                                value={editCardData.answer}
                                                onChange={(e) => handleEditCardChange('answer', e.target.value)}
                                                className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-955 rounded-lg text-indigo-955 dark:text-indigo-400 text-xs font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                              />
                                            </div>
                                          </div>

                                          <div className="flex gap-2 justify-end border-t border-slate-50 dark:border-slate-850/50 pt-2">
                                            <button 
                                              onClick={() => saveEditCard(set.id, card.id)}
                                              className="p-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-450 rounded-lg transition-all cursor-pointer"
                                              title="Save changes"
                                            >
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button 
                                              onClick={() => setEditingCardId(null)}
                                              className="p-1 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-lg transition-all cursor-pointer"
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
                                              <Badge variant={getDifficultyBadge(card.difficulty)}>
                                                {card.difficulty}
                                              </Badge>
                                              
                                              <button 
                                                onClick={() => startEditCard(card)}
                                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                title="Edit card content"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              <button 
                                                onClick={() => setCardToDelete({ setId: set.id, cardId: card.id, question: card.question })}
                                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                                                title="Delete card"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>
                                          <div className="space-y-3 flex-1">
                                            <div>
                                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide block">Question</span>
                                              <p className="text-slate-800 dark:text-slate-205 font-bold text-sm leading-snug">{card.question}</p>
                                            </div>
                                            
                                            {/* MCQ Option Listing inside Accordion */}
                                            {card.options && card.options.length > 0 && (
                                              <div className="mt-2 grid grid-cols-1 gap-1 border-t border-slate-50 dark:border-slate-850 pt-2">
                                                {card.options.map((opt, oIdx) => {
                                                  const letter = String.fromCharCode(65 + oIdx);
                                                  const isCorrect = opt === card.answer;
                                                  return (
                                                    <div 
                                                      key={oIdx}
                                                      className={`flex items-center space-x-2 py-1 px-2 border rounded-lg text-[11px] font-bold ${
                                                        isCorrect 
                                                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400' 
                                                          : 'bg-slate-50/50 dark:bg-slate-950/10 border-slate-100 dark:border-slate-850 text-slate-500 dark:text-slate-450'
                                                      }`}
                                                    >
                                                      <span className="font-extrabold mr-1">{letter}.</span>
                                                      <span>{opt}</span>
                                                      {isCorrect && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-450 ml-auto flex-shrink-0" />}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            <div className="border-t border-slate-55 dark:border-slate-850/50 pt-2">
                                              <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide block">Answer</span>
                                              <p className="text-indigo-950 dark:text-slate-300 font-extrabold text-xs leading-snug">{card.answer}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-between text-[9px] font-semibold text-slate-400 dark:text-slate-500 border-t border-slate-50 dark:border-slate-850/50 pt-2">
                                            <span>Status: <span className={`font-bold ${card.status === 'known' ? 'text-emerald-600' : 'text-amber-500'}`}>{card.status === 'known' ? 'Known' : 'Needs Practice'}</span></span>
                                            <span>Reviews: <span className="text-slate-700 dark:text-slate-300 font-bold">{card.reviewCount}</span></span>
                                            <span>Priority: <span className="text-slate-700 dark:text-slate-300 font-bold">{card.priority}</span></span>
                                          </div>
                                        </>
                                      )}
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
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
