const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vlogs",
    description: "Ver logs y estadísticas de canales temporales",
    userPermissions: ["ManageGuild"],
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "tipo",
                description: "Tipo de log a ver",
                type: ApplicationCommandOptionType.String,
                required: false,
                choices: [
                    { name: "Todos", value: "all" },
                    { name: "Creados", value: "created" },
                    { name: "Eliminados", value: "deleted" },
                ],
            },
            {
                name: "limite",
                description: "Cantidad de logs a mostrar (máx 50)",
                type: ApplicationCommandOptionType.Integer,
                required: false,
                minValue: 1,
                maxValue: 50,
            },
        ],
    },

    async interactionRun({ interaction }) {
        await interaction.deferReply();

        const tipo = interaction.options.getString("tipo") || "all";
        const limite = interaction.options.getInteger("limite") || 20;

        try {
            const guildId = interaction.guild.id;
            const logs = await db.getLogs(guildId, 100);

            let filteredLogs = logs;
            if (tipo === "created") {
                filteredLogs = logs.filter(l => l.action === "created");
            } else if (tipo === "deleted") {
                filteredLogs = logs.filter(l => l.action === "deleted");
            }

            filteredLogs = filteredLogs.slice(0, limite);

            if (filteredLogs.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No hay logs disponibles");
                return interaction.editReply({ embeds: [embed] });
            }

            const logsText = filteredLogs
                .map((log) => {
                    const fecha = new Date(log.timestamp).toLocaleString("es-ES");
                    const accion = log.action === "created" ? "✅ Creado" : "❌ Eliminado";
                    const duracion = log.duration ? ` (${Math.floor(log.duration / 60)}m)` : "";
                    return `${accion}: **${log.channelName}** - ${fecha}${duracion}`;
                })
                .join("\n");

            const embed = new EmbedBuilder()
                .setColor("#422afb")
                .setTitle("📊 Logs de Canales Temporales")
                .setDescription(logsText || "Sin logs")
                .setFooter({ text: `Total: ${filteredLogs.length} logs` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[TempChannels] Error en vlogs:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error al obtener los logs");
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
