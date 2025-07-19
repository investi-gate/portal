'use client';

import React, { useState, useEffect } from 'react';
import { useAIAnalysis } from '@/hooks/useDatabase';
import { EntityScore, RelationPattern, ClusterInfo, SuggestedRelation } from '@/lib/ai-analysis';

export function AnalysisPanel() {
  const { analyze, loading } = useAIAnalysis();
  const [activeTab, setActiveTab] = useState<'importance' | 'patterns' | 'clusters' | 'suggestions'>('importance');
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        const results = await analyze(activeTab);
        setAnalysisResults(results);
      } catch (error) {
        console.error('Analysis failed:', error);
      }
    };

    runAnalysis();
  }, [activeTab, analyze]);

  const renderImportance = (scores: EntityScore[]) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700 mb-2">Most Important Entities</h4>
      {scores.slice(0, 10).map((score) => (
        <div key={score.entity.id} className="flex justify-between items-center p-2 bg-white/30 backdrop-blur-sm rounded">
          <div>
            <div className="text-sm font-medium">Entity {score.entity.id.slice(0, 8)}</div>
            <div className="text-xs text-gray-600">
              {score.connections} connections • Centrality: {(score.centralityScore * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-sm font-semibold text-blue-600">
            {(score.score * 100).toFixed(0)}%
          </div>
        </div>
      ))}
    </div>
  );

  const renderPatterns = (patterns: RelationPattern[]) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700 mb-2">Relationship Patterns</h4>
      {patterns.map((pattern) => (
        <div key={pattern.predicate} className="p-2 bg-white/30 backdrop-blur-sm rounded">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">{pattern.predicate}</div>
            <div className="text-sm text-gray-600">{pattern.count} occurrences</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Involves {pattern.entities.size} entities
          </div>
        </div>
      ))}
    </div>
  );

  const renderClusters = (clusters: ClusterInfo[]) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700 mb-2">Entity Clusters</h4>
      {clusters.map((cluster) => (
        <div key={cluster.id} className="p-3 bg-white/30 backdrop-blur-sm rounded">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-medium">{cluster.id}</div>
            <div className="text-xs text-gray-600">
              Density: {(cluster.density * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-xs text-gray-600">
            {cluster.entities.length} entities • {cluster.relations.length} relations
          </div>
          {cluster.commonPredicates.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              Common: {cluster.commonPredicates.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderSuggestions = (suggestions: SuggestedRelation[]) => (
    <div className="space-y-2">
      <h4 className="font-medium text-sm text-gray-700 mb-2">Suggested Relations</h4>
      {suggestions.map((suggestion, index) => (
        <div key={index} className="p-3 bg-white/30 backdrop-blur-sm rounded">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <span className="font-medium">{suggestion.subjectId.slice(0, 8)}</span>
              <span className="mx-2 text-gray-500">→</span>
              <span className="font-medium">{suggestion.objectId.slice(0, 8)}</span>
            </div>
            <div className="text-sm font-semibold text-green-600">
              {(suggestion.confidence * 100).toFixed(0)}%
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {suggestion.predicate} • {suggestion.reason}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-lg p-4 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">AI Analysis</h3>
      
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab('importance')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'importance' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Importance
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'patterns' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Patterns
        </button>
        <button
          onClick={() => setActiveTab('clusters')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'clusters' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Clusters
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-3 py-2 text-sm font-medium ${
            activeTab === 'suggestions' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Suggestions
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500">Analyzing...</div>
        ) : analysisResults ? (
          <>
            {activeTab === 'importance' && analysisResults.entityScores && 
              renderImportance(analysisResults.entityScores)}
            {activeTab === 'patterns' && analysisResults.relationPatterns && 
              renderPatterns(analysisResults.relationPatterns)}
            {activeTab === 'clusters' && analysisResults.clusters && 
              renderClusters(analysisResults.clusters)}
            {activeTab === 'suggestions' && analysisResults.suggestedRelations && 
              renderSuggestions(analysisResults.suggestedRelations)}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">No data available</div>
        )}
      </div>
    </div>
  );
}