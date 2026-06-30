import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, Brain, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { authService } from '../services/api';

const Landing = () => {
  const isAuthenticated = authService.isAuthenticated();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-indigo-50/50 via-white to-slate-50">
        {/* Subtle Decorative Blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-8 animate-slide-up">
            <div className="inline-flex items-center space-x-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span>Offline Local NLP Processing</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-none">
              Generate Smart Flashcards
              <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                From Your Study Notes
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Instantly turn raw notes into custom question-answer pairs using spaCy NLP. 
              Review with custom spaced-repetition loops designed to lock concepts in.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-200 text-base"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-200 text-base"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold px-8 py-4 rounded-2xl shadow-sm transition-all duration-200 text-base"
                  >
                    Log In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Feature Cards Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              Built for Efficient Studying
            </h2>
            <p className="text-slate-500 font-medium">
              We leverage local NLP models to parse syntax, allowing you to study completely privacy-first.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300 space-y-6 group">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">AI-Powered Questioning</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Our local spaCy parser automatically extracts definitions, historical dates, people, and locations to frame high-yield questions.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300 space-y-6 group">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Spaced Repetition</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                Our smart review algorithm automatically flags harder topics and surfaces them more frequently so you focus where it matters most.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl transition-all duration-300 space-y-6 group">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Privacy First</h3>
              <p className="text-slate-500 leading-relaxed text-sm">
                No third-party paid APIs or cloud engines. All notes are parsed locally inside the backend server, keeping your data protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-base">SmartFlash</span>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} SmartFlash. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
