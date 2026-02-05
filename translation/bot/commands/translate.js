const { ApplicationCommandOptionType } = require("discord.js");
const { EmbedUtils } = require("strange-sdk/utils");
const { translate } = require("../utils");
const { GOOGLE_TRANSLATE } = require("../../data.json");

// Discord limits to a maximum of 25 choices for slash command
// Add any 25 language codes from here: https://cloud.google.com/translate/docs/languages

const choices = [
    "ar",
    "cs",
    "de",
    "en",
    "fa",
    "fr",
    "hi",
    "hr",
    "it",
    "ja",
    "ko",
    "la",
    "nl",
    "pl",
    "ta",
    "te",
    "es",
];

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "traducir",
    description: "translation:CMD_DESC",
    cooldown: 20,
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        aliases: ["tr"],
        usage: "<iso-code> <mensaje>",
        minArgsCount: 2,
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "idioma",
                description: "translation:CMD_LANGUAGE_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
                choices: choices.map((choice) => ({
                    name: GOOGLE_TRANSLATE[choice],
                    value: choice,
                })),
            },
            {
                name: "texto",
                description: "translation:CMD_TEXT_DESC",
                type: ApplicationCommandOptionType.String,
                required: true,
            },
        ],
    },

    async messageRun({ message, args }) {
        let embed = EmbedUtils.embed();
        const outputCode = args.shift();

        if (!GOOGLE_TRANSLATE[outputCode]) {
            embed.setDescription(
                "Código de traducción inválido. Visita [aquí](https://cloud.google.com/translate/docs/languages) para ver la lista de códigos de traducción compatibles.",
            );
            return message.reply({ embeds: [embed] });
        }

        const input = args.join(" ");
        if (!input) message.reply("Proporciona algún texto de traducción válido");

        const response = await getTranslation(message, message.author, input, outputCode);
        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const outputCode = interaction.options.getString("idioma");
        const input = interaction.options.getString("texto");
        const response = await getTranslation(interaction, interaction.user, input, outputCode);
        await interaction.followUp(response);
    },
};

async function getTranslation({ guild }, author, input, outputCode) {
    const data = await translate(input, outputCode);
    if (!data) return guild.getT("translation:CMD_ERROR");

    const embed = EmbedUtils.embed()
        .setAuthor({
            name: `${author.username} says`,
            iconURL: author.avatarURL(),
        })
        .setDescription(data.output)
        .setFooter({
            text: `${data.inputLang} (${data.inputCode}) ⟶ ${data.outputLang} (${data.outputCode})`,
        });

    return { embeds: [embed] };
}
