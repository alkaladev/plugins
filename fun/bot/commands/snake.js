const SnakeGame = require("snakecord");

/**
 * @type {import('strange-sdk').CommandType}
 */
module.exports = {
    name: "snake",
    description: "fun:SNAKE.DESCRIPTION",
    cooldown: 300,
    botPermissions: [
        "SendMessages",
        "EmbedLinks",
        "AddReactions",
        "ReadMessageHistory",
        "ManageMessages",
    ],
    command: {
        enabled: true,
    },
    slashCommand: {
        enabled: true,
    },

    async messageRun({ message }) {
        await message.reply("**Comenzando el juego de la serpiente**");
        await startSnakeGame(message);
    },

    async interactionRun({ interaction }) {
        await interaction.followUp("**Comenzando el juego de la serpiente**");
        await startSnakeGame(interaction);
    },
};

/**
 *
 */
async function startSnakeGame(data) {
    const { guild } = data;
    const snakeGame = new SnakeGame({
        title: guild.getT("fun:SNAKE.GAME_TITLE"),
        color: "BLUE",
        timestamp: true,
        gameOverTitle: guild.getT("fun:SNAKE.GAME_OVER_TITLE"),
    });

    await snakeGame.newGame(data);
}
