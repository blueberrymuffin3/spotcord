import { t } from 'i18next';
import { AudioResource, createAudioResource, StreamType } from '@discordjs/voice';
import fetch, { Response } from 'node-fetch';
import * as spotify from '../spotify-api.js';
import { Readable } from 'node:stream'
import { Embed } from '@discordjs/builders';
import { formatDurationMs } from '../util.js';
import { User, Util } from 'discord.js';

/**
 * This is the data required to create a Track object.
 */
interface TrackData {
	info: SpotifyApi.TrackObjectSimplified
	user: User
	infoFull?: SpotifyApi.TrackObjectFull
}

const noop = () => { };

export class Track implements TrackData {
	public readonly info: SpotifyApi.TrackObjectSimplified
	public readonly user: User;
	private headRequest?: Promise<Response>

	private constructor({ info, user }: TrackData) {
		this.info = info;
		this.user = user;
	}

	/**
	 * Creates an AudioResource from this Track.
	 */
	public async createAudioResource(): Promise<AudioResource<Track>> {
		await this.headRequest
		const res = await fetch(Track.getUrl(this.info.id));
		const data = res.body as Readable

		return createAudioResource(data as any, {
			metadata: this,
			inputType: StreamType.OggOpus
		})
	}

	/**
	 * Creates a Track from a video URL and lifecycle callback methods.
	 *
	 * @param url The URL of the video
	 * @param methods Lifecycle callbacks
	 *
	 * @returns The created Track
	 */
	public static async from(trackId: string, user: User): Promise<Track> {
		const info = await spotify.getTrackSimple(trackId)
		return new Track({ info, user });
	}

	private static getArt(infoFull: SpotifyApi.TrackObjectFull): string | null {
		const art = infoFull.album.images
			.filter(image => image.width && image.width <= 300)
		if (art.length) {
			return art[0].url
		} else {
			return null
		}
	}

	private static getArtistsString(artists: SpotifyApi.ArtistObjectSimplified[]): string {
		return artists
			.map(artist => artist.name)
			.join(", ")
	}

	// TODO: use i18next for this
	public async generateEmbed() {
		let infoFull = await spotify.getTrackFull(this.info.id)

		return new Embed()
			.setColor(0x1DB954)
			.setTitle(infoFull.name)
			.setThumbnail(Track.getArt(infoFull))
			.addField({
				name: infoFull.artists.length > 1 ? "Artists" : "Artist",
				value: Track.getArtistsString(infoFull.artists),
				inline: true
			})
			.addField({
				name: "Album",
				value: infoFull.album.name,
				inline: true
			})
			.addField({
				name: "Requested by",
				value: this.user.toString(),
				inline: true
			})
			.addField({
				name: "Length",
				value: formatDurationMs(infoFull.duration_ms),
				inline: true
			})
			.setFooter({
				text: "Spotify",
				iconURL: "https://cdn.discordapp.com/attachments/950635812628869150/950635979490856980/Spotify_Icon_RGB_Green.png"
			})
			.toJSON()
	}

	private static getUrl(trackId: string): string {
		return `http://downloader/track/${trackId}`
	}
}
