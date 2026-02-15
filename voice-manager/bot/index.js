const { BotPlugin } = require("strange-sdk");
const { ChannelType, Collection } = require("discord.js");
const config = require("./config");

const deleteQueue = new Collection();

module.exports = new BotPlugin({
    name: "voice-manager",
    baseDir: __dirname,

    async boot(client) {
        // Log para confirmar que el plugin ha arrancado
        client.logger.info(">>> [VOICE-DEBUG] Plugin Voice Manager iniciado correctamente.");

        client.on("voiceStateUpdate", async (oldState, newState) => {
            const { guild, member } = newState;
            const newChannel = newState.channel;
            
            // LOG 1: Detectar cualquier movimiento
            if (newChannel) {
                client.logger.info(`>>> [VOICE-DEBUG] ${member.user.tag} entró al canal: ${newChannel.name} (ID: ${newChannel.id})`);
            }

            // LOG 2: Listar los IDs que el bot tiene registrados como generadores
            const generatorIds = config.generators.map(g => g.sourceId);
            // client.logger.info(`>>> [VOICE-DEBUG] IDs registrados actualmente: ${generatorIds.join(", ")}`);

            const generator = config.generators.find(g => g.sourceId === newChannel?.id);

            if (generator) {
                client.logger.info(`>>> [VOICE-DEBUG] ¡MATCH! El canal ${newChannel.id} es un generador.`);

                try {
                    // Contar canales existentes para el número
                    const existingPatrols = guild.channels.cache.filter(c => 
                        c.name.startsWith(generator.namePrefix) && 
                        c.parentId === newChannel.parentId
                    ).size;

                    const newName = `${generator.namePrefix}${existingPatrols + 1}`;
                    
                    client.logger.info(`>>> [VOICE-DEBUG] Intentando crear canal: ${newName}`);

                    const newVoiceChannel = await guild.channels.create({
                        name: newName,
                        type: ChannelType.GuildVoice,
                        parent: newChannel.parentId,
                        userLimit: generator.userLimit,
                        reason: 'Voice Manager: Patrulla automática'
                    });

                    client.logger.info(`>>> [VOICE-DEBUG] Canal creado. Moviendo a ${member.user.tag}...`);
                    await member.voice.setChannel(newVoiceChannel);
                    
                } catch (error) {
                    client.logger.error(">>> [VOICE-DEBUG] ERROR FATAL:", error);
                }
            }

            // --- Lógica de borrado ---
            const oldChannel = oldState.channel;
            if (oldChannel && oldChannel.members.size === 0) {
                const isTemp = config.generators.some(g => oldChannel.name.startsWith(g.namePrefix));
                if (isTemp) {
                    const timeout = setTimeout(async () => {
                        const ch = await guild.channels.fetch(oldChannel.id).catch(() => null);
                        if (ch && ch.members.size === 0) {
                            await ch.delete().catch(() => {});
                            deleteQueue.delete(oldChannel.id);
                        }
                    }, 120000);
                    deleteQueue.set(oldChannel.id, timeout);
                }
            }

            if (newChannel && deleteQueue.has(newChannel.id)) {
                clearTimeout(deleteQueue.get(newChannel.id));
                deleteQueue.delete(newChannel.id);
            }
        });

        // Receptor para la Dashboard o comandos
        client.on("ipc:voice:setup", (data, reply) => {
            const newGen = {
                sourceId: data.channel_id,
                namePrefix: data.prefix,
                userLimit: data.limit,
                deleteDelay: 120000
            };
            config.generators.push(newGen);
            client.logger.info(`>>> [VOICE-DEBUG] Nuevo generador añadido vía IPC: ${data.channel_id}`);
            if (reply) reply({ success: true });
        });
    }
});