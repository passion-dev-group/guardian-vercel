# MiTurn - Fintech Savings Circles Application

[![Vercel](https://img.shields.io/badge/Deploy%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/miturn)

MiTurn is a comprehensive fintech web application that facilitates group savings through "savings circles" (rotating credit associations). It combines social savings features with individual goal tracking, gamification, and financial management tools.

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy with Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Clone and deploy**
   ```bash
   git clone https://github.com/yourusername/miturn.git
   cd miturn
   vercel
   ```

3. **Follow the prompts** and deploy to your Vercel account

### Option 2: Deploy via Vercel Dashboard

1. **Fork/Clone this repository** to your GitHub account
2. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Configure environment variables** (see below)
6. **Deploy!**

## 🏗️ Project Overview

### Core Features
- **Savings Circles Management** - Create, join, and manage rotating credit associations
- **Financial Management** - Bank account linking via Plaid, payment processing
- **Individual Savings Goals** - Personal goal tracking with automated allocations
- **Social Features** - Gamification, achievements, and community engagement
- **Analytics & Reporting** - Comprehensive financial insights and performance metrics

### Technology Stack
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Payment Processing**: Plaid API integration
- **Deployment**: Vercel (Frontend) + Supabase (Backend)

## ⚙️ Environment Setup

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- Supabase account
- Plaid account (for payment processing)
- SendGrid account (for email notifications)

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Plaid Configuration
VITE_PLAID_CLIENT_ID=your_plaid_client_id
VITE_PLAID_SECRET=your_plaid_secret
VITE_PLAID_ENV=sandbox

# SendGrid Configuration
VITE_SENDGRID_API_KEY=your_sendgrid_api_key
VITE_SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Analytics (Optional)
VITE_ANALYTICS_ENABLED=true
```

### Vercel Environment Variables

Set these in your Vercel project dashboard:

1. **Go to Project Settings → Environment Variables**
2. **Add each variable** from `.env.local`
3. **Set environment** to "Production" and "Preview"

## 🗄️ Database Setup

### 1. Create Supabase Project
1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Create New Project**
3. **Note your project URL and anon key**

### 2. Run Database Migrations
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your_project_ref

# Run migrations
supabase db push
```

### 3. Deploy Edge Functions
```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific functions
supabase functions deploy process-circle-payment
supabase functions deploy send-payment-reminder
supabase functions deploy plaid-create-link-token
```

## 🚀 Local Development

### 1. Install Dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Start Development Server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

### 3. Build for Production
```bash
npm run build
# or
yarn build
# or
pnpm build
```

## 📱 Application Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Shadcn/ui components
│   ├── dashboard/      # Dashboard-specific components
│   └── circle-details/ # Circle management components
├── pages/              # Application pages
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
├── types/              # TypeScript type definitions
└── contexts/           # React contexts (Auth, etc.)
```

## 🔧 Configuration

### Supabase Configuration
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with email/password
- **Storage**: File uploads for avatars and documents
- **Edge Functions**: Payment processing, notifications, analytics

### Plaid Integration
- **Bank Linking**: Secure account connection via Plaid Link
- **Payment Processing**: ACH transfers for contributions and payouts
- **Balance Checking**: Real-time account balance verification

## 🚀 Deployment Checklist

### Before Deploying
- [ ] **Environment Variables**: Set all required variables in Vercel
- [ ] **Database**: Run all migrations in Supabase
- [ ] **Edge Functions**: Deploy all Supabase functions
- [ ] **API Keys**: Verify Plaid and SendGrid credentials
- [ ] **Domain**: Configure custom domain if needed

### Post-Deployment
- [ ] **Test Bank Linking**: Verify Plaid integration works
- [ ] **Test Payments**: Verify contribution/payout processing
- [ ] **Test Emails**: Verify SendGrid notifications work
- [ ] **Performance**: Check Core Web Vitals
- [ ] **Security**: Verify environment variables are not exposed

## 🔒 Security Considerations

- **Environment Variables**: Never commit `.env` files
- **API Keys**: Use Vercel's environment variable system
- **CORS**: Configured for production domains
- **RLS**: Database-level security policies enabled
- **Authentication**: Supabase Auth with proper session management

## 📊 Monitoring & Analytics

- **Vercel Analytics**: Built-in performance monitoring
- **Error Tracking**: Comprehensive error logging
- **User Analytics**: Event tracking for user behavior
- **Performance**: Core Web Vitals monitoring

## 🆘 Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Verify variables are set in Vercel dashboard
   - Check variable names match exactly
   - Ensure variables are set for correct environment

2. **Database Connection Errors**
   - Verify Supabase project URL and keys
   - Check if database is active
   - Verify RLS policies are configured

3. **Plaid Integration Issues**
   - Check Plaid credentials
   - Verify Plaid environment (sandbox/production)
   - Check Plaid account status

4. **Build Failures**
   - Check Node.js version (18+ required)
   - Verify all dependencies are installed
   - Check TypeScript compilation errors

### Getting Help

- **Documentation**: Check Supabase and Plaid docs
- **Issues**: Create GitHub issue with detailed error
- **Community**: Join Supabase Discord for support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For deployment support or questions:
- **Email**: support@yourdomain.com
- **Documentation**: [Project Wiki](https://github.com/yourusername/miturn/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/miturn/issues)

---

**Built with ❤️ using React, Supabase, and Vercel**
