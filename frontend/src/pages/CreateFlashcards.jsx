import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Play, 
  AlertCircle, 
  Check, 
  Settings, 
  Clipboard, 
  Upload, 
  Folder, 
  BookOpen, 
  AlertTriangle,
  FileText,
  HelpCircle,
  RefreshCw,
  Cpu,
  Brain,
  Zap,
  Globe,
  Database
} from 'lucide-react';
import { flashcardService, settingsService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import DocumentUpload from './DocumentUpload';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';

const CreateFlashcards = () => {
  const navigate = useNavigate();
  const [inputMethod, setInputMethod] = useState('text'); // 'text' | 'document'
  const [notes, setNotes] = useState('');
  
  // Document state
  const [docId, setDocId] = useState(null);
  const [docName, setDocName] = useState('');
  
  // Settings
  const [cardType, setCardType] = useState('qa'); // 'qa' | 'fillup' | 'mcq'
  const [cardCount, setCardCount] = useState(10); // 5 | 10 | 20 | 30 | 50
  const [subject, setSubject] = useState('General');
  const [folderName, setFolderName] = useState('');
  const [ignoreWords, setIgnoreWords] = useState('');
  const [difficulty, setDifficulty] = useState('all'); // 'all' | 'easy' | 'medium' | 'hard'
  const [userSettings, setUserSettings] = useState(null);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Existing subjects for suggestions
  const [subjectSuggestions, setSubjectSuggestions] = useState([]);
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSet, setGeneratedSet] = useState(null);

  // Advanced pipeline state for stepping animation
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const pipelineSteps = [
    { title: 'Analyzing document...', desc: 'Reading structure and raw text content...', icon: Cpu, color: 'text-indigo-500 bg-indigo-500/10' },
    { title: 'Extracting concepts...', desc: 'Identifying main topics, definitions, and relationships...', icon: Brain, color: 'text-purple-500 bg-purple-500/10' },
    { title: 'Creating flashcards...', desc: 'Formulating high-yield QA, MCQ, or fill-up cards...', icon: Globe, color: 'text-amber-500 bg-amber-500/10' },
    { title: 'Validating structured output', desc: 'Checking schema integrity and validating answers...', icon: Zap, color: 'text-rose-500 bg-rose-500/10' },
    { title: 'Database syncing', desc: 'Indexing card weights & review intervals...', icon: Database, color: 'text-cyan-500 bg-cyan-500/10' }
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        const list = await flashcardService.listSubjects();
        setSubjectSuggestions(list || []);
      } catch (err) {
        console.error("Failed to load subjects:", err);
      }
      try {
        const settingsData = await settingsService.getSettings();
        if (settingsData && settingsData.settings) {
          setUserSettings(settingsData.settings);
          setSelectedModel(settingsData.settings.preferred_model || '');
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };
    loadData();
  }, []);

  const handleUploadSuccess = (uploadedId, name, preview) => {
    setDocId(uploadedId);
    setDocName(name);
    setError('');
  };

  const handleUploadReset = () => {
    setDocId(null);
    setDocName('');
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setGeneratedSet(null);

    // Validation
    if (inputMethod === 'text') {
      const cleanNotes = notes.trim();
      if (cleanNotes.length < 30) {
        setError('Study notes must be at least 30 characters long.');
        return;
      }
    } else {
      if (!docId) {
        setError('Please upload a document first before generating.');
        return;
      }
    }

    setIsLoading(true);
    setCurrentStepIndex(0);

    // Simulate stepping through pipeline steps for premium feel
    const timers = [];
    timers.push(setTimeout(() => setCurrentStepIndex(1), 1000));
    timers.push(setTimeout(() => setCurrentStepIndex(2), 2200));
    timers.push(setTimeout(() => setCurrentStepIndex(3), 3500));
    timers.push(setTimeout(() => setCurrentStepIndex(4), 4800));

    // Parse ignore words
    const ignoreList = ignoreWords
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0);

    try {
      const payload = {
        notes: inputMethod === 'text' ? notes : undefined,
        source: inputMethod === 'document' ? docId : undefined,
        count: cardCount,
        type: cardType,
        subject: subject.trim() || 'General',
        folder_name: folderName.trim() || undefined,
        ignore_words: ignoreList.length > 0 ? ignoreList : undefined,
        difficulty: difficulty === 'all' ? undefined : difficulty,
        custom_prompt_id: selectedPromptId || undefined,
        model: selectedModel || undefined
      };

      const data = await flashcardService.generate(payload);
      // Let the final step display briefly
      setTimeout(() => {
        setGeneratedSet(data);
        setIsLoading(false);
        timers.forEach(t => clearTimeout(t));
      }, 5500);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Failed to parse flashcards. Make sure the content contains full factual sentences.'
      );
      setIsLoading(false);
      timers.forEach(t => clearTimeout(t));
    }
  };

  const getDifficultyBadgeVariant = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy': return 'easy';
      case 'medium': return 'medium';
      case 'hard': return 'hard';
      default: return 'secondary';
    }
  };

  // Determine Active Step based on current inputs
  const getStepNumber = () => {
    if (isLoading) return 3;
    if (generatedSet) return 3;
    if (inputMethod === 'text' ? notes.trim().length >= 30 : docId) return 2;
    return 1;
  };

  const currentStep = getStepNumber();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in text-slate-805 dark:text-slate-205">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">AI Flashcard Factory</span>
            <Sparkles className="w-7 h-7 text-pink-500 animate-pulse" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Turn study guides, lecture slides, or textbook text into smart review decks.
          </p>
        </div>

        {/* Dynamic 1-2-3 Step Indicator */}
        <div className="flex items-center space-x-2 bg-white/40 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 w-fit backdrop-blur-md">
          {[
            { step: 1, label: 'Content' },
            { step: 2, label: 'Settings' },
            { step: 3, label: 'Build' }
          ].map((item) => (
            <div 
              key={item.step} 
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentStep === item.step
                  ? 'bg-gradient-to-r from-indigo-650 via-purple-650 to-pink-650 text-white shadow-md shadow-indigo-500/10'
                  : currentStep > item.step
                    ? 'text-indigo-650 dark:text-indigo-400'
                    : 'text-slate-400 dark:text-slate-550'
              }`}
            >
              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold border ${
                currentStep === item.step
                  ? 'border-white/20 bg-white/10'
                  : currentStep > item.step
                    ? 'border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900'
              }`}>
                {currentStep > item.step ? '✓' : item.step}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-3 bg-rose-50 dark:bg-rose-955/20 border border-rose-150 dark:border-rose-900/40 text-rose-700 dark:text-rose-450 p-4 rounded-2xl text-xs font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Workspace Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Configuration Panel */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-805">
            <CardHeader className="border-b border-slate-50 dark:border-slate-850/50 py-4">
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-500" />
                <span>Config Editor</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5 py-5">
              {/* Step 1: Input method toggler */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  1. Study Source
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={inputMethod === 'text' ? 'primary' : 'outline'}
                    size="sm"
                    className={`h-12 text-xs font-extrabold rounded-xl ${inputMethod === 'text' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-none' : ''}`}
                    onClick={() => setInputMethod('text')}
                    icon={Clipboard}
                  >
                    Paste Text
                  </Button>
                  <Button
                    type="button"
                    variant={inputMethod === 'document' ? 'primary' : 'outline'}
                    size="sm"
                    className={`h-12 text-xs font-extrabold rounded-xl ${inputMethod === 'document' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-none' : ''}`}
                    onClick={() => setInputMethod('document')}
                    icon={Upload}
                  >
                    Upload File
                  </Button>
                </div>
              </div>

              {/* Conditional Inputs */}
              {inputMethod === 'text' ? (
                <div className="space-y-2">
                  <Input
                    label="Paste Study Notes / Textbook Text"
                    type="textarea"
                    rows={7}
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g. Mitochondria are double-membraned organelles found in most eukaryotic organisms. They generate most of the cell's supply of adenosine triphosphate (ATP), used as a source of chemical energy. The mitochondria is often referred to as the powerhouse of the cell."
                    description={`Min length: 30 chars | Current: ${notes.length}`}
                    error={notes.length > 0 && notes.length < 30 ? 'Must be at least 30 characters' : ''}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Upload Study Document (PDF, DOCX, TXT)
                  </label>
                  <DocumentUpload 
                    onUploadSuccess={handleUploadSuccess} 
                    onUploadReset={handleUploadReset} 
                  />
                </div>
              )}

              {/* Step 2: Settings */}
              <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6 space-y-5">
                <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-350 font-bold text-sm pb-1">
                  <Settings className="w-4 h-4 text-purple-500" />
                  <span>2. Deck Settings</span>
                </div>

                {/* Subject Organizer */}
                <div className="space-y-1.5">
                  <Input
                    label="Subject Category"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Biology, Chemistry"
                    list="subjects-list"
                    icon={BookOpen}
                  />
                  <datalist id="subjects-list">
                    {subjectSuggestions.map((s, index) => (
                      <option key={index} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Folder Organizer */}
                <div className="space-y-1.5">
                  <Input
                    label="Folder / Deck (Optional)"
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="e.g. Midterm Exams"
                    icon={Folder}
                  />
                </div>

                {/* Ignore Words list */}
                <div className="space-y-1.5">
                  <Input
                    label="Ignored Words (Cloze Blacklist)"
                    type="text"
                    value={ignoreWords}
                    onChange={(e) => setIgnoreWords(e.target.value)}
                    placeholder="e.g. cellular, eukaryotic (comma-separated)"
                    icon={AlertTriangle}
                    description="The local parsing engine will avoid masking these keywords."
                  />
                </div>

                {/* Card Type — compact horizontal pills */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Card Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'qa',     label: 'QA',     sublabel: 'Definition', color: 'from-indigo-500 to-purple-600'  },
                      { id: 'fillup', label: 'Cloze',  sublabel: 'Fill Blank', color: 'from-purple-500 to-pink-600'   },
                      { id: 'mcq',    label: 'MCQ',    sublabel: 'Multi-Choice', color: 'from-pink-500 to-rose-500' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setCardType(type.id)}
                        className={`relative flex flex-col items-center py-3 px-2 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.03] overflow-hidden ${
                          cardType === type.id
                            ? 'border-transparent shadow-lg'
                            : 'border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {cardType === type.id && (
                          <span className={`absolute inset-0 bg-gradient-to-br ${type.color} opacity-10`} />
                        )}
                        {cardType === type.id && (
                          <span className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r ${type.color}`} />
                        )}
                        <span className={`text-xs font-extrabold relative z-10 ${
                          cardType === type.id ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'
                        }`}>{type.label}</span>
                        <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5 relative z-10">{type.sublabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card Count + Difficulty — side by side */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cards</label>
                    <div className="flex flex-wrap gap-1.5">
                      {[5, 10, 20, 30, 50].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setCardCount(count)}
                          className={`px-3 py-1.5 text-xs font-extrabold rounded-lg border transition-all duration-200 ${
                            cardCount === count
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-none text-white shadow-md shadow-indigo-500/15'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Difficulty</label>
                    <Input
                      type="select"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option value="all">Mixed</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </Input>
                  </div>
                </div>

                {/* AI Model & Custom Prompt Template selectors */}
                {userSettings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        AI Model Override
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                      >
                        <option value="">Default ({userSettings.preferred_model})</option>
                        <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
                        <option value="gemma-2-9b-it">Gemma 2 9B (Precise)</option>
                        <option value="mixtral-8x7b-32768">Mixtral 8x7B (Detailed)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Instructions Preset
                      </label>
                      <select
                        value={selectedPromptId}
                        onChange={(e) => setSelectedPromptId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium"
                        disabled={!userSettings.custom_prompts || userSettings.custom_prompts.length === 0}
                      >
                        <option value="">Standard Generation</option>
                        {userSettings.custom_prompts && userSettings.custom_prompts.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Trigger */}
              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full py-4 text-sm font-extrabold h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-650 hover:opacity-95 border-none shadow-lg shadow-purple-500/15"
                  onClick={handleGenerate}
                  disabled={inputMethod === 'text' ? notes.trim().length < 30 : !docId}
                  isLoading={isLoading}
                  icon={Sparkles}
                >
                  Generate AI Flashcards
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Stepping Progress or Card Preview */}
        <div className="lg:col-span-7 space-y-6">
          {isLoading ? (
            /* Custom Stepping Progress Animation */
            <Card className="p-8 shadow-2xl bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="text-center pb-8">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 blur-xl rounded-full animate-pulse opacity-20" />
                  <div className="relative bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-5 rounded-3xl text-white shadow-lg animate-bounce">
                    <Cpu className="w-10 h-10 animate-spin-slow" />
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white animate-pulse">AI is creating your flashcards...</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1.5">Our Groq-powered AI pipeline is generating and indexing your deck.</p>
              </div>

              {/* Pipelines Progress Timeline */}
              <div className="relative pl-8 space-y-6 border-l-2 border-indigo-100 dark:border-indigo-950 ml-6">
                {pipelineSteps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isCompleted = idx < currentStepIndex;
                  const IconComp = step.icon;
                  
                  return (
                    <div key={idx} className="relative transition-all duration-300">
                      {/* Timeline Dot Indicator */}
                      <span className={`absolute -left-[45px] top-0 w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all shadow-md ${
                        isActive 
                          ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 border-indigo-400 text-white scale-110 shadow-indigo-500/20' 
                          : isCompleted 
                            ? 'bg-emerald-500 border-emerald-500 text-white' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <IconComp className="w-4 h-4" />}
                      </span>
                      
                      <div className={`space-y-0.5 ml-2 ${isActive ? 'opacity-100 scale-[1.01]' : isCompleted ? 'opacity-70' : 'opacity-35'}`}>
                        <h4 className={`text-xs font-bold ${isActive ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {step.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : generatedSet ? (
            /* Results View */
            <div className="space-y-6 animate-slide-up">
              {/* Meta Summary Box */}
              <Card className="p-6 bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-pink-500/5 border-indigo-200/50 dark:border-indigo-900/50 shadow-xl relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-450 font-extrabold text-xs">
                      <Check className="w-4.5 h-4.5 bg-emerald-500/10 p-0.5 rounded-full" />
                      <span>Deck Synthesized Successfully!</span>
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-905 dark:text-white leading-tight">{generatedSet.title}</h2>
                    <div className="flex flex-wrap gap-1.5 pt-1.5 font-bold">
                      <Badge variant="secondary">Source: {generatedSet.source_type}</Badge>
                      <Badge variant="info">Type: {generatedSet.flashcard_type}</Badge>
                      <Badge variant="success">Cards: {generatedSet.card_count}</Badge>
                      {generatedSet.subject && (
                        <Badge variant="warning">{generatedSet.subject}</Badge>
                      )}
                      <Badge variant="info" className="bg-violet-50 dark:bg-violet-950/30 text-violet-650 dark:text-violet-400 border-violet-100 dark:border-violet-900/50">
                        Generated by: {generatedSet.generation_method === 'groq' ? 'SmartFlash AI (Groq)' : 'spaCy (Fallback)'}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => navigate(`/review?setId=${generatedSet.id}`)}
                    variant="success"
                    className="w-full md:w-auto h-12 text-sm font-extrabold shadow-lg shadow-emerald-500/15"
                    icon={Play}
                  >
                    Start Review
                  </Button>
                </div>
              </Card>

              <div className="flex justify-between items-center px-1 border-b border-slate-100 dark:border-slate-850 pb-2">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200">Deck Preview ({generatedSet.card_count} Cards)</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setGeneratedSet(null);
                    setNotes('');
                    handleUploadReset();
                  }}
                  icon={RefreshCw}
                >
                  Create New Set
                </Button>
              </div>

              {/* Cards List Grid */}
              <div className="grid grid-cols-1 gap-4">
                {generatedSet.cards.map((card, idx) => (
                  <Card key={card.id || idx} className="p-6 bg-white dark:bg-slate-900 border-slate-200/85 dark:border-slate-800/85 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500" />
                    
                    <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-850/50 pl-2">
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Card #{idx + 1}
                      </span>
                      <Badge variant={getDifficultyBadgeVariant(card.difficulty)}>
                        {card.difficulty}
                      </Badge>
                    </div>

                    <div className="space-y-4 pt-3.5 pl-2">
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Question</span>
                        <p className="text-slate-805 dark:text-slate-150 font-extrabold text-sm leading-relaxed mt-1">{card.question}</p>
                      </div>

                      {/* Options rendering for MCQ */}
                      {card.options && card.options.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 pt-2">
                          {card.options.map((opt, oIdx) => {
                            const isCorrect = opt === card.answer;
                            return (
                              <div 
                                key={oIdx} 
                                className={`flex items-center space-x-2.5 py-2.5 px-3.5 border rounded-xl text-xs font-semibold ${
                                  isCorrect 
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-450 font-bold' 
                                    : 'bg-slate-50/30 dark:bg-slate-950/10 border-slate-150 dark:border-slate-850 text-slate-550 dark:text-slate-400'
                                  }`}
                              >
                                <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-[9px] font-extrabold ${
                                  isCorrect ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-550 dark:text-slate-400'
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="border-t border-slate-150 dark:border-slate-850/50 pt-3">
                        <span className="text-[10px] font-extrabold text-indigo-650 dark:text-indigo-400 uppercase tracking-widest block">Correct Answer</span>
                        <p className="text-indigo-950 dark:text-indigo-400 font-extrabold text-sm mt-1">{card.answer}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* Idle Empty State */
            <div className="h-full min-h-[350px] border border-dashed border-slate-350 dark:border-slate-850 rounded-3xl flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/30 dark:bg-slate-950/10">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400">
                <FileText className="w-8 h-8 text-indigo-500" />
              </div>
              <div className="space-y-1.5 max-w-xs">
                <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">No deck generated yet</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-normal font-medium">Configure your study materials and click "Synthesize Decks" to watch the NLP parser extract card items in real-time.</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CreateFlashcards;
