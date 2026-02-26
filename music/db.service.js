const { DBService, Schema } = require("strange-sdk");

class MusicService extends DBService {
    constructor() {
        super(__dirname);
    }

    defineSchemas() {
        return {
            history: new Schema({
                guild_id:  { type: String, required: true, index: true },
                title:     { type: String, required: true },
                author:    { type: String, default: "Unknown" },
                artwork:   { type: String, default: "" },
                duration:  { type: Number, default: 0 },
                played_at: { type: Date, default: Date.now, index: true },
            }, { timestamps: false }),

            top_tracks: new Schema({
                guild_id:    { type: String, required: true, index: true },
                title:       { type: String, required: true },
                author:      { type: String, default: "Unknown" },
                artwork:     { type: String, default: "" },
                duration:    { type: Number, default: 0 },
                count:       { type: Number, default: 1 },
                last_played: { type: Date, default: Date.now },
            }),

            pinned_playlists: new Schema({
                guild_id:    { type: String, required: true, index: true },
                name:        { type: String, required: true },
                icon:        { type: String, default: "fa-music" },
                color:       { type: String, default: "from-purple-500 to-indigo-600" },
                query:       { type: String, default: "" },
                track_count: { type: Number, default: 0 },
                order:       { type: Number, default: 0 },
            }),

            pinned_artists: new Schema({
                guild_id: { type: String, required: true, index: true },
                name:     { type: String, required: true },
                artwork:  { type: String, default: "" },
                query:    { type: String, default: "" },
                order:    { type: Number, default: 0 },
            }),
        };
    }

    // ── HISTORIAL ────────────────────────────────────────────
    async addToHistory(guildId, track) {
        const Model = this.getModel("history");
        await new Model({ guild_id: guildId, ...track, played_at: new Date() }).save();
        const count = await Model.countDocuments({ guild_id: guildId });
        if (count > 200) {
            const oldest = await Model.find({ guild_id: guildId })
                .sort({ played_at: 1 }).limit(count - 200).select("_id");
            await Model.deleteMany({ _id: { $in: oldest.map(d => d._id) } });
        }
    }

    async getHistory(guildId, limit = 20) {
        return this.getModel("history")
            .find({ guild_id: guildId })
            .sort({ played_at: -1 })
            .limit(limit)
            .lean();
    }

    // ── TOP TRACKS ───────────────────────────────────────────
    async incrementTopTrack(guildId, track) {
        await this.getModel("top_tracks").findOneAndUpdate(
            { guild_id: guildId, title: track.title, author: track.author },
            { $inc: { count: 1 }, $set: { artwork: track.artwork, duration: track.duration, last_played: new Date() } },
            { upsert: true, new: true }
        );
    }

    async getTopTracks(guildId, limit = 5) {
        return this.getModel("top_tracks")
            .find({ guild_id: guildId })
            .sort({ count: -1 })
            .limit(limit)
            .lean();
    }

    // ── PLAYLISTS ANCLADAS ───────────────────────────────────
    async getPinnedPlaylists(guildId) {
        return this.getModel("pinned_playlists")
            .find({ guild_id: guildId })
            .sort({ order: 1 })
            .lean();
    }

    async upsertPinnedPlaylist(guildId, data) {
        const Model = this.getModel("pinned_playlists");
        if (data._id) {
            return Model.findOneAndUpdate({ _id: data._id, guild_id: guildId }, data, { new: true });
        }
        const count = await Model.countDocuments({ guild_id: guildId });
        return new Model({ guild_id: guildId, ...data, order: count }).save();
    }

    async deletePinnedPlaylist(guildId, id) {
        return this.getModel("pinned_playlists").deleteOne({ _id: id, guild_id: guildId });
    }

    async reorderPinnedPlaylists(guildId, orderedIds) {
        return Promise.all(
            orderedIds.map((id, i) =>
                this.getModel("pinned_playlists").updateOne({ _id: id, guild_id: guildId }, { order: i })
            )
        );
    }

    // ── ARTISTAS ANCLADOS ────────────────────────────────────
    async getPinnedArtists(guildId) {
        return this.getModel("pinned_artists")
            .find({ guild_id: guildId })
            .sort({ order: 1 })
            .lean();
    }

    async upsertPinnedArtist(guildId, data) {
        const Model = this.getModel("pinned_artists");
        if (data._id) {
            return Model.findOneAndUpdate({ _id: data._id, guild_id: guildId }, data, { new: true });
        }
        const count = await Model.countDocuments({ guild_id: guildId });
        return new Model({ guild_id: guildId, ...data, order: count }).save();
    }

    async deletePinnedArtist(guildId, id) {
        return this.getModel("pinned_artists").deleteOne({ _id: id, guild_id: guildId });
    }
}

module.exports = new MusicService();
