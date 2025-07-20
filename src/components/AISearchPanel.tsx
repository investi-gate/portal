'use client';

import React from 'react';
import { proxy, useSnapshot } from 'valtio';
import { useAIAnalysis } from '@/hooks/useDatabase';
import { Entity } from '@/db/types';
import { Search } from 'lucide-react';

interface AISearchPanelProps {
  onEntitySelect?: (entity: Entity) => void;
}

// Create a proxy for the search panel state
const searchPanelState = proxy({
  query: '',
  results: [] as Entity[],
});

export function AISearchPanel({ onEntitySelect }: AISearchPanelProps) {
  const state = useSnapshot(searchPanelState);
  const { search, loading } = useAIAnalysis();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPanelState.query.trim()) return;

    try {
      const searchResults = await search(searchPanelState.query);
      searchPanelState.results = searchResults || [];
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  return (
    <>
      <form onSubmit={handleSearch} className="relative" data-test="search-form">
        <div className="relative">
          <input
            type="text"
            value={state.query}
            onChange={(e) => searchPanelState.query = e.target.value}
            placeholder="Search entities, relationships, types..."
            className="w-full pl-4 pr-10 h-10 bg-black/70 backdrop-blur-sm text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
            data-test="search-input"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white hover:text-gray-300 disabled:opacity-50 transition-colors"
            data-test="search-button"
            title="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </form>

      {state.results.length > 0 && (
        <div className="absolute mt-2 w-full bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 p-2 max-h-64 overflow-y-auto" data-test="search-results">
          <p className="text-xs text-gray-600 mb-2" data-test="results-count">Found {state.results.length} results</p>
          {state.results.map((entity) => (
            <div
              key={entity.id}
              className="p-2 hover:bg-gray-100 rounded cursor-pointer transition-colors"
              onClick={() => onEntitySelect?.(entity)}
              data-test="search-result-item"
            >
              <div className="font-medium text-sm">
                Entity {entity.id.slice(0, 8)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                {entity.type_facial_data_id && '👤 Facial'}
                {entity.type_facial_data_id && entity.type_text_data_id && ' • '}
                {entity.type_text_data_id && '📝 Text'}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}