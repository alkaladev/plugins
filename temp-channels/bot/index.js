const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    dbService: require("../db.service"),

    onEnable: (client) => {
        Logger.info("[TempChannels] Plugin habilitado");

        const dbService = require("../db.service");

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
                        // Obtener canales activos para este generador
                        const activeChannels = await dbService.getActiveChannels(guild.id);
                        const generatorActiveChannels = activeChannels.filter(ac => ac.sourceChannelId === channel.id);
                        
                        console.log("[TempChannels] Canales activos para este generador:", generatorActiveChannels.length);
                        console.log("[TempChannels] NamesList:", generator.namesList);

                        // Obtener los nombres ya usados (activos)
                        const usedNames = generatorActiveChannels.map(ac => ac.channelName);
                        console.log("[TempChannels] Nombres ya usados:", usedNames);

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

                        console.log("[TempChannels] Nombre disponible encontrado:", currentName, "en índice:", foundIndex);

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

                        console.log("[TempChannels] Canal guardado en BD");

                        // Mover al usuario
                        try {
                            console.log("[TempChannels] Moviendo usuario a:", tempChannel.id);
                            await member.voice.setChannel(tempChannel);
                            console.log("[TempChannels] Usuario movido correctamente");
                            Logger.info(`[TempChannels] Canal temporal creado: ${currentName}`);
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
                    console.log("[TempChannels] Usuario desconectado de:", oldState.channel.name);
                    
                    const guildToCheck = oldState.guild;
                    if (!guildToCheck) return;

                    const activeChannels = await dbService.getActiveChannels(guildToCheck.id);
                    console.log("[TempChannels] Canales activos encontrados:", activeChannels.length);
                    
                    for (const activeChannel of activeChannels) {
                        try {
                            const channel = guildToCheck.channels.cache.get(activeChannel.channelId);
                            
                            console.log("[TempChannels] Revisando canal:", activeChannel.channelId, "Miembros:", channel?.members.size);
                            
                            if (!channel) {
                                console.log("[TempChannels] Canal no encontrado, eliminando DB:", activeChannel.channelId);
                                await dbService.removeActiveChannel(activeChannel.channelId);
                                continue;
                            }

                            // Si el canal está vacío, ELIMINAR INMEDIATAMENTE
                            if (channel.members.size === 0) {
                                console.log("[TempChannels] Canal vacío, eliminando inmediatamente:", channel.name);
                                
                                try {
                                    await channel.delete();
                                    await dbService.removeActiveChannel(activeChannel.channelId);
                                    Logger.info(`[TempChannels] Canal temporal eliminado: ${channel.name}`);
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
