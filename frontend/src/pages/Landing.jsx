import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, Brain, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { authService } from '../services/api';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const Landing = () => {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-indigo-50 via-purple-50/50 to-pink-50/30 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-slate-950">
        {/* Decorative ambient background glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/15 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-spin-slow" />
        <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-pink-500/15 dark:bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-5%] left-[40%] w-[400px] h-[400px] bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8 animate-slide-up">
            <div className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Offline Local NLP Processing</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
              Generate Smart Flashcards
              <span className="block mt-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-650 to-violet-650 dark:from-indigo-400 dark:to-violet-400">
                From Your Study Notes
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
              Instantly turn raw notes into custom question-answer pairs using spaCy NLP. 
              Review with custom spaced-repetition loops designed to lock concepts in.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
              {isAuthenticated ? (
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full sm:w-auto shadow-lg shadow-indigo-500/10 h-14 px-8"
                    icon={ArrowRight}
                    iconPosition="right"
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full sm:w-auto shadow-lg shadow-indigo-500/10 h-14 px-8"
                      icon={ArrowRight}
                      iconPosition="right"
                    >
                      Get Started Free
                  </Button>
                  </Link>
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto h-14 px-8"
                    >
                      Log In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Feature Cards Grid */}
      <section className="py-20 bg-white dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Built for Efficient Studying
            </h2>
            <p className="text-slate-550 dark:text-slate-400 font-medium">
              We leverage local NLP models to parse syntax, allowing you to study completely privacy-first.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <Card hoverEffect={true} className="p-8 bg-white/80 dark:bg-slate-900/60 border-indigo-100/60 dark:border-indigo-900/30 group shadow-lg shadow-indigo-500/5">
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-3 transition-all mb-6 shadow-md shadow-indigo-500/20">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">AI-Powered Questioning</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm font-medium mt-3">
                Our local spaCy parser automatically extracts definitions, historical dates, people, and locations to frame high-yield questions.
              </p>
            </Card>

            {/* Feature 2 */}
            <Card hoverEffect={true} className="p-8 bg-white/80 dark:bg-slate-900/60 border-emerald-100/60 dark:border-emerald-900/30 group shadow-lg shadow-emerald-500/5">
              <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-3 transition-all mb-6 shadow-md shadow-emerald-500/20">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Spaced Repetition</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm font-medium mt-3">
                Our smart review algorithm automatically flags harder topics and surfaces them more frequently so you focus where it matters most.
              </p>
            </Card>

            {/* Feature 3 */}
            <Card hoverEffect={true} className="p-8 bg-white/80 dark:bg-slate-900/60 border-pink-100/60 dark:border-pink-900/30 group shadow-lg shadow-pink-500/5">
              <div className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 group-hover:rotate-3 transition-all mb-6 shadow-md shadow-pink-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Privacy First</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm font-medium mt-3">
                No third-party paid APIs or cloud engines. All notes are parsed locally inside the backend server, keeping your data protected.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-450 py-12 border-t border-slate-850 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-base">SmartFlash</span>
          </div>
          <p className="text-sm font-semibold">
            &copy; {new Date().getFullYear()} SmartFlash. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
