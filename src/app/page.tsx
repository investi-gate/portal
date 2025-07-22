'use client';

import { proxy, useSnapshot } from 'valtio';
import { InvestigationFlow } from '@/components/InvestigationFlow';
import { AISearchPanel } from '@/components/AISearchPanel';
import { DataPanel } from '@/components/DataPanel';
import { Plus, Trash2 } from 'lucide-react';
import { Entity, Relation, EntityTypeTextData } from '@/db/types';
import { useEntities } from '@/hooks/useDatabase';

// Create a proxy for the page state
const pageState = proxy<{
  selectedEntity: Entity | null,
  selectedRelation: Relation | null,
  selectedEntityTextData: EntityTypeTextData | null,
  connectModalOpen: boolean,
  preselectedItem: { entity?: string; relation?: string; asSubject?: boolean },
}>({
  selectedEntity: null,
  selectedRelation: null,
  selectedEntityTextData: null,
  connectModalOpen: false,
  preselectedItem: {},
});

export default function Home() {
  const state = useSnapshot(pageState);
  const { deleteEntity } = useEntities();

  function selectEntity(entity: Entity) { pageState.selectedEntity=entity }
  function closeConnectModal() { pageState.connectModalOpen = false }

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
              <AISearchPanel onEntitySelect={selectEntity} />
            </div>
            <DataPanel
              preselectedEntity={state.connectModalOpen ? state.preselectedItem.entity : undefined}
              preselectedRelation={state.connectModalOpen ? state.preselectedItem.relation : undefined}
              preselectedAsSubject={state.preselectedItem.asSubject}
              onOpen={closeConnectModal}
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
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this entity? This action cannot be undone.')) {
                        try {
                          await deleteEntity(state.selectedEntity.id);
                          pageState.selectedEntity = null;
                          pageState.selectedEntityTextData = null;
                        } catch (error) {
                          console.error('Failed to delete entity:', error);
                          alert('Failed to delete entity. Please try again.');
                        }
                      }
                    }}
                    className="mt-2 w-full px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors flex items-center justify-center gap-1"
                    data-test="delete-entity-button"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete Entity
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
