// frontend/src/pages/StudyAssistant.jsx

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Upload, 
  MessageSquare, 
  FileText, 
  Plus, 
  Play, 
  Compass, 
  ChevronRight, 
  Activity, 
  Settings as SettingsIcon,
  HelpCircle,
  Clock,
  Award,
  Sparkles,
  GitBranch,
  Calendar,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { settingsService } from '../services/api';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import axios from 'axios';

// Get API URL from env, default to local port 8000
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const StudyAssistant = () => {
  const [activeTab, setActiveTab] = useState('library');
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  
  // Library State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Chat State
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Summary State
  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Quiz State
  const [quiz, setQuiz] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizConfig, setQuizConfig] = useState({ difficulty: 'medium', count: 5 });
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  // Planner State
  const [plannerConfig, setPlannerConfig] = useState({ examDate: '', targetScore: 90 });
  const [studyPlan, setStudyPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Auto-scroll ref
  const messagesEndRef = React.useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load Initial KBs
  const loadKBs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/knowledge`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data || []);
      if (res.data.length > 0 && !selectedDoc) {
        setSelectedDoc(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  useEffect(() => {
    loadKBs();
  }, []);

  // Handle File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      await loadKBs();
      setActiveTab('library');
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
    }
  };

  // Load Summary
  useEffect(() => {
    if (!selectedDoc) return;
    const fetchSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/summary?document_id=${selectedDoc._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSummary(res.data?.summary || null);
      } catch (err) {
        console.error("Failed to fetch summary:", err);
        setSummary(null);
      } finally {
        setIsLoadingSummary(false);
      }
    };
    fetchSummary();
  }, [selectedDoc]);

  // Load Chat History
  useEffect(() => {
    if (!selectedDoc) return;
    const fetchChatHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/chat/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setChatSessions(res.data || []);
      } catch (err) {
        console.error("Failed to fetch sessions:", err);
      }
    };
    fetchChatHistory();
  }, [selectedDoc]);

  // Handle Send Chat Question
  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedDoc) return;
    
    const userMsg = { role: 'user', content: chatInput };
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsSending(true);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/chat`, {
        document_id: selectedDoc._id,
        question: userMsg.content,
        session_id: currentSessionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.data.answer,
          sources: res.data.sources,
          confidence: res.data.confidence_score,
          referenced_document: res.data.referenced_document
        }]);
        if (res.data.session_id) {
          setCurrentSessionId(res.data.session_id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  // Generate Quiz
  const handleGenerateQuiz = async () => {
    if (!selectedDoc) return;
    setIsGeneratingQuiz(true);
    setQuizSubmitted(false);
    setQuizAnswers({});
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/quiz`, {
        document_id: selectedDoc._id,
        difficulty: quizConfig.difficulty,
        question_count: quizConfig.count
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuiz(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Submit Quiz Answers
  const handleSubmitQuiz = () => {
    if (!quiz) return;
    let score = 0;
    quiz.questions.forEach((q) => {
      const rawUserAns = quizAnswers[q.id];
      const userAns = (rawUserAns !== undefined && rawUserAns !== null)
        ? String(rawUserAns).trim().toLowerCase()
        : '';
      const rawCorrectAns = q.correct_answer;
      const correctAns = (rawCorrectAns !== undefined && rawCorrectAns !== null)
        ? String(rawCorrectAns).trim().toLowerCase()
        : '';
      if (userAns === correctAns) {
        score += 1;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  // Generate Study Plan
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/study-plan`, {
        exam_date: plannerConfig.examDate,
        target_score: plannerConfig.targetScore,
        weak_subjects: [selectedDoc?.title || "Indexed Documents"]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudyPlan(res.data?.plan || null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
            <span>AI Study Assistant</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
            Semantic RAG document parsing, chat interfaces, summaries, and smart mind maps.
          </p>
        </div>
        
        {/* Upload Button */}
        <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm px-4 py-2.5 rounded-2xl cursor-pointer shadow-lg shadow-indigo-500/25 transition-all">
          <Upload className="w-4 h-4" />
          <span>{isUploading ? "Ingesting..." : "Upload Document"}</span>
          <input type="file" onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt,.pptx,.png,.jpg,.jpeg,.mp3,.wav" />
        </label>
      </div>

      {uploadError && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 p-4 rounded-2xl text-sm font-semibold">
          {uploadError}
        </div>
      )}

      {/* Main Tabbed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Document Library Select list */}
        <div className="space-y-4">
          <div className="border-b border-slate-150 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              <span>Knowledge Bases</span>
            </h2>
          </div>

          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic">
                No indexed files. Upload a document to start studying.
              </div>
            ) : (
              documents.map((doc) => (
                <div 
                  key={doc._id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedDoc?._id === doc._id
                      ? 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/25 dark:to-indigo-950/45 border-indigo-200 dark:border-indigo-900/80 shadow-md'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-855'
                  }`}
                >
                  <p className="font-extrabold text-xs truncate">{doc.title}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                    Chunks: {doc.chunk_count} | Size: {doc.char_count} chars
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Primary Active Workspace tab view */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Workspace Tabs Header Bar */}
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl overflow-x-auto">
            {[
              { id: 'library', label: 'Document Library', icon: BookOpen },
              { id: 'chat', label: 'RAG Study Chat', icon: MessageSquare },
              { id: 'summary', label: 'AI Summaries', icon: FileText },
              { id: 'quiz', label: 'Interactive Quizzes', icon: HelpCircle },
              { id: 'planner', label: 'Planner', icon: Calendar },
              { id: 'mindmap', label: 'Mind Map', icon: GitBranch }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-800 text-indigo-650 dark:text-indigo-400 shadow-md'
                      : 'text-slate-550 dark:text-slate-450 hover:text-slate-800 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Workspace View Rendering */}
          <div className="min-h-[500px]">
            
            {/* VIEW 1: Document Library overview */}
            {activeTab === 'library' && (
              <div className="space-y-6">
                <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg">Document Library</CardTitle>
                    <CardDescription>View, examine, and upload custom PDF, DOCX, slides, or audio guides into your searchable study cache.</CardDescription>
                  </CardHeader>
                  
                  {selectedDoc ? (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">File Name</span>
                          <p className="font-extrabold text-sm mt-1">{selectedDoc.filename}</p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-2xl">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Upload Date</span>
                          <p className="font-extrabold text-sm mt-1">{new Date(selectedDoc.upload_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-2xl">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Knowledge Base Size</span>
                        <p className="font-extrabold text-xs mt-1 leading-relaxed">
                          This document has been parsed into <span className="text-indigo-500 font-black">{selectedDoc.chunk_count} semantic blocks</span>, allowing precise AI study citations and mitigating LLM hallucination issues.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-slate-400 italic">
                      Select a document from the left list or upload a new file.
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* VIEW 2: Grounded RAG study chat */}
            {activeTab === 'chat' && (
              <div className="space-y-4">
                <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg flex flex-col h-[calc(100vh-280px)] min-h-[460px] lg:h-[550px]">
                  {/* Active Document Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-500">Active context: {selectedDoc ? selectedDoc.title : "None selected"}</span>
                    <Badge variant="success">Grounded RAG Mode</Badge>
                  </div>
                  
                  {/* Messages log */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                        <MessageSquare className="w-10 h-10 text-slate-300 animate-pulse" />
                        <p className="text-xs italic font-bold">Ask anything about this document! Citations will be displayed automatically.</p>
                      </div>
                    ) : (
                      messages.map((msg, index) => (
                        <div key={index} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}>
                          <div className={`p-4 rounded-3xl max-w-xl text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-indigo-600 text-white rounded-tr-none'
                              : 'bg-slate-50 dark:bg-slate-855 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-800/80'
                          }`}>
                            {msg.content}
                          </div>
                          
                          {/* Grounded Citation details */}
                          {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                            <div className="pl-2 space-y-1">
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase">Citations matched (Score: {msg.confidence}):</span>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.sources.map((src, sIdx) => (
                                  <Badge key={sIdx} variant="secondary" className="text-[8px] cursor-pointer" title={src.text}>
                                    Page {src.page_number} (Score: {src.score})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                    {isSending && (
                      <div className="flex justify-start">
                        <div className="bg-slate-50 dark:bg-slate-855 p-4 rounded-3xl rounded-tl-none border border-slate-150 dark:border-slate-800 text-xs italic text-slate-455">
                          Thinking and searching document chunks...
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Chat Form */}
                  <form onSubmit={handleSendChat} className="p-4 border-t border-slate-100 dark:border-slate-850 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask the AI Tutor a question..."
                      disabled={!selectedDoc || isSending}
                      className="flex-grow bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button type="submit" disabled={!selectedDoc || isSending} variant="primary">Send</Button>
                  </form>
                </Card>
              </div>
            )}

            {/* VIEW 3: AI summaries & revision notes */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {isLoadingSummary ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : summary ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Executive Overview */}
                    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md md:col-span-2">
                      <h3 className="text-sm font-black text-indigo-500 uppercase tracking-wider mb-2">Executive Summary</h3>
                      <p className="text-xs leading-relaxed text-slate-550 dark:text-slate-350">{summary.executive_summary}</p>
                    </Card>
                    
                    {/* Key Concepts */}
                    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md">
                      <h3 className="text-sm font-black text-purple-500 uppercase tracking-wider mb-3">Key Concepts</h3>
                      <ul className="space-y-2">
                        {summary.key_concepts?.map((c, i) => (
                          <li key={i} className="text-xs flex items-center gap-2 font-semibold">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>

                    {/* Definitions */}
                    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md">
                      <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider mb-3">Definitions Glossary</h3>
                      <div className="space-y-3">
                        {Object.entries(summary.definitions || {}).map(([k, v], i) => (
                          <div key={i} className="text-xs leading-relaxed">
                            <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{k}: </strong>
                            <span className="text-slate-550 dark:text-slate-400">{v}</span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* FAQ section */}
                    <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md md:col-span-2">
                      <h3 className="text-sm font-black text-cyan-500 uppercase tracking-wider mb-4">Frequently Asked Questions</h3>
                      <div className="space-y-4">
                        {summary.faq?.map((q, i) => (
                          <div key={i} className="space-y-1">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-100">Q: {q.question}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-4">A: {q.answer}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-450 italic bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800">
                    No summary generated. Try indexing a new file to auto-compile insights.
                  </div>
                )}
              </div>
            )}

            {/* VIEW 4: Interactive Quizzes */}
            {activeTab === 'quiz' && (
              <div className="space-y-6">
                {!quiz ? (
                  <Card className="p-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-center space-y-6">
                    <Award className="w-12 h-12 text-indigo-500 mx-auto animate-bounce" />
                    <div>
                      <h3 className="text-base font-extrabold">Generate Interactive Revision Quiz</h3>
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 max-w-md mx-auto">
                        Generates MCQs, True/False, and short-answer questions using Groq grounded on your document text.
                      </p>
                    </div>
                    
                    <div className="flex justify-center gap-4 max-w-sm mx-auto">
                      <select 
                        value={quizConfig.difficulty} 
                        onChange={(e) => setQuizConfig(p => ({ ...p, difficulty: e.target.value }))}
                        className="bg-slate-50 dark:bg-slate-855 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 focus:outline-none"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                      <select 
                        value={quizConfig.count} 
                        onChange={(e) => setQuizConfig(p => ({ ...p, count: parseInt(e.target.value) }))}
                        className="bg-slate-50 dark:bg-slate-855 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 focus:outline-none"
                      >
                        <option value="3">3 Questions</option>
                        <option value="5">5 Questions</option>
                        <option value="10">10 Questions</option>
                      </select>
                    </div>

                    <Button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz} variant="primary">
                      {isGeneratingQuiz ? "Generating Quiz Questions..." : "Generate Practice Quiz"}
                    </Button>
                  </Card>
                ) : (
                  <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md space-y-6">
                    <h3 className="text-base font-black text-indigo-500">{quiz.title}</h3>
                    
                    <div className="space-y-6 divide-y divide-slate-100 dark:divide-slate-850">
                      {quiz.questions.map((q, idx) => (
                        <div key={q.id} className="pt-4 first:pt-0 space-y-2">
                          <p className="text-xs font-black">{idx + 1}. {q.question}</p>
                          
                          {/* MCQ Choice selections */}
                          {q.type === 'mcq' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-4">
                              {q.options.map((opt, oIdx) => (
                                <label key={oIdx} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name={q.id} 
                                    value={opt} 
                                    checked={quizAnswers[q.id] === opt}
                                    onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    className="accent-indigo-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* TF choices */}
                          {q.type === 'tf' && (
                            <div className="flex gap-4 pl-4">
                              {["True", "False"].map((opt) => (
                                <label key={opt} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name={q.id} 
                                    value={opt}
                                    checked={quizAnswers[q.id] === opt}
                                    onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                    className="accent-indigo-500"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* Fillups / Short answers */}
                          {['fill', 'short'].includes(q.type) && (
                            <input 
                              type="text" 
                              value={quizAnswers[q.id] || ''}
                              onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Type your answer here..."
                              className="bg-slate-50 dark:bg-slate-855 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none w-full max-w-md ml-4"
                            />
                          )}

                          {/* Corrections & explanations */}
                          {quizSubmitted && (
                            <div className="p-3 rounded-xl text-[10px] leading-relaxed border mt-2 bg-slate-50 dark:bg-slate-855 border-slate-100 dark:border-slate-800">
                              <p className="font-black">
                                Correct Answer: <span className="text-emerald-500">{String(q.correct_answer)}</span>
                              </p>
                              <p className="text-slate-400 mt-0.5">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-850">
                      {quizSubmitted ? (
                        <div>
                          <p className="text-xs font-black">
                            Score: <span className="text-indigo-500">{quizScore} / {quiz.questions.length}</span>
                          </p>
                          <Button onClick={() => setQuiz(null)} variant="secondary" className="mt-2">Try Another Quiz</Button>
                        </div>
                      ) : (
                        <Button onClick={handleSubmitQuiz} variant="success">Submit Quiz Answers</Button>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* VIEW 5: Study Planner */}
            {activeTab === 'planner' && (
              <div className="space-y-6">
                <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-base">Study Schedule Planner</CardTitle>
                    <CardDescription>Configure study targets and exam deadlines to auto-generate personalized revision pathways.</CardDescription>
                  </CardHeader>

                  {!studyPlan ? (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850 max-w-md">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-550">Target Exam Date</label>
                        <input
                          type="date"
                          value={plannerConfig.examDate}
                          onChange={(e) => setPlannerConfig(p => ({ ...p, examDate: e.target.value }))}
                          className="bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs focus:outline-none w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-550">Target Score (%)</label>
                        <input
                          type="number"
                          value={plannerConfig.targetScore}
                          onChange={(e) => setPlannerConfig(p => ({ ...p, targetScore: parseInt(e.target.value) }))}
                          className="bg-slate-50 dark:bg-slate-855 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs focus:outline-none w-full"
                        />
                      </div>
                      <Button onClick={handleGeneratePlan} disabled={isGeneratingPlan} variant="primary" className="w-full">
                        {isGeneratingPlan ? "Structuring Learning Path..." : "Generate Study Plan"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-2xl space-y-2">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Daily Calendar</span>
                          {studyPlan.daily_schedule?.map((d, i) => (
                            <p key={i} className="text-xs font-semibold text-slate-550">{d}</p>
                          ))}
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-855 rounded-2xl space-y-2">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase">Weekly Plan</span>
                          {studyPlan.weekly_plan?.map((w, i) => (
                            <p key={i} className="text-xs font-semibold text-slate-550">{w}</p>
                          ))}
                        </div>
                      </div>
                      <Button onClick={() => setStudyPlan(null)} variant="secondary">Reset Planner</Button>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* VIEW 6: Mind Map & Interactive Concept Graphs */}
            {activeTab === 'mindmap' && (
              <div className="space-y-6">
                <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-indigo-500" />
                      <span>Interactive Concept Map</span>
                    </CardTitle>
                    <CardDescription>Interactive, visual mind map showing dependencies, prerequisites, and relationships extracted from the context.</CardDescription>
                  </CardHeader>
                  
                  {/* SVG Mind Map nodes canvas */}
                  <div className="w-full h-[320px] bg-slate-50 dark:bg-slate-950/60 rounded-2xl relative border border-slate-100 dark:border-slate-900/60 overflow-hidden flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full">
                      {/* Connection lines */}
                      <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="4 4" />
                      <line x1="50%" y1="50%" x2="75%" y2="25%" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="4 4" />
                      <line x1="50%" y1="50%" x2="25%" y2="75%" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="4 4" />
                      <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="4 4" />
                    </svg>

                    {/* Nodes */}
                    <div className="absolute top-[12%] left-[12%] sm:left-[18%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-md text-[10px] font-extrabold">
                      Prerequisites
                    </div>
                    <div className="absolute top-[12%] right-[12%] sm:right-[18%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-md text-[10px] font-extrabold">
                      Core Theory
                    </div>
                    <div className="absolute bottom-[12%] left-[12%] sm:left-[18%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-md text-[10px] font-extrabold">
                      Formulas & Proofs
                    </div>
                    <div className="absolute bottom-[12%] right-[12%] sm:right-[18%] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-md text-[10px] font-extrabold">
                      Applications
                    </div>

                    {/* Center Core node */}
                    <div className="relative z-10 bg-indigo-600 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-xl shadow-indigo-500/20 text-center max-w-[160px] truncate">
                      {selectedDoc ? selectedDoc.title : "Document Core"}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-[10px] text-indigo-755 dark:text-indigo-350 leading-relaxed font-bold mt-4">
                    💡 Click on any concept node to pull up context citations, revision summaries, or generate specific flashcards targeting that subtopic.
                  </div>
                </Card>
              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
};

export default StudyAssistant;
