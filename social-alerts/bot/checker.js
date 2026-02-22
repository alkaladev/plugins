const axios = require("axios");
const db    = require("../db.service");

// ── Twitch token cache ────────────────────────────────────────────
let twitchToken    = null;
let twitchTokenExp = 0;

async function getTwitchToken(clientId, clientSecret) {
    if (twitchToken && Date.now() < twitchTokenExp) return twitchToken;
    const res = await axios.post(`https://id.twitch.tv/oauth2/token`, null, {
        params: { client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" },
    });
    twitchToken    = res.data.access_token;
    twitchTokenExp = Date.now() + (res.data.expires_in - 60) * 1000;
    return twitchToken;
}

// ── Twitch ────────────────────────────────────────────────────────
async function checkTwitch(client, guildId, settings, globalCfg) {
    if (!settings.twitch?.enabled || !settings.twitch.channel) return;
    if (!globalCfg.twitch_client_id || !globalCfg.twitch_client_secret) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const discordChannel = guild.channels.cache.get(settings.twitch.channel);
    if (!discordChannel) return;

    const token = await getTwitchToken(globalCfg.twitch_client_id, globalCfg.twitch_client_secret);

    for (const streamer of settings.twitch.streamers) {
        try {
            const res = await axios.get("https://api.twitch.tv/helix/streams", {
                headers: { "Client-ID": globalCfg.twitch_client_id, "Authorization": `Bearer ${token}` },
                params:  { user_login: streamer.username },
            });

            const stream  = res.data.data[0];
            const cacheKey = `${guildId}:twitch:${streamer.username}`;
            const seen     = await db.getSeen(cacheKey);
            const isLive   = !!stream;

            if (isLive && (!seen || !seen.live)) {
                // Obtener info del usuario (avatar)
                const userRes = await axios.get("https://api.twitch.tv/helix/users", {
                    headers: { "Client-ID": globalCfg.twitch_client_id, "Authorization": `Bearer ${token}` },
                    params:  { login: streamer.username },
                });
                const user = userRes.data.data[0];

                const mention  = settings.twitch.mention ? `<@&${settings.twitch.mention}> ` : "";
                const text     = streamer.message?.trim() || `**${streamer.username}** acaba de empezar a hacer stream!`;
                const thumbnail = stream.thumbnail_url?.replace("{width}", "1280").replace("{height}", "720");

                const embed = {
                    color: 0x9146FF,
                    author: { name: streamer.username, icon_url: user?.profile_image_url, url: `https://twitch.tv/${streamer.username}` },
                    title: stream.title || "Sin titulo",
                    url:   `https://twitch.tv/${streamer.username}`,
                    fields: [
                        { name: "Juego", value: stream.game_name || "Desconocido", inline: true },
                        { name: "Espectadores", value: String(stream.viewer_count || 0), inline: true },
                    ],
                    image:  { url: thumbnail },
                    footer: { text: "Twitch" },
                    timestamp: new Date().toISOString(),
                };

                await discordChannel.send({ content: `${mention}${text}`, embeds: [embed] });
                await db.setSeen(cacheKey, { last_id: stream.id, live: true });

            } else if (!isLive && seen?.live) {
                await db.setSeen(cacheKey, { last_id: null, live: false });
            }
        } catch (e) {
            console.error(`[social-alerts] Twitch error (${streamer.username}):`, e.message);
        }
    }
}

// ── YouTube ───────────────────────────────────────────────────────
async function checkYouTube(client, guildId, settings) {
    if (!settings.youtube?.enabled || !settings.youtube.channel) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const discordChannel = guild.channels.cache.get(settings.youtube.channel);
    if (!discordChannel) return;

    for (const yt of settings.youtube.channels) {
        try {
            const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${yt.id}`;
            const res     = await axios.get(feedUrl, { headers: { "Accept": "application/rss+xml" } });
            const xml     = res.data;

            // Parsear el XML a mano (sin dependencias)
            const entries = xml.split("<entry>").slice(1);
            if (!entries.length) continue;

            const first    = entries[0];
            const videoId  = (first.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
            const title    = (first.match(/<title>(.*?)<\/title>/) || [])[1]?.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") || "Sin titulo";
            const published = (first.match(/<published>(.*?)<\/published>/) || [])[1];
            const author   = (first.match(/<name>(.*?)<\/name>/) || [])[1] || yt.name;

            if (!videoId) continue;

            const cacheKey = `${guildId}:youtube:${yt.id}`;
            const seen     = await db.getSeen(cacheKey);

            if (seen?.last_id === videoId) continue;

            const mention = settings.youtube.mention ? `<@&${settings.youtube.mention}> ` : "";
            const text    = yt.message?.trim() || `**${author}** ha subido un nuevo video!`;

            const embed = {
                color: 0xFF0000,
                author: { name: author, url: `https://youtube.com/channel/${yt.id}` },
                title,
                url:   `https://youtube.com/watch?v=${videoId}`,
                image: { url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` },
                footer: { text: "YouTube" },
                timestamp: published ? new Date(published).toISOString() : new Date().toISOString(),
            };

            await discordChannel.send({ content: `${mention}${text}`, embeds: [embed] });
            await db.setSeen(cacheKey, { last_id: videoId, live: false });

        } catch (e) {
            console.error(`[social-alerts] YouTube error (${yt.name}):`, e.message);
        }
    }
}

// ── Twitter/X via RSS (nitter) ────────────────────────────────────
const NITTER_INSTANCES = [
    "https://nitter.privacydev.net",
    "https://nitter.poast.org",
    "https://nitter.1d4.us",
];

async function checkTwitter(client, guildId, settings) {
    if (!settings.twitter?.enabled || !settings.twitter.channel) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const discordChannel = guild.channels.cache.get(settings.twitter.channel);
    if (!discordChannel) return;

    for (const account of settings.twitter.accounts) {
        let xml = null;
        for (const instance of NITTER_INSTANCES) {
            try {
                const res = await axios.get(`${instance}/${account.username}/rss`, { timeout: 5000 });
                xml = res.data;
                break;
            } catch { continue; }
        }
        if (!xml) { console.warn(`[social-alerts] Twitter: no se pudo obtener RSS para @${account.username}`); continue; }

        try {
            const items = xml.split("<item>").slice(1);
            if (!items.length) continue;

            const first  = items[0];
            const link   = (first.match(/<link>(.*?)<\/link>/) || [])[1];
            const title  = (first.match(/<title>(.*?)<\/title>/) || [])[1]?.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">") || "";
            const pubDate = (first.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1];
            const tweetId = link?.split("/").pop();

            if (!tweetId) continue;

            const cacheKey = `${guildId}:twitter:${account.username}`;
            const seen     = await db.getSeen(cacheKey);
            if (seen?.last_id === tweetId) continue;

            const mention = settings.twitter.mention ? `<@&${settings.twitter.mention}> ` : "";
            const text    = account.message?.trim() || `**@${account.username}** ha publicado un nuevo tweet!`;

            const embed = {
                color: 0x1DA1F2,
                author: { name: `@${account.username}`, url: `https://x.com/${account.username}` },
                description: title.slice(0, 300),
                url:   link?.replace(/nitter\.[^/]+/, "x.com"),
                footer: { text: "Twitter / X" },
                timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            };

            await discordChannel.send({ content: `${mention}${text}`, embeds: [embed] });
            await db.setSeen(cacheKey, { last_id: tweetId, live: false });

        } catch (e) {
            console.error(`[social-alerts] Twitter error (${account.username}):`, e.message);
        }
    }
}

// ── Instagram via RSS (picnob) ────────────────────────────────────
async function checkInstagram(client, guildId, settings) {
    if (!settings.instagram?.enabled || !settings.instagram.channel) return;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;
    const discordChannel = guild.channels.cache.get(settings.instagram.channel);
    if (!discordChannel) return;

    for (const account of settings.instagram.accounts) {
        try {
            const res = await axios.get(`https://rss.app/feeds/instagram/${account.username}.xml`, {
                timeout: 8000,
                headers: { "User-Agent": "Mozilla/5.0" },
            });
            const xml = res.data;

            const items = xml.split("<item>").slice(1);
            if (!items.length) continue;

            const first   = items[0];
            const link    = (first.match(/<link>(.*?)<\/link>/) || [])[1];
            const desc    = (first.match(/<description>(.*?)<\/description>/s) || [])[1]?.replace(/<[^>]+>/g, "").trim() || "";
            const imgMatch = first.match(/<enclosure[^>]+url="([^"]+)"/);
            const imgUrl  = imgMatch?.[1];
            const pubDate  = (first.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1];
            const postId  = link?.split("/p/")?.[1]?.replace("/", "") || link;

            if (!postId) continue;

            const cacheKey = `${guildId}:instagram:${account.username}`;
            const seen     = await db.getSeen(cacheKey);
            if (seen?.last_id === postId) continue;

            const mention = settings.instagram.mention ? `<@&${settings.instagram.mention}> ` : "";
            const text    = account.message?.trim() || `**@${account.username}** ha publicado en Instagram!`;

            const embed = {
                color: 0xE1306C,
                author: { name: `@${account.username}`, url: `https://instagram.com/${account.username}` },
                description: desc.slice(0, 300) || null,
                url:   link,
                footer: { text: "Instagram" },
                timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            };
            if (imgUrl) embed.image = { url: imgUrl };

            await discordChannel.send({ content: `${mention}${text}`, embeds: [embed] });
            await db.setSeen(cacheKey, { last_id: postId, live: false });

        } catch (e) {
            console.error(`[social-alerts] Instagram error (${account.username}):`, e.message);
        }
    }
}

// ── Loop principal ────────────────────────────────────────────────
async function runChecks(client) {
    try {
        const allSettings = await db.getAllSettings();
        const globalCfg   = await db.getGlobalConfig();

        for (const settings of allSettings) {
            const guildId = settings._id;
            await Promise.allSettled([
                checkTwitch(client, guildId, settings, globalCfg),
                checkYouTube(client, guildId, settings),
                checkTwitter(client, guildId, settings),
                checkInstagram(client, guildId, settings),
            ]);
        }
    } catch (e) {
        console.error("[social-alerts] Error en el loop:", e.message);
    }
}

module.exports = { runChecks };
