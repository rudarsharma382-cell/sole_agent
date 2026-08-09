'use client';

import React, { useState } from 'react';
import { Search, UserCheck, Flame, CheckCircle2, AlertTriangle, ArrowRight, Award, Shield, Cpu, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { Candidate } from '@/lib/types';
import candidatesData from '@/data/candidates.json';

interface CandidateSelectorProps {
  onSelectCandidate: (candidate: Candidate) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20
    }
  }
};

interface TiltCardProps {
  children: React.ReactNode;
  onClick: () => void;
  variants: any;
}

const TiltCard: React.FC<TiltCardProps> = ({ children, onClick, variants }) => {
  return (
    <motion.div
      onClick={onClick}
      variants={variants}
      whileHover={{
        y: -8,
        scale: 1.015,
        boxShadow: '0 25px 40px -15px rgba(0, 240, 255, 0.25)',
        borderColor: 'rgba(0, 240, 255, 0.4)',
      }}
      whileTap={{ scale: 0.98 }}
      className="group cursor-pointer relative bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md rounded-2xl p-6 transition-colors duration-300 flex flex-col justify-between overflow-hidden"
    >
      {/* Sci-fi Dot Matrix Pattern background */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,240,255,0.03)_1px,transparent_0)] bg-[size:10px_10px] pointer-events-none group-hover:bg-[radial-gradient(rgba(0,240,255,0.06)_1px,transparent_0)] transition-colors duration-500" />

      {/* Cyber Corner Tech Brackets */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-slate-300/40 dark:border-slate-800/60 group-hover:border-cyan-400/80 transition-colors duration-300" />
      <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-slate-300/40 dark:border-slate-800/60 group-hover:border-cyan-400/80 transition-colors duration-300" />
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-slate-300/40 dark:border-slate-800/60 group-hover:border-cyan-400/80 transition-colors duration-300" />
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-slate-300/40 dark:border-slate-800/60 group-hover:border-cyan-400/80 transition-colors duration-300" />

      {/* Ambient hover glow behind the card */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      {/* High-speed sheen/shimmer sweep effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent transition-transform duration-1000 ease-out pointer-events-none" />

      {/* Content wrapper */}
      <div className="h-full flex flex-col justify-between relative z-10">
        {children}
      </div>
    </motion.div>
  );
};

export const CandidateSelector: React.FC<CandidateSelectorProps> = ({ onSelectCandidate }) => {
  const candidates: Candidate[] = (candidatesData as any).candidates;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.member.jobRole.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      selectedRoleFilter === 'ALL' || c.member.jobRole.toLowerCase().includes(selectedRoleFilter.toLowerCase());
    return matchesSearch && matchesRole;
  });

  const getFirstTryPercentage = (c: Candidate) => {
    const total = Math.max(1, c.signals.missionsCompleted);
    return Math.round((c.signals.missionsFirstTry / total) * 100);
  };

  const getCandidateTag = (c: Candidate) => {
    const rate = getFirstTryPercentage(c);
    if (rate >= 80) return { label: 'HIGH PERFORMER', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30' };
    if (rate >= 40) return { label: 'BALANCED TECHNICAL', color: 'bg-blue-500/10 dark:bg-indigo-500/10 text-blue-600 dark:text-indigo-400 border-blue-500/20 dark:border-indigo-500/30' };
    return { label: 'SCAFFOLDING NEEDED', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30' };
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn relative z-10">
      {/* Banner / Title */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-blue-500/10 dark:bg-cyan-500/10 border border-blue-500/20 dark:border-cyan-500/20 text-blue-600 dark:text-cyan-400 text-xs font-mono">
          <Cpu className="w-3.5 h-3.5" />
          <span>STEP 1: SELECT COHORT CANDIDATE FOR EVALUATION</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
          Candidate Intelligence Hub
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          Select a candidate profile from the 31-day AI Cohort to launch an adaptive technical interview.
          The interviewer will calibrate question depth based on cohort signals and mission performance.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/10 dark:bg-slate-900/30 border border-white/10 dark:border-slate-800/80 backdrop-blur-md p-4 rounded-2xl shadow-lg shadow-black/5">
        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 dark:bg-slate-950/40 border border-white/10 dark:border-slate-800/80 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-450 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-cyan-500 font-sans transition-all"
          />
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'AI Engineer', 'Software Engineer', 'Data Engineer', 'Specialist'].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                selectedRoleFilter === role
                  ? 'bg-blue-600/10 dark:bg-cyan-500/20 border border-blue-600/30 dark:border-cyan-500/50 text-blue-600 dark:text-cyan-300 font-semibold'
                  : 'bg-white/5 dark:bg-slate-900/30 border border-white/5 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {/* Candidates Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredCandidates.map((candidate) => {
          const firstTryPct = getFirstTryPercentage(candidate);
          const tag = getCandidateTag(candidate);

          return (
            <TiltCard
              key={candidate.member.id}
              onClick={() => onSelectCandidate(candidate)}
              variants={cardVariants}
            >
              <div className="space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5 mb-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-550 uppercase tracking-widest">
                        {candidate.member.id}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors duration-300 truncate">
                      {candidate.member.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-455 mt-0.5 font-medium">{candidate.member.jobRole}</p>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded border shrink-0 ${tag.color} shadow-sm`}>
                    {tag.label}
                  </span>
                </div>

                {/* Signals Grid (with Dividers & Hover FX) */}
                <div className="grid grid-cols-3 gap-0 py-3 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 text-center font-mono divide-x divide-slate-150 dark:divide-slate-800/80">
                  <div className="px-2">
                    <div className="text-[9px] text-slate-400 dark:text-slate-550 uppercase tracking-wider">EXPR</div>
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors duration-300">{candidate.member.yearsExperience} yrs</div>
                  </div>
                  <div className="px-2">
                    <div className="text-[9px] text-slate-400 dark:text-slate-550 uppercase tracking-wider">MISSIONS</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-cyan-400 group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.4)] transition-all duration-300">{candidate.signals.missionsCompleted}/31</div>
                  </div>
                  <div className="px-2">
                    <div className="text-[9px] text-slate-400 dark:text-slate-550 uppercase tracking-wider">1ST TRY</div>
                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-300">{firstTryPct}%</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-500 dark:text-slate-455">
                    <span>Missions Completed</span>
                    <span className="font-semibold">{Math.round((candidate.signals.missionsCompleted / 31) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-900 rounded-full overflow-hidden p-[1px]">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 rounded-full transition-all duration-500 group-hover:shadow-[0_0_8px_rgba(6,182,212,0.6)]"
                      style={{ width: `${(candidate.signals.missionsCompleted / 31) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-455 font-mono group-hover:text-slate-700 dark:group-hover:text-slate-350 truncate pr-2">
                  {candidate.member.education}
                </span>
                <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-blue-600 dark:text-cyan-400 group-hover:text-blue-500 dark:group-hover:text-cyan-300 shrink-0">
                  <span className="group-hover:tracking-widest transition-all duration-300">INSPECT DNA</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-300" />
                </div>
              </div>
            </TiltCard>
          );
        })}
      </motion.div>
    </div>
  );
};
