import SpotifyWebApi from 'spotify-web-api-node'
import NodeCache from 'node-cache'
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
spotifyClient.setAccessToken((await spotifyClient.clientCredentialsGrant()).body.access_token)

export async function search(query: string) {
    const { body } = await spotifyClient.search(query, ['track', 'album', 'playlist'])
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
    let track = trackCacheSimple.get<SpotifyApi.TrackObjectFull>(trackId)
    if (track == undefined) {
        return getTrackFull(trackId)
    }
    return track
}
