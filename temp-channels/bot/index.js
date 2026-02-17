const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService: require("../db.service"),

    onEnable: (client) => {
        Logger.success("[TempChannels IPC] Cargando eventos IPC...");

        const dbService = require("../db.service");
        const deleteTimers = new Map();

        Logger.success("[TempChannels IPC] Eventos IPC cargados");

        client.on("voiceStateUpdate", async (oldState, newState) => {
            try {
                const { channel, member, guild } = newState;

                // Usuario se conecta a un canal de voz
                if (!oldState.channel && channel) {
                    Logger.info("[TempChannels] Usuario conectado al canal: " + channel.name);
                    
                    const settings = await dbService.getSettings(guild.id);
                    const generator = settings.generators.find((g) => g.sourceChannelId === channel.id);
                    
                    if (!generator || !generator.enabled) {
                        return;
                    }

                    try {
                        // Obtener canales activos para este generador
                        const activeChannels = await dbService.getActiveChannels(guild.id);
                        const generatorActiveChannels = activeChannels.filter(ac => ac.sourceChannelId === channel.id);

                        // Obtener los nombres ya usados (activos)
                        const usedNames = generatorActiveChannels.map(ac => ac.channelName);

                        // Buscar el PRIMER nombre disponible en la lista
                        let currentName = null;
                        let foundIndex = -1;

                        for (let i = 0; i < generator.namesList.length; i++) {
                            if (!usedNames.includes(generator.namesList[i])) {
                                currentName = generator.namesList[i];
                                foundIndex = i;
                                break;
                            }
                        }

                        if (!currentName) {
                            console.error("[TempChannels] Error: No hay nombres disponibles");
                            return;
                        }

                        // Crear el canal con el nombre encontrado
                        const tempChannel = await guild.channels.create({
                            name: currentName,
                            type: 2,
                            parent: generator.parentCategoryId || channel.parentId,
                            userLimit: generator.userLimit || 0,
                        });

                        // Guardar en BD
                        await dbService.addActiveChannel({
                            channelId: tempChannel.id,
                            guildId: guild.id,
                            sourceChannelId: channel.id,
                            channelName: currentName,
                            createdBy: member.id,
                            createdAt: new Date(),
                        });

                        // Registrar log
                        // await dbService.addLog(guild.id, {
                        //     action: 'created',
                        //     channelId: tempChannel.id,
                        //     channelName: currentName,
                        //     userId: member.id,
                        //     sourceChannelId: channel.id,
                        //     timestamp: new Date(),
                        // });

                        // Mover al usuario
                        try {
                            await member.voice.setChannel(tempChannel);
                            Logger.success(`[TempChannels] Canal temporal creado: ${currentName}`);
                        } catch (moveError) {
                            console.error("[TempChannels] Error al mover usuario:", moveError.message);
                            Logger.error("[TempChannels] Error moviendo usuario:", moveError);
                        }
                        
                    } catch (error) {
                        Logger.error("[TempChannels] Error creando canal temporal:", error);
                        console.error("[TempChannels] Detalles del error:", error.message);
                    }
                }
                // Usuario se desconecta
                else if (oldState.channel && (!newState.channel || oldState.channel.id !== newState.channel?.id)) {
                    Logger.success("[TempChannels] Usuario desconectado de: " + oldState.channel.name);
                    
                    const guildToCheck = oldState.guild;
                    if (!guildToCheck) return;

                    const activeChannels = await dbService.getActiveChannels(guildToCheck.id);
                    
                    for (const activeChannel of activeChannels) {
                        try {
                            const channel = guildToCheck.channels.cache.get(activeChannel.channelId);
                            
                            if (!channel) {
                                await dbService.removeActiveChannel(activeChannel.channelId);
                                continue;
                            }

                            // Si el canal está vacío, ELIMINAR INMEDIATAMENTE
                            if (channel.members.size === 0) {
                                Logger.success("[TempChannels] Canal vacío, eliminando inmediatamente: " + channel.name);
                                
                                try {
                                    const duration = Math.floor((Date.now() - new Date(activeChannel.createdAt)) / 1000);
                                    
                                    await channel.delete();
                                    await dbService.removeActiveChannel(activeChannel.channelId);
                                    
                                    // Registrar en historial
                                    // await dbService.addDeletedChannel(guildToCheck.id, {
                                    //     channelId: activeChannel.channelId,
                                    //     channelName: activeChannel.channelName,
                                    //     sourceChannelId: activeChannel.sourceChannelId,
                                    //     createdBy: activeChannel.createdBy,
                                    //     createdAt: new Date(activeChannel.createdAt),
                                    //     deletedAt: new Date(),
                                    //     duration: duration,
                                    //     members: 0,
                                    //     reason: 'empty',
                                    // });

                                    // Registrar log
                                    // await dbService.addLog(guildToCheck.id, {
                                    //     action: 'deleted',
                                    //     channelId: activeChannel.channelId,
                                    //     channelName: activeChannel.channelName,
                                    //     userId: 'system',
                                    //     sourceChannelId: activeChannel.sourceChannelId,
                                    //     timestamp: new Date(),
                                    //     duration: duration,
                                    // });
                                    
                                    Logger.success(`[TempChannels] Canal temporal eliminado: ${channel.name}`);
                                } catch (deleteError) {
                                    console.error("[TempChannels] Error eliminando canal:", deleteError.message);
                                }
                            }
                        } catch (error) {
                            Logger.error("[TempChannels] Error procesando canal:", error);
                            console.error("[TempChannels] Error:", error.message);
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
