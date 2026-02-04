const { ApplicationCommandOptionType } = require("discord.js");
const balance = require("./sub/balance");
const deposit = require("./sub/deposit");
const transfer = require("./sub/transfer");
const withdraw = require("./sub/withdraw");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "banco",
    description: "economy:BANK.DESCRIPTION",
    botPermissions: ["EmbedLinks"],
    command: {
        enabled: true,
        minArgsCount: 1,
        subcommands: [
            {
                trigger: "saldo",
                description: "economy:BANK.BALANCE_DESC",
            },
            {
                trigger: "ingresar <monedas>",
                description: "economy:BANK.DEPOSIT_DESC",
            },
            {
                trigger: "retirar <monedas>",
                description: "economy:BANK.WITHDRAW_DESC",
            },
            {
                trigger: "transferir <usuario> <monedas>",
                description: "economy:BANK.TRANSFER_DESC",
            },
        ],
    },
    slashCommand: {
        enabled: true,
        options: [
            {
                name: "saldo",
                description: "economy:BANK.BALANCE_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "usuario",
                        description: "economy:BANK.BALANCE_USER",
                        type: ApplicationCommandOptionType.User,
                        required: false,
                    },
                ],
            },
            {
                name: "ingresar",
                description: "economy:BANK.DEPOSIT_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "monedas",
                        description: "economy:BANK.DEPOSIT_COINS",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
            {
                name: "retirar",
                description: "economy:BANK.WITHDRAW_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "monedas",
                        description: "economy:BANK.WITHDRAW_COINS",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
            {
                name: "transferir",
                description: "economy:BANK.TRANSFER_DESC",
                type: ApplicationCommandOptionType.Subcommand,
                options: [
                    {
                        name: "usuario",
                        description: "economy:BANK.TRANSFER_USER",
                        type: ApplicationCommandOptionType.User,
                        required: true,
                    },
                    {
                        name: "monedas",
                        description: "economy:BANK.TRANSFER_COINS",
                        type: ApplicationCommandOptionType.Integer,
                        required: true,
                    },
                ],
            },
        ],
    },

    async messageRun({ message, args }) {
        const sub = args[0];
        let response;

        if (sub === "saldo") {
            const resolved = (await message.guild.resolveMember(args[1])) || message.member;
            response = await balance(message.guild, resolved.user);
        }

        //
        else if (sub === "ingresar") {
            const coins = args.length && parseInt(args[1]);
            response = await deposit(message.guild, message.author, coins);
        }

        //
        else if (sub === "retirar") {
            const coins = args.length && parseInt(args[1]);
            if (isNaN(coins)) return message.replyT("economy:BANK.INVALID_WITHDRAW");
            response = await withdraw(message.guild, message.author, coins);
        }

        //
        else if (sub === "transferir") {
            if (args.length < 3) return message.replyT("economy:BANK.INVALID_TRANSFER");
            const target = await message.guild.resolveMember(args[1], true);
            if (!target) return message.replyT("economy:BANK.INVALID_TRANSFER_USER");
            const coins = parseInt(args[2]);
            if (isNaN(coins)) return message.replyT("economy:BANK.INVALID_TRANSFER_AMOUNT");
            response = await transfer(message.guild, message.author, target.user, coins);
        }

        //
        else {
            return message.replyT("INVALID_SUBCOMMAND", { sub });
        }

        await message.reply(response);
    },

    async interactionRun({ interaction }) {
        const sub = interaction.options.getSubcommand();
        let response;

        // balance
        if (sub === "saldo") {
            const user = interaction.options.getUser("usuario") || interaction.user;
            response = await balance(interaction.guild, user);
        }

        // deposit
        else if (sub === "ingresar") {
            const coins = interaction.options.getInteger("monedas");
            response = await deposit(interaction.guild, interaction.user, coins);
        }

        // withdraw
        else if (sub === "retirar") {
            const coins = interaction.options.getInteger("monedas");
            response = await withdraw(interaction.guild, interaction.user, coins);
        }

        // transfer
        else if (sub === "transferir") {
            const user = interaction.options.getUser("usuario");
            const coins = interaction.options.getInteger("monedas");
            response = await transfer(interaction.guild, interaction.user, user, coins);
        }

        await interaction.followUp(response);
    },
};
