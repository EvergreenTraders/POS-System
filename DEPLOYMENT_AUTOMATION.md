# Automated Deployment Guide - POS System

This guide explains how to use the automated GitHub Actions deployment workflow for your POS System.

---

## Deployment Options

You have **3 ways** to deploy your application:

### Option 1: Manual Deployment (Recommended)
Deploy anytime you want by clicking a button in GitHub.

### Option 2: Deploy Branch
Automatically deploy when you merge to the `deploy` branch.

### Option 3: Auto-deploy on Main (Disabled by default)
Automatically deploy every time you merge to `main`.

---

## Setup Requirements

### 1. GitHub Secrets Configuration

You need to configure these secrets in your GitHub repository:

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following:

| Secret Name | Description | Example/How to Get |
|------------|-------------|-------------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key | From AWS IAM console |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | From AWS IAM console |
| `AWS_ACCOUNT_ID` | Your AWS account ID | 12-digit number from AWS console |
| `REACT_APP_API_URL` | Your backend API URL | `http://your-eb-env.elasticbeanstalk.com` |
| `CLOUDFRONT_DISTRIBUTION_ID` | (Optional) CloudFront distribution ID | Only if using CloudFront |

#### How to Get AWS Credentials:

1. Log in to AWS Console
2. Go to **IAM** → **Users** → Create new user (e.g., `github-deployer`)
3. Attach policies:
   - `AWSElasticBeanstalkFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess` (if using CloudFront)
4. Go to **Security credentials** → **Create access key**
5. Choose **Application running outside AWS**
6. Copy the Access Key ID and Secret Access Key

#### How to Get AWS Account ID:

1. Click your username in top-right of AWS Console
2. Your 12-digit Account ID is displayed

---

## Deployment Methods

### Method 1: Manual Deployment (Click to Deploy)

**When to use:** When you want full control over when to deploy.

**Steps:**

1. Go to your GitHub repository
2. Click **Actions** tab
3. Click **Deploy to AWS** workflow on the left
4. Click **Run workflow** button (top right)
5. Select branch (usually `main`)
6. Select environment (`production` or `staging`)
7. Click **Run workflow**

The deployment will start and you can watch the progress in real-time.

**Pros:**
- Full control over deployment timing
- Can review and test before deploying
- Can choose specific branches to deploy

**Cons:**
- Requires manual action each time

---

### Method 2: Deploy Branch (Semi-Automatic)

**When to use:** When you want to deploy after reviewing multiple changes.

**Steps:**

1. Work on your features in feature branches
2. Merge multiple PRs into `main` branch
3. When ready to deploy, create a PR from `main` to `deploy` branch
4. Review the changes in the PR
5. Merge the PR → Deployment starts automatically

**Setup the deploy branch (one-time):**

```bash
# Create deploy branch from main
git checkout main
git pull origin main
git checkout -b deploy
git push origin deploy

# Protect the deploy branch (recommended)
# Go to GitHub → Settings → Branches → Add rule for 'deploy'
# Enable: Require pull request reviews before merging
```

**Workflow:**

```
Feature Branch → Main Branch → Deploy Branch (auto-deploys)
     ↓              ↓                ↓
  (develop)    (staging/review)  (production)
```

**Pros:**
- Batch multiple changes before deploying
- Review changes in PR before deployment
- Clear separation between code merges and deployments
- Deployment history is visible in deploy branch

**Cons:**
- Requires managing an additional branch
- Need to keep deploy branch in sync

---

### Method 3: Auto-deploy on Main (Not Recommended for Production)

**When to use:** For development/staging environments only.

**Setup:**

Edit `.github/workflows/deploy.yml` and uncomment line 21:

```yaml
on:
  push:
    branches:
      - deploy
      - main  # Uncomment this line
```

**Pros:**
- Zero manual steps
- Immediate deployment after merge

**Cons:**
- Every merge to main triggers deployment
- No chance to batch changes
- Can cause frequent deployments
- Higher AWS costs due to more deployments

---

## What Gets Deployed

The workflow deploys both frontend and backend in parallel:

### Backend Deployment (Elastic Beanstalk)
1. Installs backend dependencies
2. Creates deployment package (zip)
3. Uploads to S3
4. Creates new EB application version
5. Updates EB environment
6. Waits for deployment to complete

### Frontend Deployment (S3)
1. Installs frontend dependencies
2. Builds React app (`npm run build`)
3. Syncs build folder to S3 bucket
4. (Optional) Invalidates CloudFront cache

---

## Monitoring Deployment

### During Deployment:

1. Go to **Actions** tab in GitHub
2. Click on the running workflow
3. Watch real-time logs for both jobs:
   - `Deploy Backend to Elastic Beanstalk`
   - `Deploy Frontend to S3`

### After Deployment:

**Backend (Elastic Beanstalk):**
- AWS Console → Elastic Beanstalk → Your environment
- Check "Health" status (should be green)
- View logs if needed

