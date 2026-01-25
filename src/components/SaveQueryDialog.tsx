'use client';

import { useState } from 'react';

interface Props {
  show: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}

export default function SaveQueryDialog({ show, onSave, onCancel }: Props) {
  const [queryName, setQueryName] = useState('');

  if (!show) return null;

  const handleSave = () => {
    if (queryName.trim()) {
      onSave(queryName.trim());
      setQueryName('');
    } else {
      alert('请输入查询名称');
    }
  };

  const handleCancel = () => {
    setQueryName('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">保存查询</h3>
        <input
          type="text"
          value={queryName}
          onChange={(e) => setQueryName(e.target.value)}
          placeholder="输入查询名称"
          className="w-full px-3 py-2 border rounded-lg mb-4"
          autoFocus
          onKeyPress={(e) => e.key === 'Enter' && handleSave()}
        />
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            保存
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
