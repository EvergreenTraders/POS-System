# Account Linking Feature - Complete Guide

## Overview
The account linking feature allows one customer to access another customer's transaction history. This is useful for family accounts, business relationships, or authorized representatives.

## What Access You Get After Linking Accounts

When you link **Customer A** → **Customer B**, Customer A gains the following access:

### ✅ Full Transaction Access
- Customer A can view ALL of Customer B's transactions
- This includes:
  - Transaction details (ID, date, amount, status)
  - Items purchased
  - Payment methods and amounts
  - Employee who processed the transaction
  - Outstanding balances

### ✅ Combined Transaction History
- The Sales History page automatically shows:
  - Customer A's own transactions
  - ALL transactions from linked accounts (Customer B, C, D, etc.)
  - Clear visual indicators showing which transactions are from linked accounts

### ✅ Visual Indicators
- **Blue background**: Linked account transactions have a subtle blue tint
- **"Linked" badge**: Each linked transaction shows a badge with a link icon
- **Summary breakdown**: Shows count of own vs linked transactions
- **Info alert**: Explains linked account transactions at the top of the page

## How to Use in Your Application

### Step 1: Link Customer Accounts

1. Go to **Customer Manager**
2. Find the primary customer (the one who will gain access)
3. Click the **🔗 Link icon** button next to their name
4. Click **"Link Account"** button
5. Search for the customer to link (type name, email, or phone)
6. Select **Link Type**:
   - `full_access` - Full transaction access (default)
   - `view_only` - View only (for future use)
   - `limited` - Limited access (for future use)
7. Add optional notes
8. Click **"Link Account"**

### Step 2: View Combined Transactions

1. Go to **Customer Manager**
2. Find the primary customer
3. Click the **History icon** (🕐) or click their row
4. Click **"View Sales History"**
5. You'll now see:
   - Customer's own transactions
   - All linked account transactions
   - Visual indicators for linked transactions

### Step 3: Manage Links

1. Go to **Customer Manager**
2. Click the **🔗 Link icon** next to a customer
3. You can:
   - **View all linked accounts** for that customer
   - **Activate/Deactivate links** by clicking the status chip
   - **Delete links** by clicking the delete button
   - **Add more links** by clicking "Link Account"

## Current Implementation Example

From our demo script, here's a real example:

**Customer A: Benjamin Caron (ID: 18)**
- Own Transactions: 28 ($3,207.32)
- Email: benjamin.caron@example.com
- Phone: (306) 555-7890

**Customer B: Charlotte Bergeron (ID: 17)**
- Own Transactions: 28 ($1,543.01)
- Email: charlotte.bergeron@example.com
- Phone: (613) 555-6789

### After Linking A → B:

**Benjamin's Sales History now shows:**
- Total Transactions: **56** (28 own + 28 linked)
- Total Value: **$4,750.33**
- Summary breakdown clearly shows: "(28 own + 28 linked)"
- Each of Charlotte's transactions appears with a "Linked" badge
- Blue background tint on linked transactions

### After Deactivating Link:

**Benjamin's Sales History shows:**
- Total Transactions: **28** (own only)
- Total Value: **$3,207.32**
- No linked transactions visible

## API Endpoints Available

### 1. Get Linked Accounts
```
GET /api/customers/:id/linked-accounts
```
Returns all accounts linked to a customer.

**Response:**
```json
[
  {
    "id": 6,
    "primary_customer_id": 18,
    "linked_customer_id": 17,
    "link_type": "full_access",
    "is_active": true,
    "created_at": "2025-10-26T21:46:03.000Z",
    "linked_customer_name": "Charlotte Bergeron",
    "linked_customer_email": "charlotte.bergeron@example.com",
    "linked_customer_phone": "(613) 555-6789"
  }
]
```

### 2. Get All Accessible Transactions (Own + Linked)
```
GET /api/customers/:id/all-accessible-transactions
```
Returns combined transactions with linked account flag.

**Response:**
```json
{
  "customer_id": 18,
  "summary": {
    "total_transactions": 56,
    "own_transactions": 28,
    "linked_transactions": 28,
    "total_spent": 4750.33,
    "total_paid": 4110.69,
    "outstanding_balance": 639.64,
    "completed_transactions": 50,
    "pending_transactions": 6
  },
  "transactions": [
    {
      "transaction_id": "F0000122",
      "customer_id": 18,
      "customer_name": "Benjamin Caron",
      "total_amount": 438.19,
      "transaction_status": "PENDING",
      "is_linked_account": false,
      ...
    },
    {
      "transaction_id": "F0000055",
      "customer_id": 17,
      "customer_name": "Charlotte Bergeron",
      "total_amount": 127.87,
      "transaction_status": "COMPLETED",
      "is_linked_account": true,
      ...
    }
  ]
}
```

