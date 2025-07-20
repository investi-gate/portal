'use client';

import { useEffect } from 'react';
import { proxy, useSnapshot } from 'valtio';
import { InvestigationFlow } from '@/components/InvestigationFlow';
import { AISearchPanel } from '@/components/AISearchPanel';
import { DataPanel } from '@/components/DataPanel';
import { Plus } from 'lucide-react';
import { Entity, Relation, EntityTypeTextData } from '@/db/types';
import { useEntityTypeData } from '@/hooks/useDatabase';

// Create a proxy for the page state
const pageState = proxy({
  selectedEntity: null as Entity | null,
  selectedRelation: null as Relation | null,
  selectedEntityTextData: null as EntityTypeTextData | null,
  connectModalOpen: false,
  preselectedItem: {} as { entity?: string; relation?: string; asSubject?: boolean },
});

export default function Home() {
  const state = useSnapshot(pageState);
  const { getTextData } = useEntityTypeData();

  useEffect(() => {
    const fetchTextData = async () => {
      if (pageState.selectedEntity?.type_text_data_id) {
        try {
          const textData = await getTextData(pageState.selectedEntity.type_text_data_id);
          pageState.selectedEntityTextData = textData;
        } catch (error) {
          console.error('Failed to fetch text data:', error);
          pageState.selectedEntityTextData = null;
        }
      } else {
        pageState.selectedEntityTextData = null;
      }
    };

    fetchTextData();
  }, [state.selectedEntity, getTextData]);

  return (
    <main className="w-screen h-screen relative overflow-hidden" data-test="main-container">
      {/* Main Investigation Flow - Full Screen */}
      <InvestigationFlow 
        onEntitySelect={(entity) => pageState.selectedEntity = entity}
        onRelationSelect={(relation) => pageState.selectedRelation = relation}
      />


      {/* AI Tools - Minimal Floating UI */}
      <div className="absolute top-4 right-4 z-10" data-test="ai-tools">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-64">
              <AISearchPanel onEntitySelect={(entity) => pageState.selectedEntity = entity} />
            </div>
            <DataPanel 
              preselectedEntity={state.connectModalOpen ? state.preselectedItem.entity : undefined}
              preselectedRelation={state.connectModalOpen ? state.preselectedItem.relation : undefined}
              preselectedAsSubject={state.preselectedItem.asSubject}
              onOpen={() => pageState.connectModalOpen = false}
            />
          </div>
          
          {/* Selected Item Info */}
          {(state.selectedEntity || state.selectedRelation) && (
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 max-w-sm" data-test="selected-item-info">
              {state.selectedEntity && (
                <div data-test="selected-entity">
                  <h4 className="font-semibold text-sm mb-2">Selected Entity</h4>
                  <p className="text-xs text-gray-600">ID: {state.selectedEntity.id}</p>
                  <p className="text-xs text-gray-600">
                    Types: {state.selectedEntity.type_facial_data_id && '👤 Facial'} 
                    {state.selectedEntity.type_text_data_id && '📝 Text'}
                  </p>
                  {state.selectedEntityTextData?.content && (
                    <div className="mt-2" data-test="entity-text-content-display">
                      <p className="text-xs font-semibold text-gray-700">Text Content:</p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{state.selectedEntityTextData.content}</p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      pageState.preselectedItem = { entity: state.selectedEntity.id, asSubject: true };
                      pageState.connectModalOpen = true;
                      // Trigger the DataPanel modal to open
                      setTimeout(() => {
                        const addButton = document.querySelector('[data-test="add-button"]') as HTMLButtonElement;
                        if (addButton) addButton.click();
                      }, 100);
                    }}
                    className="mt-3 w-full px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
                    data-test="connect-entity-button"
                  >
                    <Plus className="h-3 w-3" />
                    Connect to
                  </button>
                </div>
              )}
              {state.selectedRelation && (
                <div data-test="selected-relation">
                  <h4 className="font-semibold text-sm mb-2">Selected Relation</h4>
                  <p className="text-xs text-gray-600">ID: {state.selectedRelation.id}</p>
                  <p className="text-xs text-gray-600">Predicate: {state.selectedRelation.predicate}</p>
                  <div className="text-xs text-gray-600 mt-1">
                    <div>
                      Subject: {state.selectedRelation.subject_entity_id ? (
                        <>Entity: {state.selectedRelation.subject_entity_id.slice(0, 8)}</>
                      ) : state.selectedRelation.subject_relation_id ? (
                        <>Relation: {state.selectedRelation.subject_relation_id.slice(0, 8)}</>
                      ) : 'None'}
                    </div>
                    <div>
                      Object: {state.selectedRelation.object_entity_id ? (
                        <>Entity: {state.selectedRelation.object_entity_id.slice(0, 8)}</>
                      ) : state.selectedRelation.object_relation_id ? (
                        <>Relation: {state.selectedRelation.object_relation_id.slice(0, 8)}</>
                      ) : 'None'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      pageState.preselectedItem = { relation: state.selectedRelation.id, asSubject: true };
                      pageState.connectModalOpen = true;
                      // Trigger the DataPanel modal to open
                      setTimeout(() => {
                        const addButton = document.querySelector('[data-test="add-button"]') as HTMLButtonElement;
                        if (addButton) addButton.click();
                      }, 100);
                    }}
                    className="mt-3 w-full px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center gap-1"
                    data-test="connect-relation-button"
                  >
                    <Plus className="h-3 w-3" />
                    Connect to
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}