# Authority Discord Bot Setup Guide

## Overview

The Authority Discord bot provides real-time updates about your creative work directly in your Discord server. It can notify you about new characters, worlds, stories, and chat sessions.

## Required Bot Scopes

When creating your Discord application, you'll need the following scopes:

### Essential Scopes
- `bot` - Places the bot in your server
- `applications.commands` - Enables slash commands

### Permissions
- `Send Messages` (2048) - Post notifications
- `Embed Links` (16384) - Create rich embeds
- `Attach Files` (32768) - Share images of characters/worlds
- `Read Message History` (65536) - Context for commands
- `Use Slash Commands` (2147483648) - Interactive commands

### Permission Integer
Combined permissions integer: **2147614720**

## Setup Steps

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name it "Authority Bot"
4. Navigate to "Bot" section
5. Click "Reset Token" and copy your bot token
6. Add to your `.env`: `DISCORD_BOT_TOKEN=your_token_here`

### 2. Generate OAuth2 URL

Use this URL template (replace CLIENT_ID with your application's client ID):

\`\`\`
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=2147614720&scope=bot%20applications.commands
\`\`\`

### 3. Invite Bot to Server

1. Replace `CLIENT_ID` in the URL above
2. Visit the URL
3. Select your server
4. Authorize the bot

### 4. Create Webhook (For Quick Notifications)

1. Go to your Discord server
2. Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Name it "Authority Notifications"
5. Copy the webhook URL
6. Add to Authority Admin Panel → Webhooks section

## Bot Features

### Real-Time Notifications

The bot automatically posts to your configured channel when:
- New characters are created
- New worlds are designed
- Stories are outlined
- Chat sessions are completed
- Images are generated

### Slash Commands

Available commands:
- `/authority stats` - Show your creative statistics
- `/authority recent` - Display recent activity
- `/authority character [name]` - Look up a character
- `/authority world [name]` - View world details

### Rich Embeds

All notifications use Discord's rich embeds with:
- Gothic dark red theme (#8B0000)
- Character portraits as thumbnails
- World maps as full images
- Relevant metadata fields

## Environment Variables

Add these to your `.env` file:

\`\`\`env
# Discord Bot Token (from Developer Portal)
DISCORD_BOT_TOKEN=your_bot_token_here

# Discord Guild ID (Your server's ID - enable Developer Mode to copy)
DISCORD_GUILD_ID=your_guild_id_here

# Discord Channel ID (Channel for notifications)
DISCORD_CHANNEL_ID=your_channel_id_here
\`\`\`

## Security Best Practices

1. **Never share your bot token** - It provides full access to your bot
2. **Use environment variables** - Don't hardcode tokens
3. **Limit permissions** - Only grant what's needed
4. **Rotate tokens regularly** - Reset if compromised
5. **Use webhook signatures** - Verify authenticity of incoming requests

## Webhook vs Bot

### Use Webhooks When:
- You only need one-way notifications
- Simple setup required
- No interactive commands needed

### Use Bot When:
- You want interactive commands
- Need two-way communication
- Want presence/status updates
- Require complex permissions

## Troubleshooting

### Bot doesn't respond
- Verify bot token is correct
- Check bot has "Send Messages" permission in channel
- Ensure bot role is above target roles

### Embeds not showing
- Verify "Embed Links" permission
- Check webhook URL is valid
- Ensure content isn't blocked by server settings

### Commands not appearing
- Verify "applications.commands" scope
- Re-invite bot with correct scopes
- Wait up to 1 hour for command cache

## Example Notification

\`\`\`json
{
  "username": "Authority",
  "avatar_url": "https://your-domain.com/authority-avatar.png",
  "embeds": [{
    "title": "New Character Created",
    "description": "**Shadowbane the Dark** has been added to your world",
    "color": 9109504,
    "fields": [
      { "name": "Role", "value": "Antagonist", "inline": true },
      { "name": "Species", "value": "Demon", "inline": true }
    ],
    "thumbnail": { "url": "https://..." },
    "timestamp": "2025-01-01T12:00:00.000Z"
  }]
}
\`\`\`

## Advanced Features

### Custom Intents
If you need more advanced features, enable these intents in the Developer Portal:
- `GUILD_MESSAGES` - Read messages
- `GUILD_MEMBERS` - Access member info
- `MESSAGE_CONTENT` - Read message content (privileged)

### Rate Limits
Discord has rate limits:
- 5 requests per 5 seconds per channel (webhooks)
- 50 requests per second globally (bot)
- Plan accordingly for bulk notifications

## Support

For issues or questions:
- Check Discord Developer Documentation
- Review Authority app logs in Admin Panel
- Test webhook URLs with curl before integrating
