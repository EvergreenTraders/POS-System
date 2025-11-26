# AWS Deployment Guide - POS System
## Elastic Beanstalk + RDS + S3 + CodePipeline

This guide will walk you through deploying your POS System to AWS with automated CI/CD.

---

## Prerequisites

Before starting, ensure you have:
- AWS Account with billing enabled
- AWS CLI installed and configured
- EB CLI installed (`pip install awsebcli`)
- Node.js 18+ installed
- PostgreSQL client (for database setup)
- GitHub repository for your code

---

## Architecture Overview

```
GitHub Repository (your code)
    ↓ (push to main)
GitHub Actions / CodePipeline
    ↓
    ├─→ Frontend → S3 → CloudFront (React app)
    └─→ Backend → Elastic Beanstalk (Node.js API)
              ↓
         RDS PostgreSQL (Database)
         S3 Bucket (File uploads)
```

---

## Step-by-Step Deployment

### **PHASE 1: AWS Account Setup**

#### 1.1 Install AWS CLI
```bash
# Windows
choco install awscli

# Mac
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

#### 1.2 Configure AWS CLI
```bash
aws configure
# Enter:
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region: us-east-1
# Default output format: json
```

#### 1.3 Install Elastic Beanstalk CLI
```bash
pip install awsebcli --upgrade
eb --version
```

---

### **PHASE 2: Create RDS PostgreSQL Database**

#### 2.1 Create RDS Instance via AWS Console

1. Go to **AWS Console** → **RDS** → **Create Database**
2. Choose:
   - **Engine**: PostgreSQL 15.x
   - **Template**: Free tier (or Dev/Test for production)
   - **DB Instance Identifier**: `pos-system-db`
   - **Master username**: `postgres`
   - **Master password**: Choose a strong password (save it!)
   - **DB Instance Class**: `db.t3.micro` (free tier eligible)
   - **Storage**: 20 GB gp2
   - **VPC**: Default VPC
   - **Public access**: Yes (for initial setup, change later)
   - **VPC Security Group**: Create new → `pos-system-db-sg`
   - **Database name**: `pos_system`

3. Click **Create Database** (takes 5-10 minutes)

#### 2.2 Configure Security Group

1. Go to **EC2** → **Security Groups** → Find `pos-system-db-sg`
2. Edit **Inbound Rules**:
   - Add Rule: PostgreSQL (port 5432)
   - Source: Your IP (for testing)
   - Source: Elastic Beanstalk security group (add after creating EB environment)

#### 2.3 Test Connection

```bash
# Replace with your RDS endpoint
psql -h pos-system-db.xxxxxxxxx.us-east-1.rds.amazonaws.com -U postgres -d pos_system

# Or use GUI tool like pgAdmin/DBeaver
```

#### 2.4 Run Database Schema

```bash
# Connect to RDS and run your schema
psql -h YOUR_RDS_ENDPOINT -U postgres -d pos_system -f deployment/init-db.sql
```

---

### **PHASE 3: Create S3 Buckets**

#### 3.1 Create Frontend Bucket

```bash
# Create bucket for frontend
aws s3 mb s3://pos-system-frontend-YOUR-UNIQUE-ID

# Enable static website hosting
aws s3 website s3://pos-system-frontend-YOUR-UNIQUE-ID \
  --index-document index.html \
  --error-document index.html

