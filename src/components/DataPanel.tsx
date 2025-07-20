'use client';

import React from 'react';
import { proxy, useSnapshot } from 'valtio';
import { useEntities, useRelations } from '@/hooks/useDatabase';
import type { Entity } from '@/db/types';
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
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { User, FileText, Image, Upload, Plus, Link } from 'lucide-react';

interface DataPanelProps {
  preselectedEntity?: string;
  preselectedRelation?: string;
  preselectedAsSubject?: boolean;
  onOpen?: () => void;
}

interface EntityWithContent extends Entity {
  text_content?: string;
}

// Create state proxy object
const dataPanelState = proxy({
  modalOpen: false,
  activeTab: 'entity' as 'entity' | 'relation',
  entityType: 'facial' as 'facial' | 'text' | 'image',
  textContent: '',
  imageMediaId: '',
  imageCaption: '',
  imageAltText: '',
  selectedFile: null as File | null,
  isUploading: false,
  uploadError: '',
  selectedSubject: '',
  selectedObject: '',
  predicate: '',
  subjectType: 'entity' as 'entity' | 'relation',
  objectType: 'entity' as 'entity' | 'relation',
});

export function DataPanel({ preselectedEntity, preselectedRelation, preselectedAsSubject = true, onOpen }: DataPanelProps) {
  const { entities, createEntity, deleteEntity } = useEntities();
  const { relations, createRelation, deleteRelation } = useRelations();
  const state = useSnapshot(dataPanelState);

  // Prepare entity options for combobox
  const entityOptions: ComboboxOption[] = React.useMemo(() => {
    return entities.map((entity: EntityWithContent) => {
      const types = [];
      if (entity.type_facial_data_id) types.push('👤 Facial');
      if (entity.type_text_data_id) types.push('📝 Text');
      if (entity.type_image_data_id) types.push('🖼️ Image');
      
      // Get text preview if available
      let textPreview = '';
      if (entity.text_content) {
        const maxLength = 50;
        textPreview = entity.text_content.length > maxLength 
          ? entity.text_content.slice(0, maxLength) + '...'
          : entity.text_content;
      }
      
      const label = textPreview || `Entity ${entity.id.slice(0, 8)}`;
      const sublabel = types.join(', ') || 'No data';
      
      return {
        value: entity.id,
        label,
        sublabel,
      };
    }).sort((a, b) => {
      // Sort by creation date (newer first) - assuming UUIDs are time-ordered
      return b.value.localeCompare(a.value);
    });
  }, [entities]);

  // Prepare relation options for combobox
  const relationOptions: ComboboxOption[] = React.useMemo(() => {
    return relations.map((relation) => {
      const subjectId = relation.subject_entity_id || relation.subject_relation_id;
      const objectId = relation.object_entity_id || relation.object_relation_id;
      const subjectType = relation.subject_entity_id ? 'E' : 'R';
      const objectType = relation.object_entity_id ? 'E' : 'R';
      
      return {
        value: relation.id,
        label: `${subjectType}:${subjectId?.slice(0, 6)} → ${relation.predicate} → ${objectType}:${objectId?.slice(0, 6)}`,
        sublabel: `Relation ${relation.id.slice(0, 8)}`,
      };
    });
  }, [relations]);

  const handleFileUpload = async () => {
    if (!dataPanelState.selectedFile) {
      dataPanelState.uploadError = 'Please select a file';
      return null;
    }

    dataPanelState.isUploading = true;
    dataPanelState.uploadError = '';

    try {
      const formData = new FormData();
      formData.append('file', dataPanelState.selectedFile);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      dataPanelState.imageMediaId = data.media.id;
      return data.media.id;
    } catch (error) {
      console.error('Upload error:', error);
      dataPanelState.uploadError = error instanceof Error ? error.message : 'Upload failed';
      return null;
    } finally {
      dataPanelState.isUploading = false;
    }
  };

  const handleCreateEntity = async () => {
    try {
      let facialId: string | undefined;
      let textId: string | undefined;
      let imageId: string | undefined;

      // Create entity type records first
      if (dataPanelState.entityType === 'facial') {
        const facialResponse = await fetch('/api/entity-types/facial', {
          method: 'POST',
        });
        if (!facialResponse.ok) throw new Error('Failed to create facial data type');
        const facialData = await facialResponse.json();
        facialId = facialData.facialData.id;
      }

      if (dataPanelState.entityType === 'text') {
        if (!dataPanelState.textContent || dataPanelState.textContent.trim() === '') {
          alert('Text content is required for text entities');
          return;
        }
        
        const textResponse = await fetch('/api/entity-types/text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: dataPanelState.textContent }),
        });
        
        if (!textResponse.ok) {
          const errorData = await textResponse.json();
          console.error('Failed to create text data:', errorData);
          throw new Error(errorData.error || 'Failed to create text data type');
        }
        
        const textData = await textResponse.json();
        textId = textData.textData.id;
      }

      if (dataPanelState.entityType === 'image') {
        let mediaId = dataPanelState.imageMediaId;
        
        // If no media ID but file selected, upload first
        if (!mediaId && dataPanelState.selectedFile) {
          mediaId = await handleFileUpload();
          if (!mediaId) {
            return; // Upload failed
          }
        }
        
        if (!mediaId || mediaId.trim() === '') {
          alert('Please upload an image or provide a media ID');
          return;
        }
        
        const imageResponse = await fetch('/api/entity-types/image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            media_id: mediaId,
            caption: dataPanelState.imageCaption || null,
            alt_text: dataPanelState.imageAltText || null
          }),
        });
        
        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          console.error('Failed to create image data:', errorData);
          throw new Error(errorData.error || 'Failed to create image data type');
        }
        
        const imageData = await imageResponse.json();
        imageId = imageData.imageData.id;
      }

      // Ensure at least one type is specified
      if (!facialId && !textId && !imageId) {
        throw new Error('At least one entity type must be specified');
      }

      await createEntity({
        type_facial_data_id: facialId,
        type_text_data_id: textId,
        type_image_data_id: imageId,
      });
      
      dataPanelState.modalOpen = false;
      // Reset all form state
      dataPanelState.activeTab = 'entity';
      dataPanelState.entityType = 'facial';
      dataPanelState.textContent = '';
      dataPanelState.imageMediaId = '';
      dataPanelState.imageCaption = '';
      dataPanelState.imageAltText = '';
      dataPanelState.selectedFile = null;
      dataPanelState.uploadError = '';
      dataPanelState.selectedSubject = '';
      dataPanelState.selectedObject = '';
      dataPanelState.predicate = '';
      dataPanelState.subjectType = 'entity';
      dataPanelState.objectType = 'entity';
    } catch (error) {
      console.error('Failed to create entity:', error);
    }
  };

  const handleCreateRelation = async () => {
    if (!dataPanelState.selectedSubject || !dataPanelState.selectedObject || !dataPanelState.predicate) return;

    try {
      const relationData: any = {
        predicate: dataPanelState.predicate,
      };

      // Set subject based on type
      if (dataPanelState.subjectType === 'entity') {
        relationData.subject_entity_id = dataPanelState.selectedSubject;
      } else {
        relationData.subject_relation_id = dataPanelState.selectedSubject;
      }

      // Set object based on type
      if (dataPanelState.objectType === 'entity') {
        relationData.object_entity_id = dataPanelState.selectedObject;
      } else {
        relationData.object_relation_id = dataPanelState.selectedObject;
      }

      await createRelation(relationData);
      
      dataPanelState.modalOpen = false;
      // Reset all form state
      dataPanelState.activeTab = 'entity';
      dataPanelState.entityType = 'facial';
      dataPanelState.textContent = '';
      dataPanelState.imageMediaId = '';
      dataPanelState.imageCaption = '';
      dataPanelState.imageAltText = '';
      dataPanelState.selectedFile = null;
      dataPanelState.uploadError = '';
      dataPanelState.selectedSubject = '';
      dataPanelState.selectedObject = '';
      dataPanelState.predicate = '';
      dataPanelState.subjectType = 'entity';
      dataPanelState.objectType = 'entity';
    } catch (error) {
      console.error('Failed to create relation:', error);
    }
  };

  const handleCreate = () => {
    if (dataPanelState.activeTab === 'entity') {
      handleCreateEntity();
    } else {
      handleCreateRelation();
    }
  };

  // Handle dialog open/close with preselected values
  const handleDialogOpenChange = (open: boolean) => {
    if (open && (preselectedEntity || preselectedRelation)) {
      // Set preselected values when opening
      dataPanelState.activeTab = 'relation';
      
      if (preselectedEntity) {
        if (preselectedAsSubject) {
          dataPanelState.subjectType = 'entity';
          dataPanelState.selectedSubject = preselectedEntity;
        } else {
          dataPanelState.objectType = 'entity';
          dataPanelState.selectedObject = preselectedEntity;
        }
      } else if (preselectedRelation) {
        if (preselectedAsSubject) {
          dataPanelState.subjectType = 'relation';
          dataPanelState.selectedSubject = preselectedRelation;
        } else {
          dataPanelState.objectType = 'relation';
          dataPanelState.selectedObject = preselectedRelation;
        }
      }
    } else if (!open) {
      // Reset all form state when closing
      dataPanelState.activeTab = 'entity';
      dataPanelState.entityType = 'facial';
      dataPanelState.textContent = '';
      dataPanelState.imageMediaId = '';
      dataPanelState.imageCaption = '';
      dataPanelState.imageAltText = '';
      dataPanelState.selectedFile = null;
      dataPanelState.uploadError = '';
      dataPanelState.selectedSubject = '';
      dataPanelState.selectedObject = '';
      dataPanelState.predicate = '';
      dataPanelState.subjectType = 'entity';
      dataPanelState.objectType = 'entity';
    }
    dataPanelState.modalOpen = open;
  };

  return (
    <Dialog open={state.modalOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <button
          data-test="add-button"
          className="h-10 w-10 flex items-center justify-center bg-black/70 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition-colors"
          title="Add Entity or Relation"
          onClick={() => {
            if (onOpen) onOpen();
          }}
        >
          <Plus className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Create a new entity or relation in your investigation.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={state.activeTab} onValueChange={(value: string) => dataPanelState.activeTab = value as 'entity' | 'relation'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entity" data-test="tab-entity">
              <User className="h-4 w-4 mr-2" />
              Entity
            </TabsTrigger>
            <TabsTrigger value="relation" data-test="tab-relation">
              <Link className="h-4 w-4 mr-2" />
              Relation
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="entity" className="mt-4">
            <Tabs value={state.entityType} onValueChange={(value: string) => dataPanelState.entityType = value as 'facial' | 'text' | 'image'} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="facial" data-test="entity-type-facial" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Facial
                </TabsTrigger>
                <TabsTrigger value="text" data-test="entity-type-text" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="image" data-test="entity-type-image" className="flex items-center gap-2">
                  <Image className="h-4 w-4" alt="" />
                  Image
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
                      value={state.textContent}
                      onChange={(e) => dataPanelState.textContent = e.target.value}
                      placeholder="Enter text content for this entity..."
                      className="mt-1 w-full"
                      rows={4}
                      required
                      data-test="entity-text-content"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="image" className="mt-4">
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <p>Create an entity with image data.</p>
                    <p className="mt-2">Upload an image or provide an existing media ID.</p>
                  </div>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-2">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-sm text-blue-600 hover:text-blue-500">
                            Upload an image
                          </span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                dataPanelState.selectedFile = file;
                                dataPanelState.uploadError = '';
                              }
                            }}
                            data-test="entity-image-file-input"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          JPEG, PNG, WebP, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                    {state.selectedFile && (
                      <div className="mt-3 text-sm text-gray-600">
                        Selected: {state.selectedFile.name}
                      </div>
                    )}
                    {state.uploadError && (
                      <div className="mt-2 text-sm text-red-600">
                        {state.uploadError}
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-500">Or use existing media</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Media ID</label>
                    <input
                      type="text"
                      value={state.imageMediaId}
                      onChange={(e) => dataPanelState.imageMediaId = e.target.value}
                      placeholder="Enter existing media ID (UUID)..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={state.isUploading}
                      data-test="entity-image-media-id"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Caption</label>
                    <input
                      type="text"
                      value={state.imageCaption}
                      onChange={(e) => dataPanelState.imageCaption = e.target.value}
                      placeholder="Enter image caption..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-test="entity-image-caption"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Alt Text</label>
                    <input
                      type="text"
                      value={state.imageAltText}
                      onChange={(e) => dataPanelState.imageAltText = e.target.value}
                      placeholder="Enter alternative text..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-test="entity-image-alt-text"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="relation" className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Subject Type</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="entity"
                      checked={state.subjectType === 'entity'}
                      onChange={() => {
                        dataPanelState.subjectType = 'entity';
                        dataPanelState.selectedSubject = '';
                      }}
                      className="mr-2"
                      data-test="subject-type-entity"
                    />
                    <span className="text-sm">Entity</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="relation"
                      checked={state.subjectType === 'relation'}
                      onChange={() => {
                        dataPanelState.subjectType = 'relation';
                        dataPanelState.selectedSubject = '';
                      }}
                      className="mr-2"
                      data-test="subject-type-relation"
                    />
                    <span className="text-sm">Relation</span>
                  </label>
                </div>
                <div className="mt-2">
                  <Combobox
                    options={state.subjectType === 'entity' ? entityOptions : relationOptions}
                    value={state.selectedSubject}
                    onValueChange={(value) => dataPanelState.selectedSubject = value}
                    placeholder={`Select ${state.subjectType}...`}
                    searchPlaceholder={`Search ${state.subjectType}...`}
                    emptyText={`No ${state.subjectType} found.`}
                    data-test="relation-subject-combobox"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Predicate</label>
                <div className="mt-1">
                  <Combobox
                    options={[
                      { value: 'implies', label: 'implies' },
                      { value: 'contradicts', label: 'contradicts' },
                      { value: 'supports', label: 'supports' },
                      { value: 'refutes', label: 'refutes' },
                      { value: 'relates-to', label: 'relates to' },
                      { value: 'causes', label: 'causes' },
                      { value: 'caused-by', label: 'caused by' },
                      { value: 'contains', label: 'contains' },
                      { value: 'part-of', label: 'part of' },
                      { value: 'precedes', label: 'precedes' },
                      { value: 'follows', label: 'follows' },
                      { value: 'equals', label: 'equals' },
                      { value: 'depends-on', label: 'depends on' },
                    ]}
                    value={state.predicate}
                    onValueChange={(value) => dataPanelState.predicate = value}
                    placeholder="Select or type predicate..."
                    searchPlaceholder="Search predicates..."
                    emptyText="Type a custom predicate..."
                    allowCustomValue={true}
                    data-test="relation-predicate-combobox"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Object Type</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="entity"
                      checked={state.objectType === 'entity'}
                      onChange={() => {
                        dataPanelState.objectType = 'entity';
                        dataPanelState.selectedObject = '';
                      }}
                      className="mr-2"
                      data-test="object-type-entity"
                    />
                    <span className="text-sm">Entity</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="relation"
                      checked={state.objectType === 'relation'}
                      onChange={() => {
                        dataPanelState.objectType = 'relation';
                        dataPanelState.selectedObject = '';
                      }}
                      className="mr-2"
                      data-test="object-type-relation"
                    />
                    <span className="text-sm">Relation</span>
                  </label>
                </div>
                <div className="mt-2">
                  <Combobox
                    options={state.objectType === 'entity' ? entityOptions : relationOptions}
                    value={state.selectedObject}
                    onValueChange={(value) => dataPanelState.selectedObject = value}
                    placeholder={`Select ${state.objectType}...`}
                    searchPlaceholder={`Search ${state.objectType}...`}
                    emptyText={`No ${state.objectType} found.`}
                    data-test="relation-object-combobox"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => dataPanelState.modalOpen = false}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleCreate}
            data-test={state.activeTab === 'entity' ? 'create-entity-button' : 'create-relation-button'}
            disabled={state.isUploading}
          >
            {state.isUploading ? 'Uploading...' : `Create ${state.activeTab === 'entity' ? 'Entity' : 'Relation'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}