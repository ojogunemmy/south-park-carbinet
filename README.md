# South Park Cabinets - Management Platform

A production-ready web application for managing South Park Cabinets business operations, including employee payroll, contracts, billing, costs, and administrative functions.

## 📋 Project Overview

This is a full-stack web application built with React and Express, designed specifically for South Park Cabinets and cabinet manufacturing businesses.

The platform provides comprehensive tools for:

- **Employee Management**: Track employees, manage their payment methods, handle absences/deductions
- **Payment Processing**: Generate weekly payments, manage payment obligations, print checks
- **Contract Management**: Track active contracts and project commitments
- **Financial Tracking**: Monitor bills, costs, and profit margins
- **Admin Control**: User management with role-based access (admin/coworker)
- **Work Documentation**: Generate work letters for employees

## 🛠️ Tech Stack

### Frontend

- **React 18** - UI library with hooks and functional components
- **React Router 6** - SPA routing (spa mode, no server routing)
- **TypeScript** - Type safety across the application
- **Vite** - Fast build tool and dev server
- **TailwindCSS 3** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **jsPDF & html2canvas** - PDF generation for checks and reports

### Backend

- **Express 5** - Node.js web framework for API endpoints
- **TypeScript** - Server-side type safety
- **Zod** - Schema validation

### Development Tools

- **Vitest** - Unit testing framework
- **TypeScript** - Strict type checking
- **Prettier** - Code formatting
- **PNPM** - Package manager (recommended)

## 🚀 Quick Start

### Install Dependencies

```bash
pnpm install
```

### Start Development

```bash
pnpm dev
```

The app will be available at: http://localhost:8080

### Build for Production

```bash
pnpm build
```

### Run Production Build

```bash
pnpm start
```

## 📁 Project Structure

```
code/
├── client/                           # React SPA frontend
│   ├── pages/                        # Route components (each page = route)
│   │   ├── Index.tsx                # Dashboard/home page
│   │   ├── Employees.tsx            # Employee management
│   │   ├── Payments.tsx             # Payment tracking & management
│   │   ├── Contracts.tsx            # Contract management
│   │   ├── Bills.tsx                # Bill management
│   │   ├── Costs.tsx                # Cost tracking
│   │   ├── WorkLetters.tsx          # Work letter generation
│   │   └── Settings.tsx             # Company & bank settings
│   ├── components/                   # Reusable UI components
│   │   ├── ui/                      # Radix UI + TailwindCSS components
│   │   ├── Layout.tsx               # Main layout wrapper
│   │   └── other components
│   ├── App.tsx                      # Routes definition
│   ├── global.css                   # TailwindCSS theming
│   ├── lib/                         # Utilities (cn, etc.)
│   └── hooks/
│       └── use-toast.ts             # Toast notification hook
├── server/
│   ├── index.ts                     # Express server
│   └── routes/                      # API endpoints
├── shared/
│   └── api.ts                       # Shared TypeScript types
├── package.json
├── tsconfig.json
├── vite.config.ts                   # Vite frontend config
├── vite.config.server.ts            # Vite server config
└── tailwind.config.ts               # TailwindCSS configuration
```

## ✨ Key Features

- **Dashboard** - Overview metrics and quick navigation
- **Employee Management** - Full employee CRUD with payment methods
- **Payment Processing** - Auto-generated weekly payments with check printing
- **Contract Tracking** - Monitor active contracts and values
- **Bill Management** - Track and categorize expenses
- **Cost Tracking** - Monitor business expenses
- **Work Letters** - Generate work documentation for employees
- **Settings** - Configure company and bank information

## 📊 Data Management

Currently uses **localStorage** for data storage. Data is year-partitioned (2025-2030).

For production with team collaboration, consider migrating to a cloud database like [Supabase](https://supabase.com).

## 🚀 Deployment

### Netlify (Recommended)

```bash
npm run build:client
```

Deploy the `dist/spa` folder to Netlify.

### Vercel

Use `vercel` CLI or connect your GitHub repository.

### Self-Hosted

```bash
npm run build
npm start
```

## 🎯 Next Steps for Production

1. **Add Cloud Database** - Migrate from localStorage to Supabase/PostgreSQL for team data sharing
2. **Setup Authentication** - Implement proper user authentication with JWT
3. **Add API Endpoints** - Create REST/GraphQL APIs for data persistence
4. **Environment Variables** - Configure for production settings
5. **Error Monitoring** - Setup Sentry for error tracking
6. **Analytics** - Add usage tracking and metrics

## 📝 Contributing

Follow existing code patterns and conventions. All components should use TypeScript.

## 📞 Support

For issues or questions, refer to the troubleshooting guides or contact the development team.

---

**Version**: 1.0  
**Company**: South Park Cabinets  
**Status**: Production Ready
"# south-park-carbinet" 
