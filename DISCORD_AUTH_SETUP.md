# Discord OAuth Setup Guide

This guide will walk you through setting up Discord OAuth for the House Wolf website.

## Prerequisites

- Discord account with access to the House Wolf server
- Admin access to Discord Developer Portal

## Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "House Wolf Website" (or similar)
4. Click "Create"

## Step 2: Configure OAuth2

1. In your application, go to **OAuth2** → **General**
2. Add redirect URLs:
   - Development: `http://localhost:3000/api/auth/callback/discord`
   - Production: `https://www.housewolf.co/api/auth/callback/discord`
3. Click "Save Changes"

## Step 3: Get Credentials

1. Go to **OAuth2** → **General**
2. Copy your **Client ID**
3. Click "Reset Secret" to generate a new **Client Secret** (copy it immediately)

## Step 4: Get Discord Server (Guild) ID

### Method 1: Discord App
1. Enable Developer Mode in Discord:
   - User Settings → Advanced → Developer Mode
2. Right-click your House Wolf server icon
3. Click "Copy Server ID"

### Method 2: Discord Developer Portal
1. Go to your server
2. The URL will be: `https://discord.com/channels/GUILD_ID/...`
3. Copy the `GUILD_ID` from the URL

## Step 5: Configure Environment Variables

Update your `.env` file with the following:

```env
# Generate this with: openssl rand -base64 32
AUTH_SECRET="your-generated-secret-here"
AUTH_TRUST_HOST=true

# From Discord Developer Portal
DISCORD_CLIENT_ID="your-client-id"
DISCORD_CLIENT_SECRET="your-client-secret"

# Your Discord server ID
DISCORD_GUILD_ID="your-guild-id"

# Your site URL
NEXTAUTH_URL="http://localhost:3000"  # Change for production
```

### Generating AUTH_SECRET

**On Linux/Mac:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**Alternative:**
Visit: https://generate-secret.vercel.app/32

## Step 6: Required OAuth2 Scopes

The application requests these scopes:
- `identify` - Get user's Discord ID, username, avatar
- `email` - Get user's email address
- `guilds` - Check guild membership
- `guilds.members.read` - Get user's roles in the server

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/auth/signin`

3. Click "Sign in with Discord"

4. Authorize the application

5. You should be redirected to `/dashboard`

## Troubleshooting

### "Access Denied" Error
- **Cause**: User is not a member of the House Wolf Discord
- **Solution**: Join the server or check `DISCORD_GUILD_ID` is correct

### "Configuration Error"
- **Cause**: Missing or incorrect environment variables
- **Solution**: Verify all env vars are set correctly

### "Invalid Redirect URI"
- **Cause**: Redirect URL mismatch in Discord Developer Portal
- **Solution**: Ensure redirect URLs match exactly (including http/https)

### Users Not Getting Roles
- **Cause**: Missing `guilds.members.read` scope or bot not in server
- **Solution**: Check OAuth2 scopes in Discord Developer Portal

## Security Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Rotate secrets regularly** - Especially `AUTH_SECRET` and `DISCORD_CLIENT_SECRET`
3. **Use HTTPS in production** - Required for secure cookie transmission
4. **Limit OAuth scopes** - Only request what you need

## Role Sync

The auth system automatically:
- Checks Discord guild membership on signin
- Syncs user's Discord roles to the database
- Maps Discord roles to site permissions (via `permissions` table)
- Updates user data (username, avatar) on each login

## Permission System

To grant users site permissions:

1. Create permissions in the database:
   ```sql
   INSERT INTO permissions (key, description) VALUES
   ('SITE_ADMIN', 'Full site administration access'),
   ('MERCENARY_APPROVE', 'Approve mercenary profiles'),
   ('MARKETPLACE_ADMIN', 'Full marketplace administration');
   ```

2. Map Discord roles to permissions:
   ```sql
   -- Example: Give "Admin" role (ID: 123456789) site admin permission
   INSERT INTO role_permissions (discord_role_id, permission_id)
   VALUES ('123456789', (SELECT id FROM permissions WHERE key = 'SITE_ADMIN'));
   ```

## Next Steps

- [ ] Set up permission mappings for your Discord roles
- [ ] Test with different user roles
- [ ] Configure production environment variables
- [ ] Set up SSL/HTTPS for production
- [ ] Add Discord bot for enhanced role sync (optional)

## Resources

- [NextAuth.js Documentation](https://authjs.dev/)
- [Discord OAuth2 Documentation](https://discord.com/developers/docs/topics/oauth2)
- [House Wolf Discord](https://discord.gg/your-invite-link)
