import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, MessageActionRow, MessageSelectMenu, SelectMenuInteraction } from 'discord.js';
import { SpotifyClient } from '../spotify-api.js';
import { formatDurationMs, formatPlural, truncateEllipses } from '../util.js';
import { decode as decodeEntity } from 'html-entities';
import { Track } from '../music/track.js';
import { entersState, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { MusicSubscription, subscriptions } from '../music/subscription.js';

const customIdSelectSearchResultTrack = "select_search_result_track";
const customIdSelectSearchResultAlbum = "select_search_result_album";
const customIdSelectSearchResultPlaylist = "select_search_result_playlist";
const EMOJI_TRACk = "%F0%9F%8E%B5"; // :musical_note:
const EMOJI_ALBUM = "%F0%9F%92%BD"; // :minidisk:
const EMOJI_PLAYLIST = "%F0%9F%93%9C"; // :scroll:
const TRUNCATE_LENGTH = 50
const TRUNCATE_LENGTH_LONG = 100

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from spotify')
    .addStringOption(option => option.setName('query')
        .setDescription('Song to search for, or a spotify URL')
        .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    let query = interaction.options.getString("query") as string
    let { body } = await SpotifyClient.search(query, ['track', 'album', 'playlist'])

    const menus: MessageSelectMenu[] = []

    if (body.tracks!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultTrack)
            .setPlaceholder(`${formatPlural(body.tracks!.total, 'tracks', 'track')} found`)
            .addOptions(body.tracks!.items.map(track => {
                let artists = track.artists
                    .map(artist => artist.name)
                    .join(', ')

                let explicit = track.explicit ? '[explicit] ' : ''
                let duration = formatDurationMs(track.duration_ms)

                return {
                    label: `${truncateEllipses(track.name, TRUNCATE_LENGTH - 8)} [${duration}]`,
                    description: truncateEllipses(`${explicit}${artists}`, TRUNCATE_LENGTH_LONG),
                    value: track.id,
                    emoji: EMOJI_TRACk
                }
            }))
        )
    }

    if (body.albums!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultAlbum)
            .setPlaceholder(`${formatPlural(body.albums!.total, 'albums', 'album')} found`)
            .addOptions(body.albums!.items.map(album => {
                let artists = album.artists
                    .map(artist => artist.name)
                    .join(', ')

                return {
                    label: `${truncateEllipses(album.name, TRUNCATE_LENGTH - 11)} [${formatPlural(album.total_tracks, 'tracks', 'track')}]`,
                    description: truncateEllipses(artists, TRUNCATE_LENGTH_LONG),
                    value: album.id,
                    emoji: EMOJI_ALBUM
                }
            }))
        )
    }

    if (body.playlists!.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultPlaylist)
            .setPlaceholder(`${formatPlural(body.playlists!.total, 'playlists', 'playlist')} found`)
            .addOptions(body.playlists!.items.map(playlist => {
                let description = playlist.description || ''
                description = decodeEntity(description, { scope: 'strict' })
                description = truncateEllipses(description, TRUNCATE_LENGTH_LONG)

                return {
                    label: `${truncateEllipses(playlist.name, TRUNCATE_LENGTH - 11)} [${formatPlural(playlist.tracks.total, 'tracks', 'track')}]`,
                    description: description,
                    value: playlist.id,
                    emoji: EMOJI_PLAYLIST
                }
            }))
        )
    }

    if (menus.length == 0) {
        interaction.reply({
            content: `No results found for query \`${query}\``,
            ephemeral: true
        })
    } else {
        await interaction.reply({
            content: `Results found for query \`${query}\``,
            components: menus.map(menu => new MessageActionRow().addComponents(menu)),
            ephemeral: true
        })
    }
}

export const interactionIds = [customIdSelectSearchResultTrack, customIdSelectSearchResultAlbum, customIdSelectSearchResultPlaylist]


export async function interact(interaction: SelectMenuInteraction) {
    if (!interaction.guildId) return;
    let subscription = subscriptions.get(interaction.guildId)

    const update = (content: string) => interaction.update({
        content: content,
        components: []
    })

    switch (interaction.customId) {
        case customIdSelectSearchResultTrack:
            // Extract the track id from the command
            const trackId = interaction.values[0];

            // If a connection to the guild doesn't already exist and the user is in a voice channel, join that channel
            // and create a subscription.
            if (!subscription) {
                if (interaction.member instanceof GuildMember && interaction.member.voice.channel) {
                    const channel = interaction.member.voice.channel;
                    subscription = new MusicSubscription(
                        joinVoiceChannel({
                            channelId: channel.id,
                            guildId: channel.guild.id,
                            adapterCreator: channel.guild.voiceAdapterCreator,
                        }),
                    );
                    subscription.voiceConnection.on('error', console.warn);
                    subscriptions.set(interaction.guildId, subscription);
                }
            }

            // If there is no subscription, tell the user they need to join a channel.
            if (!subscription) {
                await update('Join a voice channel and then try that again!');
                return;
            }

            // Make sure the connection is ready before processing the user's request
            try {
                await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
            } catch (error) {
                console.warn(error);
                await update('Failed to join voice channel within 20 seconds, please try again later!');
                return;
            }

            try {
                // Attempt to create a Track from the user's video URL
                const track = await Track.from(trackId, {
                    onStart() {
                        update('Now playing!').catch(console.warn);
                    },
                    onFinish() {
                        update('Now finished!').catch(console.warn);
                    },
                    onError(error) {
                        console.warn(error);
                        update(`Error: ${error.message}`).catch(console.warn);
                    },
                });
                // Enqueue the track and reply a success message to the user
                subscription.enqueue(track);
                await interaction.deleteReply();
                // await update(`Enqueued **${track.info.name}**`);
            } catch (error) {
                console.warn(error);
                await interaction.followUp('Failed to play track, please try again later!');
            }
            break;
        case customIdSelectSearchResultAlbum:
        case customIdSelectSearchResultPlaylist:
            await update('Not yet implemented, please be patient!')
            break;
        default:
            throw new Error(`Unknown interaction ID ${interaction.customId}`)
    }
}
