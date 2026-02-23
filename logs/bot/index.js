const { BotPlugin } = require("strange-sdk");
const db = require("../db.service");

const plugin = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService: db,

    onEnable: async (botClient) => {
        console.log("[guild-logger] Plugin activado.");
        const { sendLog } = require("./logHelper");
        const { EmbedBuilder, AuditLogEvent } = require("discord.js");

        // ════════════════════════════════════════════════════════
        // CANALES
        // ════════════════════════════════════════════════════════
        botClient.on("channelCreate", async (channel) => {
            if (!channel.guild) return;
            const embed = new EmbedBuilder()
                .setTitle("📢 Canal creado")
                .setDescription("Se ha creado el canal **#" + channel.name + "**")
                .addFields({ name:"Nombre", value:channel.name, inline:true }, { name:"Tipo", value:String(channel.type), inline:true }, { name:"ID", value:channel.id, inline:true })
                .setTimestamp();
            await sendLog(botClient, db, channel.guild.id, "channels", "channelCreate", embed);
        });

        botClient.on("channelDelete", async (channel) => {
            if (!channel.guild) return;
            const embed = new EmbedBuilder()
                .setTitle("🗑️ Canal eliminado")
                .setDescription("Se ha eliminado el canal **#" + channel.name + "**")
                .addFields({ name:"Nombre", value:channel.name, inline:true }, { name:"ID", value:channel.id, inline:true })
                .setTimestamp();
            await sendLog(botClient, db, channel.guild.id, "channels", "channelDelete", embed);
        });

        botClient.on("channelUpdate", async (oldCh, newCh) => {
            if (!newCh.guild) return;
            // Permisos actualizados
            const oldPerms = JSON.stringify([...oldCh.permissionOverwrites.cache.values()].map(o => o.toJSON()));
            const newPerms = JSON.stringify([...newCh.permissionOverwrites.cache.values()].map(o => o.toJSON()));
            if (oldPerms !== newPerms) {
                let executor = "Desconocido";
                try {
                    const logs = await newCh.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelOverwriteUpdate, limit:1 });
                    const entry = logs.entries.first();
                    if (entry && Date.now() - entry.createdTimestamp < 5000) executor = "<@" + entry.executor.id + ">";
                } catch(_) {}
                const pEmbed = new EmbedBuilder()
                    .setTitle("🔒 Permisos del canal actualizados")
                    .setDescription("Los permisos de **#" + newCh.name + "** han cambiado")
                    .addFields({ name:"Canal", value:"<#" + newCh.id + ">", inline:true }, { name:"Moderador", value:executor, inline:true })
                    .setTimestamp();
                await sendLog(botClient, db, newCh.guild.id, "channels", "channelPermUpdate", pEmbed);
            }
            // Nombre/tema actualizados
            const changes = [];
            if (oldCh.name  !== newCh.name)  changes.push({ name:"Nombre", value:"`" + oldCh.name + "` → `" + newCh.name + "`", inline:false });
            if (oldCh.topic !== newCh.topic) changes.push({ name:"Tema",   value:"`" + (oldCh.topic||"vacío") + "` → `" + (newCh.topic||"vacío") + "`", inline:false });
            if (changes.length) {
                const embed = new EmbedBuilder()
                    .setTitle("✏️ Canal editado")
                    .setDescription("El canal **#" + newCh.name + "** ha sido modificado")
                    .addFields(...changes, { name:"Canal", value:"<#" + newCh.id + ">", inline:true })
                    .setTimestamp();
                await sendLog(botClient, db, newCh.guild.id, "channels", "channelUpdate", embed);
            }
            // Pin de mensaje
            if (oldCh.lastPinTimestamp !== newCh.lastPinTimestamp) {
                const embed = new EmbedBuilder()
                    .setTitle("📌 Mensaje fijado")
                    .setDescription("Se ha fijado o desfijado un mensaje en <#" + newCh.id + ">")
                    .setTimestamp();
                await sendLog(botClient, db, newCh.guild.id, "messages", "messagePinned", embed);
            }
        });

        // ════════════════════════════════════════════════════════
        // SERVIDOR
        // ════════════════════════════════════════════════════════
        botClient.on("guildUpdate", async (oldG, newG) => {
            const changes = [];
            if (oldG.name !== newG.name) changes.push({ name:"Nombre", value:"`" + oldG.name + "` → `" + newG.name + "`", inline:false });
            if (oldG.icon !== newG.icon) changes.push({ name:"Icono",  value:"Actualizado", inline:true });
            if (!changes.length) return;
            const embed = new EmbedBuilder().setTitle("⚙️ Servidor actualizado").addFields(...changes).setTimestamp();
            await sendLog(botClient, db, newG.id, "server", "guildUpdate", embed);
        });

        botClient.on("emojiCreate", async (emoji) => {
            const embed = new EmbedBuilder().setTitle("😄 Emoji añadido").setDescription("Se ha añadido :" + emoji.name + ":").setThumbnail(emoji.url).setTimestamp();
            await sendLog(botClient, db, emoji.guild.id, "server", "emojiCreate", embed);
        });

        botClient.on("emojiDelete", async (emoji) => {
            const embed = new EmbedBuilder().setTitle("😢 Emoji eliminado").setDescription("Se ha eliminado :" + emoji.name + ":").setTimestamp();
            await sendLog(botClient, db, emoji.guild.id, "server", "emojiDelete", embed);
        });

        botClient.on("emojiUpdate", async (oldE, newE) => {
            if (oldE.name === newE.name) return;
            const embed = new EmbedBuilder().setTitle("✏️ Emoji editado").addFields({ name:"Nombre", value:"`" + oldE.name + "` → `" + newE.name + "`", inline:true }).setTimestamp();
            await sendLog(botClient, db, newE.guild.id, "server", "emojiUpdate", embed);
        });

        botClient.on("stickerCreate", async (sticker) => {
            if (!sticker.guild) return;
            const embed = new EmbedBuilder().setTitle("🗒️ Sticker añadido").setDescription("Añadido: **" + sticker.name + "**").setTimestamp();
            await sendLog(botClient, db, sticker.guild.id, "server", "stickerCreate", embed);
        });

        botClient.on("stickerDelete", async (sticker) => {
            if (!sticker.guild) return;
            const embed = new EmbedBuilder().setTitle("🗑️ Sticker eliminado").setDescription("Eliminado: **" + sticker.name + "**").setTimestamp();
            await sendLog(botClient, db, sticker.guild.id, "server", "stickerDelete", embed);
        });

        botClient.on("webhooksUpdate", async (channel) => {
            if (!channel.guild) return;
            const embed = new EmbedBuilder().setTitle("🔗 Webhook modificado").setDescription("Los webhooks de <#" + channel.id + "> han cambiado").setTimestamp();
            await sendLog(botClient, db, channel.guild.id, "server", "webhookUpdate", embed);
        });

        // ════════════════════════════════════════════════════════
        // MIEMBROS
        // ════════════════════════════════════════════════════════
        botClient.on("guildMemberAdd", async (member) => {
            const created = Math.floor(member.user.createdTimestamp / 1000);
            const embed = new EmbedBuilder()
                .setTitle("👋 Nuevo miembro")
                .setDescription("**" + member.user.tag + "** se ha unido al servidor")
                .setThumbnail(member.user.displayAvatarURL({ size:128 }))
                .addFields(
                    { name:"Usuario", value:"<@" + member.id + ">", inline:true },
                    { name:"ID",      value:member.id, inline:true },
                    { name:"Cuenta creada", value:"<t:" + created + ":R>", inline:true },
                    { name:"Miembros totales", value:String(member.guild.memberCount), inline:true },
                )
                .setTimestamp();
            await sendLog(botClient, db, member.guild.id, "members", "memberJoin", embed);

            // Tracking de invitaciones
            try {
                const { inviteCache } = require("./inviteCache");
                const newInvites = await member.guild.invites.fetch();
                const oldCache   = inviteCache.get(member.guild.id) || new Map();
                const used = newInvites.find(i => (oldCache.get(i.code) ?? 0) < i.uses);
                inviteCache.set(member.guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
                if (used) {
                    const invEmbed = new EmbedBuilder()
                        .setTitle("📩 Invitación usada")
                        .setDescription("<@" + member.id + "> entró usando **" + used.code + "**")
                        .addFields(
                            { name:"Invitado por", value: used.inviterId ? "<@" + used.inviterId + ">" : "Desconocido", inline:true },
                            { name:"Usos", value:String(used.uses), inline:true },
                        )
                        .setTimestamp();
                    await sendLog(botClient, db, member.guild.id, "invites", "inviteUse", invEmbed);
                }
            } catch(_) {}
        });

        botClient.on("guildMemberRemove", async (member) => {
            const joined = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
            const embed = new EmbedBuilder()
                .setTitle("🚪 Miembro salió")
                .setDescription("**" + member.user.tag + "** ha abandonado el servidor")
                .setThumbnail(member.user.displayAvatarURL({ size:128 }))
                .addFields(
                    { name:"Usuario", value:member.user.tag, inline:true },
                    { name:"ID",      value:member.id, inline:true },
                    { name:"Se unió", value:joined ? "<t:" + joined + ":R>" : "Desconocido", inline:true },
                )
                .setTimestamp();
            await sendLog(botClient, db, member.guild.id, "members", "memberLeave", embed);

            // Detectar kick via AuditLog
            try {
                const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit:1 });
                const entry = logs.entries.first();
                if (entry && entry.target.id === member.id && Date.now() - entry.createdTimestamp < 5000) {
                    const kickEmbed = new EmbedBuilder()
                        .setTitle("👢 Usuario expulsado")
                        .setDescription("**" + member.user.tag + "** ha sido expulsado")
                        .addFields(
                            { name:"Moderador", value:"<@" + entry.executor.id + ">", inline:true },
                            { name:"Motivo",    value:entry.reason || "Sin motivo", inline:false },
                        )
                        .setTimestamp();
                    await sendLog(botClient, db, member.guild.id, "moderation", "kickMember", kickEmbed);
                }
            } catch(_) {}
        });

        botClient.on("guildMemberUpdate", async (oldM, newM) => {
            // Apodo
            if (oldM.nickname !== newM.nickname) {
                const embed = new EmbedBuilder()
                    .setTitle("📝 Apodo cambiado")
                    .setDescription("El apodo de <@" + newM.id + "> ha cambiado")
                    .addFields(
                        { name:"Antes", value:oldM.nickname || "*Sin apodo*", inline:true },
                        { name:"Ahora", value:newM.nickname || "*Sin apodo*", inline:true },
                    )
                    .setTimestamp();
                await sendLog(botClient, db, newM.guild.id, "members", "nicknameChange", embed);
            }
            // Timeout añadido
            if (!oldM.communicationDisabledUntil && newM.communicationDisabledUntil) {
                const until = Math.floor(newM.communicationDisabledUntilTimestamp / 1000);
                const embed = new EmbedBuilder().setTitle("⏰ Timeout aplicado").setDescription("<@" + newM.id + "> ha recibido un timeout").addFields({ name:"Hasta", value:"<t:" + until + ":F>", inline:true }).setTimestamp();
                await sendLog(botClient, db, newM.guild.id, "members", "timeoutAdd", embed);
            }
            // Timeout eliminado
            if (oldM.communicationDisabledUntil && !newM.communicationDisabledUntil) {
                const embed = new EmbedBuilder().setTitle("✅ Timeout eliminado").setDescription("El timeout de <@" + newM.id + "> ha sido eliminado").setTimestamp();
                await sendLog(botClient, db, newM.guild.id, "members", "timeoutRemove", embed);
            }
            // Roles
            const addedRoles   = newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id));
            const removedRoles = oldM.roles.cache.filter(r => !newM.roles.cache.has(r.id));
            if (addedRoles.size) {
                const embed = new EmbedBuilder().setTitle("🏷️ Rol asignado").setDescription("A <@" + newM.id + "> se le han asignado roles").addFields({ name:"Roles añadidos", value:addedRoles.map(r => "<@&" + r.id + ">").join(" "), inline:false }).setTimestamp();
                await sendLog(botClient, db, newM.guild.id, "roles", "roleAssign", embed);
            }
            if (removedRoles.size) {
                const embed = new EmbedBuilder().setTitle("🏷️ Rol quitado").setDescription("A <@" + newM.id + "> se le han quitado roles").addFields({ name:"Roles eliminados", value:removedRoles.map(r => "<@&" + r.id + ">").join(" "), inline:false }).setTimestamp();
                await sendLog(botClient, db, newM.guild.id, "roles", "roleRemove", embed);
            }
        });

        botClient.on("userUpdate", async (oldU, newU) => {
            const changes = [];
            if (oldU.username !== newU.username) changes.push({ name:"Nombre", value:"`" + oldU.username + "` → `" + newU.username + "`", inline:false });
            if (oldU.avatar   !== newU.avatar)   changes.push({ name:"Avatar", value:"Actualizado", inline:true });
            if (!changes.length) return;
            const embed = new EmbedBuilder().setTitle("👤 Perfil actualizado").setDescription("El perfil de **" + newU.tag + "** ha cambiado").setThumbnail(newU.displayAvatarURL({ size:128 })).addFields(...changes).setTimestamp();
            for (const guild of botClient.guilds.cache.values()) {
                if (guild.members.cache.has(newU.id)) await sendLog(botClient, db, guild.id, "members", "userUpdate", embed);
            }
        });

        // ════════════════════════════════════════════════════════
        // MENSAJES
        // ════════════════════════════════════════════════════════
        botClient.on("messageDelete", async (message) => {
            if (!message.guild || message.author?.bot) return;
            const embed = new EmbedBuilder()
                .setTitle("🗑️ Mensaje eliminado")
                .setDescription("Mensaje de <@" + (message.author?.id ?? "Desconocido") + "> eliminado en <#" + message.channelId + ">")
                .addFields(
                    { name:"Autor",     value:message.author ? "<@" + message.author.id + ">" : "Desconocido", inline:true },
                    { name:"Canal",     value:"<#" + message.channelId + ">", inline:true },
                    { name:"Contenido", value:message.content ? message.content.slice(0, 1024) : "*Sin texto*", inline:false },
                )
                .setTimestamp();
            await sendLog(botClient, db, message.guild.id, "messages", "messageDelete", embed);
        });

        botClient.on("messageDeleteBulk", async (messages, channel) => {
            if (!channel.guild) return;
            const embed = new EmbedBuilder().setTitle("💥 Borrado masivo").setDescription("Se han eliminado **" + messages.size + "** mensajes en <#" + channel.id + ">").addFields({ name:"Cantidad", value:String(messages.size), inline:true }).setTimestamp();
            await sendLog(botClient, db, channel.guild.id, "messages", "messageBulkDelete", embed);
        });

        botClient.on("messageUpdate", async (oldMsg, newMsg) => {
            if (!newMsg.guild || newMsg.author?.bot) return;
            if (oldMsg.content === newMsg.content) return;
            const embed = new EmbedBuilder()
                .setTitle("✏️ Mensaje editado")
                .setDescription("Mensaje editado por <@" + newMsg.author.id + "> en <#" + newMsg.channelId + ">")
                .addFields(
                    { name:"Antes",  value:(oldMsg.content?.slice(0,512) || "*vacío*"), inline:false },
                    { name:"Ahora",  value:(newMsg.content?.slice(0,512) || "*vacío*"), inline:false },
                    { name:"Enlace", value:"[Ver mensaje](" + newMsg.url + ")", inline:true },
                )
                .setTimestamp();
            await sendLog(botClient, db, newMsg.guild.id, "messages", "messageUpdate", embed);
        });

        // ════════════════════════════════════════════════════════
        // VOZ
        // ════════════════════════════════════════════════════════
        botClient.on("voiceStateUpdate", async (oldState, newState) => {
            if (!newState.guild) return;
            const member  = newState.member;
            const guildId = newState.guild.id;
            const oldCh = oldState.channel;
            const newCh = newState.channel;

            if (!oldCh && newCh) {
                const embed = new EmbedBuilder().setTitle("🔊 Conectado a voz").setDescription("<@" + member.id + "> se conectó al canal **" + newCh.name + "**").setTimestamp();
                return await sendLog(botClient, db, guildId, "voice", "voiceJoin", embed);
            }
            if (oldCh && !newCh) {
                const embed = new EmbedBuilder().setTitle("🔇 Desconectado de voz").setDescription("<@" + member.id + "> abandonó **" + oldCh.name + "**").setTimestamp();
                return await sendLog(botClient, db, guildId, "voice", "voiceLeave", embed);
            }
            if (oldCh && newCh && oldCh.id !== newCh.id) {
                const embed = new EmbedBuilder().setTitle("🔄 Cambio de canal").setDescription("<@" + member.id + "> cambió de canal").addFields({ name:"Antes", value:oldCh.name, inline:true }, { name:"Ahora", value:newCh.name, inline:true }).setTimestamp();
                return await sendLog(botClient, db, guildId, "voice", "voiceSwitch", embed);
            }
            if (oldState.selfMute !== newState.selfMute || oldState.serverMute !== newState.serverMute) {
                const muted = newState.selfMute || newState.serverMute;
                const embed = new EmbedBuilder().setTitle(muted ? "🔕 Silenciado" : "🔔 Dessilenciado").setDescription("<@" + member.id + "> " + (muted ? "se ha silenciado" : "ha quitado el silencio")).setTimestamp();
                return await sendLog(botClient, db, guildId, "voice", "voiceMute", embed);
            }
            if (oldState.selfDeaf !== newState.selfDeaf || oldState.serverDeaf !== newState.serverDeaf) {
                const deafened = newState.selfDeaf || newState.serverDeaf;
                const embed = new EmbedBuilder().setTitle(deafened ? "🦻 Ensordecido" : "👂 Desensordecido").setDescription("<@" + member.id + "> " + (deafened ? "activó modo sordo" : "desactivó modo sordo")).setTimestamp();
                return await sendLog(botClient, db, guildId, "voice", "voiceDeafen", embed);
            }
            if (oldState.streaming !== newState.streaming) {
                const embed = new EmbedBuilder().setTitle(newState.streaming ? "📡 Stream iniciado" : "📡 Stream finalizado").setDescription("<@" + member.id + "> " + (newState.streaming ? "empezó" : "paró") + " de hacer stream").setTimestamp();
                return await sendLog(botClient, db, guildId, "voice", "voiceStream", embed);
            }
        });

        // ════════════════════════════════════════════════════════
        // MODERACIÓN (baneos)
        // ════════════════════════════════════════════════════════
        botClient.on("guildBanAdd", async (ban) => {
            let executor = "Desconocido", reason = "Sin motivo";
            try {
                const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit:1 });
                const entry = logs.entries.first();
                if (entry && Date.now() - entry.createdTimestamp < 5000) { executor = "<@" + entry.executor.id + ">"; reason = entry.reason || "Sin motivo"; }
            } catch(_) {}
            const embed = new EmbedBuilder().setTitle("🔨 Usuario baneado").setDescription("**" + ban.user.tag + "** ha sido baneado").setThumbnail(ban.user.displayAvatarURL({ size:128 })).addFields({ name:"Moderador", value:executor, inline:true }, { name:"Motivo", value:reason, inline:false }).setTimestamp();
            await sendLog(botClient, db, ban.guild.id, "moderation", "banAdd", embed);
        });

        botClient.on("guildBanRemove", async (ban) => {
            let executor = "Desconocido";
            try {
                const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanRemove, limit:1 });
                const entry = logs.entries.first();
                if (entry && Date.now() - entry.createdTimestamp < 5000) executor = "<@" + entry.executor.id + ">";
            } catch(_) {}
            const embed = new EmbedBuilder().setTitle("✅ Ban eliminado").setDescription("El ban de **" + ban.user.tag + "** ha sido retirado").addFields({ name:"Moderador", value:executor, inline:true }).setTimestamp();
            await sendLog(botClient, db, ban.guild.id, "moderation", "banRemove", embed);
        });

        // ════════════════════════════════════════════════════════
        // HILOS
        // ════════════════════════════════════════════════════════
        botClient.on("threadCreate", async (thread) => {
            if (!thread.guild) return;
            const embed = new EmbedBuilder().setTitle("🧵 Hilo creado").setDescription("Se ha creado el hilo **" + thread.name + "**").addFields({ name:"Canal padre", value:"<#" + thread.parentId + ">", inline:true }).setTimestamp();
            await sendLog(botClient, db, thread.guild.id, "threads", "threadCreate", embed);
        });

        botClient.on("threadDelete", async (thread) => {
            if (!thread.guild) return;
            const embed = new EmbedBuilder().setTitle("🗑️ Hilo eliminado").setDescription("Se ha eliminado el hilo **" + thread.name + "**").setTimestamp();
            await sendLog(botClient, db, thread.guild.id, "threads", "threadDelete", embed);
        });

        botClient.on("threadUpdate", async (oldT, newT) => {
            if (!newT.guild) return;
            if (oldT.archived !== newT.archived) {
                const embed = new EmbedBuilder().setTitle(newT.archived ? "📦 Hilo archivado" : "📂 Hilo desarchivado").setDescription("El hilo **" + newT.name + "** ha sido " + (newT.archived ? "archivado" : "desarchivado")).setTimestamp();
                await sendLog(botClient, db, newT.guild.id, "threads", "threadArchive", embed);
            }
            if (oldT.name !== newT.name) {
                const embed = new EmbedBuilder().setTitle("✏️ Hilo editado").addFields({ name:"Nombre", value:"`" + oldT.name + "` → `" + newT.name + "`", inline:false }).setTimestamp();
                await sendLog(botClient, db, newT.guild.id, "threads", "threadUpdate", embed);
            }
        });

        // ════════════════════════════════════════════════════════
        // INVITACIONES
        // ════════════════════════════════════════════════════════
        const { inviteCache } = require("./inviteCache");
        // Poblar cache al arrancar
        const populateCache = async () => {
            for (const guild of botClient.guilds.cache.values()) {
                try {
                    const invites = await guild.invites.fetch();
                    inviteCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
                } catch(_) {}
            }
        };
        if (botClient.isReady()) populateCache(); else botClient.once("ready", populateCache);

        botClient.on("inviteCreate", async (invite) => {
            if (!invite.guild) return;
            const cache = inviteCache.get(invite.guild.id) || new Map();
            cache.set(invite.code, 0);
            inviteCache.set(invite.guild.id, cache);
            const expires = invite.expiresTimestamp ? "<t:" + Math.floor(invite.expiresTimestamp/1000) + ":R>" : "Nunca";
            const embed = new EmbedBuilder().setTitle("🔗 Invitación creada").addFields({ name:"Código", value:invite.code, inline:true }, { name:"Canal", value:"<#" + invite.channel?.id + ">", inline:true }, { name:"Expira", value:expires, inline:true }).setTimestamp();
            await sendLog(botClient, db, invite.guild.id, "invites", "inviteCreate", embed);
        });

        botClient.on("inviteDelete", async (invite) => {
            if (!invite.guild) return;
            const cache = inviteCache.get(invite.guild.id);
            cache?.delete(invite.code);
            const embed = new EmbedBuilder().setTitle("🗑️ Invitación eliminada").setDescription("La invitación **" + invite.code + "** ha sido eliminada").setTimestamp();
            await sendLog(botClient, db, invite.guild.id, "invites", "inviteDelete", embed);
        });

        // ════════════════════════════════════════════════════════
        // ROLES
        // ════════════════════════════════════════════════════════
        botClient.on("roleCreate", async (role) => {
            const embed = new EmbedBuilder().setTitle("🏷️ Rol creado").setDescription("Se ha creado el rol **" + role.name + "**").addFields({ name:"Nombre", value:role.name, inline:true }, { name:"Color", value:role.hexColor, inline:true }, { name:"ID", value:role.id, inline:true }).setTimestamp();
            await sendLog(botClient, db, role.guild.id, "roles", "roleCreate", embed);
        });

        botClient.on("roleDelete", async (role) => {
            const embed = new EmbedBuilder().setTitle("🗑️ Rol eliminado").setDescription("Se ha eliminado el rol **" + role.name + "**").addFields({ name:"Nombre", value:role.name, inline:true }, { name:"ID", value:role.id, inline:true }).setTimestamp();
            await sendLog(botClient, db, role.guild.id, "roles", "roleDelete", embed);
        });

        botClient.on("roleUpdate", async (oldR, newR) => {
            const changes = [];
            if (oldR.name     !== newR.name)     changes.push({ name:"Nombre", value:"`" + oldR.name + "` → `" + newR.name + "`", inline:false });
            if (oldR.hexColor !== newR.hexColor) changes.push({ name:"Color",  value:"`" + oldR.hexColor + "` → `" + newR.hexColor + "`", inline:true });
            if (!changes.length) return;
            const embed = new EmbedBuilder().setTitle("✏️ Rol editado").setDescription("El rol **" + newR.name + "** ha sido modificado").addFields(...changes).setTimestamp();
            await sendLog(botClient, db, newR.guild.id, "roles", "roleUpdate", embed);
        });

        console.log("[guild-logger] Todos los eventos registrados.");
    },

    onDisable: async () => {
        console.log("[guild-logger] Plugin desactivado.");
    },
});

module.exports = plugin;
