const { EmbedBuilder, ApplicationCommandOptionType } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "vhistorial",
    description: "Ver historial de canales temporales eliminados",
    userPermissions: ["ManageGuild"],
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "limite",
                description: "Cantidad de canales a mostrar (máx 50)",
                type: ApplicationCommandOptionType.Integer,
                required: false,
                minValue: 1,
                maxValue: 50,
            },
        ],
    },

    async interactionRun({ interaction }) {
        await interaction.deferReply();

        const limite = interaction.options.getInteger("limite") || 15;

        try {
            const guildId = interaction.guild.id;
            const historial = await db.getDeletedChannels(guildId, 100);

            const filtrado = historial.slice(0, limite);

            if (filtrado.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor("#fd3b02")
                    .setDescription("❌ No hay canales en el historial");
                return interaction.editReply({ embeds: [embed] });
            }

            const historialText = filtrado
                .map((canal) => {
                    const fechaCreacion = new Date(canal.createdAt).toLocaleString("es-ES");
                    const fechaEliminacion = new Date(canal.deletedAt).toLocaleString("es-ES");
                    const duracionMinutos = Math.floor(canal.duration / 60);
                    const razon = canal.reason === "empty" ? "Vacío" : canal.reason;

                    return `
**${canal.channelName}**
📅 Creado: ${fechaCreacion}
🗑️ Eliminado: ${fechaEliminacion}
⏱️ Duración: ${duracionMinutos}m
👥 Miembros: ${canal.members}
📋 Razón: ${razon}`;
                })
                .join("\n━━━━━━━━━━━━━━━━━\n");

            const embed = new EmbedBuilder()
                .setColor("#422afb")
                .setTitle("📜 Historial de Canales Eliminados")
                .setDescription(historialText || "Sin historial")
                .setFooter({ text: `Total: ${filtrado.length} canales` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error("[TempChannels] Error en vhistorial:", error);
            const embed = new EmbedBuilder()
                .setColor("#fd3b02")
                .setDescription("❌ Error al obtener el historial");
            await interaction.editReply({ embeds: [embed] });
        }
    },
};
