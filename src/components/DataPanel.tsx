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
import { User, FileText, Image, Upload, Plus, Link } from 'lucide-react';

export function DataPanel() {
  const { entities, createEntity, deleteEntity } = useEntities();
  const { relations, createRelation, deleteRelation } = useRelations();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'entity' | 'relation'>('entity');
  const [entityType, setEntityType] = useState<'facial' | 'text' | 'image'>('facial');
  const [textContent, setTextContent] = useState('');
  const [imageMediaId, setImageMediaId] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageAltText, setImageAltText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedObject, setSelectedObject] = useState('');
  const [predicate, setPredicate] = useState('');
  const [subjectType, setSubjectType] = useState<'entity' | 'relation'>('entity');
  const [objectType, setObjectType] = useState<'entity' | 'relation'>('entity');

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file');
      return null;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      setImageMediaId(data.media.id);
      return data.media.id;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateEntity = async () => {
    try {
      let facialId: string | undefined;
      let textId: string | undefined;
      let imageId: string | undefined;

      // Create entity type records first
      if (entityType === 'facial') {
        const facialResponse = await fetch('/api/entity-types/facial', {
          method: 'POST',
        });
        if (!facialResponse.ok) throw new Error('Failed to create facial data type');
        const facialData = await facialResponse.json();
        facialId = facialData.facialData.id;
      }

      if (entityType === 'text') {
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

      if (entityType === 'image') {
        let mediaId = imageMediaId;
        
        // If no media ID but file selected, upload first
        if (!mediaId && selectedFile) {
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
            caption: imageCaption || null,
            alt_text: imageAltText || null
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
      
      setModalOpen(false);
      setEntityType('facial'); // Reset to default
      setTextContent(''); // Reset text content
      setImageMediaId(''); // Reset image fields
      setImageCaption('');
      setImageAltText('');
      setSelectedFile(null);
      setUploadError('');
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
      
      setModalOpen(false);
      setSelectedSubject('');
      setSelectedObject('');
      setPredicate('');
      setSubjectType('entity');
      setObjectType('entity');
    } catch (error) {
      console.error('Failed to create relation:', error);
    }
  };

  const handleCreate = () => {
    if (activeTab === 'entity') {
      handleCreateEntity();
    } else {
      handleCreateRelation();
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        <button
          data-test="add-button"
          className="h-10 w-10 flex items-center justify-center bg-black/70 backdrop-blur-sm text-white rounded-lg hover:bg-black/80 transition-colors"
          title="Add Entity or Relation"
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
        
        <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'entity' | 'relation')} className="w-full">
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
            <Tabs value={entityType} onValueChange={(value: string) => setEntityType(value as 'facial' | 'text' | 'image')} className="w-full">
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
                                setSelectedFile(file);
                                setUploadError('');
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
                    {selectedFile && (
                      <div className="mt-3 text-sm text-gray-600">
                        Selected: {selectedFile.name}
                      </div>
                    )}
                    {uploadError && (
                      <div className="mt-2 text-sm text-red-600">
                        {uploadError}
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
                      value={imageMediaId}
                      onChange={(e) => setImageMediaId(e.target.value)}
                      placeholder="Enter existing media ID (UUID)..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={isUploading}
                      data-test="entity-image-media-id"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Caption</label>
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      placeholder="Enter image caption..."
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      data-test="entity-image-caption"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Alt Text</label>
                    <input
                      type="text"
                      value={imageAltText}
                      onChange={(e) => setImageAltText(e.target.value)}
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
                      checked={subjectType === 'entity'}
                      onChange={() => {
                        setSubjectType('entity');
                        setSelectedSubject('');
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
                      checked={subjectType === 'relation'}
                      onChange={() => {
                        setSubjectType('relation');
                        setSelectedSubject('');
                      }}
                      className="mr-2"
                      data-test="subject-type-relation"
                    />
                    <span className="text-sm">Relation</span>
                  </label>
                </div>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                  data-test="relation-subject-select"
                >
                  <option value="">Select {subjectType}...</option>
                  {subjectType === 'entity' ? (
                    entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.id.slice(0, 8)}
                        {entity.type_facial_data_id && ' 👤'}
                        {entity.type_text_data_id && ' 📝'}
                        {entity.type_image_data_id && ' 🖼️'}
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
                <label className="text-sm font-medium text-gray-700">Predicate</label>
                <input
                  type="text"
                  value={predicate}
                  onChange={(e) => setPredicate(e.target.value)}
                  placeholder="e.g., implies, contradicts, supports"
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                  data-test="relation-predicate-input"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Object Type</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="entity"
                      checked={objectType === 'entity'}
                      onChange={() => {
                        setObjectType('entity');
                        setSelectedObject('');
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
                      checked={objectType === 'relation'}
                      onChange={() => {
                        setObjectType('relation');
                        setSelectedObject('');
                      }}
                      className="mr-2"
                      data-test="object-type-relation"
                    />
                    <span className="text-sm">Relation</span>
                  </label>
                </div>
                <select
                  value={selectedObject}
                  onChange={(e) => setSelectedObject(e.target.value)}
                  className="mt-2 w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
                  data-test="relation-object-select"
                >
                  <option value="">Select {objectType}...</option>
                  {objectType === 'entity' ? (
                    entities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.id.slice(0, 8)}
                        {entity.type_facial_data_id && ' 👤'}
                        {entity.type_text_data_id && ' 📝'}
                        {entity.type_image_data_id && ' 🖼️'}
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
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleCreate}
            data-test={activeTab === 'entity' ? 'create-entity-button' : 'create-relation-button'}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : `Create ${activeTab === 'entity' ? 'Entity' : 'Relation'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}