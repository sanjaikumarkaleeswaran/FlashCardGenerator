import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Cpu, Sliders, FileText, 
  Trash2, Plus, Save, RotateCcw, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { settingsService, flashcardService } from '../services/api';

const Settings = () => {
  const [settings, setSettings] = useState({
    preferred_model: 'llama-3.1-8b-instant',
    study_preferences: {
      starting_ease_factor: 2.5,
      interval_multiplier: 1.0,
      max_reviews_per_day: 100
    },
    custom_prompts: []
  });

  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  
  // Custom Prompt Form State
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptInstruction, setNewPromptInstruction] = useState('');

  // Reset Modal states
  const [showGlobalResetModal, setShowGlobalResetModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await settingsService.getSettings();
      if (res && res.settings) {
        const data = res.settings;
        setSettings({
          preferred_model: data.preferred_model || 'llama-3.1-8b-instant',
          study_preferences: {
            starting_ease_factor: data.study_preferences?.starting_ease_factor ?? 2.5,
            interval_multiplier: data.study_preferences?.interval_multiplier ?? 1.0,
            max_reviews_per_day: data.study_preferences?.max_reviews_per_day ?? 100
          },
          custom_prompts: data.custom_prompts || []
        });
      }
      
      const modelsData = await settingsService.listModels();
      if (modelsData && modelsData.models) {
        setAvailableModels(modelsData.models);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
      showStatus('Failed to load settings from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showStatus = (text, type = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handlePreferenceChange = (key, val) => {
    setSettings(prev => ({
      ...prev,
      study_preferences: {
        ...prev.study_preferences,
        [key]: parseFloat(val) || val
      }
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await settingsService.updateSettings({
        preferred_model: settings.preferred_model,
        study_preferences: settings.study_preferences
      });
      showStatus('Settings saved successfully!');
    } catch (err) {
      console.error(err);
      showStatus('Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrompt = async (e) => {
    e.preventDefault();
    if (!newPromptName.trim() || !newPromptInstruction.trim()) return;
    try {
      const res = await settingsService.addCustomPrompt(
        newPromptName.trim(),
        newPromptInstruction.trim()
      );
      const added = res.prompt || res;
      setSettings(prev => ({
        ...prev,
        custom_prompts: [...prev.custom_prompts, added]
      }));
      setNewPromptName('');
      setNewPromptInstruction('');
      showStatus('Custom prompt template added!');
    } catch (err) {
      console.error(err);
      showStatus('Failed to add custom prompt template.', 'error');
    }
  };

  const handleDeletePrompt = async (promptId) => {
    try {
      await settingsService.deleteCustomPrompt(promptId);
      setSettings(prev => ({
        ...prev,
        custom_prompts: prev.custom_prompts.filter(p => p.id !== promptId)
      }));
      showStatus('Prompt template deleted.');
    } catch (err) {
      console.error(err);
      showStatus('Failed to delete prompt template.', 'error');
    }
  };

  const handleGlobalReset = async () => {
    try {
      await flashcardService.resetGlobalProgress();
      setResetSuccess(true);
      setShowGlobalResetModal(false);
      showStatus('Global study progress reset successfully.');
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      showStatus('Failed to reset global progress.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        <p className="mt-4 text-slate-500 font-medium">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
          <SettingsIcon className="w-6 h-6 animate-spin-slow" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configure models, customize prompt templates, and tune spaced repetition SM-2 variables.</p>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMsg && (
        <div className={`fixed bottom-5 right-5 flex items-center space-x-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-bold z-50 animate-bounce ${
          statusMsg.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-250' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-250'
        }`}>
          {statusMsg.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Columns - Forms */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Form for general settings */}
          <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-indigo-950/[0.03] border border-slate-100 dark:border-slate-800 space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Cpu className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Model & Generation Settings</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Preferred AI Model
                </label>
                <select
                  value={settings.preferred_model}
                  onChange={(e) => setSettings(prev => ({ ...prev, preferred_model: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all"
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.provider})
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-400 mt-1 block">
                  Select the default Groq LLM API model used to extract topics and synthesize flashcards.
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 pt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Sliders className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">SM-2 Spaced Repetition Tuner</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Starting Ease Factor
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1.3"
                  max="3.0"
                  value={settings.study_preferences.starting_ease_factor}
                  onChange={(e) => handlePreferenceChange('starting_ease_factor', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <span className="text-xs text-slate-400 mt-1 block">
                  Default ease factor for new cards (default: 2.5). Higher means faster intervals.
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interval Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="2.0"
                  value={settings.study_preferences.interval_multiplier}
                  onChange={(e) => handlePreferenceChange('interval_multiplier', e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <span className="text-xs text-slate-400 mt-1 block">
                  Scales next review spacing. E.g. 1.2 adds 20% delay for slower schedules.
                </span>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Max Daily Reviews
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={settings.study_preferences.max_reviews_per_day}
                  onChange={(e) => handlePreferenceChange('max_reviews_per_day', parseInt(e.target.value) || 100)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <span className="text-xs text-slate-400 mt-1 block">
                  Capping maximum due cards shown on your daily review deck queue.
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center space-x-2 bg-gradient-to-r from-indigo-650 to-purple-650 hover:opacity-90 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-indigo-500/10 cursor-pointer transition-all"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Configuration</span>
              </button>
            </div>
          </form>

          {/* Custom Prompt Templates */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-indigo-950/[0.03] border border-slate-100 dark:border-slate-800 space-y-6">
            <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <FileText className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Custom Generation Instructions</h2>
            </div>

            {/* List custom prompts */}
            <div className="space-y-3">
              {settings.custom_prompts.length === 0 ? (
                <p className="text-slate-450 dark:text-slate-500 text-sm italic">No custom instructions templates created yet. Add one below!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settings.custom_prompts.map((prompt) => (
                    <div key={prompt.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 relative group transition-all">
                      <button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{prompt.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-450 line-clamp-3">{prompt.instruction}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add prompt template form */}
            <form onSubmit={handleAddPrompt} className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Create New Instruction Template</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-650 dark:text-slate-400 mb-1">Template Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. For Kids"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-650 dark:text-slate-400 mb-1">Additional Instructions</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Explain terms using simple, analogical stories."
                      value={newPromptInstruction}
                      onChange={(e) => setNewPromptInstruction(e.target.value)}
                      className="flex-grow px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl flex items-center justify-center shadow-md cursor-pointer transition-all shrink-0"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Danger Zone & Info */}
        <div className="space-y-8">
          {/* Info Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-slate-900 dark:to-indigo-950/20 rounded-3xl p-6 border border-indigo-150/40 dark:border-indigo-900/30">
            <div className="flex items-center space-x-2 mb-3">
              <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Configuration Guides</h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-650 dark:text-slate-350 list-disc list-inside">
              <li>Custom prompt templates appear in the card generator panel.</li>
              <li>Starting ease factor adjusts the starting speed of reviews.</li>
              <li>Reducing interval multiplier reviews cards sooner.</li>
              <li>Maximum reviews limits deck overload.</li>
            </ul>
          </div>

          {/* Danger Zone */}
          <div className="bg-rose-50/50 dark:bg-rose-950/10 rounded-3xl p-6 border border-rose-100 dark:border-rose-900/30 space-y-4">
            <h3 className="font-bold text-rose-800 dark:text-rose-400 text-base flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Danger Zone</span>
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">These actions will irreversibly clear your personal analytics, learning stats, and history.</p>

            <button
              onClick={() => setShowGlobalResetModal(true)}
              className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md shadow-rose-500/10 cursor-pointer transition-all text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset All Study Progress</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Reset Confirmation Modal */}
      {showGlobalResetModal && (
        <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-slate-800 shadow-2xl animate-scale-up space-y-6">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold">Reset Global Progress?</h3>
            </div>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              This action will permanently reset the learning history, repetitions count, interval schedules, and ease factors for <strong>ALL</strong> flashcards in your decks. This cannot be undone.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowGlobalResetModal(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-sm cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleGlobalReset}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md cursor-pointer transition-all"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
