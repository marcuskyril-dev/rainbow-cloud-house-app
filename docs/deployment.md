# Deployment Guide

This guide covers deploying the Rainbow Cloud House Wishlist app using AWS CDK for backend infrastructure and AWS Amplify for frontend hosting.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| AWS CLI | v2+ | `brew install awscli` |
| AWS CDK | v2.180+ | installed as project devDependency in `infra/cdk` |
| Node.js | 20+ | `brew install node@20` |
| npm | 10+ | Bundled with Node.js |

You also need an AWS account with permissions to create Lambda, API Gateway, DynamoDB, S3, Cognito, and IAM resources.

---

## IAM Deploy Identity (Recommended)

Avoid using root credentials for deployments. Create a dedicated IAM user:

```bash
aws iam create-user --user-name wishlist-deployer
aws iam attach-user-policy \
  --user-name wishlist-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
aws iam create-access-key --user-name wishlist-deployer
```

Configure a named profile:

```bash
aws configure --profile wishlist-deploy
# Enter the access key, secret key, and region (ap-southeast-1)
```

Validate:

```bash
aws sts get-caller-identity --profile wishlist-deploy
```

All CDK and seed commands below assume `--profile wishlist-deploy`.

---

## AWS Account Setup

1. **Configure AWS CLI credentials:**

   ```bash
   aws configure --profile wishlist-deploy
   # Enter your Access Key ID, Secret Access Key, region (e.g. ap-southeast-1)
   ```

2. **Set default profile** (optional):

   ```bash
   export AWS_PROFILE=wishlist-deploy
   ```

---

## Local Development

### DynamoDB Local

1. **Start DynamoDB Local:**

   ```bash
   docker run -d -p 8000:8000 amazon/dynamodb-local
   ```

2. **Create tables locally:**

   ```bash
   aws dynamodb create-table \
     --table-name WishlistApp \
     --attribute-definitions \
       AttributeName=PK,AttributeType=S \
       AttributeName=SK,AttributeType=S \
       AttributeName=GSI1PK,AttributeType=S \
       AttributeName=GSI1SK,AttributeType=S \
     --key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
     --global-secondary-indexes \
       '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
     --billing-mode PAY_PER_REQUEST \
     --endpoint-url http://localhost:8000

   aws dynamodb create-table \
     --table-name WishlistItems \
     --attribute-definitions \
       AttributeName=id,AttributeType=S \
       AttributeName=GSI1PK,AttributeType=S \
       AttributeName=GSI1SK,AttributeType=S \
     --key-schema AttributeName=id,KeyType=HASH \
     --global-secondary-indexes \
       '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
     --billing-mode PAY_PER_REQUEST \
     --endpoint-url http://localhost:8000

   aws dynamodb create-table \
     --table-name WishlistContributions \
     --attribute-definitions \
       AttributeName=itemId,AttributeType=S \
       AttributeName=SK,AttributeType=S \
     --key-schema AttributeName=itemId,KeyType=HASH AttributeName=SK,KeyType=RANGE \
     --billing-mode PAY_PER_REQUEST \
     --endpoint-url http://localhost:8000

   aws dynamodb create-table \
     --table-name IdempotencyKeys \
     --attribute-definitions AttributeName=PK,AttributeType=S \
     --key-schema AttributeName=PK,KeyType=HASH \
     --billing-mode PAY_PER_REQUEST \
     --endpoint-url http://localhost:8000
   ```

3. **Seed data:**

   ```bash
   cd infra/lambda
   npm install
   npm run build
   AWS_ENDPOINT=http://localhost:8000 npx tsx src/seed.ts
   ```

---

## One-off migrations

### Split DynamoDB tables (items + contributions)

This migrates data from the legacy single-table design (`WishlistApp-*`) into the new
split tables (`WishlistItems-*` and `WishlistContributions-*`) and deletes legacy
reservation records (`RES#...`) from the old table.

```bash
cd infra/lambda
npm install

# Optional for DynamoDB Local:
# export AWS_ENDPOINT=http://localhost:8000

WISHLIST_TABLE="WishlistApp-<stage>" \
ITEMS_TABLE="WishlistItems-<stage>" \
CONTRIBUTIONS_TABLE="WishlistContributions-<stage>" \
npx tsx src/migrations/splitDynamoTables.ts
```

### Environment Variables

Create a `.env` file in the project root for local frontend development:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=ap-southeast-1
```

### Run Frontend Locally

```bash
npm install
npm run dev
```

---

## Backend Deployment (CDK)

### CDK Stacks

The infrastructure is defined in `infra/cdk/` as four stacks:

| Stack | Resources |
|-------|-----------|
| `Wishlist-Data-{stage}` | DynamoDB tables (WishlistApp, WishlistItems, WishlistContributions, IdempotencyKeys) with GSI and TTL |
| `Wishlist-Auth-{stage}` | Cognito User Pool, App Client, admin group |
| `Wishlist-Storage-{stage}` | S3 images bucket with CORS |
| `Wishlist-Api-{stage}` | API Gateway REST API, 6 Lambda functions, Cognito authorizer |

### 1. Build Lambda functions

```bash
cd infra/lambda
npm ci
npm run build
```

### 2. Bootstrap CDK (first time only)

```bash
cd infra/cdk
npm ci
npx cdk bootstrap aws://ACCOUNT_ID/REGION --profile wishlist-deploy
```

### 3. Synthesize (validate)

```bash
cd infra/cdk
npx cdk synth --profile wishlist-deploy
```

### 4. Deploy

```bash
cd infra/cdk

