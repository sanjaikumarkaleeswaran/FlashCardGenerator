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
  TrendingUp,
  FileText,
  PieChart,
  Calendar,
  Filter
} from 'lucide-react';
import { flashcardService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [sets, setSets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Subject Filter State
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');

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
  let docsUploadedCount = 0;

  filteredSets.forEach((set) => {
    const srcType = set.source_type?.toLowerCase() || 'text';
    if (['pdf', 'docx', 'txt'].includes(srcType)) {
      docsUploadedCount += 1;
    }

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

  // Generate SVG path for 30 Days Timeline Chart
  const svgWidth = 600;
  const svgHeight = 150;
  const paddingX = 40;
  const paddingY = 20;

  const points = timelineData.map((d, index) => {
    const x = paddingX + (index * (svgWidth - 2 * paddingX)) / (timelineData.length - 1);
    const y = svgHeight - paddingY - (d.count * (svgHeight - 2 * paddingY)) / maxTimelineCount;
    return { x, y, label: d.label, count: d.count };
  });

  // Construct SVG Path String
  const pathD = points.reduce((acc, p, index) => {
    return index === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Gradient area path string
  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`
    : '';

  // --- SVG Data Computation (Weekly Study Activity Contribution Grid) ---
  // A Grid representing the last 5 weeks: 7 rows (Sun-Sat) by 5 columns
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
      {/* Header section with Subject Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Study Workspace</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Review metrics and manage your generated flashcards.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Subject Filter Dropdown */}
          <div className="relative flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm text-sm font-semibold text-slate-700 min-w-[200px] flex-1 md:flex-initial">
            <Filter className="w-4 h-4 text-indigo-500" />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-transparent focus:outline-none w-full cursor-pointer font-bold text-slate-800"
            >
              {uniqueSubjects.map((subj, index) => (
                <option key={index} value={subj}>{subj}</option>
              ))}
            </select>
          </div>

          <Link
            to="/create"
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md transition-all text-sm flex-1 md:flex-initial cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Cards</span>
          </Link>
          <Link
            to="/review"
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md transition-all text-sm flex-1 md:flex-initial cursor-pointer"
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
          title="Documents uploaded"
          value={docsUploadedCount}
          icon={FileText}
          colorClass="bg-blue-50 text-blue-600"
          subtitle="PDF, DOCX, TXT inputs"
        />
        <MetricCard
          title="Known cards"
          value={knownCards}
          icon={CheckCircle}
          colorClass="bg-emerald-50 text-emerald-600"
          subtitle={`${knownPercentage}% mastery rate`}
        />
      </div>

      {/* Dynamic SVG Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Timeline Analytics (Cards created over 30 days) */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <span>Cards Created Over Time (30 Days)</span>
              </h3>
              <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Timeline track of total cards synthesized by NLP model.</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-extrabold">
              Max: {maxTimelineCount} Cards/Day
            </span>
          </div>

          {/* SVG line chart */}
          <div className="w-full overflow-x-auto pt-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px]">
              <defs>
                <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25"/>
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0"/>
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
                    className="stroke-slate-100"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* Area Under Curve */}
              {points.length > 0 && (
                <path d={areaD} fill="url(#chart-grad)" />
              )}

              {/* Line Curve */}
              {points.length > 0 && (
                <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
              )}

              {/* Data circles & Tooltip count */}
              {points.map((p, index) => {
                // Show circles only for non-zero points or selected intervals to prevent clutter
                if (p.count === 0 && index % 3 !== 0) return null;
                return (
                  <g key={index} className="group cursor-pointer">
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r="4" 
                      className="fill-white stroke-indigo-600 hover:stroke-indigo-800 transition-all" 
                      strokeWidth="2.5" 
                    />
                    {p.count > 0 && (
                      <text
                        x={p.x}
                        y={p.y - 8}
                        textAnchor="middle"
                        className="text-[9px] font-extrabold fill-indigo-700 bg-white"
                      >
                        {p.count}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* X Axis Labels (First, Middle, Last) */}
              {points.length > 0 && (
                <>
                  <text x={points[0].x} y={svgHeight - 4} textAnchor="start" className="text-[10px] font-bold fill-slate-400">
                    {points[0].label}
                  </text>
                  <text x={points[Math.floor(points.length / 2)].x} y={svgHeight - 4} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">
                    {points[Math.floor(points.length / 2)].label}
                  </text>
                  <text x={points[points.length - 1].x} y={svgHeight - 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400">
                    {points[points.length - 1].label}
                  </text>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Right Side: GitHub-style Study Activity Contribution Grid */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-50">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>Weekly Generation Grid</span>
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Study set generation activity mapped over the last 5 weeks.</p>
          </div>

          <div className="flex justify-center py-4">
            {/* Grid Container */}
            <div className="flex gap-2">
              {/* Day Labels Column */}
              <div className="flex flex-col justify-between text-[9px] font-bold text-slate-400 pr-1 py-1">
                <span>Su</span>
                <span>Tu</span>
                <span>Th</span>
                <span>Sa</span>
              </div>

              {/* Weeks columns */}
              <div className="flex gap-1.5">
                {weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-1.5">
                    {week.map((day, dIndex) => {
                      // Determine box color based on generations count
                      let colorClass = 'bg-slate-100 hover:bg-slate-200';
                      if (day.count > 0) {
                        if (day.count === 1) colorClass = 'bg-indigo-200 hover:bg-indigo-300';
                        else if (day.count === 2) colorClass = 'bg-indigo-400 hover:bg-indigo-500';
                        else colorClass = 'bg-indigo-650 hover:bg-indigo-700';
                      }
                      
                      return (
                        <div
                          key={dIndex}
                          className={`w-4 h-4 rounded-md transition-all cursor-pointer ${colorClass}`}
                          title={`${day.label}: ${day.count} sets created`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 border-t border-slate-50 pt-3">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-slate-100 rounded-sm" />
              <div className="w-3 h-3 bg-indigo-200 rounded-sm" />
              <div className="w-3 h-3 bg-indigo-400 rounded-sm" />
              <div className="w-3 h-3 bg-indigo-650 rounded-sm" />
            </div>
            <span>More</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Recent Sets and Mastery Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Recent Notes/Sets */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-xl font-extrabold text-slate-900">Recent Study Sets ({selectedSubject})</h2>
            <Link 
              to="/history" 
              className="text-indigo-600 hover:text-indigo-700 text-sm font-bold flex items-center space-x-1"
            >
              <span>See All History</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {filteredSets.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm space-y-6">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800">No Flashcard Sets Found</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">
                  {selectedSubject === 'All Subjects'
                    ? 'Upload study documents or paste notes, and our AI will automatically parse flashcards for you.'
                    : `No study sets are categorised under "${selectedSubject}" yet.`}
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
              {filteredSets.slice(0, 3).map((set) => {
                const docType = set.source_type?.toUpperCase() || 'TEXT';
                const cardTypeLabel = set.flashcard_type === 'mcq' ? 'MCQ' : set.flashcard_type === 'fillup' ? 'FILLUP' : 'QA';
                
                return (
                  <div 
                    key={set.id}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
                  >
                    <div className="space-y-2 max-w-lg flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-extrabold text-slate-800 line-clamp-1 leading-tight">{set.title}</h3>
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-bold rounded">
                          {docType}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded">
                          {cardTypeLabel}
                        </span>
                        {set.folder_name && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-pink-50 text-pink-700 font-bold rounded">
                            {set.folder_name}
                          </span>
                        )}
                      </div>
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
                        className="flex-1 sm:flex-initial text-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer"
                      >
                        Study Set
                      </Link>
                      <Link
                        to="/history"
                        className="flex-1 sm:flex-initial text-center bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Learning Progress / Card Mastery Ring & Card Types */}
        <div className="space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xl font-extrabold text-slate-900 font-sans">Learning Insights</h2>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
            
            {/* SVG Circular Mastery Gauge */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    className="stroke-slate-100 fill-none"
                    strokeWidth="10"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    className="stroke-indigo-600 fill-none transition-all duration-1000 ease-out"
                    strokeWidth="10"
                    strokeDasharray={402.1}
                    strokeDashoffset={402.1 - (402.1 * knownPercentage) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center space-y-0.5">
                  <span className="text-3xl font-extrabold text-slate-900">{knownPercentage}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mastered</span>
                </div>
              </div>
              
              <div className="w-full flex justify-between items-center text-xs font-bold text-slate-500 px-4">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Known: {knownPercentage}%</span>
                </span>
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Not Known: {notKnownPercentage}%</span>
                </span>
              </div>
            </div>

            {/* Card Types Distribution */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <PieChart className="w-4 h-4 text-indigo-500" />
                <span>Card Types Distribution</span>
              </h3>

              <div className="space-y-3">
                {/* QA bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Question & Answer</span>
                    <span className="text-slate-400">{qaCount} cards</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full" 
                      style={{ width: `${totalCards > 0 ? (qaCount / totalCards) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* MCQ bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Multiple Choice (MCQ)</span>
                    <span className="text-slate-400">{mcqCount} cards</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-600 h-full rounded-full" 
                      style={{ width: `${totalCards > 0 ? (mcqCount / totalCards) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Fillups bar */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                    <span>Fill in the Blanks</span>
                    <span className="text-slate-400">{fillupCount} cards</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full" 
                      style={{ width: `${totalCards > 0 ? (fillupCount / totalCards) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary statistics */}
            <div className="w-full border-t border-slate-100 pt-6 flex justify-around text-center">
              <div>
                <span className="block text-2xl font-extrabold text-emerald-600">{knownCards}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Known</span>
              </div>
              <div className="border-r border-slate-100" />
              <div>
                <span className="block text-2xl font-extrabold text-amber-600">{notKnownCards}</span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Needs Review</span>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
