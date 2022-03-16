import { t } from 'i18next';
import {
	AudioPlayer,
	AudioPlayerStatus,
	AudioResource,
	createAudioPlayer,
	entersState,
	joinVoiceChannel,
	VoiceConnection,
	VoiceConnectionDisconnectReason,
	VoiceConnectionState,
	VoiceConnectionStatus,
} from '@discordjs/voice';
import type { Track } from './track';
import { promisify } from 'node:util';
import { Message, Snowflake, TextBasedChannel, VoiceBasedChannel } from 'discord.js';

const wait = promisify(setTimeout);
const subscriptions = new Map<Snowflake, MusicSubscription>();

export function getSubscription(
	guildId: string,
	createIfNotExist = false,
	createIn: VoiceBasedChannel | null = null,
	updatesTo: TextBasedChannel | null = null
) {
	let subscription = subscriptions.get(guildId)
	if (!subscription && createIfNotExist && createIn) {
		subscription = new MusicSubscription(
			joinVoiceChannel({
				guildId: guildId,
				channelId: createIn.id,
				adapterCreator: createIn.guild.voiceAdapterCreator,
			}),
			createIn.id,
			updatesTo!
		);
		subscription.voiceConnection.on('error', console.warn);
		subscriptions.set(guildId, subscription);
	}
	return subscription
}

/**
 * A MusicSubscription exists for each active VoiceConnection. Each subscription has its own audio player and queue,
 * and it also attaches logic to the audio player and voice connection for error handling and reconnection logic.
 */
export class MusicSubscription {
	public readonly voiceConnection: VoiceConnection;
	public readonly audioPlayer: AudioPlayer;
	public queue: Track[];
	public queueLock = false;
	public readyLock = false;
	private voiceChannelId: Snowflake
	private updates: TextBasedChannel
	private nowPlayingMessage: Message | undefined

	public constructor(voiceConnection: VoiceConnection, voiceChannelId: Snowflake, updates: TextBasedChannel) {
		this.voiceConnection = voiceConnection;
		this.voiceChannelId = voiceChannelId;
		this.updates = updates;
		this.audioPlayer = createAudioPlayer();
		this.queue = [];

		this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async (_, newState) => {
			if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
				/**
				 * If the WebSocket closed with a 4014 code, this means that we should not manually attempt to reconnect,
				 * but there is a chance the connection will recover itself if the reason of the disconnect was due to
				 * switching voice channels. This is also the same code for the bot being kicked from the voice channel,
				 * so we allow 5 seconds to figure out which scenario it is. If the bot has been kicked, we should destroy
				 * the voice connection.
				 */
				try {
					await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5_000);
					// Probably moved voice channel
				} catch {
					this.voiceConnection.destroy();
					// Probably removed from voice channel
				}
			} else if (this.voiceConnection.rejoinAttempts < 5) {
				/**
				 * The disconnect in this case is recoverable, and we also have <5 repeated attempts so we will reconnect.
				 */
				await wait((this.voiceConnection.rejoinAttempts + 1) * 5_000);
				this.voiceConnection.rejoin();
			} else {
				/**
				 * The disconnect in this case may be recoverable, but we have no more remaining attempts - destroy.
				 */
				this.voiceConnection.destroy();
			}
		})

		this.voiceConnection.on(VoiceConnectionStatus.Destroyed, (_, _newState) => {
			/**
			 * Once destroyed, stop the subscription.
			 */
			this.stop();
			subscriptions.delete(this.voiceConnection.joinConfig.guildId)
		})

		const connectingSignalling = async (_oldState: VoiceConnectionState, _newState: VoiceConnectionState) => {
			if (!this.readyLock) {
				/**
				 * In the Signalling or Connecting states, we set a 20 second time limit for the connection to become ready
				 * before destroying the voice connection. This stops the voice connection permanently existing in one of these
				 * states.
				 */
				this.readyLock = true;
				try {
					await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20_000);
				} catch {
					if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy();
				} finally {
					this.readyLock = false;
				}
			}
		}

		this.voiceConnection.on(VoiceConnectionStatus.Connecting, connectingSignalling)
		this.voiceConnection.on(VoiceConnectionStatus.Signalling, connectingSignalling)

		// Configure audio player
		this.audioPlayer.on(AudioPlayerStatus.Idle, (oldState, _newState) => {
			if (oldState.status != AudioPlayerStatus.Idle) {
				this.onFinish((oldState.resource as AudioResource<Track>).metadata);
				this.processQueue();
			}
		})

		this.audioPlayer.on(AudioPlayerStatus.Playing, (_oldState, newState) => {
			this.onStart((newState.resource as AudioResource<Track>).metadata)
		})

		this.audioPlayer.on('error', (error) => {
			this.onError((error.resource as AudioResource<Track>).metadata, error);
		});

		voiceConnection.subscribe(this.audioPlayer);
	}

	/**
	 * Adds a new Track to the queue.
	 *
	 * @param track The track to add to the queue
	 */
	public enqueue(track: Track) {
		this.queue.push(track);
		void this.processQueue();
	}

	/**
	 * Stops audio playback and empties the queue.
	 */
	public stop() {
		this.queueLock = true;
		this.queue = [];
		this.audioPlayer.stop(true);
	}

	/**
	 * Attempts to play a Track from the queue.
	 */
	private async processQueue(): Promise<void> {
		// If the queue is locked (already being processed), is empty, or the audio player is already playing something, return
		if (this.queueLock || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.queue.length === 0) {
			return;
		}
		// Lock the queue to guarantee safe access
		this.queueLock = true;

		// Take the first item from the queue. This is guaranteed to exist due to the non-empty check above.
		const nextTrack = this.queue.shift()!;
		try {
			// Attempt to convert the Track into an AudioResource (i.e. start streaming the video)
			let resource = await nextTrack.createAudioResource();
			this.audioPlayer.play(resource);
			this.queueLock = false;
		} catch (error) {
			// If an error occurred, try the next item of the queue instead
			this.onError(nextTrack, error as Error)
			this.queueLock = false;
			return this.processQueue();
		}
	}

	async onStart(track: Track) {
		this.nowPlayingMessage = await this.updates.send({
			content: `Now Playing in <#${this.voiceChannelId}>`,
			embeds: [await track.generateEmbed()]
		})
	}

	async onFinish(track: Track) {
		if (this.nowPlayingMessage?.deletable) {
			await this.nowPlayingMessage?.delete()
		}
	}

	async onError(track: Track, error: Error) {
		console.warn(error)
		if (this.nowPlayingMessage?.deletable) {
			await this.nowPlayingMessage?.delete()
		}
		await this.updates.send(`An error occurred playing ${t('generic.song_inline', track.info)}`)
	}
}
