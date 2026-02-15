const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService: require("../db.service"),

    onEnable: (client) => {
        Logger.info("[TempChannels] Plugin habilitado");

        const dbService = require("../db.service");
        const deleteTimers = new Map(); // Map para rastrear timers de eliminación

        // Escuchar cambios en canales de voz
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
                        const tempChannelName = generator.namePrefix;

                        console.log("[TempChannels] Creando canal temporal:", tempChannelName);

                        const tempChannel = await guild.channels.create({
                            name: tempChannelName,
                            type: 2,
                            parent: generator.parentCategoryId || channel.parentId,
                            userLimit: generator.userLimit || 0,
                        });

                        console.log("[TempChannels] Canal creado:", tempChannel.id);

                        await dbService.addActiveChannel({
                            channelId: tempChannel.id,
                            guildId: guild.id,
                            sourceChannelId: channel.id,
                            namePrefix: generator.namePrefix,
                            createdBy: member.id,
                            createdAt: new Date(),
                        });

                        console.log("[TempChannels] Datos guardados en DB");

                        // Mover al usuario al canal temporal con delay pequeño
                        setTimeout(async () => {
                            try {
                                console.log("[TempChannels] Intentando mover usuario a:", tempChannel.id);
                                await member.voice.setChannel(tempChannel);
                                console.log("[TempChannels] Usuario movido correctamente");
                                Logger.info(`[TempChannels] Canal temporal creado: ${tempChannelName}`);
                            } catch (moveError) {
                                console.error("[TempChannels] Error al mover usuario:", moveError);
                                Logger.error("[TempChannels] Error moviendo usuario:", moveError);
                            }
                        }, 500);
                        
                    } catch (error) {
                        Logger.error("[TempChannels] Error creando canal temporal:", error);
                        console.error("[TempChannels] Detalles del error:", error.message);
                    }
                }
                // Usuario se desconecta o se mueve
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
                                
                                // Si ya existe un timer, no crear otro
                                if (deleteTimers.has(activeChannel.channelId)) {
                                    console.log("[TempChannels] Timer ya existe para:", activeChannel.channelId);
                                    continue;
                                }

                                console.log("[TempChannels] Iniciando timer de 1 minuto para:", channel.name);
                                
                                // Crear timer de 1 minuto (60000 ms)
                                const timer = setTimeout(async () => {
                                    try {
                                        const channelToDelete = guildToCheck.channels.cache.get(activeChannel.channelId);
                                        
                                        // Verificar que siga vacío
                                        if (channelToDelete && channelToDelete.members.size === 0) {
                                            console.log("[TempChannels] Eliminando canal vacío después de 1 minuto:", channelToDelete.name);
                                            await channelToDelete.delete();
                                            await dbService.removeActiveChannel(activeChannel.channelId);
                                            Logger.info(`[TempChannels] Canal temporal eliminado automáticamente: ${channelToDelete.name}`);
                                        } else {
                                            console.log("[TempChannels] Canal ya tiene usuarios, no se elimina:", activeChannel.channelId);
                                        }
                                    } catch (error) {
                                        Logger.error("[TempChannels] Error eliminando canal después de timer:", error);
                                    } finally {
                                        deleteTimers.delete(activeChannel.channelId);
                                    }
                                }, 60000); // 1 minuto = 60000 ms

                                deleteTimers.set(activeChannel.channelId, timer);
                            }
                            // Si el canal no está vacío, limpiar timer si existe
                            else if (channel.members.size > 0) {
                                if (deleteTimers.has(activeChannel.channelId)) {
                                    console.log("[TempChannels] Cancelando timer, canal tiene usuarios:", channel.name);
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