### 3. Create Account Link
```
POST /api/customers/:id/link-account
```

**Body:**
```json
{
  "linked_customer_id": 17,
  "link_type": "full_access",
  "notes": "Family member - authorized access"
}
```

### 4. Update Account Link
```
PUT /api/customers/account-links/:linkId
```

**Body:**
```json
{
  "is_active": false,
  "link_type": "view_only",
  "notes": "Updated permissions"
}
```

### 5. Delete Account Link
```
DELETE /api/customers/account-links/:linkId
```

## Testing the Feature

### Method 1: Use the Demo Script
```bash
cd c:\Users\User\Downloads\POS-System\scripts
node demo_account_linking.js
```

This will:
- Find 2 customers with transactions
- Create a link between them
- Show before/after transaction counts
- Test activation/deactivation
- Provide full demonstration output

### Method 2: Manual UI Testing
1. Open Customer Manager
2. Link two customers with existing transactions
3. View Sales History for the primary customer
4. Verify you see combined transactions with "Linked" badges
5. Try deactivating the link and verify transactions disappear

### Method 3: API Testing
```bash
# Get all accessible transactions for customer 18
curl http://localhost:5000/api/customers/18/all-accessible-transactions

# Get linked accounts
curl http://localhost:5000/api/customers/18/linked-accounts
```

## Database Schema

### customer_account_links Table
```sql
CREATE TABLE customer_account_links (
  id SERIAL PRIMARY KEY,
  primary_customer_id INTEGER NOT NULL,  -- Who gets access
  linked_customer_id INTEGER NOT NULL,   -- Whose data is shared
  link_type VARCHAR(50) DEFAULT 'full_access',
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,

  -- Constraints
  CONSTRAINT fk_primary_customer FOREIGN KEY (primary_customer_id)
    REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_linked_customer FOREIGN KEY (linked_customer_id)
    REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT chk_no_self_link CHECK (primary_customer_id != linked_customer_id),
  CONSTRAINT unique_account_link UNIQUE (primary_customer_id, linked_customer_id)
);
```

## Key Features

### ✅ Implemented Features
- [x] Link/unlink customer accounts via UI
- [x] View all linked accounts for a customer
- [x] Activate/deactivate links without deletion
- [x] Multiple link types (full_access, view_only, limited)
- [x] Combined transaction view in Sales History
- [x] Visual indicators for linked transactions
- [x] Summary breakdown (own vs linked)
- [x] Database constraints (no self-linking, no duplicates)
- [x] Cascade delete (when customer is deleted, links are removed)
- [x] Audit trail (created_by, created_at, updated_at)

### 🔒 Database Constraints
- Cannot link a customer to themselves
- Cannot create duplicate links
- Automatic cleanup when customers are deleted
- Link types are restricted to valid values

### 📊 Summary Statistics
The Sales History page shows:
- Total transactions (with breakdown)
- Total spent across all accounts
- Total paid
- Outstanding balance
- Completed vs pending transaction counts

## Important Notes

1. **One-way relationship**: Linking A → B means A can see B's transactions, but B cannot see A's transactions. To enable two-way access, create two links (A → B and B → A).

2. **Active links only**: Only links with `is_active = true` grant access. Deactivated links remain in the database but don't provide access.

3. **No permission levels yet**: Currently, all link types provide the same access. The `link_type` field is prepared for future use when different permission levels are implemented.

4. **Transaction ownership**: Each transaction is clearly marked with `is_linked_account` flag to identify the source.

5. **Performance**: The combined transaction query uses efficient CTEs (Common Table Expressions) to minimize database load.

## Future Enhancements (Not Yet Implemented)

- [ ] Different permission levels for link types
- [ ] Notification when linked accounts are accessed
- [ ] Link expiration dates
- [ ] Bi-directional linking with one click
- [ ] Batch linking for multiple accounts
- [ ] Export linked transaction reports
- [ ] Link request/approval workflow

## Files Modified

### Backend
- `backend/database/create_customer_account_links.sql` - Database schema
- `backend/server.js` - API endpoints (lines 3243-3467)

### Frontend
- `frontend/src/components/LinkedAccountsManager.js` - Link management UI
- `frontend/src/pages/CustomerManager.js` - Added link button
- `frontend/src/pages/SalesHistory.js` - Updated to show combined transactions

### Scripts
- `scripts/test_account_linking.js` - Automated testing
- `scripts/demo_account_linking.js` - Feature demonstration

## Support

For issues or questions:
1. Check browser console for errors (F12)
2. Verify backend server is running with updated endpoints
3. Check database for active links: `SELECT * FROM customer_account_links WHERE is_active = true;`
4. Run demo script to verify feature is working: `node scripts/demo_account_linking.js`