**Frontend (S3):**
- Visit your S3 website URL: `http://pos-system-frontend.s3-website.ca-central-1.amazonaws.com/`
- Check if new changes are visible

---

## Troubleshooting

### Deployment Fails with AWS Credentials Error

**Problem:** `Error: Credentials could not be loaded`

**Solution:**
1. Verify secrets are set in GitHub: Settings → Secrets → Actions
2. Check secret names match exactly (case-sensitive)
3. Verify AWS credentials are still valid in IAM

---

### Backend Deployment Succeeds but Environment Unhealthy

**Problem:** EB environment shows "Severe" or "Degraded" health

**Solution:**
1. Check EB logs: AWS Console → EB → Logs → Request Logs
2. Common issues:
   - Database connection failed (check RDS security group)
   - Missing environment variables (check EB environment configuration)
   - Node.js version mismatch

---

### Frontend Deployed but Shows Old Version

**Problem:** S3 updated but browser shows old version

**Solution:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. If using CloudFront: Wait for cache invalidation to complete (~5 mins)
3. Check S3 bucket contents: AWS Console → S3 → pos-system-frontend

---

### Build Fails During Frontend Build

**Problem:** `npm run build` fails in GitHub Actions

**Solution:**
1. Check the error in Actions logs
2. Common issues:
   - Missing `REACT_APP_API_URL` secret
   - Build warnings treated as errors (set `CI=false` in build step)
   - Dependencies not compatible

---

## Recommended Workflow

For production deployments, we recommend this workflow:

1. **Development:**
   - Create feature branches from `main`
   - Develop and test locally
   - Create PR to merge into `main`

2. **Review:**
   - Review PR
   - Run tests
   - Merge PR into `main`

3. **Batch Changes:**
   - Accumulate several merged PRs in `main`
   - Test `main` branch thoroughly

4. **Deploy:**
   - **Option A (Manual):** Use "Run workflow" button in GitHub Actions
   - **Option B (Deploy Branch):** Create PR from `main` to `deploy`, review, and merge

5. **Verify:**
   - Check deployment logs in GitHub Actions
   - Test the live application
   - Monitor EB environment health

---

## Deployment Checklist

Before deploying, ensure:

- [ ] All GitHub secrets are configured
- [ ] RDS database is running and accessible
- [ ] S3 bucket exists and is configured for static website hosting
- [ ] Elastic Beanstalk environment is healthy
- [ ] Latest code is merged to the branch you want to deploy
- [ ] Local tests pass
- [ ] Database migrations are compatible (if any schema changes)

After deploying, verify:

- [ ] GitHub Actions workflow completes successfully
- [ ] EB environment health is "OK" (green)
- [ ] Frontend loads at S3 URL
- [ ] Backend API responds (check health endpoint)
- [ ] Database connections work
- [ ] Authentication works
- [ ] File uploads work (if applicable)

---

## Cost Optimization

Minimize deployment costs:

1. **Use Manual Deployment:** Deploy only when necessary, not on every merge
2. **Batch Changes:** Accumulate multiple changes before deploying
3. **Delete Old Versions:** EB keeps old application versions → Clean up periodically
4. **Use Deploy Branch:** Better control over when deployments happen

**Estimated Costs per Deployment:**
- GitHub Actions: Free (2,000 minutes/month for public repos)
- S3 Data Transfer: ~$0.01-0.05 per deployment
- EB Deployment: Free (just uses existing EC2)

---

## Advanced Configuration

### Deploy to Multiple Environments

Modify workflow to support staging and production:

```yaml
env:
  AWS_REGION: ca-central-1
  EB_APPLICATION_NAME: pos-system
  EB_ENVIRONMENT_NAME: ${{ github.event.inputs.environment == 'staging' && 'pos-system-staging' || 'pos-system-prod' }}
  FRONTEND_S3_BUCKET: ${{ github.event.inputs.environment == 'staging' && 'pos-system-frontend-staging' || 'pos-system-frontend' }}
```

### Add Deployment Notifications

Add Slack/Discord notifications on deployment success/failure:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Run Tests Before Deployment

Add a test job that must pass before deployment:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install && npm test

  deploy-backend:
    needs: test  # Only deploy if tests pass
    # ... rest of deployment
```

---

## Support

If you encounter issues:

1. Check GitHub Actions logs for detailed error messages
2. Review AWS CloudWatch logs for runtime errors
3. Check this guide's troubleshooting section
4. Verify all secrets and environment variables are set correctly

---

## Summary

**Recommended for Production:**
- Use **Manual Deployment** (Method 1) for full control
- Or use **Deploy Branch** (Method 2) for semi-automatic deployment with review

**Current Configuration:**
- ✅ Manual deployment enabled (workflow_dispatch)
- ✅ Deploy branch auto-deployment enabled
- ❌ Main branch auto-deployment disabled (uncomment to enable)

**Next Steps:**
1. Configure GitHub secrets (if not already done)
2. Test manual deployment with "Run workflow"
3. Create `deploy` branch if using Method 2
4. Set up branch protection rules for `deploy` branch
