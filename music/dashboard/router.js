// plugins/music/dashboard/router.js - LAVALINK 2.9+

const path = require("path");
const router = require("express").Router();
const { Logger } = require("strange-sdk/utils");

const VIEW_FILE = path.join(__dirname, "view.ejs");

// Configuración
const IPC_TIMEOUT = 8000; // 8 segundos de timeout (aumentado para Lavalink 2.9+)
const IPC_CLIENT_NAME = "Bot #0";
const ALLOWED_EVENTS = [
    "music:TOGGLE_PAUSE",
    "music:SKIP_TRACK",
    "music:STOP_PLAYER",
    "music:SET_VOLUME",
    "music:PLAY_SONG",
    "music:ADD_QUEUE"
];

/**
 * Obtener cliente IPC con validación
 */
function getIPCClient(req) {
    if (!req.app.ipcServer?.server?.sockets) {
        return null;
    }
    
    const botSocket = req.app.ipcServer.server.sockets.get("Bot #0");
    
    if (!botSocket) {
        const sockets = Array.from(req.app.ipcServer.server.sockets.values());
        return sockets.find(s => s.name?.includes("Bot")) || sockets[0] || null;
    }
    
    return botSocket || null;
}

/**
 * Wrapper para enviar mensajes IPC con timeout
 */
