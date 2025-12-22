
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { TaskType, ScoringResult, AppState, ExcelEssay, ViewMode } from './types';
import { evaluateEssay } from './services/geminiService';
import CriteriaCard from './components/CriteriaCard';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'ielts_essay_repository';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    viewMode: 'ANALYZER',
    taskType: TaskType.TASK_2,
    question: '',
    essay: '',
    isAnalyzing: false,
    result: null,
    error: null,
    history: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setState(prev => ({ ...prev, history: parsed }));
      } catch (e) {
        console.error("Failed to parse saved history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  }, [state.history]);

  // Robust word count calculation
  const wordCount = useMemo(() => {
    return (state.essay.match(/\S+/g) || []).length;
  }, [state.essay]);

  const handleAnalyze = async () => {
    if (!state.question.trim() || !state.essay.trim()) {
      setState(prev => ({ ...prev, error: "Please enter both the question prompt and your essay." }));
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null, result: null }));

    try {
      const result = await evaluateEssay(state.taskType, state.question, state.essay);
      setState(prev => ({ ...prev, result, isAnalyzing: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message, isAnalyzing: false }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const mappedData: ExcelEssay[] = data.map((row: any, index) => ({
        stt: row['STT'] || row['stt'] || state.history.length + index + 1,
        source: row['Source'] || row['source'] || 'Uploaded Excel',
        topic: row['Topic'] || row['topic'] || '',
        sample: row['Sample'] || row['sample'] || '',
        gr: row['GR'] || row['gr'] || '',
        lr: row['LR'] || row['lr'] || '',
        cc: row['CC'] || row['cc'] || '',
        ta: row['TA'] || row['ta'] || '',
        overall: row['Overall'] || row['overall'] || '',
      }));

      setState(prev => ({ ...prev, history: [...prev.history, ...mappedData] }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveToRepository = () => {
    if (!state.result) return;

    const newEntry: ExcelEssay = {
      stt: state.history.length + 1,
      source: 'AI Analyzer',
      topic: state.question,
      sample: state.essay,
      gr: state.result.criteria.grammaticalRange.score,
      lr: state.result.criteria.lexicalResource.score,
      cc: state.result.criteria.coherenceCohesion.score,
      ta: state.result.criteria.taskAchievement.score,
      overall: state.result.overallBand,
    };

    setState(prev => ({
      ...prev,
      history: [newEntry, ...prev.history],
    }));
    
    alert("Saved to Repository!");
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your entire repository? This cannot be undone.")) {
      setState(prev => ({ ...prev, history: [] }));
    }
  };

  const loadFromHistory = (item: ExcelEssay) => {
    setState(prev => ({
      ...prev,
      question: item.topic,
      essay: item.sample,
      viewMode: 'ANALYZER',
      result: null,
    }));
  };

  const chartData = state.result ? [
    { subject: 'Task Response', A: state.result.criteria.taskAchievement.score, fullMark: 9 },
    { subject: 'Cohesion', A: state.result.criteria.coherenceCohesion.score, fullMark: 9 },
    { subject: 'Lexical', A: state.result.criteria.lexicalResource.score, fullMark: 9 },
    { subject: 'Grammar', A: state.result.criteria.grammaticalRange.score, fullMark: 9 },
  ] : [];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-20 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">IELTS Writing Pro AI</h1>
          </div>
          <nav className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setState(prev => ({ ...prev, viewMode: 'ANALYZER' }))}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${state.viewMode === 'ANALYZER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Analyzer
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, viewMode: 'REPOSITORY' }))}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${state.viewMode === 'REPOSITORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Repository
              {state.history.length > 0 && <span className="ml-2 bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded text-xs">{state.history.length}</span>}
            </button>
          </nav>
        </div>

        {state.viewMode === 'ANALYZER' ? (
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setState(prev => ({ ...prev, taskType: TaskType.TASK_1 }))}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${state.taskType === TaskType.TASK_1 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              TASK 1
            </button>
            <button 
              onClick={() => setState(prev => ({ ...prev, taskType: TaskType.TASK_2 }))}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${state.taskType === TaskType.TASK_2 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              TASK 2
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
             <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
            <button onClick={clearHistory} className="px-4 py-2 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold hover:bg-rose-50 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Clear All
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import Excel
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex overflow-hidden">
        {state.viewMode === 'ANALYZER' ? (
          <>
            <section className="w-1/2 p-6 overflow-y-auto border-r border-slate-200 bg-slate-50">
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">Question Prompt</label>
                  <textarea
                    value={state.question}
                    onChange={(e) => setState(prev => ({ ...prev, question: e.target.value }))}
                    placeholder={`Paste your IELTS Task ${state.taskType === TaskType.TASK_1 ? '1' : '2'} prompt here...`}
                    className="w-full h-32 p-4 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 placeholder-slate-400 resize-none shadow-sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Your Essay</label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${wordCount >= (state.taskType === TaskType.TASK_1 ? 150 : 250) ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {wordCount} WORDS
                    </span>
                  </div>
                  <textarea
                    value={state.essay}
                    onChange={(e) => setState(prev => ({ ...prev, essay: e.target.value }))}
                    placeholder="Start typing your response..."
                    className="w-full h-96 p-5 bg-white border border-slate-300 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-900 placeholder-slate-400 shadow-sm leading-relaxed"
                  />
                </div>

                {state.error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-3 animate-pulse">
                    <svg className="w-5 h-5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    <span className="font-medium">{state.error}</span>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={state.isAnalyzing}
                  className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transform transition-all active:scale-95 flex justify-center items-center gap-3 ${
                    state.isAnalyzing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {state.isAnalyzing ? (
                    <>
                      <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Grading your essay...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      Get AI Feedback
                    </>
                  )}
                </button>
              </div>
            </section>

            <section className="w-1/2 p-6 overflow-y-auto bg-slate-100 border-l border-slate-200">
              {!state.result && !state.isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full scale-150"></div>
                    <svg className="w-24 h-24 relative opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-bold text-slate-500">Awaiting your response</p>
                    <p className="text-sm max-w-xs mx-auto">Click "Get AI Feedback" to see your predicted IELTS band and detailed scoring.</p>
                  </div>
                </div>
              ) : state.isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-indigo-600 space-y-8">
                  <div className="flex gap-3">
                    <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-4 h-4 bg-indigo-600 rounded-full animate-bounce"></div>
                  </div>
                  <div className="text-center space-y-3">
                    <p className="text-2xl font-black tracking-tight">AI Examiner is Reading...</p>
                    <p className="text-slate-500 max-w-sm mx-auto animate-pulse">Analyzing coherence, grammar, lexical resources, and task achievement.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-700">
                  <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl transition-transform duration-1000 group-hover:scale-110"></div>
                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <h2 className="text-indigo-200 font-bold tracking-widest uppercase text-xs mb-2">Estimated Band</h2>
                        <div className="flex items-baseline gap-3">
                          <span className="text-8xl font-black leading-none">{state.result?.overallBand}</span>
                          <span className="text-3xl font-bold text-indigo-300/60">/ 9.0</span>
                        </div>
                      </div>
                      <div className="w-40 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid stroke="#fff" strokeOpacity={0.2} />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#e0e7ff', fontSize: 8, fontWeight: 'bold' }} />
                            <Radar name="Student" dataKey="A" stroke="#fff" fill="#fff" fillOpacity={0.3} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={handleSaveToRepository} className="flex-1 py-3 px-6 bg-white border border-slate-200 rounded-2xl font-bold text-indigo-600 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                      Save to Repository
                    </button>
                    <button onClick={() => window.print()} className="py-3 px-6 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <CriteriaCard label={state.taskType === TaskType.TASK_1 ? "Task Achievement" : "Task Response"} score={state.result!.criteria.taskAchievement.score} explanation={state.result!.criteria.taskAchievement.explanation} color="border-blue-500" />
                    <CriteriaCard label="Cohesion & Cohesion" score={state.result!.criteria.coherenceCohesion.score} explanation={state.result!.criteria.coherenceCohesion.explanation} color="border-emerald-500" />
                    <CriteriaCard label="Lexical Resource" score={state.result!.criteria.lexicalResource.score} explanation={state.result!.criteria.lexicalResource.explanation} color="border-amber-500" />
                    <CriteriaCard label="Grammatical Range" score={state.result!.criteria.grammaticalRange.score} explanation={state.result!.criteria.grammaticalRange.explanation} color="border-purple-500" />
                  </div>

                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 group">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-5">
                      <h3 className="font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
                        Model Band 9.0 Revision
                      </h3>
                      <button onClick={() => { navigator.clipboard.writeText(state.result?.improvedVersion || ''); alert("Copied!"); }} className="text-slate-400 hover:text-indigo-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 8h4m-2-2v4" /></svg>
                      </button>
                    </div>
                    <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium">{state.result?.improvedVersion}</div>
                  </div>

                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-8">
                     <h3 className="font-bold text-indigo-800 text-sm uppercase tracking-widest mb-2">Examiner's Verdict</h3>
                     <p className="text-indigo-700 text-sm italic font-medium leading-relaxed">"{state.result?.detailedFeedback}"</p>
                  </div>
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="flex-1 p-8 bg-white overflow-hidden flex flex-col">
            <div className="mb-8 flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Essay Repository</h2>
                <p className="text-slate-500">Your persistent history of source materials, topics, and scores.</p>
              </div>
              <div className="text-xs font-bold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 uppercase tracking-widest">{state.history.length} ENTRIES SAVED</div>
            </div>

            {state.history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
                <div className="p-4 bg-white rounded-2xl shadow-sm mb-4"><svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                <p className="text-slate-600 font-bold mb-1">No essays found</p>
                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Import Data</button>
              </div>
            ) : (
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                    <tr className="border-b border-slate-200">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">STT</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Source</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Topic</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">GR</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">LR</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">CC</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">TA</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Overall</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {state.history.map((item, idx) => (
                      <tr key={`${idx}-${item.stt}`} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="p-4 text-sm font-bold text-slate-400">{item.stt}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${item.source === 'AI Analyzer' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{item.source}</span></td>
                        <td className="p-4 text-sm text-slate-800 font-semibold truncate max-w-xs">{item.topic}</td>
                        <td className="p-4 text-sm font-bold text-purple-600">{item.gr}</td>
                        <td className="p-4 text-sm font-bold text-amber-600">{item.lr}</td>
                        <td className="p-4 text-sm font-bold text-emerald-600">{item.cc}</td>
                        <td className="p-4 text-sm font-bold text-blue-600">{item.ta}</td>
                        <td className="p-4"><span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-xs font-black">{item.overall}</span></td>
                        <td className="p-4 text-right"><button onClick={() => loadFromHistory(item)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-4 decoration-2 opacity-0 group-hover:opacity-100 transition-opacity">LOAD</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
