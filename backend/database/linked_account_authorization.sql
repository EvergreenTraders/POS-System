-- Create table for linked account authorization form template
CREATE TABLE IF NOT EXISTS linked_account_authorization_template (
    id SERIAL PRIMARY KEY,
    link_type VARCHAR(50) NOT NULL UNIQUE,
    form_title VARCHAR(255) NOT NULL DEFAULT 'Account Linking Authorization',
    form_content TEXT NOT NULL DEFAULT 'I, {{CUSTOMER_NAME}}, hereby authorize {{PRIMARY_CUSTOMER_NAME}} to access my account information and transaction history.',
    consent_text VARCHAR(500) NOT NULL DEFAULT 'I understand and consent to sharing my account information.',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add link_type column if it doesn't exist (for existing tables)
DO $$
BEGIN
    ALTER TABLE linked_account_authorization_template
        ADD COLUMN IF NOT EXISTS link_type VARCHAR(50);

    -- If there are existing rows without link_type, delete them
    DELETE FROM linked_account_authorization_template WHERE link_type IS NULL;

    -- Now make it NOT NULL and UNIQUE
    ALTER TABLE linked_account_authorization_template
        ALTER COLUMN link_type SET NOT NULL;

    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'linked_account_authorization_template_link_type_key'
    ) THEN
        ALTER TABLE linked_account_authorization_template
            ADD CONSTRAINT linked_account_authorization_template_link_type_key UNIQUE (link_type);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if constraints already exist
        NULL;
END $$;

-- Insert default templates for each link type
INSERT INTO linked_account_authorization_template (link_type, form_title, form_content, consent_text)
VALUES
(
    'full_access',
    'Full Access Account Linking Authorization',
    'I, {{CUSTOMER_NAME}}, hereby authorize {{PRIMARY_CUSTOMER_NAME}} to have FULL ACCESS to my account information and transaction history for the purpose of managing linked accounts.

This full access authorization includes:
- Complete access to transaction history
- Ability to view and manage account details
- View all purchase records
- Make transactions on my behalf
- Access all account information

I understand that this authorization grants complete access to my account and can be revoked at any time by contacting the business directly.',
    'I have read and understood the above authorization and consent to granting FULL ACCESS to my account.'
),
(
    'view_only',
    'View Only Account Linking Authorization',
    'I, {{CUSTOMER_NAME}}, hereby authorize {{PRIMARY_CUSTOMER_NAME}} to have VIEW ONLY access to my account information and transaction history.

This view-only authorization includes:
- View transaction history (read-only)
- View account details (read-only)
- View purchase records (read-only)

This authorization does NOT include:
- Making transactions on my behalf
- Modifying account information
- Any write or edit permissions

I understand that this authorization can be revoked at any time by contacting the business directly.',
    'I have read and understood the above authorization and consent to granting VIEW ONLY access to my account.'
),
(
    'limited',
    'Limited Access Account Linking Authorization',
    'I, {{CUSTOMER_NAME}}, hereby authorize {{PRIMARY_CUSTOMER_NAME}} to have LIMITED access to my account information.

This limited authorization includes:
- View recent transaction history (last 30 days)
- View basic account details
- Limited purchase record access

This authorization does NOT include:
- Full transaction history
- Making transactions on my behalf
- Modifying account information

I understand that this authorization can be revoked at any time by contacting the business directly.',
    'I have read and understood the above authorization and consent to granting LIMITED access to my account.'
)
ON CONFLICT (link_type) DO NOTHING;

-- Create table for storing actual authorizations
CREATE TABLE IF NOT EXISTS linked_account_authorizations (
    id SERIAL PRIMARY KEY,
    link_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    authorized_by_name VARCHAR(255) NOT NULL,
    signature_data TEXT,
    authorization_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_linked_account_authorization_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER linked_account_authorization_template_updated_at
    BEFORE UPDATE ON linked_account_authorization_template
    FOR EACH ROW
    EXECUTE FUNCTION update_linked_account_authorization_template_timestamp();
