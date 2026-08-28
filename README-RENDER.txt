Behaviour Change Agent - Render backend deployment

Files in this bundle:
- render.yaml (project root)
- backend/Dockerfile
- backend/src/main/resources/application.properties
- backend/src/main/java/com/behaviourchange/backend/config/CorsConfig.java

Secrets to enter in Render when prompted:
- DATABASE_URL = your current Neon connection string
- ADMIN_USERNAME = admin
- ADMIN_PASSWORD = your current desired initial admin password

Do not commit secret values to Git.
