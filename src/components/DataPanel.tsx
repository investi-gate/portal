'use client';

import React, { useState } from 'react';
import { useEntities, useRelations } from '@/hooks/useDatabase';
import { Entity } from '@/db/types';

export function DataPanel() {
  const { entities, createEntity, deleteEntity } = useEntities();
  const { relations, createRelation, deleteRelation } = useRelations();
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [showCreateRelation, setShowCreateRelation] = useState(false);
  const [entityType, setEntityType] = useState<'facial' | 'text' | 'both'>('facial');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedObject, setSelectedObject] = useState('');
  const [predicate, setPredicate] = useState('');

  const handleCreateEntity = async () => {
    try {
      let facialId: string | undefined;
      let textId: string | undefined;

      // Create entity type records first
      if (entityType === 'facial' || entityType === 'both') {
        const facialResponse = await fetch('/api/entity-types/facial', {
          method: 'POST',
        });
        if (!facialResponse.ok) throw new Error('Failed to create facial data type');
        const facialData = await facialResponse.json();
        facialId = facialData.facialData.id;
      }

      if (entityType === 'text' || entityType === 'both') {
        const textResponse = await fetch('/api/entity-types/text', {
          method: 'POST',
        });
        if (!textResponse.ok) throw new Error('Failed to create text data type');
        const textData = await textResponse.json();
        textId = textData.textData.id;
      }

      await createEntity({
        type_facial_data_id: facialId,
        type_text_data_id: textId,
      });
      
      setShowCreateEntity(false);
    } catch (error) {
      console.error('Failed to create entity:', error);
    }
  };

  const handleCreateRelation = async () => {
    if (!selectedSubject || !selectedObject || !predicate) return;

    try {
      await createRelation({
        subject_entity_id: selectedSubject,
        object_entity_id: selectedObject,
        predicate: predicate,
      });
      
      setShowCreateRelation(false);
      setSelectedSubject('');
      setSelectedObject('');
      setPredicate('');
    } catch (error) {
      console.error('Failed to create relation:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Data Management</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm text-gray-700">
              Entities ({entities.length})
            </h4>
            <button
              onClick={() => setShowCreateEntity(!showCreateEntity)}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              data-test="add-entity-button"
            >
              + Add Entity
            </button>
          </div>
          
          {showCreateEntity && (
            <div className="p-3 bg-gray-50 rounded mb-2">
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600">Entity Type</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value as any)}
                    className="w-full px-2 py-1 text-sm border rounded"
                    data-test="entity-type-select"
                  >
                    <option value="facial">Facial Data</option>
                    <option value="text">Text Data</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateEntity}
                    className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    data-test="create-entity-button"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateEntity(false)}
                    className="text-sm px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-h-40 overflow-y-auto space-y-1">
            {entities.slice(0, 10).map((entity) => (
              <div
                key={entity.id}
                className="flex justify-between items-center p-2 text-sm bg-gray-50 rounded"
                data-test="entity-item"
              >
                <div>
                  <span className="font-medium">{entity.id.slice(0, 8)}</span>
                  <span className="ml-2 text-xs text-gray-600" data-test="entity-icons">
                    {entity.type_facial_data_id && '👤'}
                    {entity.type_text_data_id && '📝'}
                  </span>
                </div>
                <button
                  onClick={() => deleteEntity(entity.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm text-gray-700">
              Relations ({relations.length})
            </h4>
            <button
              onClick={() => setShowCreateRelation(!showCreateRelation)}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              + Add Relation
            </button>
          </div>
          
          {showCreateRelation && (
            <div className="p-3 bg-gray-50 rounded mb-2">
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600">Subject Entity</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                  >
                    <option value="">Select entity...</option>
                    {entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Predicate</label>
                  <input
                    type="text"
                    value={predicate}
                    onChange={(e) => setPredicate(e.target.value)}
                    placeholder="e.g., knows, related-to, works-with"
                    className="w-full px-2 py-1 text-sm border rounded"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Object Entity</label>
                  <select
                    value={selectedObject}
                    onChange={(e) => setSelectedObject(e.target.value)}
                    className="w-full px-2 py-1 text-sm border rounded"
                  >
                    <option value="">Select entity...</option>
                    {entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateRelation}
                    className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateRelation(false)}
                    className="text-sm px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="max-h-40 overflow-y-auto space-y-1">
            {relations.slice(0, 10).map((relation) => (
              <div
                key={relation.id}
                className="flex justify-between items-center p-2 text-sm bg-gray-50 rounded"
              >
                <div className="text-xs">
                  <span className="font-medium">
                    {relation.subject_entity_id?.slice(0, 8)}
                  </span>
                  <span className="mx-1 text-gray-500">→</span>
                  <span className="text-gray-700">{relation.predicate}</span>
                  <span className="mx-1 text-gray-500">→</span>
                  <span className="font-medium">
                    {relation.object_entity_id?.slice(0, 8)}
                  </span>
                </div>
                <button
                  onClick={() => deleteRelation(relation.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}