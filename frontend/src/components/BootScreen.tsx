'use client';

import React, { useEffect, useState, useRef } from 'react';

interface BootScreenProps {
  onComplete: () => void;
  title?: string;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete, title = "SOLE_AGENT v1.0.0" }) => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const bootLogs = [
    "SYS_INIT: Booting SOLE_AGENT Technical Interview Core...",
    "SYS_INIT: Checking environment and API configurations...",
    "SECURE_GATEWAY: Establishing connection to OpenRouter LLM...",
    "SECURE_GATEWAY: Connection verified. Model: openrouter/free",
    "DATA_STORE: Loading candidate records (20 synthetic profiles)...",
    "DATA_STORE: Parsing curriculum.json (31-day AI Cohort Objectives)...",
    "RAG_ENGINE: Initializing local Vector Store & Embeddings...",
    "RAG_ENGINE: Vector store status: OK. 52 chunks indexed.",
    "AGENT_CORE: Calibrating adaptive cognitive planners...",
    "AGENT_CORE: Calibrating min_questions = 8, min_curriculum_days = 4...",
    "UI_ENGINE: Establishing Model Context Protocol socket channels...",
    "UI_ENGINE: Visual DNA profiling layers compiled.",
    "READY: System initialized. Welcome to the Intelligence Hub."
  ];

  useEffect(() => {
    // Scroll logs to bottom
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    let logIndex = 0;
    let logTimer: NodeJS.Timeout;
    
    // Add logs one by one
    const addLog = () => {
      if (logIndex < bootLogs.length) {
        const nextLog = bootLogs[logIndex];
        setLogs(prev => [...prev, nextLog]);
        logIndex++;
        // Random time between 80ms and 250ms for realistic log generation
        logTimer = setTimeout(addLog, 70 + Math.random() * 120);
      }
    };
    
    addLog();

    // Progress bar loader
    const duration = 2400; // 2.4 seconds total boot time
    const intervalTime = 30;
    const step = 100 / (duration / intervalTime);
    
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return next;
      });
    }, intervalTime);

    // Wait slightly after 100% to trigger onComplete
    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration + 300);

    return () => {
      clearTimeout(logTimer);
      clearInterval(progressTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Format progress bar characters e.g. [██████░░░░░]
  const renderProgressBar = () => {
    const totalBars = 30;
    const activeBars = Math.floor((progress / 100) * totalBars);
    const inactiveBars = totalBars - activeBars;
    return `[${'█'.repeat(activeBars)}${'░'.repeat(inactiveBars)}] ${Math.round(progress)}%`;
  };

  return (
    <div className="fixed inset-0 bg-black z-[999999] flex flex-col items-center justify-center p-6 font-mono text-cyan-400 select-none">
      {/* Visual background grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00F0FF05_1px,transparent_1px),linear-gradient(to_bottom,#00F0FF05_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
      
      {/* CRT scanline effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] opacity-40" />

      <div className="w-full max-w-2xl flex flex-col h-[500px] border border-cyan-500/30 bg-black/80 backdrop-blur-md rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.15)] overflow-hidden relative">
        {/* Window title bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/20 bg-cyan-950/20">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs uppercase tracking-wider text-cyan-300 font-semibold">{title}</span>
          </div>
          <div className="flex space-x-1.5">
            <div className="w-2 h-2 rounded-full border border-cyan-500/30" />
            <div className="w-2 h-2 rounded-full border border-cyan-500/30" />
            <div className="w-2 h-2 rounded-full border border-cyan-500/30" />
          </div>
        </div>

        {/* Console Body */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col justify-between space-y-4">
          
          {/* Logo ASCII Art */}
          <pre className="text-[7px] sm:text-[9px] leading-tight text-cyan-400 font-bold self-center opacity-90 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
{`   _____  ____  _      ______          _____ ______ _   _ _______ 
  / ____|/ __ \\| |    |  ____|   /\\   / ____|  ____| \\ | |__   __|
 | (___ | |  | | |    | |__     /  \\ | |  __| |__  |  \\| |  | |   
  \\___ \\| |  | | |    |  __|   / /\\ \\| | |_ |  __| | . \` |  | |   
  ____) | |__| | |____| |____ / ____ \\ |__| | |____| |\\  |  | |   
 |_____/ \\____/|______|______/_/    \\_\\_____|______|_| \\_|  |_|   `}
          </pre>

          {/* Logs scroll area */}
          <div 
            ref={logsContainerRef}
            className="flex-1 overflow-y-auto text-xs space-y-1.5 pr-2 terminal-scroll text-cyan-300/90 font-mono"
          >
            {logs.map((log, index) => {
              if (!log) return null;
              const isReady = log.startsWith("READY:");
              const isError = log.startsWith("ERR:");
              return (
                <div key={index} className={`flex items-start ${isReady ? 'text-emerald-400 font-semibold' : isError ? 'text-rose-500' : ''}`}>
                  <span className="text-cyan-500/50 shrink-0 select-none mr-2">&gt;&gt;</span>
                  <span>{log}</span>
                </div>
              );
            })}
            <div className="w-1.5 h-4 bg-cyan-400 animate-blink inline-block vertical-middle ml-1" />
          </div>

          {/* Progress and status area */}
          <div className="space-y-3 pt-4 border-t border-cyan-500/20">
            <div className="flex justify-between text-xs font-semibold text-cyan-300 uppercase tracking-widest">
              <span>SYSTEM INITIALIZATION</span>
              <span>{Math.round(progress)}% COMPLETE</span>
            </div>
            
            <div className="font-mono text-sm tracking-wider text-center text-cyan-400/90 selection:bg-cyan-500/20">
              {renderProgressBar()}
            </div>
          </div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
      ` }} />
    </div>
  );
};
