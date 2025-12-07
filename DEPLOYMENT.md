# Automated Deployment Guide

This document explains how to set up and use automated deployment for the POS System using GitHub Actions.

## Overview

The deployment workflow automatically deploys:
1. **Backend** → AWS Elastic Beanstalk
2. **Database Migrations** → RDS PostgreSQL via migration API
3. **Frontend** → AWS S3 Static Website

## Prerequisites

1. AWS Account with Elastic Beanstalk, RDS, and S3 configured
2. GitHub repository
3. AWS IAM user with appropriate permissions

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

### Go to: Settings → Secrets and variables → Actions → New repository secret

1. **`AWS_ACCESS_KEY_ID`**
   - Your AWS IAM access key ID
   - Example: `AKIAIOSFODNN7EXAMPLE`

2. **`AWS_SECRET_ACCESS_KEY`**
   - Your AWS IAM secret access key
   - Example: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

3. **`AWS_ACCOUNT_ID`**
   - Your 12-digit AWS account ID
   - Find it: AWS Console → Account menu (top right) → Account
   - Example: `123456789012`

### How to Get AWS Credentials

If you don't have an IAM user for deployment:

```bash
# Create IAM user for GitHub Actions
aws iam create-user --user-name github-actions-deployer

# Attach necessary policies
aws iam attach-user-policy --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess-AWSElasticBeanstalk

aws iam attach-user-policy --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Create access keys
aws iam create-access-key --user-name github-actions-deployer
```

Save the `AccessKeyId` and `SecretAccessKey` from the output.

## Deployment Methods

### Method 1: Manual Deployment via GitHub UI (Recommended)

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Deploy to AWS** workflow
4. Click **Run workflow** button (green button on the right)
5. Choose:
   - **Run migrations**: true or false
6. Click **Run workflow**

The workflow will deploy:
- ✅ Backend to Elastic Beanstalk
- ✅ Database migrations to RDS (if selected)
- ✅ Frontend to S3

### Method 2: Manual Deployment via GitHub CLI

```bash
# Install GitHub CLI if not installed
# https://cli.github.com/

# Trigger deployment with migrations
gh workflow run deploy.yml -f run_migrations=true

# Trigger deployment without migrations
gh workflow run deploy.yml -f run_migrations=false
```

## Workflow Steps

The deployment happens in 3 jobs:

### 1. Deploy Backend (Always Runs)
- Checks out code
- Installs Node.js dependencies
- Creates deployment ZIP package
- Uploads to S3
- Creates new Elastic Beanstalk version
- Deploys to EB environment
- Waits for deployment to complete

### 2. Run Database Migrations (Conditional)
- Runs only if you select `run_migrations=true` when clicking "Run workflow"
- Waits for backend to be healthy
- Calls migration API endpoint
- Executes all SQL migrations in order
- Reports success/failure

### 3. Deploy Frontend (Always Runs)
- Checks out code
- Installs Node.js dependencies
- Builds React production bundle
- Syncs build files to S3 bucket
- Outputs deployment URLs

## Monitoring Deployments

### GitHub Actions UI
1. Go to **Actions** tab in GitHub
2. Click on the running workflow
3. View real-time logs for each job
4. Check for errors or warnings

### AWS Elastic Beanstalk
1. Go to AWS Console → Elastic Beanstalk
2. Select `pos-system-prod` environment
3. View deployment events and logs
4. Check environment health

### AWS S3
1. Go to AWS Console → S3
2. Select `pos-system-frontend` bucket
3. Verify files are updated
4. Check bucket properties for website hosting

## Troubleshooting

### Deployment Fails: "Version already exists"
This is normal and expected. The workflow will skip version creation and continue.

### Backend Health Check Fails
```bash
# Check backend health manually
curl http://pos-system-prod.eba-3fkkan5u.ca-central-1.elasticbeanstalk.com/api/health
```

If it returns an error:
- Check Elastic Beanstalk logs in AWS Console
- Verify environment variables are set correctly
- Check RDS security group allows EB to connect

### Migration Fails
```bash
# Test migration API manually
curl -X POST http://pos-system-prod.eba-3fkkan5u.ca-central-1.elasticbeanstalk.com/api/migrate \
  -H "X-Migration-Key: pos-system-migration-secret-2024" \
  -H "Content-Type: application/json"
```

Check:
- Migration key is correct
- RDS database is accessible
- SQL files have no syntax errors
- Database connection environment variables are set

### Frontend Not Updating
```bash
# Check S3 bucket
aws s3 ls s3://pos-system-frontend/

# Verify website configuration
aws s3api get-bucket-website --bucket pos-system-frontend
```

Hard refresh browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

## Current Configuration

- **AWS Region**: ca-central-1 (Canada Central)
- **EB Application**: pos-system
- **EB Environment**: pos-system-prod
- **S3 Bucket**: pos-system-frontend
- **Node Version**: 20
- **Backend URL**: http://pos-system-prod.eba-3fkkan5u.ca-central-1.elasticbeanstalk.com
- **Frontend URL**: http://pos-system-frontend.s3-website.ca-central-1.amazonaws.com

## Security Notes

1. **Never commit secrets** to the repository
2. Migration key is hardcoded in the workflow (change if needed for security)
3. Use environment-specific secrets for staging/production
4. Review AWS IAM permissions regularly
5. Enable MFA on AWS accounts
6. Rotate access keys every 90 days

## Advanced: Customizing the Workflow

### Change Node Version
Edit `.github/workflows/deploy.yml`:
```yaml
env:
  NODE_VERSION: '20'  # Change to desired version
```

### Add Staging Environment
Edit `.github/workflows/deploy.yml`:
```yaml
env:
  EB_ENVIRONMENT_NAME: ${{ github.event.inputs.environment == 'staging' && 'pos-system-staging' || 'pos-system-prod' }}
  FRONTEND_S3_BUCKET: ${{ github.event.inputs.environment == 'staging' && 'pos-system-frontend-staging' || 'pos-system-frontend' }}
```

### Always Run Migrations
To always run migrations without prompting, edit `.github/workflows/deploy.yml` line 97:
```yaml
if: ${{ github.event.inputs.run_migrations == 'true' }}
```

Change to:
```yaml
if: true
```

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Check AWS CloudWatch logs
3. Review this guide's troubleshooting section
4. Check AWS service health dashboard
