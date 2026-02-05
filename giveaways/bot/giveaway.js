const { GiveawaysManager } = require("discord-giveaways");
const db = require("../db.service");

class MongooseGiveaways extends GiveawaysManager {
    constructor(client) {
        super(
            client,
            {
                default: {
                    botsCanWin: false,
                },
            },
            false, // No inicializar todavía
        );
        this.Model = db.getModel("giveaways");
        
        // Llamamos a la inicialización manual
        this._init();
    }

    // ESTE MÉTODO ES VITAL: discord-giveaways lo usa internamente para cargar la DB
    async getAllGiveaways() {
        return await this.Model.find().lean().exec();
    }

    async saveGiveaway(messageId, giveawayData) {
        await this.Model.create(giveawayData);
        return true;
    }

    async editGiveaway(messageId, giveawayData) {
        await this.Model.updateOne({ messageId }, giveawayData, { omitUndefined: true }).exec();
        return true;
    }

    async deleteGiveaway(messageId) {
        await this.Model.deleteOne({ messageId }).exec();
        return true;
    }
}

module.exports = (client) => new MongooseGiveaways(client);