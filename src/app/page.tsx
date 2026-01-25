'use client';

import { useState, useEffect } from 'react';
import { AnalysisConfig } from '@/types';
import AnalysisConfigManager from '@/components/AnalysisConfigManager';
import DataQueryPanel from '@/components/DataQueryPanel';
import { Database, BarChart3 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'config' | 'query'>('config');
  const [configs, setConfigs] = useState<AnalysisConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analysis');
      const result = await response.json();
      if (result.success) {
        setConfigs(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">泵房数据分析系统</h1>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('config')}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <Database className="w-5 h-5 mr-2" />
              分析配置管理
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={`
                flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'query'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              数据查询分析
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6 pb-12">
          {activeTab === 'config' ? (
            <AnalysisConfigManager 
              configs={configs} 
              onConfigsChange={loadConfigs}
              loading={loading}
            />
          ) : (
            <DataQueryPanel configs={configs} />
          )}
        </div>
      </div>
    </div>
  );
}
