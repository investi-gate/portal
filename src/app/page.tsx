'use client';

import { useState } from 'react';
import { InvestigationFlow } from '@/components/InvestigationFlow';
import { AISearchPanel } from '@/components/AISearchPanel';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { DataPanel } from '@/components/DataPanel';
import { Entity, Relation } from '@/db/types';

export default function Home() {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  return (
    <main className="w-screen h-screen flex">
      {/* Main Investigation Flow */}
      <div className="flex-1 relative">
        <InvestigationFlow 
          onEntitySelect={setSelectedEntity}
          onRelationSelect={setSelectedRelation}
        />
        
        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute top-4 right-4 z-10 px-3 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        >
          {showSidebar ? '→' : '←'} {showSidebar ? 'Hide' : 'Show'} AI Tools
        </button>

        {/* Selected Item Info */}
        {(selectedEntity || selectedRelation) && (
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
            {selectedEntity && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Selected Entity</h4>
                <p className="text-xs text-gray-600">ID: {selectedEntity.id}</p>
                <p className="text-xs text-gray-600">
                  Types: {selectedEntity.type_facial_data_id && '👤 Facial'} 
                  {selectedEntity.type_text_data_id && '📝 Text'}
                </p>
              </div>
            )}
            {selectedRelation && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Selected Relation</h4>
                <p className="text-xs text-gray-600">Predicate: {selectedRelation.predicate}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Tools Sidebar */}
      {showSidebar && (
        <div className="w-96 bg-gray-50 p-4 overflow-y-auto border-l">
          <h2 className="text-xl font-bold mb-4">Investigation AI Assistant</h2>
          
          <div className="space-y-4">
            <AISearchPanel onEntitySelect={setSelectedEntity} />
            <AnalysisPanel />
            <DataPanel />
          </div>
        </div>
      )}
    </main>
  );
}