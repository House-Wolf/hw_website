# GitHub to Discord Webhook Setup Guide

This guide explains how to configure GitHub webhooks to post updates (PRs, commits, issues, etc.) to your Discord channel.

## What's Already Done

✅ Discord bot webhook endpoint has been added at `/github-webhook`
✅ The bot will post to the channel specified in `DISCORD_BOT_CHANNEL_ID`
✅ Supports the following GitHub events:
- Pull Requests (opened, closed, merged, reopened)
- Commits (push events)
- Issues (opened, closed, reopened)
- Releases
- Pull Request Reviews

## Setup Instructions

### Step 1: Ensure Your Bot is Running

Make sure your Discord bot is running and accessible. For production, you'll need:
- A publicly accessible URL for your bot (e.g., `https://bot.housewolf.co`)
- Update `BOT_SERVICE_URL` in your production environment

### Step 2: Configure GitHub Webhook

1. Go to your GitHub repository: https://github.com/House-Wolf/hw_website
2. Click on **Settings** (top navigation)
3. Click on **Webhooks** in the left sidebar
4. Click **Add webhook** button

### Step 3: Webhook Configuration

Fill in the webhook form with these details:

**Payload URL:**
- For local testing: `http://YOUR_NGROK_URL/github-webhook`
- For production: `https://bot.housewolf.co/github-webhook`

**Content type:** `application/json`

**Secret:** (optional but recommended for security)
- Leave blank for now, or add a secret and update the bot code to verify it

**Which events would you like to trigger this webhook?**
- Select **Let me select individual events**
- Check these boxes:
  - ✅ Pull requests
  - ✅ Pushes
  - ✅ Issues
  - ✅ Releases
  - ✅ Pull request reviews
- Uncheck everything else

**Active:** ✅ Check this box

4. Click **Add webhook**

### Step 4: Testing

#### Local Testing with ngrok

If you want to test locally before deploying:

1. Install ngrok: `npm install -g ngrok` or download from https://ngrok.com
2. Start your bot: `npm run bot` or `node bot/index.js`
3. In another terminal, run: `ngrok http 4000`
4. Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok.io`)
5. Use this URL when configuring the webhook: `https://abc123.ngrok.io/github-webhook`

#### Test the Webhook

After setting up the webhook:

1. Make a small change to your repository (edit a file, create a PR, etc.)
2. Check your Discord channel (ID: `1180577727229722634`)
3. You should see a formatted embed with the GitHub update!

### Step 5: Production Deployment

For production use:

1. Deploy your bot to a server with a public URL
2. Update the `BOT_SERVICE_URL` environment variable to your production URL
3. Update the GitHub webhook URL to point to your production endpoint
4. Make sure your bot has permissions to post in the Discord channel

## Supported Events

### 🔀 Pull Requests
- Opened (green)
- Merged (purple)
- Closed (gray)
- Reopened (blue)

Shows: Author, PR number, branch, changes, files changed

### 📌 Commits (Push)
- Shows up to 5 commits per push
- Includes commit messages and SHAs
- Links to compare view

### 🐛 Issues
- Opened (green)
- Closed (red)
- Reopened (blue)

### 🚀 Releases
- Published releases only
- Shows release notes and tag

### ✅ Pull Request Reviews
- Approved (green)
- Changes requested (red)
- Commented (gray)

## Troubleshooting

### Webhook not working?

1. Check the webhook delivery status in GitHub:
   - Go to Settings → Webhooks
   - Click on your webhook
   - Scroll to "Recent Deliveries"
   - Click on a delivery to see the request/response

2. Check bot logs:
   - Look for `🔔 Received GitHub webhook: [event_type]`
   - Look for any error messages

3. Verify environment variables:
   - `DISCORD_BOT_CHANNEL_ID` is set correctly
   - Bot has permissions to post in that channel

### Bot not posting to Discord?

1. Verify the bot is online and running
2. Check that the channel ID is correct
3. Ensure the bot has permissions to:
   - View the channel
   - Send messages
   - Embed links

## Security Considerations

For production, you should:

1. **Add webhook secret validation:**
   - Set a secret in GitHub webhook settings
   - Verify the `X-Hub-Signature-256` header in your bot

2. **Use HTTPS only:**
   - Never use HTTP for production webhooks

3. **Rate limiting:**
   - Consider adding rate limiting to prevent spam

## Customization

You can customize the webhook handler in `bot/index.js`:

- Change embed colors
- Modify which events trigger notifications
- Add additional fields to embeds
- Filter specific branches or authors
- Add custom formatting

Look for the `/github-webhook` endpoint around line 818.
