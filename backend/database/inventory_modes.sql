-- ============================================================
-- INVENTORY MODES
-- Defines valid modes for all inventory item tables.
-- ui_color maps to MUI Chip color prop (default/primary/success/warning/error/info).
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_modes (
    code          VARCHAR(10)  PRIMARY KEY,
    label         VARCHAR(50)  NOT NULL,
    description   TEXT,
    ui_color      VARCHAR(20)  NOT NULL DEFAULT 'default',
    display_order INTEGER      NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP
);

INSERT INTO inventory_modes (code, label, description, ui_color, display_order)
SELECT * FROM (VALUES
    ('PIECE',  'Piece',  'A unique one-off item with no catalog link required', 'default', 1),
    ('UNIT',   'Unit',   'A serialised item linked to a catalog item',          'primary', 2),
    ('STOCK',  'Stock',  'A quantity-tracked SKU added to a stock record',      'success', 3),
    ('BUCKET', 'Bucket', 'A mixed lot stored under a single total value',       'warning', 4)
) AS v(code, label, description, ui_color, display_order)
WHERE NOT EXISTS (SELECT 1 FROM inventory_modes LIMIT 1);


-- ============================================================
-- PROCESSING STATUSES
-- Defines valid processing_status values used across all
-- inventory item tables (jewelry, hardgoods, etc.).
-- ui_color maps to MUI Chip color prop.
-- status_group: intake | processing | branch | jewellery
-- ============================================================
CREATE TABLE IF NOT EXISTS processing_statuses (
    code          VARCHAR(30)  PRIMARY KEY,
    label         VARCHAR(60)  NOT NULL,
    description   TEXT,
    ui_color      VARCHAR(20)  NOT NULL DEFAULT 'default',
    status_group  VARCHAR(30)  NOT NULL DEFAULT 'processing',
    display_order INTEGER      NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP
);

-- Add columns when upgrading an existing schema
ALTER TABLE processing_statuses ADD COLUMN IF NOT EXISTS status_group  VARCHAR(30) NOT NULL DEFAULT 'processing';
ALTER TABLE processing_statuses ADD COLUMN IF NOT EXISTS display_order INTEGER     NOT NULL DEFAULT 0;

-- Replace all statuses with values from processing design (Section 31)
DELETE FROM processing_statuses;

INSERT INTO processing_statuses (code, label, description, ui_color, status_group, display_order) VALUES
    -- INTAKE
    ('INTAKE_PENDING',              'Intake Pending',          'Received and logged, not yet assigned to processing',  'default', 'intake',      1),

    -- PROCESSING WORKFLOW
    ('PROCESSING_PENDING',          'Processing Pending',      'Queued for processing, not yet started',               'default', 'processing',  10),
    ('NEEDS_FIELDS',                'Needs Fields',            'Missing required category fields',                     'warning', 'processing',  11),
    ('NEEDS_CHECKLIST',             'Needs Checklist',         'Checklist not yet completed',                          'warning', 'processing',  12),
    ('NEEDS_TESTING',               'Needs Testing',           'In testing queue (electronics, consoles, etc.)',       'warning', 'processing',  13),
    ('NEEDS_PHOTOS',                'Needs Photos',            'Missing product photos',                               'warning', 'processing',  14),
    ('NEEDS_PRICE',                 'Needs Price',             'Awaiting pricing decision',                            'warning', 'processing',  15),
    ('READY_TO_FINALIZE',           'Ready to Finalize',       'All steps complete, pending final review',             'info',    'processing',  16),
    ('PROCESSING_COMPLETE',         'Processing Complete',     'Fully processed and ready for routing decision',       'success', 'processing',  17),

    -- BRANCH (routing decisions)
    ('STOCK_CANDIDATE',             'Stock Candidate',         'Flagged to be added to a stock SKU record',            'info',    'branch',      20),
    ('BUCKET_CANDIDATE',            'Bucket Candidate',        'Flagged to be grouped into a bulk lot',                'info',    'branch',      21),
    ('NEEDS_REPAIR',                'Needs Repair',            'Sent to repair shop before sellable',                  'warning', 'branch',      22),
    ('DAMAGED_MISSING_PARTS',       'Damaged / Missing Parts', 'Damaged or missing parts, decision pending',           'error',   'branch',      23),
    ('POLICE_HOLD',                 'Police Hold',             'Under police hold, isolated from normal queues',       'error',   'branch',      24),
    ('CONFISCATED',                 'Confiscated',             'Confiscated by police (permanent)',                    'error',   'branch',      25),
    ('RETURNED_CANCELLED',          'Returned / Cancelled',    'Returned to customer or buy cancelled',                'default', 'branch',      26),
    ('TRANSFER_PENDING',            'Transfer Pending',        'Approved for transfer, awaiting movement',             'warning', 'branch',      27),
    ('EXCEPTION',                   'Exception',               'Blocked; see blocking_reason and next_action',         'error',   'branch',      28),

    -- JEWELLERY PIPELINE
    ('JEWELLERY_TRIAGE',            'Jewellery Triage',        'Initial assessment of jewellery item',                 'default', 'jewellery',   30),
    ('JEWELLERY_REPAIR_CLEANING',   'Repair / Cleaning',       'Jewellery in repair or cleaning',                      'warning', 'jewellery',   31),
    ('JEWELLERY_SW_PROCESSING',     'Software Processing',     'Being processed through jewellery software',           'warning', 'jewellery',   32),
    ('JEWELLERY_READY_HOLDING',     'Ready / Holding',         'Processed and ready but not yet on floor',             'info',    'jewellery',   33),
    ('JEWELLERY_RETAIL_FLOOR',      'Retail Floor',            'On display in store or showcase',                      'success', 'jewellery',   34),
    ('JEWELLERY_SCRAP_REFINE',      'Scrap / Refine',          'Moved to scrap or sent for refining',                  'default', 'jewellery',   35),
    ('JEWELLERY_EXCEPTION',         'Jewellery Exception',     'Blocked jewellery item; see blocking_reason',          'error',   'jewellery',   36);
