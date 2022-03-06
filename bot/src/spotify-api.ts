import SpotifyWebApi from 'spotify-web-api-node'
const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env as Record<string, string>;

export const spotifyApi = new SpotifyWebApi({
    clientId: SPOTIFY_CLIENT_ID,
    clientSecret: SPOTIFY_CLIENT_SECRET
})

let { body } = await spotifyApi.clientCredentialsGrant()
spotifyApi.setAccessToken(body.access_token)
