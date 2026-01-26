'use client';

import { AnalysisConfig, ComparisonType } from '@/types';
import { Bookmark, Trash2 } from 'lucide-react';

export interface SavedQuery {
  id: string;
  name: string;
  configId: number;
  startTime: string;
  endTime: string;
  comparisonType: ComparisonType;
  selectedMonths?: string[];
  chartStyles?: any;
  savedAt: string;
}

interface Props {
  queries: SavedQuery[];
  configs: AnalysisConfig[];
  onLoad: (query: SavedQuery) => void;
  onQueryDirect: (query: SavedQuery) => void;
  onDelete: (id: string) => void;
}

export default function SavedQueriesList({ queries, configs, onLoad, onQueryDirect, onDelete }: Props) {
  if (queries.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
        <Bookmark className="w-4 h-4 mr-2" />
        已保存的查询
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {queries.map((query) => {
          const config = configs.find(c => c.id === query.configId);
          return (
            <div
              key={query.id}
              className="border rounded-lg p-2 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-1.5">
                <h3 className="font-medium text-sm text-gray-900 truncate flex-1 mr-1">{query.name}</h3>
                <button
                  onClick={() => onDelete(query.id)}
                  className="text-red-600 hover:bg-red-50 p-0.5 rounded flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onLoad(query)}
                  className="flex-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                >
                  加载
                </button>
                <button
                  onClick={() => onQueryDirect(query)}
                  className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  查询
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
