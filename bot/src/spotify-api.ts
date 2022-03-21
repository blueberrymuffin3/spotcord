import SpotifyWebApi from 'spotify-web-api-node'
import NodeCache from 'node-cache'
import retry from 'async-retry'
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env as Record<string, string>;

const cacheOpts: NodeCache.Options = {
    stdTTL: 3600, useClones: false
}
const trackCacheSimple = new NodeCache(cacheOpts)
const trackCacheFull = new NodeCache(cacheOpts)

const spotifyClient = new SpotifyWebApi({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET
})

const REFRESH_ON_REMAINING = 600;
await refreshAccessToken()

async function refreshAccessToken() {
    const { body } = await retry(() => {
        console.log("Refreshing spotify access token...")
        return spotifyClient.clientCredentialsGrant()
    }, {
        forever: true, onRetry: console.warn, maxTimeout: REFRESH_ON_REMAINING * 1000
    })
    spotifyClient.setAccessToken(body.access_token)
    console.log(`Refreshed spotify access token, expires in ${body.expires_in} seconds`)
    setTimeout(refreshAccessToken, (body.expires_in - REFRESH_ON_REMAINING) * 1000).unref()
}

export async function search(query: string, types: Array<string>, limit = 30) {
    const { body } = await spotifyClient.search(query, types as any, { limit })
    for (const track of body.tracks?.items || []) {
        trackCacheSimple.set(track.id, track)
    }
    return body
}

export async function getTrackFull(trackId: string) {
    let track = trackCacheFull.get<SpotifyApi.TrackObjectFull>(trackId)
    if (track == undefined) {
        track = (await spotifyClient.getTrack(trackId)).body
        trackCacheFull.set(trackId, track)
        trackCacheSimple.set(trackId, track)
    }
    return track
}

export async function getTrackSimple(trackId: string) {
    const track = trackCacheSimple.get<SpotifyApi.TrackObjectFull>(trackId)
    if (track == undefined) {
        return getTrackFull(trackId)
    }
    return track
}

export async function getAlbum(albumId: string) {
    const { body } = await spotifyClient.getAlbum(albumId)

    for (const track of body.tracks?.items || []) {
        trackCacheSimple.set(track.id, track)
    }

    return body;
}

export async function getPlaylistWithTracks(playlistId: string) {
    let { body: data } = await spotifyClient.getPlaylist(playlistId)

    let tracks = []
    let offset = 0
    let body = data.tracks
    while (true) {
        for (const track of body.items) {
            if (track.is_local) continue;
            trackCacheSimple.set(track.track.id, track.track)
            tracks.push(track.track)
        }

        if (body.next) {
            offset += body.items.length
            console.log(`Fetching extra page of ${playlistId} (offset: ${offset})`)
            body = (await spotifyClient.getPlaylistTracks(playlistId, { offset })).body
        } else {
            break
        }
    }

    return {
        data, tracks
    };
}
