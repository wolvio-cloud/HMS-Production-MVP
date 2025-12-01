# HMS Frontend - Next.js 14

Modern, responsive frontend for Hospital Management System with live stock indicators and glassmorphism design.

## Features

### 🎯 **Doctor Console**
- **Live Patient Queue** with FIFO ordering
- **Smart Queue Routing** (General vs Specialist doctors)
- **Real-time Vitals Display**
- **Prescription Builder with Live Stock Indicators** 🟢🟡🔴
- **Lab Test Ordering** with one-click common tests
- **Lifestyle Advice** with pre-defined chips
- **Auto-routing** after consultation completion

### 🎨 **Design**
- **Glassmorphism UI** with frosted glass effects
- **Smooth Animations** using Framer Motion
- **Responsive Design** for all screen sizes
- **Tailwind CSS** for utility-first styling

### ⚡ **Performance**
- **Debounced Medicine Search** for optimal UX
- **Optimistic UI Updates**
- **Toast Notifications** for user feedback
- **Zustand State Management** for auth

## Tech Stack

- **Next.js 14** - App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Axios** - API client
- **Zustand** - State management
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

## Prerequisites

- Node.js 18+ installed
- Backend running on `http://localhost:3001`

## Installation

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local and set NEXT_PUBLIC_API_URL if needed

# Run development server
npm run dev
```

The app will be running at `http://localhost:3000`

## Project Structure

```
frontend/
├── app/
│   ├── login/
│   │   └── page.tsx          # Login screen
│   ├── doctor/
│   │   └── page.tsx          # Doctor dashboard
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home (redirects)
│   └── globals.css           # Global styles
│
├── components/
│   ├── PatientQueue.tsx      # Patient queue list
│   ├── ConsultationPanel.tsx # Main consultation interface
│   ├── PatientInfo.tsx       # Patient vitals display
│   ├── PrescriptionBuilder.tsx # Medicine search with stock ⭐
│   ├── LabOrders.tsx         # Lab test ordering
│   └── LifestyleAdvice.tsx   # Advice chips
│
├── lib/
│   ├── api.ts                # API client
│   └── utils.ts              # Utility functions
│
└── store/
    └── authStore.ts          # Authentication state
```

## Key Components

### **PrescriptionBuilder.tsx** ⭐
The most important component - enables doctors to search medicines and see live stock status:

```typescript
// Features:
- Debounced search (300ms)
- Real-time stock indicators (🟢🟡🔴)
- Auto-calculation of quantities
- Stock validation before prescription
- Smooth animations
```

### **ConsultationPanel.tsx**
Main interface for patient consultation:

```typescript
// Features:
- Prescription & Advice tab
- Medical History tab
- Auto-save functionality
- Finish Consultation with auto-routing
- Integration with all sub-components
```

## API Integration

All API calls go through `/lib/api.ts`:

```typescript
import { api } from '@/lib/api';

// Example usage:
const queue = await api.getMyQueue();
const medicines = await api.searchMedicines('para', 10);
await api.createPrescription(data);
```

## Authentication

JWT token stored in localStorage:
- Auto-login on page load
- Auto-redirect to login if unauthorized
- Logout clears token and redirects

```typescript
import { useAuthStore } from '@/store/authStore';

const { user, login, logout, isAuthenticated } = useAuthStore();
```

## Styling

Utility classes in `globals.css`:

```css
.glass-card         /* Glassmorphism card */
.btn-primary        /* Primary button */
.btn-chip           /* Chip button */
.input-glass        /* Glass input */
.stock-in           /* Green stock indicator */
.stock-low          /* Yellow stock indicator */
.stock-out          /* Red stock indicator */
```

## Demo Credentials

**General Doctor:**
- Username: `dr.kumar`
- Password: `demo`
- Role: DOCTOR

**Orthopedic Specialist:**
- Username: `dr.sharma`
- Password: `demo`
- Role: DOCTOR

## Build for Production

```bash
npm run build
npm run start
```

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Key Features Implementation

### 1. Live Stock Indicators
Medicine search shows real-time stock status from Redis (<10ms):
- 🟢 **In Stock** (>10 units)
- 🟡 **Low Stock** (1-10 units)
- 🔴 **Out of Stock** (0 units)

### 2. Auto-Calculate Quantities
Prescription quantities calculated automatically:
```
Dosage × Frequency × Duration = Total Quantity
Example: 1 tablet × 3 times × 5 days = 15 tablets
```

### 3. Smart Queue Routing
- General doctors see shared queue
- Specialists see only assigned patients
- Patient locking on selection

### 4. Auto-Routing Workflow
After finishing consultation:
1. Prescription created (if medicines added)
2. Lab orders created (if tests ordered)
3. Patient automatically routed to next stage (Lab/Pharmacy/Both)
4. Queue refreshed

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Performance Optimizations

- Debounced search queries
- Lazy loading of images
- Optimized animations with Framer Motion
- Minimal re-renders with Zustand

---

**Built with ❤️ for modern healthcare**
