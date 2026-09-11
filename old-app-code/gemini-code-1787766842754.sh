mkdir classifieds-rag-backend
cd classifieds-rag-backend
npm init -y

# Install Core & AI Dependencies
npm install express cors dotenv mysql2 bcryptjs jsonwebtoken @qdrant/js-client-rest together-ai groq-sdk uuid

# Install Development Types & Tools
npm install -D typescript @types/node @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/uuid tsx
npx tsc --init