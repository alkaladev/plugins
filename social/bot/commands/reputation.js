const { ApplicationCommandOptionType } = require("discord.js");
const { MiscUtils, EmbedUtils } = require("strange-sdk/utils");
const db = require("../../db.service");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "reputacion",
    description: "social:REP.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        minArgsCount: 1,
        aliases: ["popularidad"],
        subcommands: [
            {
                trigger: "ver [usuario]",
                description: "social:REP.SUB_VIEW_DESC",
            },
            {
                trigger: "dar [usuario]",
                description: "social:REP.SUB_GIVE_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "ver",
                description: "social:REP.SUB_VIEW_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "usuario",
                        description: "social:REP.SUB_VIEW_USER_DESC",
                        type: ApplicationCommandOptionType.User,
                        required: false,
                    },
                ],
            },
            {
                name: "dar",
                description: "social:REP.SUB_GIVE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "usuario",
                        description: "social:REP.SUB_GIVE_USER_DESC",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun({ message, args }) {
        const sub = args[0];
        let response;

        // status
        if (sub === "ver") {
            let target = message.author;
            if (args.length > 1) {
                const resolved = (await message.guild.resolveMember(args[1])) || message.member;
                if (resolved) target = resolved.user;
            }
            response = await viewReputation(message, target);
        }

        // give
        else if (sub === "dar") {
            const target = await message.guild.resolveMember(args[1]);
            if (!target) return message.replyT("social:REP.INVALID_USER");
            response = await giveReputation(message, message.author, target.user);
        }

        //
        else {
            response = message.guild.getT("INVALID_SUBCOMMAND", { sub });
        }

        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const sub = interaction.options.getSubcommand();
        let response;

        // status
        if (sub === "ver") {
            const target = interaction.options.getUser("usuario") || interaction.user;
            response = await viewReputation(interaction, target);
        }

        // give
        if (sub === "dar") {
            const target = interaction.options.getUser("usuario");
            response = await giveReputation(interaction, interaction.user, target);
        }

        await interaction.followUp(response);
    },
};

async function viewReputation({ guild }, target) {
    const userData = await db.getSocial(target);
    if (!userData) return guild.getT("social:REP.NO_REP", { user: target.username });

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: guild.getT("social:REP.VIEW_REP_TITLE", { target: target.username }),
        })
        .setThumbnail(target.displayAvatarURL())
        .addFields(
            {
                name: guild.getT("social:REP.GIVEN"),
                value: userData.reputation?.given.toString(),
                inline: true,
            },
            {
                name: guild.getT("social:REP.RECEIVED"),
                value: userData.reputation?.received.toString(),
                inline: true,
            },
        );

    return { embeds: [embed] };
}

async function giveReputation({ guild }, user, target) {
    if (target.bot) return guild.getT("social:REP.BOT_REP");
    if (target.id === user.id) return guild.getT("social:REP.SELF_REP");

    const userData = await db.getSocial(user);
    if (userData && userData.reputation.timestamp) {
        const lastRep = new Date(userData.reputation.timestamp);
        const diff = MiscUtils.diffHours(new Date(), lastRep);
        if (diff < 24) {
            const nextUsage = lastRep.setHours(lastRep.getHours() + 24);
            return guild.getT("social:REP.REP_COOLDOWN", {
                time: MiscUtils.getRemainingTime(nextUsage),
            });
        }
    }

    const targetData = await db.getSocial(target);

    userData.reputation.given += 1;
    userData.reputation.timestamp = new Date();
    targetData.reputation.received += 1;

    await userData.save();
    await targetData.save();

    const embed = EmbedUtils.embed()
        .setDescription(`${target.toString()} +1 Reputación!`)
        .setFooter({ text: `Por ${user.username}` })
        .setTimestamp(Date.now());

    return { embeds: [embed] };
}
