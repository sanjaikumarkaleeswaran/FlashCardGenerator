import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderHeart, 
  Layers, 
  CheckCircle, 
  Plus, 
  Play, 
  BookOpen, 
  ArrowRight,
  TrendingUp,
  FileText,
  PieChart,
  Calendar,
  Filter,
  Flame,
  Award,
  Trash2,
  Sparkles,
  UploadCloud
} from 'lucide-react';
import { flashcardService } from '../services/api';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import Tooltip from '../components/ui/Tooltip';
import DocumentUpload from './DocumentUpload';

const Dashboard = () => {
  const [sets, setSets] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Subject Filter State
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  
  // Hovered Chart Node for Tooltip
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Spaced Repetition Analytics States
  const [forecast, setForecast] = useState([]);
  const [leechCards, setLeechCards] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await flashcardService.list();
        setSets(data);
      } catch (err) {
        console.error("Failed to fetch decks:", err);
        setError('Failed to fetch dashboard data. Please try again.');
      }

      try {
        const forecastData = await flashcardService.getForecast();
        setForecast(forecastData || []);
      } catch (err) {
        console.error("Failed to fetch review forecast:", err);
      }

      try {
        const leechData = await flashcardService.getLeechCards();
        setLeechCards(leechData || []);
      } catch (err) {
        console.error("Failed to fetch leech cards:", err);
      }

      try {
        const docsData = await flashcardService.listDocuments();
        setDocuments(docsData || []);
      } catch (err) {
        console.error("Failed to fetch documents:", err);
      }

      // Add a slight delay for smooth layout transitions
      setTimeout(() => {
        setIsLoading(false);
      }, 600);
    };
    fetchDashboardData();
  }, []);

  const handleUploadSuccess = async (uploadedId, name, preview) => {
    try {
      const docsData = await flashcardService.listDocuments();
      setDocuments(docsData || []);
    } catch (err) {
      console.error("Failed to refresh documents list:", err);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (window.confirm("Are you sure you want to delete this document? This will remove the document reference but won't delete existing generated flashcard sets.")) {
      try {
        await flashcardService.deleteDocument(docId);
        setDocuments(prevDocs => prevDocs.filter(d => d.id !== docId));
      } catch (err) {
        console.error("Failed to delete document:", err);
        setError("Failed to delete document. Please try again.");
      }
    }
  };

  // Get unique subjects for filter dropdown
  const uniqueSubjects = ['All Subjects', ...new Set(sets.map(s => s.subject || 'General'))];

  // Filter sets by subject
  const filteredSets = selectedSubject === 'All Subjects'
    ? sets
    : sets.filter(s => (s.subject || 'General') === selectedSubject);

  // Compute Metrics based on filtered sets
  const totalSets = filteredSets.length;
  let totalCards = 0;
  let knownCards = 0;
  let notKnownCards = 0;
  
  let qaCount = 0;
  let mcqCount = 0;
  let fillupCount = 0;
  const docsUploadedCount = documents.length;

  filteredSets.forEach((set) => {
    totalCards += set.cards.length;
    set.cards.forEach((card) => {
      if (card.status === 'known') {
        knownCards += 1;
      } else {
        notKnownCards += 1;
      }

      const type = card.type || 'qa';
      if (type === 'mcq') {
        mcqCount += 1;
      } else if (type === 'fillup') {
        fillupCount += 1;
      } else {
        qaCount += 1;
      }
    });
  });

  const knownPercentage = totalCards > 0 ? Math.round((knownCards / totalCards) * 100) : 0;
  const notKnownPercentage = totalCards > 0 ? (100 - knownPercentage) : 0;

  // Compute Weekly Study Streak
  const getStudyStreak = () => {
    let streak = 0;
    const today = new Date();
    const sortedDates = [...new Set(sets.map(s => new Date(s.created_at).toDateString()))]
      .map(d => new Date(d))
      .sort((a, b) => b - a); // newest first

    let checkDate = new Date(today.toDateString());
    
    // Check if they studied today or yesterday to start streak count
    const hasStudiedOn = (date) => {
      return sortedDates.some(d => d.toDateString() === date.toDateString());
    };

    if (hasStudiedOn(checkDate)) {
      streak += 1;
    } else {
      // Check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      if (hasStudiedOn(checkDate)) {
        streak += 1;
      } else {
        return 0; // Streak broken
      }
    }

    // Trace back daily
    while (true) {
      checkDate.setDate(checkDate.getDate() - 1);
      if (hasStudiedOn(checkDate)) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = getStudyStreak();

  // --- SVG Data Computation (30 days timeline) ---
  const getTimelineData = () => {
    const dataPoints = [];
    const now = new Date();
    
    // Create 30 days slots
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toDateString();
      dataPoints.push({
        date: d,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        dateStr,
        count: 0
      });
    }

    // Accumulate card counts on respective dates
    filteredSets.forEach(set => {
      const setDate = new Date(set.created_at).toDateString();
      const point = dataPoints.find(p => p.dateStr === setDate);
      if (point) {
        point.count += set.cards.length;
      }
    });

    return dataPoints;
  };

  const timelineData = getTimelineData();
  const maxTimelineCount = Math.max(...timelineData.map(d => d.count), 5); // default floor of 5 for scaling

  // Generate SVG path for 30 Days Timeline Chart (Bezier curves)
  const svgWidth = 600;
  const svgHeight = 180;
  const paddingX = 40;
  const paddingY = 30;

  const points = timelineData.map((d, index) => {
    const x = paddingX + (index * (svgWidth - 2 * paddingX)) / (timelineData.length - 1);
    const y = svgHeight - paddingY - (d.count * (svgHeight - 2 * paddingY)) / maxTimelineCount;
    return { x, y, label: d.label, count: d.count };
  });

  // Construct Smooth Bezier Curve Path String
  const getBezierPath = (pts) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      // Control points
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 2 / 3;
      const cp2y = p1.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return path;
  };

  const pathD = getBezierPath(points);

  // Gradient area path string
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : '';

  // --- SVG Data Computation (Weekly Study Activity Contribution Grid) ---
  const getActivityGrid = () => {
    const grid = [];
    const today = new Date();
    // Start from 34 days ago (5 weeks of 7 days)
    const startDate = new Date();
    startDate.setDate(today.getDate() - 34);

    for (let dayIndex = 0; dayIndex < 35; dayIndex++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + dayIndex);
      const dateStr = d.toDateString();
      
      // Count sets generated on this day
      let setsCount = 0;
      filteredSets.forEach(set => {
        if (new Date(set.created_at).toDateString() === dateStr) {
          setsCount += 1;
        }
      });

      grid.push({
        date: d,
        dayOfWeek: d.getDay(), // 0 = Sun, 6 = Sat
        count: setsCount,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    }
    return grid;
  };

  const activityGrid = getActivityGrid();
  // Divide into 5 weeks
  const weeks = [];
  for (let i = 0; i < 5; i++) {
    weeks.push(activityGrid.slice(i * 7, (i + 1) * 7));
  }

  // SKELETON LOADER STATE
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200/60 dark:border-slate-800/80">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(idx => (
            <Card key={idx} className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="w-12 h-12 rounded-2xl" />
              </div>
            </Card>
          ))}
        </div>

        {/* Analytics Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80">
            <div className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-36 w-full rounded-2xl" />
            </div>
          </Card>
          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80">
            <div className="space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-36 w-full rounded-2xl" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in text-slate-800 dark:text-slate-250">
      
      {/* Header section with Subject Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-200/60 dark:border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Study Workspace</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">Review learning insights and manage AI-generated flashcard decks.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Subject Filter Selector */}
          <div className="relative flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl shadow-sm text-sm font-semibold text-slate-700 min-w-[200px] flex-1 md:flex-initial">
            <Filter className="w-4 h-4 text-indigo-500" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer font-bold text-slate-800 dark:text-slate-100 border-none appearance-none"
            >
              {uniqueSubjects.map((subj, index) => (
                <option key={index} value={subj} className="dark:bg-slate-900">{subj}</option>
              ))}
            </select>
          </div>

          <Link to="/create" className="flex-1 md:flex-initial">
            <Button variant="primary" icon={Plus} className="w-full">
              Generate Cards
            </Button>
          </Link>
          <Link to="/review" className="flex-1 md:flex-initial">
            <Button variant="success" icon={Play} className="w-full">
              Review Queue
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 p-4 rounded-2xl text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Glassmorphism Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Sets Card */}
        <Card glass={true} hoverEffect={true} className="p-6 bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">Total Topics</span>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalSets}</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450">Study sets generated</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 text-indigo-650 dark:text-indigo-400 border border-indigo-150/40 dark:border-indigo-900/40">
              <FolderHeart className="w-5.5 h-5.5" />
            </div>
          </div>
        </Card>

        {/* Total Cards Card */}
        <Card glass={true} hoverEffect={true} className="p-6 bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">Total Items</span>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{totalCards}</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450">Flashcard items cached</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-violet-500/10 to-purple-500/10 dark:from-violet-500/20 dark:to-purple-500/20 text-violet-600 dark:text-violet-400 border border-violet-150/40 dark:border-violet-900/40">
              <Layers className="w-5.5 h-5.5" />
            </div>
          </div>
        </Card>

        {/* Documents Uploaded Card */}
        <Card glass={true} hoverEffect={true} className="p-6 bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">Doc Uploads</span>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{docsUploadedCount}</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450">PDF, DOCX, TXT sources</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 text-blue-600 dark:text-blue-400 border border-blue-150/40 dark:border-blue-900/40">
              <FileText className="w-5.5 h-5.5" />
            </div>
          </div>
        </Card>

        {/* Known Mastery % Card */}
        <Card glass={true} hoverEffect={true} className="p-6 bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-extrabold uppercase tracking-widest">Mastery Rate</span>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{knownPercentage}%</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450">{knownCards} cards memorized</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20 text-emerald-700 dark:text-emerald-450 border border-emerald-150/40 dark:border-emerald-900/40">
              <CheckCircle className="w-5.5 h-5.5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Analytics Section: Upgraded SVG Line Chart & Streak Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Timeline Analytics (Bezier Curve Curve Chart) */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 shadow-md">
            <CardHeader className="p-0 pb-4 flex justify-between items-center border-b border-slate-50 dark:border-slate-850/50">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <span>Study Generation Timeline</span>
                </CardTitle>
                <CardDescription>Synthesized flashcard counts monitored over the past 30 days.</CardDescription>
              </div>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-xl font-extrabold uppercase tracking-wide border border-indigo-100/40 dark:border-indigo-900/40">
                Peak: {maxTimelineCount} Cards/Day
              </span>
            </CardHeader>

            {/* SVG line chart */}
            <div className="w-full pt-4 relative">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto">
                <defs>
                  {/* Premium Area Fill Gradient */}
                  <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
                  </linearGradient>
                  
                  {/* Curve Glow Gradient */}
                  <linearGradient id="line-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>

                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = paddingY + ratio * (svgHeight - 2 * paddingY);
                  return (
                    <line 
                      key={idx}
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      className="stroke-slate-100 dark:stroke-slate-800/80"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })}

                {/* Area Under Smooth Curve */}
                {points.length > 0 && (
                  <path d={areaD} fill="url(#chart-area-grad)" className="transition-all duration-500" />
                )}

                {/* Smooth Bezier Line */}
                {points.length > 0 && (
                  <path d={pathD} fill="none" stroke="url(#line-grad)" strokeWidth="3" strokeLinecap="round" className="transition-all duration-500" />
                )}

                {/* Interactive Node Circles */}
                {points.map((p, index) => {
                  if (p.count === 0 && index % 3 !== 0) return null;
                  const isHovered = hoveredPoint && hoveredPoint.index === index;
                  
                  return (
                    <g 
                      key={index} 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPoint({ ...p, index })}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      {/* Interactive Trigger Overlay */}
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r="12" 
                        fill="transparent"
                      />
                      
                      {/* Visual Node */}
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r={isHovered ? "6" : "3.5"} 
                        className="fill-white dark:fill-slate-900 stroke-indigo-650 dark:stroke-indigo-400 transition-all duration-150" 
                        strokeWidth="2.5" 
                      />
                    </g>
                  );
                })}

                {/* X Axis Labels */}
                {points.length > 0 && (
                  <>
                    <text x={points[0].x} y={svgHeight - 8} textAnchor="start" className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500">
                      {points[0].label}
                    </text>
                    <text x={points[Math.floor(points.length / 2)].x} y={svgHeight - 8} textAnchor="middle" className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500">
                      {points[Math.floor(points.length / 2)].label}
                    </text>
                    <text x={points[points.length - 1].x} y={svgHeight - 8} textAnchor="end" className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500">
                      {points[points.length - 1].label}
                    </text>
                  </>
                )}
              </svg>

              {/* Float Hover Tooltip overlay */}
              {hoveredPoint && (
                <div 
                  className="absolute bg-slate-950/90 text-white text-[10px] font-extrabold py-1.5 px-2.5 rounded-xl shadow-lg border border-slate-800/80 pointer-events-none transform -translate-x-1/2 -translate-y-full"
                  style={{ 
                    left: `${(hoveredPoint.x / svgWidth) * 100}%`, 
                    top: `${(hoveredPoint.y / svgHeight) * 100 - 4}%` 
                  }}
                >
                  <p className="opacity-70 scale-90">{hoveredPoint.label}</p>
                  <p className="text-xs text-indigo-400 font-extrabold">{hoveredPoint.count} Cards Created</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Side: Streak Heatmap — Premium */}
        <div className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 shadow-xl overflow-hidden">
            {/* Gradient header banner */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 pt-5 pb-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 80% 20%, white 0%, transparent 50%)'}} />
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <p className="text-white/80 text-[10px] font-extrabold uppercase tracking-widest">Daily Activity</p>
                  <h3 className="text-white text-xl font-extrabold mt-0.5">Study Streak</h3>
                </div>
                {/* Big flame streak counter */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-2xl border border-white/30">
                    <Flame className="w-6 h-6 text-white fill-white animate-pulse" />
                    <span className="text-2xl font-black text-white">{currentStreak}</span>
                  </div>
                  <p className="text-white/70 text-[9px] font-bold mt-1 uppercase tracking-wide">
                    {currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
                  </p>
                </div>
              </div>
              {/* Motivational tagline */}
              <p className="text-white/70 text-xs font-semibold mt-2 relative z-10">
                {currentStreak === 0
                  ? '🚀 Start studying today to begin your streak!'
                  : currentStreak < 3
                  ? '🌱 Great start — keep it going!'
                  : currentStreak < 7
                  ? '🔥 You\'re on a roll — don\'t stop now!'
                  : '⚡ Legendary streak — you\'re unstoppable!'}
              </p>
            </div>

            {/* Heatmap grid — pulled up to overlap the header */}
            <div className="px-5 pb-5 -mt-4">
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-lg">
                <div className="flex gap-2.5">
                  {/* Day Labels */}
                  <div className="flex flex-col justify-between text-[9px] font-extrabold text-slate-400 dark:text-slate-500 py-0.5 gap-1.5">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                      <span key={d} className="h-5 flex items-center">{d}</span>
                    ))}
                  </div>

                  {/* Weeks grid */}
                  <div className="flex gap-1.5 flex-1">
                    {weeks.map((week, wIndex) => (
                      <div key={wIndex} className="flex flex-col gap-1.5 flex-1">
                        {week.map((day, dIndex) => {
                          // Vivid color scale — green shades like GitHub
                          let bg, shadow;
                          if (day.count === 0) {
                            bg = 'bg-slate-100 dark:bg-slate-800/70';
                            shadow = '';
                          } else if (day.count === 1) {
                            bg = 'bg-emerald-300 dark:bg-emerald-800';
                            shadow = 'shadow-sm shadow-emerald-300/40';
                          } else if (day.count === 2) {
                            bg = 'bg-emerald-500 dark:bg-emerald-600';
                            shadow = 'shadow-md shadow-emerald-500/40';
                          } else {
                            bg = 'bg-gradient-to-br from-emerald-500 to-teal-500 dark:from-emerald-500 dark:to-teal-600';
                            shadow = 'shadow-lg shadow-emerald-500/50';
                          }

                          const isToday = day.date.toDateString() === new Date().toDateString();

                          return (
                            <Tooltip key={dIndex} content={`${day.label}: ${day.count} ${day.count === 1 ? 'Deck' : 'Decks'}`}>
                              <div
                                className={`h-5 rounded-md transition-all duration-200 hover:scale-125 cursor-pointer ${bg} ${shadow} ${isToday ? 'ring-2 ring-offset-1 ring-amber-400 dark:ring-amber-500' : ''}`}
                              />
                            </Tooltip>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">Less</span>
                  <div className="flex items-center gap-1">
                    <div className="w-3.5 h-3.5 bg-slate-100 dark:bg-slate-800 rounded-sm" />
                    <div className="w-3.5 h-3.5 bg-emerald-300 dark:bg-emerald-800 rounded-sm" />
                    <div className="w-3.5 h-3.5 bg-emerald-500 dark:bg-emerald-600 rounded-sm" />
                    <div className="w-3.5 h-3.5 bg-teal-500 rounded-sm" />
                  </div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide">More</span>
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3 border border-indigo-100 dark:border-indigo-900/40 text-center">
                  <p className="text-indigo-700 dark:text-indigo-400 text-lg font-black">{sets.length}</p>
                  <p className="text-[10px] font-bold text-indigo-600/70 dark:text-indigo-500 uppercase tracking-wide">Total Sets</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40 text-center">
                  <p className="text-emerald-700 dark:text-emerald-400 text-lg font-black">{knownPercentage}%</p>
                  <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-500 uppercase tracking-wide">Mastered</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

      </div>

      {/* Spaced Repetition Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Due Cards Forecast Calendar */}
        <div className="lg:col-span-2">
          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 shadow-md h-full">
            <CardHeader className="p-0 pb-4 flex justify-between items-center border-b border-slate-50 dark:border-slate-850/50 mb-4">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Review Forecast Schedule</span>
                </CardTitle>
                <CardDescription>Number of flashcards scheduled for daily review over the next 7 days.</CardDescription>
              </div>
            </CardHeader>
            
            {forecast.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-slate-400 dark:text-slate-500 text-xs italic">
                No due card forecast details available.
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2.5 sm:gap-4 pt-2">
                {forecast.slice(0, 7).map((fDay, idx) => {
                  const dateObj = new Date(fDay.date + 'T00:00:00');
                  const weekday = dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                  const dayNum = dateObj.toLocaleDateString(undefined, { day: 'numeric' });
                  const isToday = idx === 0;
                  
                  return (
                    <div key={idx} className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${
                      isToday
                        ? 'bg-gradient-to-b from-indigo-50/70 to-indigo-100/40 dark:from-indigo-950/20 dark:to-indigo-950/40 border-indigo-200 dark:border-indigo-900/60 shadow-md shadow-indigo-500/5'
                        : 'bg-slate-50/40 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60'
                    }`}>
                      <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase">{weekday}</span>
                      <span className={`text-sm font-black my-1.5 ${isToday ? 'text-indigo-650 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{dayNum}</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                        fDay.count > 0 
                          ? 'bg-indigo-100 text-indigo-850 dark:bg-indigo-900/50 dark:text-indigo-350' 
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-550'
                      }`}>
                        {fDay.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Leech Cards Alerts */}
        <div className="lg:col-span-1">
          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 shadow-md h-full">
            <CardHeader className="p-0 pb-4 flex justify-between items-center border-b border-slate-50 dark:border-slate-850/50 mb-4">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Leech Card Alert</span>
                </CardTitle>
                <CardDescription>Difficult terms identified by multiple learning failures.</CardDescription>
              </div>
            </CardHeader>
            
            {leechCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-5 bg-slate-50/30 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl h-[120px] text-center">
                <CheckCircle className="w-6 h-6 text-emerald-500 mb-1.5" />
                <p className="text-xs font-extrabold text-slate-750 dark:text-slate-300">All clear!</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5 leading-snug">No leech cards detected. Excellent recall memory!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[140px] overflow-y-auto pr-1">
                {leechCards.map((card) => (
                  <div key={card.id} className="p-2.5 bg-rose-50/40 dark:bg-rose-950/10 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-rose-755 dark:text-rose-400 truncate">{card.question}</p>
                      <p className="text-[9px] text-slate-455 dark:text-slate-500 font-semibold">Lapses: <span className="font-extrabold text-rose-600">{card.lapses}</span> | Subject: {card.subject}</p>
                    </div>
                    <Link to={`/review?setId=${card.setId}`}>
                      <button className="text-[9px] font-extrabold text-rose-755 bg-rose-100 hover:bg-rose-200 dark:text-rose-350 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 px-2 py-1 rounded-lg transition-all shrink-0 cursor-pointer">
                        Study
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Main Grid: Recent Sets and Mastery Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Recent Decks */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800/80 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Recent Study Sets ({selectedSubject})</h2>
            <Link 
              to="/history" 
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 text-xs font-bold flex items-center space-x-1"
            >
              <span>See All Decks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredSets.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 shadow-sm space-y-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-550 rounded-2xl flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-200">No Flashcard Decks Found</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs max-w-sm mx-auto">
                  {selectedSubject === 'All Subjects'
                    ? 'Upload study documents or paste notes, and our AI will automatically parse flashcards for you.'
                    : `No study sets are categorised under "${selectedSubject}" yet.`}
                </p>
              </div>
              <Link to="/create">
                <Button variant="primary" icon={Plus}>Create Your First Set</Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSets.slice(0, 3).map((set) => {
                const docType = set.source_type?.toUpperCase() || 'TEXT';
                const cardTypeLabel = set.flashcard_type === 'mcq' ? 'MCQ' : set.flashcard_type === 'fillup' ? 'FILLUP' : 'QA';
                
                return (
                  <Card 
                    key={set.id}
                    hoverEffect={true}
                    className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-850/80 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
                  >
                    <div className="space-y-2 max-w-lg flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-slate-805 dark:text-slate-100 line-clamp-1 leading-tight">{set.title}</h3>
                        <Badge variant="secondary">{docType}</Badge>
                        <Badge variant="info">{cardTypeLabel}</Badge>
                        {set.folder_name && (
                          <Badge variant="warning">{set.folder_name}</Badge>
                        )}
                      </div>
                      <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">
                        Created: {new Date(set.created_at).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })} | Cards: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{set.card_count}</span>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed font-medium">
                        {set.notes}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Link to={`/review?setId=${set.id}`} className="flex-1 sm:flex-initial">
                        <Button variant="outline" className="w-full">Study Set</Button>
                      </Link>
                      <Link to="/history" className="flex-1 sm:flex-initial">
                        <Button variant="secondary" className="w-full">Details</Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Document File Center Card */}
          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-805 shadow-md space-y-6">
            <CardHeader className="p-0 pb-4 flex justify-between items-center border-b border-slate-50 dark:border-slate-850/50">
              <div>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <span>Document File Center</span>
                </CardTitle>
                <CardDescription>Upload study materials and manage your source files directly from here.</CardDescription>
              </div>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Uploader Left Panel */}
              <div className="md:col-span-5 space-y-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Quick Upload File
                </label>
                <DocumentUpload 
                  onUploadSuccess={handleUploadSuccess}
                />
              </div>

              {/* Uploaded Documents List Right Panel */}
              <div className="md:col-span-7 space-y-3">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Uploaded Files ({documents.length})
                </label>

                {documents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-slate-50/40 dark:bg-slate-950/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl h-[170px] text-center">
                    <UploadCloud className="w-8 h-8 text-slate-350 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No documents uploaded yet</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">Drag a PDF, DOCX, or TXT file on the left to start importing knowledge.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id} 
                        className="p-3 bg-slate-50/60 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-800/60 rounded-2xl flex items-center justify-between gap-4 group hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate pr-2" title={doc.filename}>
                              {doc.filename}
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                              {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} | {(doc.char_count / 1000).toFixed(1)}k chars
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Link 
                            to={`/create?source=${doc.id}&name=${encodeURIComponent(doc.filename)}`}
                            title="Generate Flashcards"
                          >
                            <button className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 transition-all cursor-pointer">
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-455 transition-all cursor-pointer"
                            title="Delete File"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Side: Circular Mastery Ring & Card Types */}
        <div className="space-y-4">
          <div className="border-b border-slate-150 dark:border-slate-800/80 pb-3">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Learning Insights</h2>
          </div>

          <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/85 shadow-md space-y-6">
            
            {/* SVG Circular Mastery Progress Ring */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="56"
                    className="stroke-slate-100 dark:stroke-slate-800/80 fill-none"
                    strokeWidth="9"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="56"
                    className="stroke-indigo-600 dark:stroke-indigo-500 fill-none transition-all duration-1000 ease-out"
                    strokeWidth="9"
                    strokeDasharray={351.8}
                    strokeDashoffset={351.8 - (351.8 * knownPercentage) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center space-y-0.5">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{knownPercentage}%</span>
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Mastered</span>
                </div>
              </div>
              
              <div className="w-full flex justify-between items-center text-[10px] font-extrabold text-slate-500 dark:text-slate-400 px-3">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  <span>Known: {knownPercentage}%</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse" />
                  <span>Review: {notKnownPercentage}%</span>
                </span>
              </div>
            </div>

            {/* Card Types Distribution */}
            <div className="border-t border-slate-100 dark:border-slate-805 pt-5 space-y-4">
              <h3 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center space-x-1.5">
                <PieChart className="w-3.5 h-3.5 text-indigo-500" />
                <span>Card Types Distribution</span>
              </h3>

              <div className="space-y-3">
                {/* QA bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-750 dark:text-slate-300 mb-1">
                    <span>Q & A Items</span>
                    <span className="text-slate-400">{qaCount} cards</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-650 h-full rounded-full" 
                      style={{ width: `${totalCards > 0 ? (qaCount / totalCards) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* MCQ bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-750 dark:text-slate-300 mb-1">
                    <span>Multiple Choice</span>
                    <span className="text-slate-400">{mcqCount} cards</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-650 h-full rounded-full" 
                      style={{ width: `${totalCards > 0 ? (mcqCount / totalCards) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Fillups bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-750 dark:text-slate-300 mb-1">
                    <span>Fill in the Blanks</span>
                    <span className="text-slate-400">{fillupCount} cards</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full" 
                      style={{ width: `${totalCards > 0 ? (fillupCount / totalCards) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary statistics */}
            <div className="w-full border-t border-slate-100 dark:border-slate-855 pt-5 flex justify-around text-center">
              <div>
                <span className="block text-xl font-extrabold text-emerald-600 dark:text-emerald-450">{knownCards}</span>
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Known</span>
              </div>
              <div className="border-r border-slate-100 dark:border-slate-800" />
              <div>
                <span className="block text-xl font-extrabold text-amber-600 dark:text-amber-450">{notKnownCards}</span>
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Need Review</span>
              </div>
            </div>
            
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
