# 🚀 AION AI Agent - Vercel Deployment Guide

## Deploy to Vercel

This guide will help you deploy the AION AI Agent frontend to Vercel.

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: Visit [vercel.com](https://vercel.com)
2. **Sign in** with your GitHub account
3. **Click "Add New Project"**
4. **Import this repository**: `samarabdelhameed/AION_AI_Agent-Hedera`
5. **Configure the project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `cd frontend && npm ci && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install`

6. **Environment Variables** (if needed):
   - Add any required environment variables from `env.example`
   - For frontend-specific variables, add them with `VITE_` prefix

7. **Click "Deploy"** and wait for the deployment to complete

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Deployment Configuration

The project includes a `vercel.json` configuration file that:
- Sets up the build process for the frontend
- Configures routing for SPA (Single Page Application)
- Adds security headers
- Sets Node.js version to 18.x

### Post-Deployment

After deployment, Vercel will provide you with:
- 🌐 **Production URL**: `https://your-project-name.vercel.app`
- 📊 **Deployment Dashboard**: Monitor performance and logs
- 🔄 **Auto-deploys**: Automatic deployments on every push to main branch

### Testing Your Deployment

1. Visit your deployment URL
2. Connect your Web3 wallet (MetaMask, WalletConnect, etc.)
3. Test the features:
   - Dashboard overview
   - Vault deposits/withdrawals
   - Strategy selection
   - AI-powered rebalancing

### Troubleshooting

If you encounter issues:

1. **Build fails**: Check the build logs in Vercel dashboard
2. **Wallet connection issues**: Ensure you're on the correct network (BSC Testnet/Hedera Testnet)
3. **Environment variables**: Verify all required variables are set
4. **Routing issues**: The `vercel.json` handles SPA routing automatically

### Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain and follow DNS configuration instructions

---

## 🎯 Quick Deploy Button

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/samarabdelhameed/AION_AI_Agent-Hedera)

Click the button above to deploy with one click!

---

## 📝 Notes

- The frontend is a React + TypeScript + Vite application
- It supports Web3 wallet connections via RainbowKit and Wagmi
- The app is optimized for both BSC and Hedera networks
- All blockchain interactions are client-side (no backend required for basic functionality)

## 🔗 Links

- **GitHub Repository**: https://github.com/samarabdelhameed/AION_AI_Agent-Hedera
- **Documentation**: See README.md in the frontend directory
- **Hedera Integration**: See HEDERA_SETUP_GUIDE.md

---

Made with ❤️ by Samar Abdelhameed

