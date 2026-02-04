const { ApplicationCommandOptionType } = require("discord.js");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "autoeliminar",
    description: "automod:DELETE.DESC",
    userPermissions: ["ManageGuild"],
    command: {
        enabled: true,
        minArgsCount: 2,
        subcommands: [
            {
                trigger: "archivos <on|off>",
                description: "automod:DELETE.ANTI_ATTACH",
            },
            {
                trigger: "invitaciones <on|off>",
                description: "automod:DELETE.ANTI_INVITE",
            },
            {
                trigger: "links <on|off>",
                description: "automod:DELETE.ANTI_LINKS",
            },
            {
                trigger: "lineas <number>",
                description: "automod:DELETE.ANTI_MAXLINES",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: "archivos",
                description: "automod:DELETE.ANTI_ATTACH",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "estado",
                        description: "automod:DELETE.ANTI_ATTACH_STATUS",
                        required: true,
                        type: ApplicationCommandOptionType.String,
                        choices: [
                            {
                                name: "ON",
                                value: "ON",
                            },
                            {
                                name: "OFF",
                                value: "OFF",
                            },
                        ],
                    },
                ],
            },
            {
                name: "invitaciones",
                description: "automod:DELETE.ANTI_INVITE",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "estado",
                        description: "automod:DELETE.ANTI_INVITE_STATUS",
                        required: true,
                        type: ApplicationCommandOptionType.String,
                        choices: [
                            {
                                name: "ON",
                                value: "ON",
                            },
                            {
                                name: "OFF",
                                value: "OFF",
                            },
                        ],
                    },
                ],
            },
            {
                name: "links",
                description: "automod:DELETE.ANTI_LINKS",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "estado",
                        description: "automod:DELETE.ANTI_LINKS_STATUS",
                        required: true,
                        type: ApplicationCommandOptionType.String,
                        choices: [
                            {
                                name: "ON",
                                value: "ON",
                            },
                            {
                                name: "OFF",
                                value: "OFF",
                            },
                        ],
                    },
                ],
            },
            {
                name: "lineas",
                description: "automod:DELETE.ANTI_MAXLINES",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "cantidad",
                        description: "automod:DELETE.ANTI_MAXLINES_AMOUNT",
                        required: true,
                        type: ApplicationCommandOptionType.Integer,
                    },
                ],
            },
        ],
    },

    async messageRun({ message, args }) {
        const settings = await db.getSettings(message.guild);
        const sub = args[0].toLowerCase();
        let response;

        if (sub == "archivos") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.replyT("automod:DELETE.INVALID_STATUS");
            response = await antiAttachments(settings, status, message.guild);
        }

        //
        else if (sub === "invitaciones") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.replyT("automod:DELETE.INVALID_STATUS");
            response = await antiInvites(settings, status, message.guild);
        }

        //
        else if (sub == "links") {
            const status = args[1].toLowerCase();
            if (!["on", "off"].includes(status))
                return message.replyT("automod:DELETE.INVALID_STATUS");
            response = await antilinks(settings, status, message.guild);
        }

        //
        else if (sub === "lineas") {
            const max = args[1];
            response = await maxLines(settings, max, message.guild);
        }

        //
        else response = message.guild.getT("INVALID_SUBCOMMAND", { sub });
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const sub = interaction.options.getSubcommand();
        const settings = await db.getSettings(interaction.guild);
        let response;

        if (sub == "archivos") {
            response = await antiAttachments(
                settings,
                interaction.options.getString("estado"),
                interaction.guild,
            );
        } else if (sub === "invitaciones") {
            response = await antiInvites(
                settings,
                interaction.options.getString("estado"),
                interaction.guild,
            );
        } else if (sub == "links") {
            response = await antilinks(
                settings,
                interaction.options.getString("estado"),
                interaction.guild,
            );
        } else if (sub === "lineas") {
            response = await maxLines(
                settings,
                interaction.options.getInteger("cantidad"),
                interaction.guild,
            );
        } else response = interaction.guild.getT("INVALID_SUBCOMMAND", { sub });

        await interaction.followUp(response);
    },
};

async function antiAttachments(settings, input, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    settings.anti_attachments = status;
    await settings.save();
    return status
        ? guild.getT("automod:DELETE.ANTI_ATTACHMENTS_ON")
        : guild.getT("automod:DELETE.ANTI_ATTACHMENTS_OFF");
}

async function antiInvites(settings, input, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    settings.anti_invites = status;
    await settings.save();
    return status
        ? guild.getT("automod:DELETE.ANTI_INVITES_ON")
        : guild.getT("automod:DELETE.ANTI_INVITES_OFF");
}

async function antilinks(settings, input, guild) {
    const status = input.toUpperCase() === "ON" ? true : false;
    settings.anti_links = status;
    await settings.save();
    return status
        ? guild.getT("automod:DELETE.ANTI_LINKS_ON")
        : guild.getT("automod:DELETE.ANTI_LINKS_OFF");
}

async function maxLines(settings, input, guild) {
    const lines = Number.parseInt(input);
    if (isNaN(lines)) return guild.getT("automod:DELETE.ANTI_MAXLINES_NAN");

    settings.max_lines = lines;
    await settings.save();
    return input === 0
        ? guild.getT("automod:DELETE.ANTI_MAXLINES_DISABLED")
        : guild.getT("automod:DELETE.ANTI_MAXLINES_SET", { amount: lines });
}