# Deploy all stacks
npx cdk deploy --all --profile wishlist-deploy --require-approval never

# Deploy a specific stack
npx cdk deploy Wishlist-Api-dev --profile wishlist-deploy

# Deploy to a different stage
npx cdk deploy --all --profile wishlist-deploy -c stage=prod
```

### 5. View stack diff before deploy

```bash
npx cdk diff --profile wishlist-deploy
```

### 6. Destroy stacks

```bash
npx cdk destroy --all --profile wishlist-deploy
```

### 7. Note the outputs

After deployment, CDK outputs:

| Output | Description |
|--------|-------------|
| `ApiUrl` | API Gateway base URL |
| `UserPoolId` | Cognito User Pool ID |
| `UserPoolClientId` | Cognito App Client ID |
| `ImagesBucketName` | S3 images bucket name |
| `WishlistTableName` | Main DynamoDB table name |

---

## Frontend Deployment (Amplify)

### 1. Create Amplify App

```bash
aws amplify create-app \
  --name rainbow-cloud-house-wishlist \
  --repository https://github.com/your-org/rainbow-cloud-house-wishlist \
  --platform WEB
```

### 2. Connect Branch

```bash
aws amplify create-branch \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --stage PRODUCTION

aws amplify create-branch \
  --app-id YOUR_APP_ID \
  --branch-name develop \
  --stage DEVELOPMENT
```

### 3. Amplify Build Settings

Create `amplify.yml` in the project root:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - "**/*"
  cache:
    paths:
      - node_modules/**/*
```

### 4. Environment Variables in Amplify

Set these in the Amplify console (App settings → Environment variables):

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | API Gateway URL | `https://abc123.execute-api.ap-southeast-1.amazonaws.com/dev` |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID | `ap-southeast-1_AbCdEfGhI` |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID | `1a2b3c4d5e6f7g8h9i0j` |
| `VITE_COGNITO_REGION` | AWS Region | `ap-southeast-1` |

---

## CI/CD: Branch-Based Deployments

With Amplify branch-based deployments:

| Branch | Stage | CDK Stacks | API URL |
|--------|-------|------------|---------|
| `main` | Production | `Wishlist-*-prod` | `https://…/prod` |
| `develop` | Development | `Wishlist-*-dev` | `https://…/dev` |

Each branch gets its own subdomain (e.g., `develop.d1234567.amplifyapp.com`).

### Recommended Workflow

1. Develop on feature branches
2. PR → `develop` (auto-deploys frontend to dev)
3. PR → `main` (auto-deploys frontend to prod)

Backend deployments (CDK) are run separately — either manually or via a CI pipeline (GitHub Actions, etc.).

---

## Seed Data

To populate your deployed DynamoDB tables with sample data:

```bash
cd infra/lambda
npm ci && npm run build

AWS_PROFILE=wishlist-deploy \
AWS_REGION=ap-southeast-1 \
WISHLIST_TABLE=WishlistApp-dev \
NAME_LOCKS_TABLE=ReservationNameLocks-dev \
npx tsx src/seed.ts
```

This inserts 12 sample wishlist items with reservations, partial contributions, and a fully funded item.

---

## Cognito Admin User Setup

Create the initial admin user for the dashboard:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com Name=email_verified,Value=true \
  --temporary-password TempPass123! \
  --profile wishlist-deploy \
  --region ap-southeast-1

aws cognito-idp admin-set-user-password \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --password YourSecurePassword123! \
  --permanent \
  --profile wishlist-deploy \
  --region ap-southeast-1

aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username admin@example.com \
  --group-name admin \
  --profile wishlist-deploy \
  --region ap-southeast-1
```

---

## Dev Stack Reference (Current)

| Resource | Value |
|----------|-------|
| API URL | `https://d216ioo1fk.execute-api.ap-southeast-1.amazonaws.com/dev/` |
| User Pool ID | `ap-southeast-1_czJPdwlza` |
| User Pool Client ID | `6jmghudv9ac02ckl1cvc08mquv` |
| Region | `ap-southeast-1` |
| Images Bucket | `wishlist-images-dev-471112513956` |
| Wishlist Table | `WishlistApp-dev` |
| Name Locks Table | `ReservationNameLocks-dev` |
| Idempotency Table | `IdempotencyKeys-dev` |
| Admin Email | `admin@wishlist.dev` |
| Admin Password | `WishlistAdmin2024!` |

---

## Legacy: SAM Template

The file `infra/api-gateway/template.yaml` contains the original SAM-based infrastructure definition. It is preserved for reference but is no longer the primary deployment mechanism. Use CDK (`infra/cdk/`) for all new deployments.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check `allowedOrigins` in `infra/cdk/lib/api-stack.ts` matches your frontend domain |
| 401 on admin routes | Verify Cognito token is being sent in `Authorization` header |
| TransactionConflict | Retry with latest item version (optimistic locking) |
| CDK deploy fails | Run `npx cdk synth` to validate templates first |
| DynamoDB throttling | Tables use PAY_PER_REQUEST — check for hot partitions |
| Lambda module not found | Ensure `npm run build` in `infra/lambda` before CDK deploy |
