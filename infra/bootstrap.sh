#!/usr/bin/env bash
# =============================================================================
# VoteWise AI — GCP Infrastructure Bootstrap Script
# Run this ONCE to set up all cloud infrastructure before first deployment.
# Prerequisites: gcloud CLI installed and authenticated as project owner.
# =============================================================================

set -euo pipefail

PROJECT_ID="votewiseai-94849"
REGION="us-central1"
REPO_NAME="votewise"
SA_NAME="votewise-backend-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "📦 Bootstrapping VoteWise AI GCP Infrastructure..."
echo "Project: $PROJECT_ID | Region: $REGION"
echo ""

# ── 1. Enable required GCP APIs ───────────────────────────────────────────────
echo "✅ Enabling GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com \
  --project="$PROJECT_ID"

# ── 2. Create Artifact Registry repository (with image cleanup policy) ────────
echo "✅ Creating Artifact Registry: $REPO_NAME..."
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --description="VoteWise AI container images" \
  --project="$PROJECT_ID" 2>/dev/null || echo "  (Already exists)"

# Set lifecycle policy — keep 10 most recent images (Fixes #14)
gcloud artifacts repositories set-cleanup-policies "$REPO_NAME" \
  --location="$REGION" \
  --project="$PROJECT_ID" \
  --policy='[{"name":"keep-10-latest","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":10}}]'

# ── 3. Create dedicated least-privilege Service Account (Fixes #8) ────────────
echo "✅ Creating Service Account: $SA_NAME..."
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="VoteWise Backend Service Account" \
  --project="$PROJECT_ID" 2>/dev/null || echo "  (Already exists)"

# Grant ONLY the minimum required permissions
# - Firestore user: read/write Firestore documents
# - Firebase Admin SDK: verify ID tokens
# - Log writer: send Winston logs to Cloud Logging
# - Secret accessor: read secrets from Secret Manager
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# Vertex AI — allows the service account to call Gemini via Vertex AI API
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/aiplatform.user"

# ── 4. Create Secrets in Secret Manager (Fixes #5) ───────────────────────────
echo ""
echo "🔐 Creating Secret Manager secrets..."
echo "  (You will be prompted to enter values for each secret)"
echo ""

read -r -s -p "Enter GEMINI_API_KEY: " GEMINI_KEY
echo ""
printf '%s' "$GEMINI_KEY" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --project="$PROJECT_ID" 2>/dev/null || \
  printf '%s' "$GEMINI_KEY" | gcloud secrets versions add gemini-api-key --data-file=-

read -r -p "Enter ALLOWED_ORIGINS (comma-separated): " ORIGINS
printf '%s' "$ORIGINS" | gcloud secrets create allowed-origins \
  --data-file=- \
  --project="$PROJECT_ID" 2>/dev/null || \
  printf '%s' "$ORIGINS" | gcloud secrets versions add allowed-origins --data-file=-

# Grant the SA permission to read these specific secrets
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT_ID"

gcloud secrets add-iam-policy-binding allowed-origins \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --project="$PROJECT_ID"

# ── 5. Configure Workload Identity Federation for GitHub Actions ───────────────
# This eliminates the need to store any GCP credentials in GitHub Secrets.
# GitHub's OIDC token is exchanged for a short-lived GCP token automatically.
echo ""
echo "✅ Configuring Workload Identity Federation..."
GITHUB_REPO="SachinSingh014/VoteWiseAI"

gcloud iam workload-identity-pools create "github-pool" \
  --location="global" \
  --display-name="GitHub Actions Pool" \
  --project="$PROJECT_ID" 2>/dev/null || echo "  (Pool already exists)"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --project="$PROJECT_ID" 2>/dev/null || echo "  (Provider already exists)"

POOL_RESOURCE=$(gcloud iam workload-identity-pools describe "github-pool" \
  --location="global" \
  --project="$PROJECT_ID" \
  --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_RESOURCE}/attribute.repository/${GITHUB_REPO}"

# ── 6. Set up GCP Budget Alert to prevent cost overruns (Fixes #15) ──────────
echo ""
echo "✅ Creating billing budget alert ($50/month)..."
# NOTE: Budget API requires billing account ID. Update BILLING_ACCOUNT_ID below.
# Get yours with: gcloud billing accounts list
BILLING_ACCOUNT_ID="XXXXXX-XXXXXX-XXXXXX"   # <-- UPDATE THIS
gcloud billing budgets create \
  --billing-account="$BILLING_ACCOUNT_ID" \
  --display-name="VoteWise AI Monthly Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=0.5 \
  --threshold-rule=percent=0.9 \
  --threshold-rule=percent=1.0 \
  --project="$PROJECT_ID" 2>/dev/null || echo "  (Budget already exists or requires billing account update)"

# ── 7. Print GitHub Secrets needed for CI/CD ─────────────────────────────────
PROVIDER_RESOURCE=$(gcloud iam workload-identity-pools providers describe "github-provider" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --project="$PROJECT_ID" \
  --format="value(name)")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Infrastructure bootstrapped!"
echo ""
echo "Add the following secrets to your GitHub repository:"
echo "  Settings → Secrets and Variables → Actions → New Repository Secret"
echo ""
echo "  GCP_WORKLOAD_IDENTITY_PROVIDER = $PROVIDER_RESOURCE"
echo "  GCP_SERVICE_ACCOUNT            = $SA_EMAIL"
echo "  GCP_CLOUD_RUN_SA               = $SA_EMAIL"
echo "  FIREBASE_SERVICE_ACCOUNT       = (paste JSON from Firebase Console)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
