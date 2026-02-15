const { BotPlugin } = require("strange-sdk");
const { ChannelType, Collection } = require("discord.js");
const config = require("./config");

// Gestión de borrado diferido
const deleteQueue = new Collection();

module.exports = new BotPlugin({
    name: "voice-manager",
    baseDir: __dirname,

    async boot(client) {
        // Confirmación visual en la terminal al arrancar
        console.log("------------------------------------------------");
        console.log("  [VOICE-MANAGER] Sistema de Patrullas Activo   ");
        console.log("------------------------------------------------");

        client.on("voiceStateUpdate", async (oldState, newState) => {
            const { guild, member } = newState;
            const newChannel = newState.channel;
            const oldChannel = oldState.channel;

            // --- 1. DETECCIÓN Y CREACIÓN ---
            if (newChannel) {
                // Buscamos si el canal es un generador (por ID en config o por nombre "Battlefield")
                const generator = config.generators.find(g => g.sourceId === newChannel.id) || 
                                 (newChannel.name.toLowerCase() === "battlefield" ? { namePrefix: "Patrulla ", userLimit: 4 } : null);

                if (generator) {
                    console.log(`[VOICE] Generando patrulla para: ${member.user.tag}`);

                    try {
                        // Contamos cuántas patrullas existen ya en esa categoría
                        const prefix = generator.namePrefix || "Patrulla ";
                        const existingCount = guild.channels.cache.filter(c => 
                            c.name.startsWith(prefix) && c.parentId === newChannel.parentId
                        ).size;

                        // Crear el nuevo canal
                        const voiceChannel = await guild.channels.create({
                            name: `${prefix}${existingCount + 1}`,
                            type: ChannelType.GuildVoice,
                            parent: newChannel.parentId,
                            userLimit: generator.userLimit || 4,
                            reason: 'Sistema automático de patrullas'
                        });

                        console.log(`[VOICE] Canal creado: ${voiceChannel.name}. Moviendo miembro...`);
                        
                        // Mover al miembro al nuevo canal
                        await member.voice.setChannel(voiceChannel);

                    } catch (error) {
                        console.error("[VOICE ERROR] No se pudo crear o mover:", error.message);
                    }
                }
            }

            // --- 2. LÓGICA DE BORRADO (Si el canal se queda vacío) ---
            if (oldChannel) {
                // Comprobamos si el canal que abandonó era una patrulla
                const isPatrol = oldChannel.name.includes("Patrulla");
                
                if (isPatrol && oldChannel.members.size === 0) {
                    console.log(`[VOICE] Canal ${oldChannel.name} vacío. Borrado programado en 2 min.`);
                    
                    const timeout = setTimeout(async () => {
                        try {
                            const ch = await guild.channels.fetch(oldChannel.id).catch(() => null);
                            if (ch && ch.members.size === 0) {
                                await ch.delete();
                                console.log(`[VOICE] Canal ${oldChannel.name} borrado por inactividad.`);
                                deleteQueue.delete(oldChannel.id);
                            }
                        } catch (e) {
                            // Canal ya borrado o error menor
                        }
                    }, 120000); // 2 minutos

                    deleteQueue.set(oldChannel.id, timeout);
                }
            }

            // --- 3. CANCELAR BORRADO SI ALGUIEN ENTRA ---
            if (newChannel && deleteQueue.has(newChannel.id)) {
                console.log(`[VOICE] Borrado cancelado en ${newChannel.name} (usuario entró).`);
                clearTimeout(deleteQueue.get(newChannel.id));
                deleteQueue.delete(newChannel.id);
            }
        });

        // --- 4. ESCUCHA DE LA DASHBOARD / IPC ---
        client.on("ipc:voice:setup", (data, reply) => {
            const newGen = {
                sourceId: data.channel_id,
                namePrefix: data.prefix,
                userLimit: data.limit,
                deleteDelay: 120000
            };
            
            // Evitar duplicados
            config.generators = config.generators.filter(g => g.sourceId !== data.channel_id);
            config.generators.push(newGen);
            
            console.log(`[VOICE-IPC] Configuración actualizada para canal ID: ${data.channel_id}`);
            if (reply) reply({ success: true });
        });
    },
});