# Quick Start Guide - Deploy to AWS in 30 Minutes

This is a simplified guide to get your POS System running on AWS quickly.

## Prerequisites
- AWS Account
- AWS CLI installed: `pip install awscli awsebcli`
- Your code pushed to GitHub

---

## Step 1: Configure AWS CLI (5 minutes)

```bash
aws configure
# Enter your AWS credentials
```

---

## Step 2: Create RDS Database (10 minutes)

```bash
# Create database (this takes ~5-10 minutes)
aws rds create-db-instance \
  --db-instance-identifier pos-system-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --db-name pos_system \
  --publicly-accessible \
  --backup-retention-period 7 \
  --region us-east-1

# Wait for it to be available
aws rds wait db-instance-available --db-instance-identifier pos-system-db

# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier pos-system-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
# Save this endpoint!
```

---

## Step 3: Create S3 Buckets (2 minutes)

```bash
# Replace YOUR-UNIQUE-ID with something unique (e.g., your name or random string)
UNIQUE_ID="yourname123"

# Frontend bucket
aws s3 mb s3://pos-system-frontend-$UNIQUE_ID
aws s3 website s3://pos-system-frontend-$UNIQUE_ID \
  --index-document index.html \
  --error-document index.html

# Uploads bucket
aws s3 mb s3://pos-system-uploads-$UNIQUE_ID

# Make frontend bucket public
aws s3api put-bucket-policy \
  --bucket pos-system-frontend-$UNIQUE_ID \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Principal\": \"*\",
      \"Action\": \"s3:GetObject\",
      \"Resource\": \"arn:aws:s3:::pos-system-frontend-$UNIQUE_ID/*\"
    }]
  }"
```

---

## Step 4: Deploy Backend with Elastic Beanstalk (8 minutes)

```bash
# From your project root
cd c:\Users\User\Downloads\POS-System

# Initialize EB
eb init -p node.js-18 -r us-east-1 pos-system

# Create environment with your RDS endpoint
eb create pos-system-prod \
  --instance-type t3.small \
  --envvars \
    NODE_ENV=production,\
    PORT=8080,\
    DB_HOST=YOUR_RDS_ENDPOINT_HERE,\
    DB_USER=postgres,\
    DB_PASSWORD=YourSecurePassword123!,\
    DB_NAME=pos_system,\
    DB_PORT=5432,\
    AWS_REGION=us-east-1,\
    AWS_S3_BUCKET=pos-system-uploads-$UNIQUE_ID

# This takes 5-7 minutes
# Get your backend URL
eb status
# Note the CNAME (e.g., pos-system-prod.us-east-1.elasticbeanstalk.com)
```

---

## Step 5: Migrate Database (3 minutes)

```bash
# Export your local database
pg_dump -h localhost -U postgres -d postgres --schema-only > schema.sql
pg_dump -h localhost -U postgres -d postgres --data-only > data.sql

# Import to RDS (use the endpoint from Step 2)
psql -h YOUR_RDS_ENDPOINT -U postgres -d pos_system -f schema.sql
psql -h YOUR_RDS_ENDPOINT -U postgres -d pos_system -f data.sql
```

---

## Step 6: Deploy Frontend (2 minutes)

```bash
cd frontend

# Create .env.production with your backend URL from Step 4
echo "REACT_APP_API_URL=https://YOUR_EB_CNAME_HERE" > .env.production

# Build and deploy
npm run build
aws s3 sync build/ s3://pos-system-frontend-$UNIQUE_ID/

# Get your frontend URL
echo "Frontend URL: http://pos-system-frontend-$UNIQUE_ID.s3-website-us-east-1.amazonaws.com"
```

---

## Step 7: Update CORS (1 minute)

```bash
# Update backend to allow frontend domain
eb setenv FRONTEND_URL=http://pos-system-frontend-$UNIQUE_ID.s3-website-us-east-1.amazonaws.com
```

---

## Step 8: Setup Auto-Deploy with GitHub Actions (Optional)

1. Create IAM user:
```bash
aws iam create-user --user-name github-deployer
aws iam attach-user-policy --user-name github-deployer --policy-arn arn:aws:iam::aws:policy/AWSElasticBeanstalkFullAccess
aws iam attach-user-policy --user-name github-deployer --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
aws iam create-access-key --user-name github-deployer
# Save the AccessKeyId and SecretAccessKey
```

2. Add to GitHub Secrets:
   - Go to repo → Settings → Secrets → New secret
   - Add: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ACCOUNT_ID`
   - Add: `REACT_APP_API_URL` (your EB URL)

3. Push to main branch to trigger auto-deploy!

---

## You're Done! 🎉

**Access your application:**
- Frontend: `http://pos-system-frontend-$UNIQUE_ID.s3-website-us-east-1.amazonaws.com`
- Backend: `https://pos-system-prod.us-east-1.elasticbeanstalk.com`

**View logs:**
```bash
eb logs
```

**Monitor health:**
```bash
eb health
```

**Redeploy backend:**
```bash
eb deploy
```

---

## Next Steps

1. **Add CloudFront** for HTTPS and better performance
2. **Add custom domain** with Route 53
3. **Enable automatic backups** for RDS
4. **Setup monitoring** with CloudWatch alarms

See `DEPLOYMENT_GUIDE.md` for detailed instructions on these advanced features.

---

## Monthly Cost Estimate
- Elastic Beanstalk (t3.small): ~$15-20
- RDS (db.t3.micro): ~$15-20
- S3 + Transfer: ~$5-10
- **Total: ~$35-50/month**

(Free tier eligible for first 12 months: ~$0-10/month)

---

## Troubleshooting

**Backend won't start:**
```bash
eb logs
# Look for errors
```

**Can't connect to database:**
```bash
# Check security group
RDS_SG=$(aws rds describe-db-instances --db-instance-identifier pos-system-db --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' --output text)
EB_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=*pos-system-prod*" --query 'SecurityGroups[0].GroupId' --output text)

# Allow EB to access RDS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $EB_SG
```

**Frontend shows API errors:**
- Check CORS: `eb printenv` and verify FRONTEND_URL is set
- Check backend URL in frontend `.env.production`

---

## Clean Up (Delete Everything)

```bash
# Delete EB environment
eb terminate pos-system-prod

# Delete RDS
aws rds delete-db-instance --db-instance-identifier pos-system-db --skip-final-snapshot

# Delete S3 buckets
aws s3 rb s3://pos-system-frontend-$UNIQUE_ID --force
aws s3 rb s3://pos-system-uploads-$UNIQUE_ID --force
```
