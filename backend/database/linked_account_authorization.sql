-- Create table for linked account authorization form template
CREATE TABLE IF NOT EXISTS linked_account_authorization_template (
    id SERIAL PRIMARY KEY,
    form_title VARCHAR(255) NOT NULL DEFAULT 'Account Linking Authorization',
    form_content TEXT NOT NULL DEFAULT 'I, {{CUSTOMER_NAME}}, hereby authorize {{PRIMARY_CUSTOMER_NAME}} to access my account information and transaction history.',
    consent_text VARCHAR(500) NOT NULL DEFAULT 'I understand and consent to sharing my account information.',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default template
INSERT INTO linked_account_authorization_template (form_title, form_content, consent_text)
VALUES (
    'Account Linking Authorization',
    'I, {{CUSTOMER_NAME}}, hereby authorize {{PRIMARY_CUSTOMER_NAME}} to access my account information and transaction history for the purpose of managing linked accounts.

This authorization includes:
- Access to transaction history
- Ability to view account details
- View purchase records

I understand that this authorization can be revoked at any time by contacting the business directly.',
    'I have read and understood the above authorization and consent to linking my account.'
)
ON CONFLICT DO NOTHING;

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
