'use client';

import React, { useState } from 'react';
import { useEntities, useRelations } from '@/hooks/useDatabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { User, FileText, Layers } from 'lucide-react';

export function DataPanel() {
  const { entities, createEntity, deleteEntity } = useEntities();
  const { relations, createRelation, deleteRelation } = useRelations();
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [showCreateRelation, setShowCreateRelation] = useState(false);
  const [entityType, setEntityType] = useState<'facial' | 'text' | 'both'>('facial');
  const [textContent, setTextContent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedObject, setSelectedObject] = useState('');
  const [predicate, setPredicate] = useState('');
  const [subjectType, setSubjectType] = useState<'entity' | 'relation'>('entity');
  const [objectType, setObjectType] = useState<'entity' | 'relation'>('entity');

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
        if (!textContent || textContent.trim() === '') {
          alert('Text content is required for text entities');
          return;
        }
        
        const textResponse = await fetch('/api/entity-types/text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: textContent }),
        });
        
        if (!textResponse.ok) {
          const errorData = await textResponse.json();
          console.error('Failed to create text data:', errorData);
          throw new Error(errorData.error || 'Failed to create text data type');
        }
        
        const textData = await textResponse.json();
        textId = textData.textData.id;
      }

      await createEntity({
        type_facial_data_id: facialId,
        type_text_data_id: textId,
      });
      
      setEntityModalOpen(false);
      setEntityType('facial'); // Reset to default
      setTextContent(''); // Reset text content
    } catch (error) {
      console.error('Failed to create entity:', error);
    }
  };

  const handleCreateRelation = async () => {
    if (!selectedSubject || !selectedObject || !predicate) return;

    try {
      const relationData: any = {
        predicate: predicate,
      };

      // Set subject based on type
      if (subjectType === 'entity') {
        relationData.subject_entity_id = selectedSubject;
      } else {
        relationData.subject_relation_id = selectedSubject;
      }

      // Set object based on type
      if (objectType === 'entity') {
        relationData.object_entity_id = selectedObject;
      } else {
        relationData.object_relation_id = selectedObject;
      }

      await createRelation(relationData);
      
      setShowCreateRelation(false);
      setSelectedSubject('');
      setSelectedObject('');
      setPredicate('');
      setSubjectType('entity');
      setObjectType('entity');
    } catch (error) {
      console.error('Failed to create relation:', error);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-lg p-4 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Data Management</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-sm text-gray-700">
              Entities ({entities.length})
            </h4>
            <Dialog open={entityModalOpen} onOpenChange={setEntityModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  data-test="add-entity-button"
                  className="bg-blue-500 text-white hover:bg-blue-600"
                >
                  + Add Entity
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Entity</DialogTitle>
                  <DialogDescription>
                    Select the type of data for your new entity.
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={entityType} onValueChange={(value: string) => setEntityType(value as 'facial' | 'text' | 'both')} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="facial" data-test="entity-type-facial" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Facial Data
                    </TabsTrigger>
                    <TabsTrigger value="text" data-test="entity-type-text" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Text Data
                    </TabsTrigger>
                    <TabsTrigger value="both" data-test="entity-type-both" className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Both
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="facial" className="mt-4">
                    <div className="text-sm text-gray-600">
                      <p>Create an entity with facial recognition data.</p>
                      <p className="mt-2">This entity will be able to store and match facial features.</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="text" className="mt-4">
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <p>Create an entity with text-based data.</p>
                        <p className="mt-2">This entity will store textual information and descriptions.</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Text Content <span className="text-red-500">*</span></label>
                        <Textarea
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          placeholder="Enter text content for this entity..."
                          className="mt-1 w-full"
                          rows={4}
                          required
                          data-test="entity-text-content"
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="both" className="mt-4">
                    <div className="space-y-3">
                      <div className="text-sm text-gray-600">
                        <p>Create an entity with both facial and text data.</p>
                        <p className="mt-2">This entity will have the capability to store both facial features and textual information.</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Text Content <span className="text-red-500">*</span></label>
                        <Textarea
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          placeholder="Enter text content for this entity..."
                          className="mt-1 w-full"
                          rows={4}
                          required
                          data-test="entity-text-content-both"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEntityModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    onClick={handleCreateEntity}
                    data-test="create-entity-button"
                  >
                    Create Entity
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="max-h-40 overflow-y-auto space-y-1">
            {entities.slice(0, 10).map((entity) => (
              <div
                key={entity.id}
                className="flex justify-between items-center p-2 text-sm bg-white/30 backdrop-blur-sm rounded"
                data-test="entity-item"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{entity.id.slice(0, 8)}</span>
                  <span className="flex items-center gap-1" data-test="entity-icons">
                    {entity.type_facial_data_id && <User className="h-3 w-3 text-gray-600" />}
                    {entity.type_text_data_id && <FileText className="h-3 w-3 text-gray-600" />}
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
            <div className="p-3 bg-white/40 backdrop-blur-sm rounded mb-2">
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-600">Subject Type</label>
                  <div className="flex gap-2 mb-1">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="entity"
                        checked={subjectType === 'entity'}
                        onChange={(e) => {
                          setSubjectType('entity');
                          setSelectedSubject('');
                        }}
                        className="mr-1"
                        data-test="subject-type-entity"
                      />
                      <span className="text-sm">Entity</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="relation"
                        checked={subjectType === 'relation'}
                        onChange={(e) => {
                          setSubjectType('relation');
                          setSelectedSubject('');
                        }}
                        className="mr-1"
                        data-test="subject-type-relation"
                      />
                      <span className="text-sm">Relation</span>
                    </label>
                  </div>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-white/50 border border-gray-300/50 rounded backdrop-blur-sm"
                    data-test="relation-subject-select"
                  >
                    <option value="">Select {subjectType}...</option>
                    {subjectType === 'entity' ? (
                      entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.id.slice(0, 8)}
                          {entity.type_facial_data_id && ' 👤'}
                          {entity.type_text_data_id && ' 📝'}
                        </option>
                      ))
                    ) : (
                      relations.map((relation) => (
                        <option key={relation.id} value={relation.id}>
                          {relation.subject_entity_id?.slice(0, 6) || relation.subject_relation_id?.slice(0, 6)}
                          {' → '}
                          {relation.predicate}
                          {' → '}
                          {relation.object_entity_id?.slice(0, 6) || relation.object_relation_id?.slice(0, 6)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Predicate</label>
                  <input
                    type="text"
                    value={predicate}
                    onChange={(e) => setPredicate(e.target.value)}
                    placeholder="e.g., implies, contradicts, supports"
                    className="w-full px-2 py-1 text-sm bg-white/50 border border-gray-300/50 rounded backdrop-blur-sm"
                    data-test="relation-predicate-input"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Object Type</label>
                  <div className="flex gap-2 mb-1">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="entity"
                        checked={objectType === 'entity'}
                        onChange={(e) => {
                          setObjectType('entity');
                          setSelectedObject('');
                        }}
                        className="mr-1"
                        data-test="object-type-entity"
                      />
                      <span className="text-sm">Entity</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="relation"
                        checked={objectType === 'relation'}
                        onChange={(e) => {
                          setObjectType('relation');
                          setSelectedObject('');
                        }}
                        className="mr-1"
                        data-test="object-type-relation"
                      />
                      <span className="text-sm">Relation</span>
                    </label>
                  </div>
                  <select
                    value={selectedObject}
                    onChange={(e) => setSelectedObject(e.target.value)}
                    className="w-full px-2 py-1 text-sm bg-white/50 border border-gray-300/50 rounded backdrop-blur-sm"
                    data-test="relation-object-select"
                  >
                    <option value="">Select {objectType}...</option>
                    {objectType === 'entity' ? (
                      entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.id.slice(0, 8)}
                          {entity.type_facial_data_id && ' 👤'}
                          {entity.type_text_data_id && ' 📝'}
                        </option>
                      ))
                    ) : (
                      relations.map((relation) => (
                        <option key={relation.id} value={relation.id}>
                          {relation.subject_entity_id?.slice(0, 6) || relation.subject_relation_id?.slice(0, 6)}
                          {' → '}
                          {relation.predicate}
                          {' → '}
                          {relation.object_entity_id?.slice(0, 6) || relation.object_relation_id?.slice(0, 6)}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateRelation}
                    className="text-sm px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    data-test="create-relation-button"
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
                className="flex justify-between items-center p-2 text-sm bg-white/30 backdrop-blur-sm rounded"
              >
                <div className="text-xs">
                  <span className="font-medium">
                    {relation.subject_entity_id ? (
                      <>E: {relation.subject_entity_id.slice(0, 6)}</>
                    ) : (
                      <>R: {relation.subject_relation_id?.slice(0, 6)}</>
                    )}
                  </span>
                  <span className="mx-1 text-gray-500">→</span>
                  <span className="text-gray-700">{relation.predicate}</span>
                  <span className="mx-1 text-gray-500">→</span>
                  <span className="font-medium">
                    {relation.object_entity_id ? (
                      <>E: {relation.object_entity_id.slice(0, 6)}</>
                    ) : (
                      <>R: {relation.object_relation_id?.slice(0, 6)}</>
                    )}
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