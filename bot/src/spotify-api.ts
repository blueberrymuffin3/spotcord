import SpotifyWebApi from 'spotify-web-api-node'
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env as Record<string, string>;

export const SpotifyClient = new SpotifyWebApi({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET
})

let { body } = await SpotifyClient.clientCredentialsGrant()
SpotifyClient.setAccessToken(body.access_token)
