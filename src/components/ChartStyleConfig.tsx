'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface LineStyle {
  color: string;
  thickness: number;
}

interface GroupStyle {
  color: string;
}

export interface BackgroundZone {
  id: string;
  start: number;
  end: number;
  color: string;
  label: string;
  showAverage?: boolean;
}

interface Props {
  numericColumns: string[];
  comparisonGroups: any[];
  hasComparisonGroup: boolean;
  lineStyles: Record<string, LineStyle>;
  groupStyles: Record<string, Record<string, GroupStyle>>;
  backgroundZones: BackgroundZone[];
  xAxisRange: { min: number; max: number };
  canSave?: boolean;
  isSaving?: boolean;
  onUpdateLineStyle: (column: string, updates: Partial<LineStyle>) => void;
  onUpdateGroupStyle: (column: string, group: string, color: string) => void;
  onUpdateBackgroundZones: (zones: BackgroundZone[]) => void;
  onSaveStyles?: () => void;
}

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

export default function ChartStyleConfig({
  numericColumns,
  comparisonGroups,
  hasComparisonGroup,
  lineStyles,
  groupStyles,
  backgroundZones,
  xAxisRange,
  canSave = false,
  isSaving = false,
  onUpdateLineStyle,
  onUpdateGroupStyle,
  onUpdateBackgroundZones,
  onSaveStyles,
}: Props) {
  const [activeTab, setActiveTab] = useState<'lines' | 'zones'>('lines');

  const addZone = () => {
    const newZone: BackgroundZone = {
      id: Date.now().toString(),
      start: xAxisRange.min,
      end: xAxisRange.max,
      color: '#e0e0e0',
      label: `区域 ${backgroundZones.length + 1}`
    };
    onUpdateBackgroundZones([...backgroundZones, newZone]);
  };

  const updateZone = (id: string, updates: Partial<BackgroundZone>) => {
    onUpdateBackgroundZones(
      backgroundZones.map(zone => 
        zone.id === id ? { ...zone, ...updates } : zone
      )
    );
  };

  const removeZone = (id: string) => {
    onUpdateBackgroundZones(backgroundZones.filter(zone => zone.id !== id));
  };

  return (
    <div className="bg-gray-50 border rounded p-3">
      {/* Tab Navigation */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('lines')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'lines'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            {hasComparisonGroup ? '对比组样式' : '曲线样式'}
          </button>
          <button
            onClick={() => setActiveTab('zones')}
            className={`px-3 py-1 text-xs rounded ${
              activeTab === 'zones'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            背景区域
          </button>
        </div>
        
        {canSave && onSaveStyles && (
          <button
            onClick={onSaveStyles}
            disabled={isSaving}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存样式'}
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'lines' ? (
        hasComparisonGroup ? (
          // 对比模式：显示每个指标的每个对比组的颜色设置
          <div className="space-y-3">
            {numericColumns.map((column) => (
              <div key={column} className="bg-white border rounded p-2">
                <div className="text-xs font-medium text-gray-700 mb-2">{column}</div>
                <div className="flex items-center gap-2">
                  <div className="grid grid-cols-4 gap-2 flex-1">
                    {comparisonGroups.map((group) => (
                      <div key={`${column}-${group}`} className="flex items-center gap-1 p-1.5 bg-gray-50 border rounded">
                        <span className="text-[10px] text-gray-600 flex-1 truncate" title={String(group)}>
                          {String(group)}
                        </span>
                        <input
                          type="color"
                          value={groupStyles[column]?.[group as string]?.color || DEFAULT_COLORS[0]}
                          onChange={(e) => onUpdateGroupStyle(column, group as string, e.target.value)}
                          className="w-6 h-5 rounded cursor-pointer"
                          title={`${group} 的颜色`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 p-1.5 bg-gray-50 border rounded flex-shrink-0">
                    <span className="text-[10px] text-gray-600 flex-1 truncate">粗细</span>
                    <select
                      value={lineStyles[column]?.thickness || 2}
                      onChange={(e) => onUpdateLineStyle(column, { thickness: Number(e.target.value) })}
                      className="px-1 py-0.5 text-xs border rounded bg-white"
                      title="线条粗细"
                    >
                      <option value="1">细</option>
                      <option value="2">中</option>
                      <option value="3">粗</option>
                      <option value="4">很粗</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 非对比模式：显示每个指标的颜色和粗细
          <div className="grid grid-cols-2 gap-2">
            {numericColumns.map((column) => (
              <div key={column} className="flex items-center gap-2 p-2 bg-white border rounded">
                <span className="text-xs text-gray-700 flex-1 truncate" title={column}>
                  {column}
                </span>
                <input
                  type="color"
                  value={lineStyles[column]?.color || DEFAULT_COLORS[0]}
                  onChange={(e) => onUpdateLineStyle(column, { color: e.target.value })}
                  className="w-8 h-6 rounded cursor-pointer"
                  title="选择颜色"
                />
                <select
                  value={lineStyles[column]?.thickness || 2}
                  onChange={(e) => onUpdateLineStyle(column, { thickness: Number(e.target.value) })}
                  className="px-1 py-0.5 text-xs border rounded"
                  title="线条粗细"
                >
                  <option value="1">细</option>
                  <option value="2">中</option>
                  <option value="3">粗</option>
                  <option value="4">很粗</option>
                </select>
              </div>
            ))}
          </div>
        )
      ) : (
        // 背景区域设置
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs text-gray-600">
              横轴范围: {xAxisRange.min.toFixed(0)} ~ {xAxisRange.max.toFixed(0)}
            </div>
            <button
              onClick={addZone}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus className="w-3 h-3" />
              添加区域
            </button>
          </div>

          {backgroundZones.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              暂无背景区域，点击"添加区域"开始配置
            </div>
          ) : (
            <div className="space-y-2">
              {backgroundZones.map((zone) => (
                <div key={zone.id} className="bg-white border rounded p-2">
                  <div className="grid grid-cols-5 gap-2 items-center mb-2">
                    <input
                      type="text"
                      value={zone.label}
                      onChange={(e) => updateZone(zone.id, { label: e.target.value })}
                      className="px-2 py-1 text-xs border rounded"
                      placeholder="区域名称"
                    />
                    <input
                      type="number"
                      value={zone.start}
                      onChange={(e) => updateZone(zone.id, { start: Number(e.target.value) })}
                      className="px-2 py-1 text-xs border rounded"
                      placeholder="起始"
                      min={xAxisRange.min}
                      max={zone.end}
                    />
                    <input
                      type="number"
                      value={zone.end}
                      onChange={(e) => updateZone(zone.id, { end: Number(e.target.value) })}
                      className="px-2 py-1 text-xs border rounded"
                      placeholder="结束"
                      min={zone.start}
                      max={xAxisRange.max}
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-gray-600">颜色:</span>
                      <input
                        type="color"
                        value={zone.color}
                        onChange={(e) => updateZone(zone.id, { color: e.target.value })}
                        className="w-8 h-6 rounded cursor-pointer"
                      />
                    </div>
                    <button
                      onClick={() => removeZone(zone.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="删除区域"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={zone.showAverage || false}
                        onChange={(e) => updateZone(zone.id, { showAverage: e.target.checked })}
                        className="w-3 h-3 rounded"
                      />
                      <span className="text-xs text-gray-700">显示区域平均值线</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
