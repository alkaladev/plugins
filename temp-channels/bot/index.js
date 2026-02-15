const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService: require("../db.service"),

    onEnable: (client) => {
        Logger.info("[TempChannels] Plugin habilitado");

        const dbService = require("../db.service");
        const deleteTimers = new Map();

        client.on("voiceStateUpdate", async (oldState, newState) => {
            try {
                const { channel, member, guild } = newState;

                // Usuario se conecta a un canal de voz
                if (!oldState.channel && channel) {
                    console.log("[TempChannels] Usuario conectado al canal:", channel.name);
                    
                    const settings = await dbService.getSettings(guild.id);
                    const generator = settings.generators.find((g) => g.sourceChannelId === channel.id);
                    
                    if (!generator) {
                        console.log("[TempChannels] El canal no es un generador");
                        return;
                    }

                    try {
                        // Obtener el nombre actual de la lista
                        const currentName = generator.namesList[generator.currentNameIndex];
                        console.log("[TempChannels] Usando nombre:", currentName);

                        // Crear el canal con el nombre actual
                        const tempChannel = await guild.channels.create({
                            name: currentName,
                            type: 2,
                            parent: generator.parentCategoryId || channel.parentId,
                            userLimit: generator.userLimit || 0,
                        });

                        console.log("[TempChannels] Canal creado:", tempChannel.id, "con nombre:", currentName);

                        // Guardar en BD
                        await dbService.addActiveChannel({
                            channelId: tempChannel.id,
                            guildId: guild.id,
                            sourceChannelId: channel.id,
                            channelName: currentName,
                            createdBy: member.id,
                            createdAt: new Date(),
                        });

                        // Incrementar el índice para el siguiente canal (rotatorio)
                        generator.currentNameIndex = (generator.currentNameIndex + 1) % generator.namesList.length;
                        await settings.save();

                        console.log("[TempChannels] Índice actualizado a:", generator.currentNameIndex);

                        // Mover al usuario con delay
                        setTimeout(async () => {
                            try {
                                console.log("[TempChannels] Moviendo usuario a:", tempChannel.id);
                                await member.voice.setChannel(tempChannel);
                                Logger.info(`[TempChannels] Canal temporal creado: ${currentName}`);
                            } catch (moveError) {
                                console.error("[TempChannels] Error al mover usuario:", moveError);
                            }
                        }, 500);
                        
                    } catch (error) {
                        Logger.error("[TempChannels] Error creando canal temporal:", error);
                        console.error("[TempChannels] Detalles del error:", error.message);
                    }
                }
                // Usuario se desconecta
                else if (oldState.channel && (!newState.channel || oldState.channel.id !== newState.channel?.id)) {
                    console.log("[TempChannels] Usuario desconectado de:", oldState.channel.name);
                    
                    const guildToCheck = oldState.guild;
                    if (!guildToCheck) return;

                    const activeChannels = await dbService.getActiveChannels(guildToCheck.id);
                    
                    for (const activeChannel of activeChannels) {
                        try {
                            const channel = guildToCheck.channels.cache.get(activeChannel.channelId);
                            
                            if (!channel) {
                                console.log("[TempChannels] Canal no encontrado, eliminando DB:", activeChannel.channelId);
                                await dbService.removeActiveChannel(activeChannel.channelId);
                                deleteTimers.delete(activeChannel.channelId);
                                continue;
                            }

                            // Si el canal está vacío, establecer timer de 1 minuto
                            if (channel.members.size === 0) {
                                console.log("[TempChannels] Canal vacío detectado:", channel.name);
                                
                                if (deleteTimers.has(activeChannel.channelId)) {
                                    console.log("[TempChannels] Timer ya existe para:", activeChannel.channelId);
                                    continue;
                                }

                                console.log("[TempChannels] Iniciando timer de 1 minuto para:", channel.name);
                                
                                const timer = setTimeout(async () => {
                                    try {
                                        const channelToDelete = guildToCheck.channels.cache.get(activeChannel.channelId);
                                        
                                        if (channelToDelete && channelToDelete.members.size === 0) {
                                            console.log("[TempChannels] Eliminando canal vacío:", channelToDelete.name);
                                            await channelToDelete.delete();
                                            await dbService.removeActiveChannel(activeChannel.channelId);
                                            Logger.info(`[TempChannels] Canal temporal eliminado: ${channelToDelete.name}`);
                                        }
                                    } catch (error) {
                                        Logger.error("[TempChannels] Error eliminando canal:", error);
                                    } finally {
                                        deleteTimers.delete(activeChannel.channelId);
                                    }
                                }, 60000);

                                deleteTimers.set(activeChannel.channelId, timer);
                            }
                            else if (channel.members.size > 0) {
                                if (deleteTimers.has(activeChannel.channelId)) {
                                    console.log("[TempChannels] Cancelando timer:", channel.name);
                                    clearTimeout(deleteTimers.get(activeChannel.channelId));
                                    deleteTimers.delete(activeChannel.channelId);
                                }
                            }
                        } catch (error) {
                            Logger.error("[TempChannels] Error procesando canal:", error);
                        }
                    }
                }
            } catch (error) {
                Logger.error("[TempChannels] Error en voiceStateUpdate:", error);
                console.error("[TempChannels] Detalles del error:", error.message);
            }
        });
    },
});
