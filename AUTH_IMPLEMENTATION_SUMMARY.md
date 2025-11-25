# Discord Authentication Implementation Summary

## ✅ What Was Built

### 1. Complete Discord OAuth System
- NextAuth v5 integration with Discord provider
- Guild (server) membership verification
- Automatic role syncing on every login
- Permission-based access control

### 2. Database Integration
- Prisma adapter for session storage
- User profile syncing (username, avatar, email)
- Discord role tracking in database
- Permission mapping (Discord roles → site permissions)

### 3. Authentication Flow
```
User clicks "Sign in"
  ↓
Redirects to Discord OAuth
  ↓
User authorizes application
  ↓
System checks guild membership
  ↓
Syncs user data & roles to database
  ↓
Creates session
  ↓
Redirects to /dashboard
```

### 4. Files Created

**Configuration:**
- `lib/auth.ts` - NextAuth configuration with Discord OAuth
- `lib/permissions.ts` - Permission checking utilities
- `types/next-auth.d.ts` - TypeScript session types
- `middleware.ts` - Route protection middleware

**API Routes:**
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API handlers

**Pages:**
- `app/auth/signin/page.tsx` - Sign-in page
- `app/auth/error/page.tsx` - Error handling page

**Components:**
- `components/auth/SessionProvider.tsx` - Session context wrapper
- `components/auth/SignInButton.tsx` - Discord login button
- `components/auth/SignOutButton.tsx` - Logout button
- `components/auth/UserButton.tsx` - User profile display

**Documentation:**
- `DISCORD_AUTH_SETUP.md` - Complete setup guide

### 5. Database Changes

**New Tables:**
- `accounts` - OAuth account data
- `sessions` - User sessions
- `verification_tokens` - Email verification (future use)

**Updated Tables:**
- `users` - Added: email, emailVerified, image, name

## 🔐 Security Features

1. **Guild Membership Check** - Only House Wolf Discord members can sign in
2. **Session-Based Auth** - Secure database sessions
3. **Protected Routes** - Middleware guards `/dashboard/*`
4. **Permission System** - Role-based access control
5. **CSRF Protection** - Built into NextAuth
6. **Secure Cookies** - HTTP-only, secure in production

## 🎯 Permission System

### Available Utilities

```typescript
import { hasPermission, requireAuth, requirePermission } from "@/lib/permissions";

// Check if user has permission
const canApprove = await hasPermission("MERCENARY_APPROVE");

// Require authentication
const session = await requireAuth(); // Throws if not authenticated

// Require specific permission
await requirePermission("SITE_ADMIN"); // Throws if missing permission
```

### Permission Constants

```typescript
PERMISSIONS.SITE_ADMIN            // Full site administration
PERMISSIONS.MERCENARY_APPROVE     // Approve mercenary profiles
PERMISSIONS.MARKETPLACE_ADMIN     // Marketplace administration
PERMISSIONS.MARKETPLACE_MODERATOR // Marketplace moderation
PERMISSIONS.DIVISION_CONFIG       // Division configuration
```

## 📋 Setup Checklist

Before the auth system will work, you need to:

- [ ] Create Discord application in Developer Portal
- [ ] Configure OAuth2 redirect URLs
- [ ] Get Client ID and Client Secret
- [ ] Get Discord Guild (server) ID
- [ ] Generate AUTH_SECRET
- [ ] Update `.env` with all credentials
- [ ] Create permissions in database
- [ ] Map Discord roles to permissions

**See `DISCORD_AUTH_SETUP.md` for detailed instructions.**

## 🧪 Testing the Auth System

### 1. Start Development Server
```bash
npm run dev
```

### 2. Test Sign In
1. Navigate to: `http://localhost:3000/auth/signin`
2. Click "Sign in with Discord"
3. Authorize the application
4. Should redirect to `/dashboard`

### 3. Test Protected Routes
1. Sign out
2. Try accessing `/dashboard`
3. Should redirect to `/auth/signin`

### 4. Test Role Sync
1. Sign in
2. Check database: `SELECT * FROM user_roles WHERE user_id = 'your-id';`
3. Verify your Discord roles are present

## 🔧 How It Works

