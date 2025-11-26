# AWS Deployment - Complete Package

Your POS System is now ready for AWS deployment! Here's everything that's been set up for you.

---

## 📁 Files Created

### Configuration Files
- `.ebextensions/` - Elastic Beanstalk configuration
  - `nodecommand.config` - Node.js configuration
  - `01_packages.config` - System packages
  - `02_nginx.config` - Web server settings
- `.ebignore` - Files to exclude from EB deployment
- `.env.example` - Environment variables template
- `buildspec-backend.yml` - AWS CodeBuild for backend
- `buildspec-frontend.yml` - AWS CodeBuild for frontend
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD

### Backend Updates
- `backend/package.json` - Added AWS SDK dependencies
- `backend/utils/s3-upload.js` - S3 file upload utilities
- `backend/.npmrc` - NPM configuration

### Documentation
- `DEPLOYMENT_GUIDE.md` - Complete step-by-step guide (detailed)
- `deployment/quick-start.md` - Quick 30-minute deployment guide
- `deployment/s3-integration-guide.md` - How to integrate S3 uploads

### Scripts
- `deployment/env-template.txt` - Environment variables for EB
- `deployment/init-db.sql` - Database initialization
- `deployment/export-schema.sh` - Export local database
- `deployment/migrate-to-rds.sh` - Migrate to AWS RDS

---

## 🚀 Two Ways to Deploy

### Option 1: Quick Start (30 minutes)
Follow [`deployment/quick-start.md`](deployment/quick-start.md) for a streamlined deployment.

### Option 2: Complete Guide (1-2 hours)
Follow [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) for comprehensive setup with all features.

---

## 📋 Deployment Checklist

### Phase 1: AWS Setup
- [ ] Install AWS CLI and EB CLI
- [ ] Configure AWS credentials (`aws configure`)
- [ ] Create RDS PostgreSQL database
- [ ] Create S3 buckets (frontend + uploads)

### Phase 2: Backend Deployment
- [ ] Initialize Elastic Beanstalk (`eb init`)
- [ ] Create EB environment (`eb create`)
- [ ] Set environment variables
- [ ] Configure security groups (RDS access)
- [ ] Migrate database to RDS

### Phase 3: Frontend Deployment
- [ ] Build React app
- [ ] Deploy to S3
- [ ] Setup CloudFront (optional but recommended)
- [ ] Configure CORS

### Phase 4: CI/CD Setup
- [ ] Create IAM user for deployments
- [ ] Add GitHub secrets
- [ ] Test automatic deployment

### Phase 5: Production Readiness
- [ ] Setup SSL certificate (ACM)
- [ ] Configure custom domain (Route 53)
- [ ] Enable monitoring (CloudWatch)
- [ ] Setup backups (RDS snapshots)

---

## 🔧 What You Need to Do Next

### 1. Install AWS SDK in Backend (Required for S3)
```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 2. Update Backend File Uploads to Use S3
See [`deployment/s3-integration-guide.md`](deployment/s3-integration-guide.md) for detailed instructions.

**Quick summary:** Replace local file storage with S3 uploads:
```javascript
// Import the helper
const { uploadCustomerImages } = require('./utils/s3-upload');

// In your upload routes, use:
const imageUrls = await uploadCustomerImages(req.files);
```

### 3. Export Your Local Database
```bash
# Windows (PowerShell)
pg_dump -h localhost -U postgres -d postgres --schema-only > deployment/schema.sql
pg_dump -h localhost -U postgres -d postgres --data-only > deployment/data.sql

# Or use the script (Git Bash/WSL)
bash deployment/export-schema.sh
```

### 4. Choose Your Deployment Method

#### Automatic (Recommended):
```bash
# Setup once, then just push to deploy
git add .
git commit -m "Initial deployment setup"
git push origin main
# GitHub Actions will automatically deploy!
```

#### Manual:
```bash
# Backend
eb deploy

# Frontend
cd frontend
npm run build
aws s3 sync build/ s3://your-bucket-name/
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change default database password
- [ ] Set strong JWT_SECRET (min 32 characters)
- [ ] Restrict RDS public access after setup
- [ ] Use HTTPS (CloudFront + ACM certificate)
- [ ] Set up proper CORS (not wildcard `*`)
- [ ] Enable MFA on AWS account
- [ ] Use IAM roles instead of access keys on EC2/EB
- [ ] Enable RDS automatic backups
- [ ] Review and restrict IAM permissions

---

## 💰 Cost Estimate

