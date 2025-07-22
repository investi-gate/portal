import { Entity, Bucket } from '@/db/types';
import { bucketSelectors } from '@/stores/bucketStore';

export function getEntityImageUrl(entity: Entity, bucket: Bucket | null): string | undefined {
  if (!bucket) return undefined;

  // Direct image data
  if (entity.type_image_data_id) {
    const imageData = bucketSelectors.getEntityImageData(entity);
    if (imageData?.media_id) {
      const media = bucketSelectors.getMedia(imageData.media_id);
      return media?.url;
    }
  }

  // Image portion - get source image URL
  if (entity.type_image_portion_id) {
    const portionData = bucketSelectors.getEntityImagePortionData(entity);
    if (portionData?.source_image_entity_id) {
      const sourceEntity = bucketSelectors.getEntity(portionData.source_image_entity_id);
      if (sourceEntity) {
        const sourceImageData = bucketSelectors.getEntityImageData(sourceEntity);
        if (sourceImageData?.media_id) {
          const sourceMedia = bucketSelectors.getMedia(sourceImageData.media_id);
          return sourceMedia?.url;
        }
      }
    }
  }

  return undefined;
}

export function getEntityImagePortion(entity: Entity, bucket: Bucket | null) {
  if (!bucket || !entity.type_image_portion_id) return undefined;

  const portionData = bucketSelectors.getEntityImagePortionData(entity);
  if (!portionData) return undefined;

  return {
    x: portionData.x,
    y: portionData.y,
    width: portionData.width,
    height: portionData.height,
    label: portionData.label,
    confidence: portionData.confidence,
  };
}