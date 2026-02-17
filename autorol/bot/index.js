const { BotPlugin } = require("strange-sdk");
const { Logger } = require("strange-sdk/utils");

module.exports = new BotPlugin({
    dependencies: [],
    baseDir: __dirname,
    icon: "fa-solid fa-crown",
    options: {
        description: "Crea embeds con botones para que los usuarios obtengan roles automáticamente."
    },
    dbService: require("../db.service"),

    onEnable: (client) => {
        Logger.success("[Autorol] Cargando plugin...");

        const dbService = require("../db.service");

        // Evento para interactuar con los botones de roles
        client.on("interactionCreate", async (interaction) => {
            try {
                // Solo procesar button interactions
                if (!interaction.isButton()) return;

                // Verificar si el botón es del autorol
                if (!interaction.customId.startsWith("autorol_")) return;

                // Extraer información del customId
                const parts = interaction.customId.split("_");
                const roleId = parts[1];

                if (!roleId) {
                    Logger.error("[Autorol] Role ID no encontrado en customId");
                    return;
                }

                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) {
                    await interaction.reply({
                        content: "❌ El rol no existe o fue eliminado.",
                        ephemeral: true,
                    });
                    return;
                }

                const member = interaction.member;
                let action = "add"; // add o remove

                if (member.roles.cache.has(roleId)) {
                    action = "remove";
                    await member.roles.remove(roleId);
                } else {
                    await member.roles.add(roleId);
                }

                const emoji = action === "add" ? "✅" : "❌";
                const text = action === "add" ? "añadido" : "removido";

                await interaction.reply({
                    content: `${emoji} Rol **${role.name}** ha sido ${text}.`,
                    ephemeral: true,
                });

                Logger.success(
                    `[Autorol] Rol ${action === "add" ? "asignado" : "removido"}: ${role.name} a ${member.user.tag}`
                );
            } catch (error) {
                Logger.error("[Autorol] Error en interactionCreate:", error);
                console.error("[Autorol] Detalles del error:", error.message);

                try {
                    await interaction.reply({
                        content: "❌ Ocurrió un error al procesar tu solicitud.",
                        ephemeral: true,
                    });
                } catch (replyError) {
                    console.error("[Autorol] Error en reply:", replyError.message);
                }
            }
        });

        Logger.success("[Autorol] Plugin cargado correctamente");
    },
});