**Minimal Setup (Free Tier Eligible):**
- RDS db.t3.micro: $0 (free tier) or $15/month
- Elastic Beanstalk t3.small: $15-20/month
- S3 + CloudFront: $5-10/month
- **Total: $20-50/month**

**Production Setup:**
- RDS db.t3.small: $30-40/month
- Elastic Beanstalk t3.small (2 instances): $30-40/month
- S3 + CloudFront: $10-20/month
- **Total: $70-100/month**

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         Users (Web Browsers)                │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        │  CloudFront     │  (CDN)
        │  (HTTPS)        │
        └────────┬────────┘
                 │
        ┌────────┴────────┐
        │                 │
        │  S3 Bucket      │  (React Frontend)
        │  Static Website │
        └─────────────────┘
                 │
                 │ API Calls
                 ▼
        ┌─────────────────────────────┐
        │  Elastic Beanstalk          │
        │  ┌─────────┐  ┌─────────┐  │
        │  │ EC2     │  │ EC2     │  │  (Node.js Backend)
        │  │ Instance│  │ Instance│  │
        │  └─────────┘  └─────────┘  │
        │          │                  │
        │   Load Balancer             │
        └──────────┬──────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌───────▼────────┐
│ RDS PostgreSQL │   │  S3 Bucket     │
│ (Database)     │   │  (File Uploads)│
└────────────────┘   └────────────────┘
```

---

## 🛠️ Useful Commands

### Elastic Beanstalk
```bash
eb status              # Show environment status
eb health              # Show health status
eb logs                # View logs
eb logs --stream       # Real-time logs
eb deploy              # Deploy backend
eb setenv KEY=VALUE    # Set environment variable
eb printenv            # Show all variables
eb ssh                 # SSH into instance
```

### AWS CLI
```bash
# S3
aws s3 ls
aws s3 sync build/ s3://bucket-name/

# RDS
aws rds describe-db-instances
aws rds modify-db-instance --db-instance-identifier NAME --apply-immediately

# CloudFront
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

### Database
```bash
# Connect to RDS
psql -h YOUR_RDS_ENDPOINT -U postgres -d pos_system

# Backup
pg_dump -h RDS_ENDPOINT -U postgres -d pos_system > backup.sql

# Restore
psql -h RDS_ENDPOINT -U postgres -d pos_system -f backup.sql
```

---

## 🐛 Troubleshooting

### Backend Issues
```bash
# View detailed logs
eb logs --all

# Check environment variables
eb printenv

# SSH into instance
eb ssh
# Then check: sudo tail -f /var/log/eb-engine.log
```

### Database Connection Issues
```bash
# Check security groups allow traffic
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Test connection
psql -h RDS_ENDPOINT -U postgres -d pos_system

# If fails, update security group:
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --source-group sg-yyyyy
```

### Frontend Issues
- Clear CloudFront cache after updates
- Check CORS settings in backend
- Verify API URL in `.env.production`

---

## 📚 Documentation Links

- [Complete Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Quick Start Guide](deployment/quick-start.md)
- [S3 Integration Guide](deployment/s3-integration-guide.md)
- [AWS Elastic Beanstalk Docs](https://docs.aws.amazon.com/elasticbeanstalk/)
- [AWS CLI Reference](https://docs.aws.amazon.com/cli/)

---

## ✅ What's Already Configured

✅ Elastic Beanstalk configuration files
✅ GitHub Actions CI/CD workflow
✅ S3 upload utilities for file handling
✅ Database migration scripts
✅ Environment variable templates
✅ NGINX configuration for file uploads
✅ Auto-scaling and load balancing setup
✅ Production-ready package.json

---

## 🎯 Next Steps

1. **Read** [`deployment/quick-start.md`](deployment/quick-start.md)
2. **Run** `npm install` in backend to get AWS SDK
3. **Export** your local database
4. **Follow** the deployment guide step-by-step
5. **Test** your deployed application
6. **Setup** monitoring and backups

---

## 💡 Pro Tips

1. **Start small**: Use free tier instances for testing
2. **Test locally**: Set up S3 environment variables locally before deploying
3. **Monitor costs**: Enable AWS Billing Alerts
4. **Use staging**: Create separate EB environment for testing
5. **Backup first**: Export your database before migrating
6. **Check logs**: Always check EB logs if something fails

---

## 🆘 Need Help?

1. Check [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) troubleshooting section
2. Review AWS CloudWatch logs
3. Check EB environment health dashboard
4. Verify all environment variables are set correctly

---

**You're all set! Your POS System is ready for the cloud! 🚀**

Start with the [Quick Start Guide](deployment/quick-start.md) to deploy in 30 minutes.
