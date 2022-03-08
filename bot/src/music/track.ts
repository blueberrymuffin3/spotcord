import { AudioResource, createAudioResource, StreamType } from '@discordjs/voice';
import fetch, { Response } from 'node-fetch';
import { SpotifyClient } from '../spotify-api.js';
import { Readable } from 'node:stream'

/**
 * This is the data required to create a Track object.
 */
interface TrackData {
	info: SpotifyApi.TrackObjectFull
	onStart: () => void
	onFinish: () => void
	onError: (error: Error) => void
}

const noop = () => { };

export class Track implements TrackData {
	public readonly info: SpotifyApi.TrackObjectFull
	public readonly onStart: () => void
	public readonly onFinish: () => void
	public readonly onError: (error: Error) => void
	private headRequest?: Promise<Response>
	private metadata?: SpotifyApi.TrackObjectFull

	private constructor({ info, onStart, onFinish, onError }: TrackData) {
		this.info = info;
		this.onStart = onStart;
		this.onFinish = onFinish;
		this.onError = onError;
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
	public static async from(trackId: string, methods: Pick<Track, 'onStart' | 'onFinish' | 'onError'>): Promise<Track> {
		// The methods are wrapped so that we can ensure that they are only called once.
		const wrappedMethods = {
			onStart() {
				wrappedMethods.onStart = noop;
				methods.onStart();
			},
			onFinish() {
				wrappedMethods.onFinish = noop;
				methods.onFinish();
			},
			onError(error: Error) {
				wrappedMethods.onError = noop;
				methods.onError(error);
			},
		};

		const { body: info } = await SpotifyClient.getTrack(trackId)

		return new Track({ info, ...wrappedMethods });
	}

	public preload() {
		if (this.headRequest != null) {
			console.log("Preloading")
			this.headRequest = fetch(Track.getUrl(this.info.id), {
				method: 'HEAD'
			})
		}
	}

	public async getMetadata(): Promise<SpotifyApi.TrackObjectFull> {
		if (this.metadata == null) {
			const { body } = await SpotifyClient.getTrack(this.info.id)
			this.metadata = body
		}
		return this.metadata
	}

	private static getUrl(trackId: string): string {
		return `http://downloader/track/${trackId}`
	}
}
