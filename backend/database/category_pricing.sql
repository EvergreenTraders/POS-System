-- ============================================================
-- CATEGORY PRICING
-- Powers the Category Manager "Pricing" tab: the Category Buy / Pawn /
-- Trade percentages applied to a Catalog Item's Suggested Cost (doc §7:
-- "use that Catalog value as the basis for suggested Buy/Pawn calculations
-- using the applicable Category percentages"), which intelligence scope is
-- shown first (doc §7 "Scope of intelligence"), and the valuation / retail
-- suggestion logic.
--
-- Every setting is nullable: NULL = inherit from the nearest ancestor
-- category that sets it (same inheritance idea as category fields). A
-- category with no row at all inherits everything. Depends on category_tree.sql.
-- ============================================================
CREATE TABLE IF NOT EXISTS category_pricing_settings (
    category_id         INTEGER      PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
    suggested_buy_pct   NUMERIC(5,2) CHECK (suggested_buy_pct   IS NULL OR (suggested_buy_pct   >= 0 AND suggested_buy_pct   <= 200)),
    suggested_pawn_pct  NUMERIC(5,2) CHECK (suggested_pawn_pct  IS NULL OR (suggested_pawn_pct  >= 0 AND suggested_pawn_pct  <= 200)),
    suggested_trade_pct NUMERIC(5,2) CHECK (suggested_trade_pct IS NULL OR (suggested_trade_pct >= 0 AND suggested_trade_pct <= 200)),
    -- Intelligence scopes in display priority; the first is the default shown.
    source_priority     TEXT[]       CHECK (source_priority IS NULL OR (
                                       source_priority <@ ARRAY['STORE', 'COMPANY', 'NETWORK']::TEXT[]
                                       AND cardinality(source_priority) = 3)),
    -- AUTOMATIC: Catalog Suggested Cost when populated, otherwise historical
    -- intelligence (doc §7 MUST).
    valuation_method    VARCHAR(30)  CHECK (valuation_method IS NULL OR valuation_method IN ('AUTOMATIC')),
    -- CATALOG_THEN_INTELLIGENCE: Catalog Suggested Retail when populated,
    -- otherwise historical/market intelligence (doc §7 MUST).
    retail_logic        VARCHAR(40)  CHECK (retail_logic IS NULL OR retail_logic IN ('CATALOG_THEN_INTELLIGENCE')),
    updated_by          INTEGER      REFERENCES employees(employee_id) ON DELETE SET NULL,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
