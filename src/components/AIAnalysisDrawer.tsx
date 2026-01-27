'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { AnalysisResult } from '@/types';
import AIAnalysisForm from './AIAnalysisForm';
import AIAnalysisResult from './AIAnalysisResult';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  result: AnalysisResult | null;
  queryName?: string;
  queryId?: number;
}

export interface AIAnalysisResponse {
  summary?: string;
  findings?: string[];
  insights?: string[];
  anomalies?: string[];
  recommendations?: string[];
  risks?: string[];
  metrics?: Record<string, any>;
}

export default function AIAnalysisDrawer({ isOpen, onClose, result, queryName, queryId }: Props) {
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResponse | null>(null);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-2 border-b bg-gradient-to-r from-purple-600 to-blue-600">
          <h4 className="font-bold text-white">AI 数据解读</h4>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!analysisResult ? (
            <AIAnalysisForm
              result={result}
              queryName={queryName}
              queryId={queryId}
              onAnalysisComplete={setAnalysisResult}
            />
          ) : (
            <AIAnalysisResult
              result={analysisResult}
              onReset={() => setAnalysisResult(null)}
              queryId={queryId}
            />
          )}
        </div>
      </div>
    </>
  );
}