function sendIPCMessage(ipcClient, event, data, timeout = IPC_TIMEOUT) {
    return new Promise((resolve, reject) => {
        if (!ipcClient) {
            reject(new Error('IPC client not available'));
            return;
        }

        const timer = setTimeout(() => {
            reject(new Error(`IPC timeout after ${timeout}ms`));
        }, timeout);

        try {
            ipcClient.send(
                { event, payload: data },
                { receptive: true }
            )
            .then(response => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        } catch (err) {
            clearTimeout(timer);
            reject(err);
        }
    });
}

/**
 * Formatear duración en ms a MM:SS
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * GET /
 * Redirige a la página principal del reproductor
 */
router.get("/", (req, res) => {
    const guildId = res.locals.guild?.id;
    if (!guildId) return res.status(400).send("Guild no definida");
    res.redirect(`/dashboard/${guildId}/music/player`);
});

/**
 * GET /player
 * Página del reproductor
 */
router.get("/player", (req, res) => {
    const guild = res.locals.guild;
    if (!guild) return res.status(400).send("Guild no definida");

    res.render(VIEW_FILE, {
        guild,
        tr: req.translate || ((key) => key),
        tab: "player",
    });
});

/**
 * GET /health
 * Verifica si el IPC está disponible
 */
router.get("/health", (req, res) => {
    const ipcClient = getIPCClient(req);
    
    if (!ipcClient) {
        return res.status(503).json({
            status: 'unavailable',
            message: 'Bot IPC client not connected',
            timestamp: new Date().toISOString()
        });
    }

    return res.status(200).json({
        status: 'healthy',
        ipcClient: IPC_CLIENT_NAME,
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /status
 * Obtiene el estado del reproductor usando IPC
 */
router.get("/status", async (req, res) => {
    const guildId = res.locals.guild?.id;
    
    if (!guildId) {
        Logger.warn('[MUSIC-DASH] /status: Guild ID not found');
        return res.status(400).json({ 
            error: "Guild ID not found",
            active: false,
            paused: false,
            volume: 0,
            current: null,
            queue: []
        });
    }

    const ipcClient = getIPCClient(req);
    
    if (!ipcClient) {
        Logger.warn('[MUSIC-DASH] /status: IPC client not available');
        return res.status(503).json({
            error: "Bot not connected",
            active: false,
            paused: false,
            volume: 0,
            current: null,
            queue: [],
            retryAfter: 5000
        });
    }

    try {
        //Logger.info(`[MUSIC-DASH] /status: Requesting status for guild ${guildId}`);
        
        const response = await sendIPCMessage(
            ipcClient,
            "music:getStatus",
            { guildId }
        );

        // 🔧 LAVALINK 2.9+: Desenvuelve la respuesta si viene envuelta
        let data = response;
        
        if (response?.success === true && response?.data) {
            data = response.data;
        }

        if (!data) {
            Logger.warn(`[MUSIC-DASH] /status: No data returned for guild ${guildId}`);
            return res.json({
                active: false,
                paused: false,
                volume: 0,
                current: null,
                queue: []
            });
        }

        // Validar estructura de respuesta
        const validatedData = {
            active: Boolean(data.active),
            paused: Boolean(data.paused),
            volume: Math.min(100, Math.max(0, Number(data.volume) || 0)),
            position: Number(data.position) || 0,
            current: data.current ? {
                title: String(data.current.title || 'Unknown'),
                author: String(data.current.author || 'Unknown'),
                artwork: String(
                    data.current.artwork ||
                    data.current.info?.artworkUrl ||
                    data.current.info?.thumbnail ||
                    data.current.info?.iconUrl ||
                    ''
                ),
                duration: Number(data.current.duration) || 0
            } : null,
            queue: Array.isArray(data.queue) ? data.queue.map(track => ({
                title: String(track.title || 'Unknown'),
                author: String(track.author || 'Unknown')
            })) : []
        };

        //Logger.success(`[MUSIC-DASH] /status: Status retrieved for guild ${guildId}`);
        return res.json(validatedData);

    } catch (err) {
        Logger.error(`[MUSIC-DASH] /status: Error - ${err.message}`);
        
        const isTimeout = err.message.includes('timeout');
        const statusCode = isTimeout ? 504 : 503;
        
        return res.status(statusCode).json({
            error: err.message,
            active: false,
            paused: false,
            volume: 0,
            current: null,
            queue: [],
            retryAfter: isTimeout ? 3000 : 5000
        });
    }
});

/**
 * POST /search
 * Busca canciones usando el IPC event del plugin de música
 */
router.post("/search", async (req, res) => {
    const guildId = res.locals.guild?.id;
    const { query, page = 1 } = req.body;
    if (!guildId) {
        Logger.warn('[MUSIC-DASH] /search: Guild ID not found');
        return res.status(400).json({ 
            error: "Guild ID not found",
            results: [],
            hasMore: false
        });
    }

    if (!query || query.trim().length === 0) {
        Logger.warn('[MUSIC-DASH] /search: Empty query');
        return res.status(400).json({ 
            error: "Query cannot be empty",
            results: [],
            hasMore: false
        });
    }

    const ipcClient = getIPCClient(req);
    
    if (!ipcClient) {
        Logger.warn('[MUSIC-DASH] /search: IPC client not available');
        return res.status(503).json({
            error: "Bot not connected",
            results: [],
            hasMore: false,
            retryAfter: 5000
        });
    }

    try {
        Logger.info(`[MUSIC-DASH] /search: Searching for "${query}" (page ${page})`);
        
        const response = await sendIPCMessage(
            ipcClient,
            "music:search",
            { guildId, query, page }
        );

        console.log('[SEARCH-ROUTER] Response recibida del IPC:', response);
        console.log('[SEARCH-ROUTER] response.success:', response?.success);
        console.log('[SEARCH-ROUTER] response.data existe:', !!response?.data);
        
        // 🔧 LAVALINK 2.9+: Desenvuelve las respuestas envueltas por IPC
        let searchData = response;
        
        if (response?.success === true && response?.data) {
            searchData = response.data;
        }
        
        // Si la data aún tiene success/data, desenvuelve nuevamente
        if (searchData?.success === true && searchData?.data) {
            searchData = searchData.data;
        }
        
        console.log('[SEARCH-ROUTER] searchData final:', searchData);
        console.log('[SEARCH-ROUTER] searchData.tracks existe:', !!searchData?.tracks);
        console.log('[SEARCH-ROUTER] searchData.tracks.length:', searchData?.tracks?.length);
        
        // Obtener tracks
        let tracks = searchData?.tracks || [];
        
        // Si tracks es un objeto (no array), intentar convertir
        if (tracks && typeof tracks === 'object' && !Array.isArray(tracks)) {
            console.log('[SEARCH-ROUTER] Convirtiendo tracks a array...');
            tracks = Array.from(tracks);
        }
        
        console.log('[SEARCH-ROUTER] tracks.length final:', tracks?.length);

        if (!tracks || tracks.length === 0) {
            console.log('[SEARCH-ROUTER] No hay tracks, retornando vacío');
            Logger.warn(`[MUSIC-DASH] /search: No results for "${query}"`);
            return res.json({
                results: [],
                hasMore: false
            });
        }

        console.log('[SEARCH-ROUTER] Tenemos', tracks.length, 'tracks, mapeando...');

        // Mapear resultados
        const RESULTS_PER_PAGE = 10;
        const start = (page - 1) * RESULTS_PER_PAGE;
        const paginatedTracks = tracks.slice(start, start + RESULTS_PER_PAGE);

        const results = paginatedTracks.map((track, index) => {
            console.log(`[SEARCH-ROUTER] Mapeando track ${index}:`, track?.info?.title);
            console.log(`[SEARCH-ROUTER] Track duration (ms):`, track?.info?.length);
            return {
                id: track.info?.identifier || `${track.info?.title}_${index}`,
                title: track.info?.title || 'Unknown',
                author: track.info?.author || 'Unknown Artist',
                thumbnail: track.info?.artworkUrl || 'https://via.placeholder.com/50?text=No+Image',
                duration: formatDuration(track.info?.duration ?? track.info?.length ?? 0),
                durationMs: track.info?.duration ?? track.info?.length ?? 0,
                uri: track.info?.uri || ''
            };
        });

        const hasMore = tracks.length > start + RESULTS_PER_PAGE;

        console.log('[SEARCH-ROUTER] ========== RESULTADO FINAL ==========');
        console.log('[SEARCH-ROUTER] Results count:', results.length);
        console.log('[SEARCH-ROUTER] hasMore:', hasMore);

        Logger.success(`[MUSIC-DASH] /search: Found ${results.length} results for "${query}"`);
        return res.json({
            results,
            hasMore
        });

    } catch (err) {
        console.error('[SEARCH-ROUTER] ❌ ERROR:', err.message);
        Logger.error(`[MUSIC-DASH] /search: Error - ${err.message}`);
        
        const isTimeout = err.message.includes('timeout');
        const statusCode = isTimeout ? 504 : 503;
        
        return res.status(statusCode).json({
            error: err.message,
            results: [],
            hasMore: false,
            retryAfter: isTimeout ? 3000 : 5000
        });
    }
});

/**
 * POST /control
 * Controla la música usando IPC
 */
router.post("/control", async (req, res) => {
    const guildId = res.locals.guild?.id;
    
    if (!guildId) {
        Logger.warn('[MUSIC-DASH] /control: Guild ID not found');
        return res.status(400).json({ error: "Guild ID not found" });
    }

    const { event, data = {} } = req.body;

    // Validar que se proporcionó un evento
    if (!event) {
        Logger.warn('[MUSIC-DASH] /control: No event provided');
        return res.status(400).json({ error: "Event is required" });
    }

    // Validar que el evento está permitido
    if (!ALLOWED_EVENTS.includes(event)) {
        Logger.warn(`[MUSIC-DASH] /control: Invalid event "${event}"`);
        return res.status(400).json({ 
            error: `Invalid event. Allowed: ${ALLOWED_EVENTS.join(', ')}`
        });
    }

    // Validación para ADD_QUEUE
    if (event === "music:ADD_QUEUE") {
        if (!data.track) {
            Logger.warn('[MUSIC-DASH] /control: No track provided for ADD_QUEUE');
            return res.status(400).json({ error: "Track data is required" });
        }
    }

    const ipcClient = getIPCClient(req);
    
    if (!ipcClient) {
        Logger.error('[MUSIC-DASH] /control: IPC not available');
        return res.status(503).json({ 
            error: 'IPC not available',
            retryAfter: 5000
        });
    }

    try {
        Logger.info(`[MUSIC-DASH] /control: Executing ${event} for guild ${guildId}`);
                
        // Asegurar que data sea un objeto limpio sin funciones
        const cleanData = {};
        if (data && typeof data === 'object') {
            for (const key in data) {
                if (typeof data[key] !== 'function') {
                    cleanData[key] = data[key];
                }
            }
        }            
        const response = await sendIPCMessage(
            ipcClient,
            "music:control",
            { guildId, event, data: cleanData }
        );

        if (!response) {
            Logger.warn(`[MUSIC-DASH] /control: No response for ${event}`);
            return res.status(500).json({ error: 'No response from bot' });
        }

        // 🔧 Manejar respuestas envueltas por IPC
        let innerResponse = response;
        
        if (response?.success === true && response?.data) {
            innerResponse = response.data;
        }

        // Si success explícitamente es false, error
        if (innerResponse?.success === false) {
            Logger.error(`[MUSIC-DASH] /control: Failed - ${innerResponse.error}`);
            return res.status(400).json({ error: innerResponse.error || 'Unknown error' });
        }
        
        // Si tiene un error field, también es error
        if (innerResponse?.error) {
            Logger.error(`[MUSIC-DASH] /control: Failed - ${innerResponse.error}`);
            return res.status(400).json({ error: innerResponse.error });
        }
        Logger.success(`[MUSIC-DASH] /control: ${event} executed successfully`);
        return res.json({ success: true, message: 'Action completed' });

    } catch (err) {
        Logger.error(`[MUSIC-DASH] /control: Error - ${err.message}`);
        
        const isTimeout = err.message.includes('timeout');
        const statusCode = isTimeout ? 504 : 503;
        
        return res.status(statusCode).json({
            error: err.message,
            retryAfter: isTimeout ? 3000 : 5000
        });
    }
});

/**
 * GET /logs
 * Endpoint para debugging (opcional, solo en desarrollo)
 */
if (process.env.NODE_ENV !== 'production') {
    router.get("/logs", (req, res) => {
        const ipcClient = getIPCClient(req);
        const registeredClients = Array.from(req.app.ipcServer?.clients?.keys() || []);
        
        res.json({
            ipcAvailable: !!ipcClient,
            registeredClients,
            timeout: IPC_TIMEOUT,
            allowedEvents: ALLOWED_EVENTS
        });
    });
}

module.exports = router;