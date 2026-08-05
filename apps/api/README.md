# TactileType API - VPS Deployment Guide

This guide will help you deploy the TactileType API server to your VPS using Docker.

## Prerequisites

- VPS with Ubuntu/Debian/CentOS
- Docker and Docker Compose installed
- Git (for cloning your repository)
- Domain name (optional, but recommended for production)

## Quick Deployment

### 1. Prepare Your VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Restart session to apply Docker group changes
newgrp docker
```

### 2. Clone and Setup Project

```bash
# Clone your repository
git clone https://github.com/yourusername/tactiletype.git
cd tactiletype

# Copy environment file and configure
cp apps/api/.env.example apps/api/.env
nano apps/api/.env  # Edit with your actual values
```

### 3. Configure Environment Variables

Edit `apps/api/.env` with your production values:

```bash
# Required
DATABASE_URL=postgresql://user:password@db-host:5432/database
JWT_SECRET=your-secure-jwt-secret
PORT=3021

# OAuth (if using social login)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Deploy Using the Script

```bash
# Make script executable (if not already)
chmod +x apps/api/deploy.sh

# Deploy the API
./apps/api/deploy.sh deploy
```

## Alternative: Using Docker Compose

If you prefer Docker Compose for more control:

```bash
# Edit docker-compose.yml with your environment variables
nano apps/api/docker-compose.yml

# Deploy
cd apps/api
docker-compose up -d
```

## Database Setup

### PostgreSQL on VPS

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql
CREATE DATABASE tactile_db;
CREATE USER tactile_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tactile_db TO tactile_user;
\q

# Update your .env file
DATABASE_URL=postgresql://tactile_user:your_secure_password@localhost:5432/tactile_db
```

### Or Use Managed Database

For production, consider using:

- AWS RDS
- Google Cloud SQL
- DigitalOcean Managed Database
- Supabase

## Networking & Security

### 1. Firewall Configuration

```bash
# Allow SSH and HTTP/HTTPS
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

### 2. Reverse Proxy with Nginx (Recommended)

```bash
# Install Nginx
sudo apt install nginx -y

# Create site configuration
sudo nano /etc/nginx/sites-available/tactile-api

# Add this configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3021;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/tactile-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Certificates auto-renew
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring & Maintenance

### View Logs

```bash
# Using deployment script
./apps/api/deploy.sh logs

# Or directly
docker logs tactile-api-container
```

### Restart Service

```bash
./apps/api/deploy.sh restart
```

### Update Deployment

```bash
# Pull latest changes
git pull origin main

# Rebuild and deploy
./apps/api/deploy.sh deploy
```

### Health Check

```bash
# Check if API is responding
curl http://localhost:3021/api

# Check container status
./apps/api/deploy.sh status
```

## Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   sudo netstat -tulpn | grep :3021
   # Kill process or change port in .env
   ```

2. **Database connection failed**
   - Check DATABASE_URL in .env
   - Ensure PostgreSQL is running
   - Verify database credentials

3. **Container won't start**

   ```bash
   ./apps/api/deploy.sh logs
   # Check for error messages
   ```

4. **Permission denied**
   ```bash
   sudo usermod -aG docker $USER
   # Logout and login again
   ```

### Performance Tuning

```bash
# Increase Docker container resources
docker run --memory=1g --cpus=1 ...

# Or in docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Monitoring set up
- [ ] Domain DNS configured
- [ ] CORS settings updated for production domain

## Support

If you encounter issues:

1. Check logs: `./apps/api/deploy.sh logs`
2. Verify environment variables
3. Test database connectivity
4. Check firewall rules
5. Ensure Docker is running

Your API will be available at `https://your-domain.com` once SSL is configured.