# Create bucket policy for public read
cat > bucket-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::pos-system-frontend-YOUR-UNIQUE-ID/*"
    }
  ]
}
EOF

aws s3api put-bucket-policy \
  --bucket pos-system-frontend-YOUR-UNIQUE-ID \
  --policy file://bucket-policy.json
```

#### 3.2 Create Uploads Bucket (for images)

```bash
# Create bucket for file uploads
aws s3 mb s3://pos-system-uploads-YOUR-UNIQUE-ID

# Enable CORS
cat > cors.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors \
  --bucket pos-system-uploads-YOUR-UNIQUE-ID \
  --cors-configuration file://cors.json
```

---

### **PHASE 4: Setup Elastic Beanstalk**

#### 4.1 Initialize Elastic Beanstalk

```bash
# From project root
eb init

# Follow prompts:
# - Select region: us-east-1
# - Application name: pos-system
# - Platform: Node.js
# - Platform branch: Node.js 18 running on 64bit Amazon Linux 2023
# - CodeCommit: No
# - SSH: Yes (optional)
```

#### 4.2 Create Environment

```bash
eb create pos-system-prod \
  --instance-type t3.small \
  --envvars \
    NODE_ENV=production,\
    PORT=8080,\
    DB_HOST=YOUR_RDS_ENDPOINT,\
    DB_USER=postgres,\
    DB_PASSWORD=YOUR_DB_PASSWORD,\
    DB_NAME=pos_system,\
    DB_PORT=5432,\
    AWS_REGION=us-east-1,\
    AWS_S3_BUCKET=pos-system-uploads-YOUR-UNIQUE-ID
```

This will:
- Create EC2 instances
- Setup load balancer
- Configure auto-scaling
- Deploy your backend

#### 4.3 Update Security Groups

After creation, update RDS security group to allow Elastic Beanstalk:

```bash
# Get EB security group ID
EB_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*pos-system-prod*" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Get RDS security group ID
RDS_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=*pos-system-db-sg*" \
  --query 'SecurityGroups[0].GroupId' \
  --output text)

# Allow EB to access RDS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SG
```

---

### **PHASE 5: Setup CloudFront (CDN for Frontend)**

#### 5.1 Create CloudFront Distribution

1. Go to **AWS Console** → **CloudFront** → **Create Distribution**
2. Settings:
   - **Origin Domain**: `pos-system-frontend-YOUR-UNIQUE-ID.s3-website-us-east-1.amazonaws.com`
   - **Origin Path**: Leave empty
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP Methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - **Cache Policy**: CachingOptimized
   - **Origin Request Policy**: CORS-CustomOrigin
   - **Default Root Object**: `index.html`

3. **Custom Error Responses** (important for React Router):
   - Add Error Response:
     - HTTP Error Code: 403
     - Customize Error Response: Yes
     - Response Page Path: `/index.html`
     - HTTP Response Code: 200
   - Add Error Response:
     - HTTP Error Code: 404
     - Customize Error Response: Yes
     - Response Page Path: `/index.html`
     - HTTP Response Code: 200

4. Click **Create Distribution** (takes 15-20 minutes)

#### 5.2 Note Your CloudFront URL

After creation, note the **Distribution Domain Name** (e.g., `d1234567890.cloudfront.net`)

---

### **PHASE 6: Configure Backend CORS**

Update your backend's CORS settings to allow CloudFront domain:

1. Get your EB environment URL:
```bash
eb status
# Note the CNAME (e.g., pos-system-prod.us-east-1.elasticbeanstalk.com)
```

2. Set environment variable:
```bash
eb setenv FRONTEND_URL=https://d1234567890.cloudfront.net
```

---

### **PHASE 7: Setup GitHub Actions CI/CD**

#### 7.1 Create IAM User for Deployment

1. Go to **AWS Console** → **IAM** → **Users** → **Add User**
2. User name: `github-actions-deployer`
3. Access type: Programmatic access
4. Permissions: Attach policies:
   - `AWSElasticBeanstalkFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - Create custom policy for specific access (more secure)

5. Save **Access Key ID** and **Secret Access Key**

#### 7.2 Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these secrets:
```
AWS_ACCESS_KEY_ID = [Your IAM user access key]
AWS_SECRET_ACCESS_KEY = [Your IAM user secret key]
AWS_ACCOUNT_ID = [Your 12-digit AWS account ID]
REACT_APP_API_URL = https://pos-system-prod.us-east-1.elasticbeanstalk.com
CLOUDFRONT_DISTRIBUTION_ID = [Your CloudFront distribution ID]
```

#### 7.3 Update GitHub Actions Workflow

The workflow file is already created at `.github/workflows/deploy.yml`

Update these values in the workflow:
- `AWS_REGION`: Your AWS region
- `EB_APPLICATION_NAME`: `pos-system`
- `EB_ENVIRONMENT_NAME`: `pos-system-prod`
- `FRONTEND_S3_BUCKET`: `pos-system-frontend-YOUR-UNIQUE-ID`

---

### **PHASE 8: Deploy**

#### 8.1 Test Local Deployment

```bash
# Deploy backend manually first
cd backend
zip -r ../deploy.zip . -x "node_modules/*"
cd ..
eb deploy

# Build and deploy frontend manually
cd frontend
npm run build
aws s3 sync build/ s3://pos-system-frontend-YOUR-UNIQUE-ID/
```

#### 8.2 Setup Automated Deployment

1. Commit all changes:
```bash
git add .
git commit -m "Add AWS deployment configuration"
git push origin main
```

2. GitHub Actions will automatically:
   - Build frontend and deploy to S3
   - Deploy backend to Elastic Beanstalk
   - Invalidate CloudFront cache

3. Monitor deployment:
   - GitHub: **Actions** tab
   - AWS: Elastic Beanstalk console

---

### **PHASE 9: Update Frontend API URL**

Create `.env.production` in frontend folder:

```bash
REACT_APP_API_URL=https://pos-system-prod.us-east-1.elasticbeanstalk.com
```

Or update your GitHub Actions workflow to set this during build.

---

### **PHASE 10: SSL Certificate (Optional but Recommended)**

#### 10.1 Request Certificate in ACM

1. Go to **AWS Certificate Manager** (in `us-east-1` for CloudFront)
2. Request public certificate
3. Domain name: `yourapp.com` and `*.yourapp.com`
4. Validation: DNS validation
5. Add CNAME records to your domain's DNS

#### 10.2 Attach to CloudFront

1. Edit CloudFront distribution
2. **Alternate Domain Names (CNAMEs)**: Add your domain
3. **Custom SSL Certificate**: Select your ACM certificate
4. Save changes

#### 10.3 Update DNS

Point your domain to CloudFront:
- Type: CNAME
- Name: www
- Value: d1234567890.cloudfront.net

---

## Testing Your Deployment

### Test Backend
```bash
curl https://pos-system-prod.us-east-1.elasticbeanstalk.com/health
```

### Test Frontend
Visit: `https://d1234567890.cloudfront.net`

### Test Database Connection
```bash
eb ssh
# Inside EC2 instance
psql -h YOUR_RDS_ENDPOINT -U postgres -d pos_system
```

---

## Monitoring and Logs

### View Backend Logs
```bash
eb logs
# Or real-time
eb logs --stream
```

### View in AWS Console
- **Elastic Beanstalk** → Environment → Logs
- **CloudWatch** → Logs → Log Groups → `/aws/elasticbeanstalk/pos-system-prod/`

### Monitor Health
```bash
eb health
```

---

## Updating Your Application

### Automatic (Recommended)
Just push to main branch:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

GitHub Actions will automatically deploy.

### Manual Backend Update
```bash
eb deploy
```

### Manual Frontend Update
```bash
cd frontend
npm run build
aws s3 sync build/ s3://pos-system-frontend-YOUR-UNIQUE-ID/
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

---

## Cost Estimation

**Monthly costs (approximate):**
- Elastic Beanstalk (t3.small): $15-20
- RDS PostgreSQL (db.t3.micro): $15-20
- S3 Storage: $1-5
- CloudFront: $1-5
- Data Transfer: $5-10
- **Total: ~$40-60/month**

**Free tier eligible (first 12 months):**
- 750 hours EC2 (t2.micro/t3.micro)
- 750 hours RDS (db.t2.micro)
- 5GB S3 storage

---

## Troubleshooting

### Backend won't start
```bash
eb logs
# Check for errors in eb-engine.log
```

### Database connection failed
- Check RDS security group allows EB security group
- Verify environment variables: `eb printenv`
- Test connection: `eb ssh` then `psql -h ...`

### Frontend shows API errors
- Check CORS settings in backend
- Verify `REACT_APP_API_URL` is correct
- Check CloudFront distribution is deployed

### Deployment fails
- Check GitHub Actions logs
- Verify AWS credentials in GitHub secrets
- Check IAM permissions

---

## Security Checklist

- [ ] Change RDS password from default
- [ ] Set strong JWT_SECRET
- [ ] Restrict RDS public access after setup
- [ ] Enable MFA on AWS account
- [ ] Use least-privilege IAM policies
- [ ] Enable CloudTrail for audit logs
- [ ] Enable automatic RDS backups
- [ ] Use environment variables for secrets (not .env files)
- [ ] Enable HTTPS only (CloudFront + ACM certificate)
- [ ] Implement rate limiting on API
- [ ] Set up CloudWatch alarms

---

## Next Steps

1. **Custom Domain**: Configure Route 53 and ACM certificate
2. **Monitoring**: Setup CloudWatch alarms for errors, CPU, memory
3. **Backups**: Configure RDS automated backups and snapshots
4. **Staging Environment**: Create `pos-system-staging` environment
5. **CDN Optimization**: Configure CloudFront caching strategies
6. **Security**: Enable AWS WAF for protection against attacks
7. **Scaling**: Configure auto-scaling policies based on traffic

---

## Useful Commands

```bash
# EB Commands
eb status                    # Show environment status
eb health                    # Show health status
eb logs                      # Download logs
eb logs --stream            # Stream logs in real-time
eb deploy                    # Deploy backend
eb setenv KEY=VALUE         # Set environment variable
eb printenv                  # Show all environment variables
eb ssh                       # SSH into EC2 instance
eb terminate                 # Terminate environment

# AWS CLI Commands
aws s3 ls                    # List S3 buckets
aws rds describe-db-instances  # List RDS instances
aws elasticbeanstalk describe-environments  # List EB environments
aws cloudfront list-distributions  # List CloudFront distributions

# Frontend Deployment
npm run build                # Build React app
aws s3 sync build/ s3://BUCKET/  # Upload to S3
aws cloudfront create-invalidation --distribution-id ID --paths "/*"  # Clear cache
```

---

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/elasticbeanstalk/
- **EB CLI Guide**: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html
- **Pricing Calculator**: https://calculator.aws/
- **AWS Support**: https://console.aws.amazon.com/support/

---

## Configuration Files Created

- `.ebextensions/` - Elastic Beanstalk configuration
- `.ebignore` - Files to exclude from EB deployment
- `buildspec-backend.yml` - CodeBuild spec for backend
- `buildspec-frontend.yml` - CodeBuild spec for frontend
- `.github/workflows/deploy.yml` - GitHub Actions CI/CD
- `.env.example` - Environment variables template
- `deployment/env-template.txt` - EB environment variables
- `deployment/init-db.sql` - Database initialization script
- `backend/utils/s3-upload.js` - S3 file upload utility

---

**Your POS System is now ready for production deployment! 🚀**
