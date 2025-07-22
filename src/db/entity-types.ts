import { DatabaseClient } from './client';
import { EntityTypeFacialData, EntityTypeTextData, EntityTypeImageData, EntityTypeImagePortion } from './types';

// Base interface for entity type handlers
interface EntityTypeHandler<T, CreateParams, UpdateParams> {
  tableName: string;
  columns: string[];
  create: (db: DatabaseClient, params: CreateParams) => Promise<T>;
  get: (db: DatabaseClient, id: string) => Promise<T | null>;
  getAll: (db: DatabaseClient, limit?: number, offset?: number) => Promise<T[]>;
  update: (db: DatabaseClient, id: string, params: UpdateParams) => Promise<T | null>;
  delete: (db: DatabaseClient, id: string) => Promise<boolean>;
}

// Generic CRUD operations factory
function createCrudOperations<T, CreateParams, UpdateParams>(
  tableName: string,
  columns: string[]
): Omit<EntityTypeHandler<T, CreateParams, UpdateParams>, 'create' | 'update'> {
  const columnsStr = columns.join(', ');
  
  return {
    tableName,
    columns,
    
    get: async (db: DatabaseClient, id: string): Promise<T | null> => {
      const query = `
        SELECT ${columnsStr}
        FROM ${tableName}
        WHERE id = $1
      `;
      const result = await db.query(query, [id]);
      return result.rows[0] || null;
    },
    
    getAll: async (db: DatabaseClient, limit = 100, offset = 0): Promise<T[]> => {
      const query = `
        SELECT ${columnsStr}
        FROM ${tableName}
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const result = await db.query(query, [limit, offset]);
      return result.rows;
    },
    
    delete: async (db: DatabaseClient, id: string): Promise<boolean> => {
      const query = `DELETE FROM ${tableName} WHERE id = $1`;
      const result = await db.query(query, [id]);
      return result.rowCount > 0;
    }
  };
}

// Helper to build parameterized values for INSERT
function buildInsertQuery(tableName: string, fields: string[], returningColumns: string[]): string {
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
  return `
    INSERT INTO ${tableName} (${fields.join(', ')})
    VALUES (${placeholders})
    RETURNING ${returningColumns.join(', ')}
  `;
}

// Helper to build UPDATE query with COALESCE
function buildUpdateQueryWithCoalesce(
  tableName: string, 
  fields: string[], 
  returningColumns: string[]
): string {
  const setStatements = fields.map((field, i) => `${field} = COALESCE($${i + 2}, ${field})`).join(',\n        ');
  return `
    UPDATE ${tableName}
    SET updated_at = CURRENT_TIMESTAMP,
        ${setStatements}
    WHERE id = $1
    RETURNING ${returningColumns.join(', ')}
  `;
}

// Facial Data entity type configuration
const facialDataConfig = {
  tableName: 'entity_type__facial_data',
  columns: ['id', 'created_at', 'updated_at', 'face_embedding_id', 'face_cropped_picture_id'],
  fields: ['face_embedding_id', 'face_cropped_picture_id']
};

type FacialDataCreateParams = {
  face_embedding_id?: string | null;
  face_cropped_picture_id?: string | null;
};

type FacialDataUpdateParams = FacialDataCreateParams;

// Create Facial Data handler
const facialDataHandler = {
  ...createCrudOperations<EntityTypeFacialData, FacialDataCreateParams, FacialDataUpdateParams>(
    facialDataConfig.tableName,
    facialDataConfig.columns
  ),
  
  create: async (db: DatabaseClient, params: FacialDataCreateParams): Promise<EntityTypeFacialData> => {
    const query = buildInsertQuery(
      facialDataConfig.tableName,
      facialDataConfig.fields,
      facialDataConfig.columns
    );
    const result = await db.query(query, [
      params.face_embedding_id || null,
      params.face_cropped_picture_id || null
    ]);
    return result.rows[0];
  },
  
  update: async (db: DatabaseClient, id: string, params: FacialDataUpdateParams): Promise<EntityTypeFacialData | null> => {
    const query = buildUpdateQueryWithCoalesce(
      facialDataConfig.tableName,
      facialDataConfig.fields,
      facialDataConfig.columns
    );
    const result = await db.query(query, [
      id,
      params.face_embedding_id,
      params.face_cropped_picture_id
    ]);
    return result.rows[0] || null;
  }
};

// Export Facial Data functions
export const dbCreateEntityTypeFacialData = (
  db: DatabaseClient,
  face_embedding_id?: string | null,
  face_cropped_picture_id?: string | null
) => facialDataHandler.create(db, { face_embedding_id, face_cropped_picture_id });

export const dbGetEntityTypeFacialData = facialDataHandler.get;
export const dbGetAllEntityTypeFacialData = facialDataHandler.getAll;
export const dbUpdateEntityTypeFacialData = (
  db: DatabaseClient,
  id: string,
  face_embedding_id?: string | null,
  face_cropped_picture_id?: string | null
) => facialDataHandler.update(db, id, { face_embedding_id, face_cropped_picture_id });
export const dbDeleteEntityTypeFacialData = facialDataHandler.delete;

// Text Data entity type configuration
const textDataConfig = {
  tableName: 'entity_type__text_data',
  columns: ['id', 'created_at', 'updated_at', 'content'],
  fields: ['content']
};

type TextDataCreateParams = { content?: string };
type TextDataUpdateParams = { content: string };

// Create Text Data handler
const textDataHandler = {
  ...createCrudOperations<EntityTypeTextData, TextDataCreateParams, TextDataUpdateParams>(
    textDataConfig.tableName,
    textDataConfig.columns
  ),
  
  create: async (db: DatabaseClient, params: TextDataCreateParams): Promise<EntityTypeTextData> => {
    const query = buildInsertQuery(
      textDataConfig.tableName,
      textDataConfig.fields,
      textDataConfig.columns
    );
    const result = await db.query(query, [params.content || '']);
    return result.rows[0];
  },
  
  update: async (db: DatabaseClient, id: string, params: TextDataUpdateParams): Promise<EntityTypeTextData | null> => {
    const query = `
      UPDATE ${textDataConfig.tableName}
      SET updated_at = CURRENT_TIMESTAMP, content = $2
      WHERE id = $1
      RETURNING ${textDataConfig.columns.join(', ')}
    `;
    const result = await db.query(query, [id, params.content]);
    return result.rows[0] || null;
  }
};

// Export Text Data functions
export const dbCreateEntityTypeTextData = (
  db: DatabaseClient,
  content: string = ''
) => textDataHandler.create(db, { content });

export const dbGetEntityTypeTextData = textDataHandler.get;
export const dbGetAllEntityTypeTextData = textDataHandler.getAll;
export const dbUpdateEntityTypeTextData = (
  db: DatabaseClient,
  id: string,
  content: string
) => textDataHandler.update(db, id, { content });
export const dbDeleteEntityTypeTextData = textDataHandler.delete;

// Image Data entity type configuration
const imageDataConfig = {
  tableName: 'entity_type__image_data',
  columns: ['id', 'created_at', 'updated_at', 'media_id', 'caption', 
            'alt_text', 'tags', 'ocr_text', 'width', 'height', 'format', 'file_size_bytes'],
  fields: ['media_id', 'caption', 'alt_text', 'tags', 'ocr_text', 
           'width', 'height', 'format', 'file_size_bytes']
};

type ImageDataCreateParams = {
  media_id: string;
  caption?: string | null;
  alt_text?: string | null;
  tags?: string[] | null;
  ocr_text?: string | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  file_size_bytes?: number | null;
};

type ImageDataUpdateParams = Partial<ImageDataCreateParams>;

// Create Image Data handler
const imageDataHandler = {
  ...createCrudOperations<EntityTypeImageData, ImageDataCreateParams, ImageDataUpdateParams>(
    imageDataConfig.tableName,
    imageDataConfig.columns
  ),
  
  create: async (db: DatabaseClient, params: ImageDataCreateParams): Promise<EntityTypeImageData> => {
    const query = buildInsertQuery(
      imageDataConfig.tableName,
      imageDataConfig.fields,
      imageDataConfig.columns
    );
    const values = [
      params.media_id,
      params.caption || null,
      params.alt_text || null,
      params.tags || null,
      params.ocr_text || null,
      params.width || null,
      params.height || null,
      params.format || null,
      params.file_size_bytes || null
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  update: async (db: DatabaseClient, id: string, params: ImageDataUpdateParams): Promise<EntityTypeImageData | null> => {
    const query = buildUpdateQueryWithCoalesce(
      imageDataConfig.tableName,
      imageDataConfig.fields,
      imageDataConfig.columns
    );
    const values = [
      id,
      params.media_id,
      params.caption,
      params.alt_text,
      params.tags,
      params.ocr_text,
      params.width,
      params.height,
      params.format,
      params.file_size_bytes
    ];
    const result = await db.query(query, values);
    return result.rows[0] || null;
  }
};

// Export Image Data functions
export const dbCreateEntityTypeImageData = (
  db: DatabaseClient,
  media_id: string,
  caption?: string | null,
  alt_text?: string | null,
  tags?: string[] | null,
  ocr_text?: string | null,
  width?: number | null,
  height?: number | null,
  format?: string | null,
  file_size_bytes?: number | null
) => imageDataHandler.create(db, {
  media_id, caption, alt_text, tags, ocr_text,
  width, height, format, file_size_bytes
});

export const dbGetEntityTypeImageData = imageDataHandler.get;
export const dbGetAllEntityTypeImageData = imageDataHandler.getAll;
export const dbUpdateEntityTypeImageData = imageDataHandler.update;
export const dbDeleteEntityTypeImageData = imageDataHandler.delete;

// Image Portion entity type configuration
const imagePortionConfig = {
  tableName: 'entity_type__image_portion',
  columns: ['id', 'created_at', 'updated_at', 'source_image_entity_id',
            'x', 'y', 'width', 'height', 'label', 'confidence'],
  fields: ['source_image_entity_id', 'x', 'y', 'width', 'height', 'label', 'confidence']
};

type ImagePortionCreateParams = {
  source_image_entity_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string | null;
  confidence?: number | null;
};

type ImagePortionUpdateParams = Partial<ImagePortionCreateParams>;

// Helper for dynamic UPDATE query building
function buildDynamicUpdateQuery(
  tableName: string,
  id: string,
  updates: Record<string, unknown>,
  returningColumns: string[]
): { query: string; values: unknown[] } {
  const setClauses: string[] = [];
  const values: unknown[] = [id];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      paramCount++;
      setClauses.push(`${key} = $${paramCount}`);
      values.push(value);
    }
  });

  const query = setClauses.length > 0
    ? `
        UPDATE ${tableName}
        SET updated_at = CURRENT_TIMESTAMP, ${setClauses.join(', ')}
        WHERE id = $1
        RETURNING ${returningColumns.join(', ')}
      `
    : '';

  return { query, values };
}

// Create Image Portion handler
const imagePortionHandler = {
  ...createCrudOperations<EntityTypeImagePortion, ImagePortionCreateParams, ImagePortionUpdateParams>(
    imagePortionConfig.tableName,
    imagePortionConfig.columns
  ),
  
  create: async (db: DatabaseClient, params: ImagePortionCreateParams): Promise<EntityTypeImagePortion> => {
    const query = buildInsertQuery(
      imagePortionConfig.tableName,
      imagePortionConfig.fields,
      imagePortionConfig.columns
    );
    const values = [
      params.source_image_entity_id,
      params.x,
      params.y,
      params.width,
      params.height,
      params.label || null,
      params.confidence || null
    ];
    const result = await db.query(query, values);
    return result.rows[0];
  },
  
  update: async (db: DatabaseClient, id: string, params: ImagePortionUpdateParams): Promise<EntityTypeImagePortion | null> => {
    const { query, values } = buildDynamicUpdateQuery(
      imagePortionConfig.tableName,
      id,
      params,
      imagePortionConfig.columns
    );
    
    if (!query) {
      return imagePortionHandler.get(db, id);
    }
    
    const result = await db.query(query, values);
    return result.rows[0] || null;
  },
  
  getBySourceImage: async (
    db: DatabaseClient,
    source_image_entity_id: string,
    limit = 100,
    offset = 0
  ): Promise<EntityTypeImagePortion[]> => {
    const query = `
      SELECT ${imagePortionConfig.columns.join(', ')}
      FROM ${imagePortionConfig.tableName}
      WHERE source_image_entity_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [source_image_entity_id, limit, offset]);
    return result.rows;
  }
};

// Export Image Portion functions
export const dbCreateEntityTypeImagePortion = (
  db: DatabaseClient,
  source_image_entity_id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  label?: string | null,
  confidence?: number | null
) => imagePortionHandler.create(db, {
  source_image_entity_id, x, y, width, height, label, confidence
});

export const dbGetEntityTypeImagePortion = imagePortionHandler.get;
export const dbGetAllEntityTypeImagePortion = imagePortionHandler.getAll;
export const dbGetEntityTypeImagePortionBySourceImage = imagePortionHandler.getBySourceImage;
export const dbUpdateEntityTypeImagePortion = imagePortionHandler.update;
export const dbDeleteEntityTypeImagePortion = imagePortionHandler.delete;