### On Sign In

1. **User Authorization**
   - User clicks "Sign in with Discord"
   - Redirects to Discord OAuth
   - User authorizes application

2. **Guild Membership Check**
   - Fetches user's guilds from Discord API
   - Checks if user is in House Wolf server
   - Rejects if not a member

3. **Role Sync**
   - Fetches guild member data from Discord API
   - Gets user's roles in the server
   - Clears old role assignments
   - Creates new role assignments in database

4. **User Data Sync**
   - Updates username, display name, avatar
   - Sets last login timestamp
   - Creates or updates user record

5. **Session Creation**
   - Creates database session
   - Sets secure cookie
   - Redirects to dashboard

### On Every Request

1. **Middleware Check**
   - Checks if route requires authentication
   - Validates session cookie
   - Redirects to signin if needed

2. **Session Callback**
   - Fetches user from database
   - Loads user's roles
   - Flattens permissions from all roles
   - Adds to session object

3. **Permission Check**
   - Components/pages check permissions
   - Show/hide features based on access
   - Protect sensitive operations

## 🎨 UI Integration Examples

### Show User Profile

```tsx
import { UserButton } from "@/components/auth/UserButton";

export default function Header() {
  return (
    <header>
      <UserButton />
    </header>
  );
}
```

### Conditional Rendering

```tsx
import { auth } from "@/lib/auth";

export default async function Page() {
  const session = await auth();

  return (
    <div>
      {session ? (
        <p>Welcome, {session.user.discordUsername}!</p>
      ) : (
        <SignInButton />
      )}
    </div>
  );
}
```

### Permission-Based Features

```tsx
import { hasPermission } from "@/lib/permissions";

export default async function AdminPanel() {
  const isAdmin = await hasPermission("SITE_ADMIN");

  if (!isAdmin) {
    return <p>Access denied</p>;
  }

  return <div>Admin controls...</div>;
}
```

## 🚀 Next Steps

### Immediate
1. **Configure Discord Application**
   - Follow `DISCORD_AUTH_SETUP.md`
   - Set up OAuth2 redirect URLs
   - Add credentials to `.env`

2. **Test Authentication**
   - Sign in with your Discord account
   - Verify role sync works
   - Test protected routes

### Short Term
3. **Set Up Permissions**
   - Create permissions in database
   - Map your Discord roles to permissions
   - Test permission checks

4. **Build Protected Features**
   - Mercenary profile creation
   - Marketplace listing management
   - Admin panel pages

### Long Term
5. **Add Discord Bot** (Optional)
   - Real-time role sync
   - Notifications
   - Two-way integration

6. **Enhance User Experience**
   - User profile pages
   - Settings management
   - Activity tracking

## 📊 Current Status

✅ **Complete:**
- Discord OAuth setup
- Session management
- Role syncing
- Permission system
- Protected routes
- UI components
- Documentation

⏳ **Needs Configuration:**
- Discord application setup
- Environment variables
- Permission mappings

🔜 **Future Enhancements:**
- Discord bot integration
- Real-time role updates
- User profile pages
- Activity tracking
- Notification system

## 🐛 Common Issues & Solutions

### "Access Denied" Error
**Problem:** User can't sign in
**Solutions:**
- Verify user is in House Wolf Discord
- Check `DISCORD_GUILD_ID` is correct
- Ensure Discord app has correct scopes

### Roles Not Syncing
**Problem:** User roles not appearing in database
**Solutions:**
- Check `guilds.members.read` scope is enabled
- Verify Discord API tokens are valid
- Check database `user_roles` table

### Session Not Persisting
**Problem:** User gets logged out frequently
**Solutions:**
- Check `AUTH_SECRET` is set
- Verify database connection
- Check `sessions` table exists

## 📚 Resources

- **Setup Guide:** `DISCORD_AUTH_SETUP.md`
- **Database Schema:** `prisma/schema.prisma`
- **Auth Config:** `lib/auth.ts`
- **Permissions:** `lib/permissions.ts`

---

**Built with:** NextAuth v5, Prisma, PostgreSQL, Discord OAuth
**Status:** ✅ Complete and ready for configuration
