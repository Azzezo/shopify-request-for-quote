# Request for Quote - Shopify App

A Shopify app that allows customers to request quotes for products instead of adding them to cart.

## ✨ Features

- **Product-level toggle**: Enable/disable "Request for Quote" on individual products via metafields
- **Hide price option**: Optionally hide the product price when RFQ is enabled
- **Request for Quote button**: Replaces the Add to Cart button on enabled products
- **Quote request modal**: Beautiful modal form with:
  - Name (required)
  - Email (required)
  - Telephone (optional)
  - Request Details (required)
  - Phone number display for direct contact: +353 (0)1 8118920
- **Email notifications**: Receive email notifications when quotes are submitted
- **Admin dashboard**: View and manage all quote submissions with status tracking
- **Configurable settings**: Customize notification email, phone number, and form text

## 💡 No External Database Required!

This app uses **Shopify Metaobjects** to store all data directly in Shopify:
- ✅ No database hosting costs
- ✅ No database setup or maintenance
- ✅ Data lives in Shopify (automatic backups)
- ✅ Merchants can view submissions in Shopify Admin

Only a small SQLite database is used for authentication sessions (required by Shopify).

## 🚀 Setup

### Prerequisites

- Node.js 18.20+ or 20.10+
- A Shopify Partner account
- A development store

### Installation

1. Clone this repository:
   ```bash
   cd request-for-quote
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the session database:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

4. Connect to Shopify:
   ```bash
   npm run config:link
   ```

5. Start development:
   ```bash
   npm run dev
   ```

## 📖 Usage

### Enabling RFQ on Products

1. Go to a product in your Shopify Admin
2. Scroll down to the **Metafields** section
3. Find "Enable Request for Quote" and set it to **True**
4. Optionally, enable "Hide Price" to hide the product price

### Theme Setup

1. Go to **Online Store > Themes > Customize**
2. Navigate to a product page
3. Add the "Request for Quote" app block to your product section
4. The RFQ button will automatically appear for enabled products

### Managing Submissions

1. Open the app from your Shopify Admin
2. Go to **Quote Submissions** to view all requests
3. Click on any submission to view details and update status
4. Status options: Pending, Contacted, Quoted, Completed, Cancelled

### Viewing Data in Shopify Admin

Since we use Metaobjects, you can also view submissions directly in Shopify:
1. Go to **Settings > Custom data > Metaobjects**
2. Find "Quote Submission" to see all entries

## 📁 App Structure

```
├── app/
│   ├── routes/
│   │   ├── app._index.tsx      # Dashboard/home page
│   │   ├── app.settings.tsx    # Settings page (uses Metaobjects)
│   │   ├── app.submissions.tsx # Submissions view (uses Metaobjects)
│   │   ├── api.proxy.tsx       # App proxy endpoint
│   │   └── webhooks.tsx        # Webhook handlers
│   ├── services/
│   │   └── email.server.ts     # Email notification service
│   ├── db.server.ts            # Session database only
│   └── shopify.server.ts       # Shopify app configuration
├── extensions/
│   └── theme-app-extension/
│       ├── blocks/
│       │   └── rfq-button.liquid  # RFQ button & modal
│       └── shopify.extension.toml
├── prisma/
│   └── schema.prisma           # Session storage only
└── shopify.app.toml            # App config with Metaobject definitions
```

## 📧 Email Setup (Optional)

For email notifications, sign up for [Resend](https://resend.com) (100 emails/day free):

```bash
RESEND_API_KEY=your_key_here
RESEND_FROM_EMAIL=quotes@yourdomain.com
```

Without Resend configured, emails are logged to console instead.

## 🚢 Deployment

1. Build the app:
   ```bash
   npm run build
   ```

2. Deploy to your hosting provider (Vercel, Railway, Render, etc.)

3. Deploy to Shopify:
   ```bash
   npm run deploy
   ```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SHOPIFY_API_KEY` | Your Shopify app API key | Yes |
| `SHOPIFY_API_SECRET` | Your Shopify app API secret | Yes |
| `SHOPIFY_APP_URL` | Your app's public URL | Yes |
| `SCOPES` | Required API scopes | Yes |
| `RESEND_API_KEY` | Resend API key for emails | No |
| `RESEND_FROM_EMAIL` | Email sender address | No |

## 📝 License

MIT
