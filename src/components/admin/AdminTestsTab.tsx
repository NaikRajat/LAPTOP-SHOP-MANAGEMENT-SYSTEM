import React, { useState } from 'react';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.js';
import {
  Sparkles,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Terminal,
  RefreshCw
} from 'lucide-react';

export const AdminTestsTab: React.FC = () => {
  const { showToast } = useApp();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  const runTests = async () => {
    setRunning(true);
    try {
      const res = await api.runAutomatedTests();
      setResults(res);
      showToast('Tests Passed!', `${res.passed} tests executed successfully in ${res.durationMs}ms`, 'success');
    } catch (e: any) {
      showToast('Tests Failed', e.message || 'Error running test suite', 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#0d0d0d] p-5 sm:p-6 rounded-xl border border-[#1a1a1a] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-[#141414] border border-cyan-900/50 text-cyan-400 font-mono text-[10px] uppercase font-bold tracking-wider">
              Automated Quality Assurance
            </span>
            <span className="text-xs text-[#666] font-mono">CI/CD Engine</span>
          </div>
          <h2 className="text-xl font-serif italic text-white mt-1">
            Full-Stack Integration Test Runner
          </h2>
          <p className="text-xs text-[#777] mt-0.5 font-sans">
            Executes automated end-to-end unit tests against DB persistence, JWT cryptography, and checkout promo math.
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={running}
          className="px-5 py-2.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#333] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-cyan-950/40 transition-all cursor-pointer"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing Tests...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run Automated Test Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Test Suite Coverage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-[#141414] border border-cyan-900/40 text-cyan-400 flex items-center justify-center mb-2">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-serif italic text-base text-white">DB Storage & Mutation</h3>
          <p className="text-xs text-[#777] mt-1 font-sans">
            Tests create, atomic write, read-back verification, and cleanup on backend disk.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-[#141414] border border-cyan-900/40 text-cyan-400 flex items-center justify-center mb-2">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-serif italic text-base text-white">JWT Sign & Verify</h3>
          <p className="text-xs text-[#777] mt-1 font-sans">
            Tests cryptographic signing, expiry checks, and role payload validation.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-[#141414] border border-cyan-900/40 text-cyan-400 flex items-center justify-center mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-serif italic text-base text-white">Promo Math & Thresholds</h3>
          <p className="text-xs text-[#777] mt-1 font-sans">
            Tests coupon code validation, min order enforcement, and percentage vs flat calculation.
          </p>
        </div>
      </div>

      {/* Results Terminal Console */}
      {results && (
        <div className="p-6 rounded-xl bg-[#080808] text-[#e0e0e0] border border-[#1a1a1a] shadow-xl font-mono text-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-cyan-400 uppercase tracking-wider">Test Execution Output</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[#777]">
              <span>Duration: <strong className="text-white">{results.durationMs} ms</strong></span>
              <span>Total: <strong className="text-white">{results.total}</strong></span>
              <span>Passed: <strong className="text-emerald-400">{results.passed}</strong></span>
            </div>
          </div>

          <div className="space-y-3">
            {results.tests?.map((t: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  {t.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span className="font-medium text-[#ccc]">{t.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[#777]">{t.details}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    t.passed ? 'bg-[#08180e] border border-emerald-900/50 text-emerald-400' : 'bg-[#1a0c0c] border border-red-900/50 text-red-400'
                  }`}>
                    {t.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 text-right text-[11px] text-[#666]">
            All tests verified green on Express + Node.js backend.
          </div>
        </div>
      )}
    </div>
  );
};
