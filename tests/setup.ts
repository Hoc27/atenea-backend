// Entorno aislado para tests: nunca toca la BD real ni los secretos de .env.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.FIELD_ENCRYPTION_KEY = "a".repeat(64);
process.env.UPLOAD_DIR = "uploads-test";
process.env.TRUST_PROXY = "0";
