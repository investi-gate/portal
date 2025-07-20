'use client';

import { useState, useEffect } from 'react';
import { InvestigationFlow } from '@/components/InvestigationFlow';
import { AISearchPanel } from '@/components/AISearchPanel';
import { DataPanel } from '@/components/DataPanel';
import { Entity, Relation, EntityTypeTextData } from '@/db/types';
import { useEntityTypeData } from '@/hooks/useDatabase';

export default function Home() {
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<Relation | null>(null);
  const [selectedEntityTextData, setSelectedEntityTextData] = useState<EntityTypeTextData | null>(null);
  const { getTextData } = useEntityTypeData();

  useEffect(() => {
    const fetchTextData = async () => {
      if (selectedEntity?.type_text_data_id) {
        try {
          const textData = await getTextData(selectedEntity.type_text_data_id);
          setSelectedEntityTextData(textData);
        } catch (error) {
          console.error('Failed to fetch text data:', error);
          setSelectedEntityTextData(null);
        }
      } else {
        setSelectedEntityTextData(null);
      }
    };

    fetchTextData();
  }, [selectedEntity, getTextData]);

  return (
    <main className="w-screen h-screen relative overflow-hidden" data-test="main-container">
      {/* Main Investigation Flow - Full Screen */}
      <InvestigationFlow 
        onEntitySelect={setSelectedEntity}
        onRelationSelect={setSelectedRelation}
      />

      {/* Selected Item Info */}
      {(selectedEntity || selectedRelation) && (
        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-4 max-w-sm z-10" data-test="selected-item-info">
          {selectedEntity && (
            <div data-test="selected-entity">
              <h4 className="font-semibold text-sm mb-2">Selected Entity</h4>
              <p className="text-xs text-gray-600">ID: {selectedEntity.id}</p>
              <p className="text-xs text-gray-600">
                Types: {selectedEntity.type_facial_data_id && '👤 Facial'} 
                {selectedEntity.type_text_data_id && '📝 Text'}
              </p>
              {selectedEntityTextData?.content && (
                <div className="mt-2" data-test="entity-text-content-display">
                  <p className="text-xs font-semibold text-gray-700">Text Content:</p>
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{selectedEntityTextData.content}</p>
                </div>
              )}
            </div>
          )}
          {selectedRelation && (
            <div data-test="selected-relation">
              <h4 className="font-semibold text-sm mb-2">Selected Relation</h4>
              <p className="text-xs text-gray-600">ID: {selectedRelation.id}</p>
              <p className="text-xs text-gray-600">Predicate: {selectedRelation.predicate}</p>
              <div className="text-xs text-gray-600 mt-1">
                <div>
                  Subject: {selectedRelation.subject_entity_id ? (
                    <>Entity: {selectedRelation.subject_entity_id.slice(0, 8)}</>
                  ) : selectedRelation.subject_relation_id ? (
                    <>Relation: {selectedRelation.subject_relation_id.slice(0, 8)}</>
                  ) : 'None'}
                </div>
                <div>
                  Object: {selectedRelation.object_entity_id ? (
                    <>Entity: {selectedRelation.object_entity_id.slice(0, 8)}</>
                  ) : selectedRelation.object_relation_id ? (
                    <>Relation: {selectedRelation.object_relation_id.slice(0, 8)}</>
                  ) : 'None'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Tools - Minimal Floating UI */}
      <div className="absolute top-4 right-4 z-10" data-test="ai-tools">
        <div className="flex items-center gap-2">
          <div className="w-64">
            <AISearchPanel onEntitySelect={setSelectedEntity} />
          </div>
          <DataPanel />
        </div>
      </div>
    </main>
  );
}