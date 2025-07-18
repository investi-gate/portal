'use client';

import React, { useState } from 'react';
import { useAIAnalysis } from '@/hooks/useDatabase';
import { Entity } from '@/db/types';

interface AISearchPanelProps {
  onEntitySelect?: (entity: Entity) => void;
}

export function AISearchPanel({ onEntitySelect }: AISearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Entity[]>([]);
  const { search, loading } = useAIAnalysis();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const searchResults = await search(query);
      setResults(searchResults || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">AI-Powered Search</h3>
      
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities, relationships, types..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">Found {results.length} results</p>
          {results.map((entity) => (
            <div
              key={entity.id}
              className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
              onClick={() => onEntitySelect?.(entity)}
            >
              <div className="font-medium text-sm">
                Entity {entity.id.slice(0, 8)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {entity.type_facial_data_id && '👤 Facial Data'}
                {entity.type_facial_data_id && entity.type_text_data_id && ' • '}
                {entity.type_text_data_id && '📝 Text Data'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}