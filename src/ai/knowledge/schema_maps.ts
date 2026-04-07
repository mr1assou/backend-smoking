/**
 * Simple schema reference for AI / docs. Stays aligned with `prisma/schema.prisma`.
 */

export type SimpleTable = {
  /** Prisma model name */
  name: string;
  /** DB table (@@map) */
  table: string;
  /** prisma.<delegate> */
  delegate: string;
  description: string;
  /** field name → short type / note */
  fields: Record<string, string>;
  /** relation field → target + cardinality */
  relations: Record<string, string>;
};

/** PascalCase keys = Prisma models */
export const simpleSchemaMap: Record<string, SimpleTable> = {
  User: {
    name: 'User',
    table: 'users',
    delegate: 'user',
    description: 'App user: login, scans, reports, history, movements.',
    fields: {
      id: 'uuid (PK)',
      name: 'string',
      email: 'string (unique)',
      password: 'string (hashed)',
      role: 'UserRole — ADMIN | AUDITOR',
      created_at: 'DateTime',
      hashedRefreshToken: 'string? (optional)',
    },
    relations: {
      scans: 'Scan[]',
      reports: 'Report[]',
      history: 'AssetHistory[]',
      movements: 'AssetMovement[]',
    },
  },

  Asset: {
    name: 'Asset',
    table: 'assets',
    delegate: 'asset',
    description:
      'Tracked item (RFID tag optional); category, supplier, location, status.',
    fields: {
      id: 'uuid (PK)',
      tag_id:
        'string? (unique) — RFID / tag identifier; user “RFID” means this field, not id',
      name: 'string',
      category_id: 'uuid → Category',
      brand: 'string',
      model: 'string',
      supplier_id: 'uuid → Supplier',
      purchase_date: 'DateTime',
      price: 'Decimal(10,2)',
      warranty_end: 'DateTime?',
      location_id: 'uuid → Location',
      status: 'AssetStatus — GOOD | DAMAGED | REPAIR | BROKEN | TO_REPLACE',
      created_at: 'DateTime',
      image_url: 'string? (text)',
    },
    relations: {
      category: 'Category',
      supplier: 'Supplier',
      location: 'Location',
      scans: 'Scan[]',
      alerts: 'Alert[]',
      history: 'AssetHistory[]',
      movements: 'AssetMovement[]',
    },
  },

  Location: {
    name: 'Location',
    table: 'locations',
    delegate: 'location',
    description:
      'Hotel tree: HOTEL → FLOOR → ZONE → SUBZONE (parent/children).',
    fields: {
      id: 'uuid (PK)',
      name: 'string',
      parent_id: 'uuid? → Location',
      type: 'LocationType — HOTEL | FLOOR | ZONE | SUBZONE',
    },
    relations: {
      parent: 'Location?',
      children: 'Location[]',
      assets: 'Asset[]',
      scans: 'Scan[]',
      alerts: 'Alert[]',
      movements: 'AssetMovement[] (to_location)',
      from_movements: 'AssetMovement[] (from_location)',
    },
  },

  Category: {
    name: 'Category',
    table: 'categories',
    delegate: 'category',
    description: 'Asset category; name is unique.',
    fields: {
      id: 'uuid (PK)',
      name: 'string (unique)',
    },
    relations: {
      assets: 'Asset[]',
    },
  },

  Supplier: {
    name: 'Supplier',
    table: 'suppliers',
    delegate: 'supplier',
    description: 'Vendor for purchased assets.',
    fields: {
      id: 'uuid (PK)',
      name: 'string',
      contact_email: 'string?',
      phone: 'string?',
    },
    relations: {
      assets: 'Asset[]',
    },
  },

  Scan: {
    name: 'Scan',
    table: 'scans',
    delegate: 'scan',
    description: 'One RFID scan: asset, user, location, status at scan time.',
    fields: {
      id: 'uuid (PK)',
      asset_id: 'uuid → Asset',
      user_id: 'uuid → User',
      location_id: 'uuid → Location',
      status: 'AssetStatus',
      scanned_at: 'DateTime',
    },
    relations: {
      asset: 'Asset',
      user: 'User',
      location: 'Location',
      movements: 'AssetMovement[]',
    },
  },

  Alert: {
    name: 'Alert',
    table: 'alerts',
    delegate: 'alert',
    description:
      'Alert on asset and/or location; comment + photo (DB column image_url).',
    fields: {
      id: 'uuid (PK)',
      asset_id: 'uuid? → Asset',
      location_id: 'uuid? → Location',
      type: 'AlertType — DAMAGED | BROKEN | REPAIR | REPLACE | NOT_SCANNED',
      status: 'AlertStatus — OPEN | RESOLVED',
      created_at: 'DateTime',
      comment: 'string?',
      photo_url: 'string? (@map image_url)',
    },
    relations: {
      asset: 'Asset?',
      location: 'Location?',
    },
  },

  Report: {
    name: 'Report',
    table: 'reports',
    delegate: 'report',
    description: 'Generated report row; filters as JSON.',
    fields: {
      id: 'uuid (PK)',
      generated_by: 'uuid → User',
      report_type: 'string',
      filters: 'Json?',
      created_at: 'DateTime',
    },
    relations: {
      user: 'User',
    },
  },

  AssetHistory: {
    name: 'AssetHistory',
    table: 'asset_history',
    delegate: 'assetHistory',
    description: 'Audit log entry for an asset.',
    fields: {
      id: 'uuid (PK)',
      asset_id: 'uuid → Asset',
      action: 'string',
      user_id: 'uuid → User',
      timestamp: 'DateTime',
    },
    relations: {
      asset: 'Asset',
      user: 'User',
    },
  },

  AssetMovement: {
    name: 'AssetMovement',
    table: 'asset_movements',
    delegate: 'assetMovement',
    description:
      'Move asset from optional origin to destination; optional scan link.',
    fields: {
      id: 'uuid (PK)',
      asset_id: 'uuid → Asset',
      from_location_id: 'uuid? → Location',
      to_location_id: 'uuid → Location',
      user_id: 'uuid → User',
      scan_id: 'uuid? → Scan',
      moved_at: 'DateTime',
    },
    relations: {
      asset: 'Asset',
      from_location: 'Location?',
      to_location: 'Location',
      user: 'User',
      scan: 'Scan?',
    },
  },
};

/** Enum names and values only */
export const simpleEnums: Record<string, string[]> = {
  UserRole: ['ADMIN', 'AUDITOR'],
  AssetStatus: ['GOOD', 'DAMAGED', 'REPAIR', 'BROKEN', 'TO_REPLACE'],
  LocationType: ['HOTEL', 'FLOOR', 'ZONE', 'SUBZONE'],
  AlertType: ['DAMAGED', 'BROKEN', 'REPAIR', 'REPLACE', 'NOT_SCANNED'],
  AlertStatus: ['OPEN', 'RESOLVED'],
};
