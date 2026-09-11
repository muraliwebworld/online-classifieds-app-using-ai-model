# AI-Powered Online Classifieds Platform

## Project plan

This document defines the phased plan for an attractive online classifieds application using:

- Next.js for the frontend
- Node.js and Express for the backend API
- PostgreSQL as the application source of truth
- Local Qdrant for vector search
- n8n for AI ingestion workflows
- OpenAI or Together APIs for moderation, tagging, and embeddings
- Coolify on a Hostinger KVM 8 VPS

The attached PDF was used as reference material, particularly pages 5 onward. Its implementation snippets are treated as prototypes. In production, PostgreSQL should be the source of truth, Qdrant should be the search index, and the browser should never receive AI or Qdrant credentials.

## Target architecture

```text
Next.js frontend
        │
        ├── Express API ─── PostgreSQL
        │        │
        │        └── n8n webhook
        │                 ├── AI moderation and tag extraction
        │                 ├── Embedding API
        │                 ├── Qdrant vector upsert
        │                 └── Listing status callback
        │
        └── Express search API
                 ├── Query embedding API
                 ├── Qdrant semantic search
                 └── PostgreSQL listing enrichment
```

### Component responsibilities

- **PostgreSQL:** users, listings, images, messages, favorites, reports, and workflow status.
- **Qdrant:** embeddings and searchable listing metadata.
- **n8n:** asynchronous moderation, tagging, embedding, indexing, notifications, and retries.
- **Express:** authentication, validation, business rules, search, and n8n integration.
- **Next.js:** public marketplace, dashboards, forms, responsive UI, and SEO pages.

## Phase 0 — Product definition

Define:

- Categories and subcategories
- Required fields for each category
- Cities, districts, GPS coordinates, and radius search
- Listing states: `draft`, `processing`, `published`, `rejected`, `expired`, and `archived`
- User roles: buyer, seller, moderator, and administrator
- Prohibited-item and moderation policies
- Image limits and accepted formats
- Search ranking and filtering behavior
- Currency and pricing rules

Initial technical decisions:

- Next.js App Router
- Node.js, Express, and TypeScript
- PostgreSQL with Prisma
- Redis for queues, rate limiting, and caching
- Qdrant in a private Coolify network
- n8n in a private Coolify network
- S3-compatible object storage for images

## Phase 1 — VPS, Coolify, and networking

Deploy these Coolify resources:

- `classifieds-web`
- `classifieds-api`
- `classifieds-postgres`
- `classifieds-redis`
- `classifieds-qdrant`
- `classifieds-n8n`

Use an internal Docker network. The API and n8n should access Qdrant through an internal hostname such as:

```text
http://qdrant:6333
```

Do not expose Qdrant publicly. Protect any temporary dashboard access with an API key and network restrictions.

Create DNS records through Hostinger or Cloudflare:

```text
webpanel.videxpulse.com       → VPS IP
classifieds.videxpulse.com   → VPS IP
n8n.videxpulse.com            → VPS IP, preferably private or IP-restricted
```

Assign the domains in Coolify and enable HTTPS using Coolify’s reverse proxy and Let’s Encrypt. Enable Coolify 2FA and securely store recovery codes.

## Phase 2 — Backend and database foundation

Build the Express API with:

- TypeScript
- Prisma and PostgreSQL
- Zod or Joi validation
- Secure cookie or JWT authentication
- Password hashing
- Central error handling
- Structured request logging
- Rate limiting
- CORS and security headers
- OpenAPI documentation

Core tables:

- `users`
- `user_profiles`
- `listings`
- `listing_images`
- `categories`
- `locations`
- `favorites`
- `saved_searches`
- `messages`
- `reports`
- `moderation_events`
- `ai_processing_jobs`

A listing should include:

```text
id, seller_id, title, description, price, currency,
category_id, location_id, status, moderation_status,
ai_tags, published_at, expires_at, created_at, updated_at
```

## Phase 3 — Next.js frontend

Build a mobile-first marketplace containing:

- Marketplace homepage
- Natural-language search bar
- Category navigation
- Featured listings
- Location and price filters
- Image-first listing cards
- Listing detail page
- Seller profile page
- Post-ad wizard
- User dashboard
- Favorites and saved searches
- Messaging interface
- Report-listing action
- Admin moderation interface

Use server-rendered public pages for SEO and client components only for interactive features.

Recommended public routes:

```text
/
/search
/category/[slug]
/listing/[id]
/location/[city]
```

Visual direction:

- Neutral background with one strong brand accent
- Large, high-quality listing images
- Clear price hierarchy
- Rounded cards with restrained shadows
- Responsive grid layout
- Skeleton loading states
- Accessible contrast and keyboard navigation

## Phase 4 — Listing submission

The frontend submits to Express:

```text
POST /api/listings
```

Express should:

1. Authenticate the seller.
2. Validate the listing.
3. Save it as `processing`.
4. Upload and associate images.
5. Send a signed payload to the n8n webhook.
6. Return the processing status to the frontend.

Example response:

```json
{
  "listingId": "listing_123",
  "status": "processing"
}
```

The browser should call Express, not n8n directly.

## Phase 5 — n8n AI ingestion workflow

Create this n8n workflow:

