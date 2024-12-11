DROP TABLE IF EXISTS jewellery;
CREATE TABLE jewellery (
    id SERIAL PRIMARY KEY,
    type TEXT,
    sku TEXT,
    name TEXT,
    published BOOLEAN,
    is_featured BOOLEAN,
    visibility_in_catalog TEXT,
    tax_status TEXT,
    in_stock BOOLEAN,
    backorders_allowed BOOLEAN,
    sold_individually BOOLEAN,
    weight_oz NUMERIC,
    allow_customer_reviews BOOLEAN,
    regular_price NUMERIC,
    categories TEXT,
    images TEXT,
    position INTEGER
);

\COPY jewellery(id, type, sku, name, published, is_featured, visibility_in_catalog, tax_status, in_stock, backorders_allowed, sold_individually, weight_oz, allow_customer_reviews, regular_price, categories, images, position) FROM 'data/jewellery.csv' DELIMITER ',' CSV HEADER;