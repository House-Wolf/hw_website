# Discord Bot Permissions Checklist for Marketplace OAuth

## Required Bot Permissions (Discord Developer Portal)

### 1. OAuth2 Settings (Discord Developer Portal → OAuth2)
Go to: https://discord.com/developers/applications/{YOUR_APP_ID}/oauth2

**Required Scopes:**
- ✅ `identify` - Get user's Discord identity
- ✅ `guilds.join` - Add users to the server via OAuth

**Redirect URIs:**
- ✅ `{NEXTAUTH_URL}/api/marketplace/oauth/callback`
  - Example: `http://localhost:3000/api/marketplace/oauth/callback`
  - Example: `https://yourdomain.com/api/marketplace/oauth/callback`

### 2. Bot Permissions (Discord Developer Portal → Bot)
Go to: https://discord.com/developers/applications/{YOUR_APP_ID}/bot

**Required Permissions:**
- ✅ **Manage Roles** - Assign Buyer role to new members
- ✅ **Manage Server** (or **Create Invite**) - Create temporary invite links
- ✅ **Create Public Threads** - Create transaction threads
- ✅ **Send Messages** - Post in channels and threads
- ✅ **Send Messages in Threads** - Post in transaction threads
- ✅ **Embed Links** - Send rich embeds
- ✅ **Attach Files** - Send images in embeds (if needed)
- ✅ **Read Message History** - Read channel messages
- ✅ **Mention @everyone, @here, and All Roles** - Ping users in threads

**Permission Integer:** `1099780063296` (or calculate from above)

### 3. Privileged Gateway Intents (Discord Developer Portal → Bot)
**Required Intents:**
- ✅ **Server Members Intent** - Fetch guild members, detect joins
- ✅ **Message Content Intent** - Read message content (if needed)

### 4. Bot Role in Discord Server
**In your Discord server settings:**
1. Ensure the bot's role is **higher** than the "Buyer" role in the role hierarchy
2. Verify the bot has access to the marketplace channel
3. Check thread permissions in the marketplace channel

## Required Environment Variables

Ensure these are set in your `.env` file:

```env
# Discord OAuth2
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_GUILD_ID=your_guild_id

# Marketplace
MARKETPLACE_CHANNEL_ID=your_channel_id
BUYER_ROLE_ID=your_buyer_role_id
DISCORD_INVITE_URL=https://discord.gg/your_permanent_invite (fallback)

# URLs
NEXTAUTH_URL=http://localhost:3000 (or production URL)
BOT_SERVICE_URL=http://localhost:4000 (bot Express server)
```

## Testing Checklist

### Test 1: Unauthenticated User
1. ✅ User not logged into website
2. ✅ User clicks "Contact Seller"
3. ✅ Redirected to Discord OAuth
4. ✅ User authorizes → Added to server with Buyer role
5. ✅ No onboarding flow (role assigned immediately)
6. ✅ Transaction thread created automatically
7. ✅ User redirected to thread URL
8. ✅ Both buyer and seller receive DMs

### Test 2: Authenticated User NOT in Discord
1. ✅ User logged into website
2. ✅ User NOT in Discord server
3. ✅ User clicks "Contact Seller"
4. ✅ Backend detects not in server → OAuth flow
5. ✅ User added with Buyer role
6. ✅ Thread created automatically
7. ✅ Modal shows thread link

### Test 3: User Already in Discord
1. ✅ User logged into website
2. ✅ User already in Discord server
3. ✅ User clicks "Contact Seller"
4. ✅ Thread created immediately (no OAuth)
5. ✅ Modal shows thread link
6. ✅ Both receive DMs

## Common Issues & Debugging

### Issue: "Guild add failed"
**Cause:** Bot doesn't have permission to add members
**Fix:**
- Verify `guilds.join` scope in OAuth2 settings
- Check bot has "Manage Members" permission via API

### Issue: "Failed to create thread"
**Cause:** Bot can't create threads in the channel
**Fix:**
- Check bot has "Create Public Threads" permission
- Verify bot can access the marketplace channel
- Check channel isn't a forum or announcement channel

### Issue: User goes through onboarding
**Cause:** Buyer role not assigned immediately, or Dyno bot interfering
**Fix:**
- Verify BUYER_ROLE_ID is correct
- Check bot role is higher than Buyer role
- The 2-second delay should help with propagation

### Issue: Thread created but buyer can't access it
**Cause:** Discord API propagation delay
**Fix:**
- The 2-second delay in the callback route should fix this
- If still failing, increase delay to 3-5 seconds

### Issue: DMs not sending
**Cause:** User has DMs disabled
**Fix:**
- This is expected - bot catches errors and continues
- Not a critical issue

## Monitoring Logs

Watch for these log messages:

**Success:**
```
🔐 OAuth2 callback received for: Item Name
✅ Access token obtained
👤 User identified: Username
🆕 New marketplace buyer - assigning ONLY Buyer role...
✅ New member roles updated - ONLY Buyer role assigned! (bypasses onboarding)
⏳ Waiting 2 seconds for Discord API to propagate member addition...
🔨 Creating transaction thread for: Item Name
✅ Transaction thread created: https://discord.com/channels/...
```

**Failure Indicators:**
```
❌ Failed to add member to guild
❌ Failed to create thread
⚠️ Skipping thread creation - missing seller Discord ID
```

## Final Verification

Run these checks:
1. Bot is online and connected
2. Bot has correct permissions in server
3. BUYER_ROLE_ID matches actual role ID in Discord
4. MARKETPLACE_CHANNEL_ID is correct
5. Redirect URI matches exactly (no trailing slash issues)
6. All environment variables are set