```text
Webhook
  ↓
Validate signature and payload
  ↓
Load listing from Express/PostgreSQL
  ↓
Moderation and classification
  ↓
Extract tags and normalize text
  ↓
Generate embedding
  ↓
Upsert vector into Qdrant
  ↓
Update listing as published or rejected
  ↓
Respond to Express / notify seller
```

The AI node should return strict JSON:

```json
{
  "is_valid": true,
  "rejection_reason": null,
  "cleaned_title": "Used iPhone 13 128GB",
  "cleaned_description": "Good condition...",
  "category": "mobile-phones",
  "tags": ["iphone", "apple", "used-phone", "128gb"],
  "risk_level": "low"
}
```

Use OpenAI or Together for prohibited-content detection, spam detection, tag extraction, category normalization, and optional text cleanup.

Keep the original user text for auditability. Do not silently overwrite it.

Add:

- n8n error workflow
- Retries and timeouts
- Idempotency using `listingId`
- Failed-job status
- Manual moderation fallback
- Webhook authentication
- AI usage and cost logging

## Phase 6 — Embeddings and Qdrant

Use the same embedding model for indexing and searching. Configure Qdrant’s vector size to match the actual embedding response. Do not assume the dimension without checking the selected model configuration.

Recommended collection:

```text
classifieds_listings
```

Example payload:

```json
{
  "listing_id": "listing_123",
  "title": "Used iPhone 13 128GB",
  "description": "Good condition...",
  "category_id": "mobile-phones",
  "location_id": "coimbatore",
  "price": 35000,
  "currency": "INR",
  "tags": ["iphone", "apple", "128gb"],
  "status": "published",
  "created_at": "2026-09-10T00:00:00Z"
}
```

Create Qdrant payload indexes for `category_id`, `location_id`, `price`, `status`, and `created_at`. Add geographic indexes when radius search is implemented.

Use persistent storage, on-disk vectors where appropriate, scheduled snapshots, and off-server backups.

## Phase 7 — AI RAG search

Search flow:

```text
User query
  ↓
Express search endpoint
  ↓
Generate query embedding
  ↓
Apply Qdrant filters
  ↓
Semantic vector search
  ↓
PostgreSQL enrichment
  ↓
Return results
```

Example endpoint:

```text
GET /api/search?q=budget Apple phone&category=mobile-phones&maxPrice=40000
```

Support:

- Natural-language queries
- Category filtering
- Price ranges
- Location and radius filtering
- Newest and relevance sorting
- Pagination
- Minimum similarity score
- Search suggestions

For stronger RAG behavior, Qdrant should first retrieve a small candidate set. Express should remove unavailable listings and optionally rerank or explain only those candidates. Do not send the whole marketplace database to an LLM.

## Phase 8 — Images and media

Implement:

- Multiple image uploads
- Image ordering
- Thumbnail generation
- Compression
- EXIF stripping
- File-size and MIME validation
- Lazy loading
- Responsive image sizes

Store image metadata and URLs in PostgreSQL. Store the files in object storage or a dedicated persistent volume.

## Phase 9 — Security and abuse prevention

Implement:

- HTTP-only secure cookies
- CSRF protection where applicable
- Strict input validation
- Rate limiting and login throttling
- Webhook signatures
- File-upload validation
- CAPTCHA for suspicious activity
- Seller verification options
- Report and block functionality
- Admin audit trail
- Coolify-managed secrets
- Regular dependency updates
- PostgreSQL and Qdrant backups

AI moderation should assist human moderation for high-risk categories rather than being the only enforcement mechanism.

## Phase 10 — Testing

Test:

- Validation, permissions, and business rules
- Listing creation and search API integration
- n8n success, rejection, timeout, and retry paths
- Browser flows for login, posting, searching, favorites, and responsive layouts
- Duplicate webhook delivery
- OpenAI/Together timeout
- Qdrant or PostgreSQL outage
- Invalid embedding dimensions
- Expired and deleted listings
- Unauthorized access to another seller’s data

## Phase 11 — Deployment and operations

Use separate environments:

```text
development
staging
production
```

Production should include:

- GitHub repository or monorepo
- Dockerfiles for web and API
- Health checks
- Database migrations
- Rollback-capable deployments
- Environment-specific secrets
- Structured logs
- Uptime monitoring
- CPU, memory, disk, and container monitoring
- Alerts for failed n8n workflows
- Scheduled PostgreSQL backups
- Scheduled Qdrant snapshots

Suggested repository structure:

```text
classifieds/
  apps/
    web/
    api/
  packages/
    shared-types/
    validation/
  workflows/
    n8n/
  infrastructure/
    docker/
    coolify/
  docs/
```

## Phase 12 — Future enhancements

Consider adding:

- Hybrid keyword and vector search
- Location-radius search
- Personalized recommendations
- Similar-listing suggestions
- Price estimation
- Duplicate listing detection
- Image quality checks
- Seller trust scoring
- Push notifications
- Saved-search alerts
- Multilingual search
- Promoted listings
- Analytics dashboard

## Recommended implementation order

1. Coolify, domains, HTTPS, and internal networking
2. PostgreSQL, Redis, Qdrant, and n8n services
3. Express authentication and listing APIs
4. Next.js marketplace UI
5. Image upload and listing creation
6. n8n moderation workflow
7. Embedding generation and Qdrant indexing
8. Semantic and filtered search
9. User dashboard and favorites
10. Admin moderation
11. Backups, monitoring, security hardening, and load testing
