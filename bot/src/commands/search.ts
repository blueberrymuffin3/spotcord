import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, MessageActionRow, MessageSelectMenu, SelectMenuInteraction } from 'discord.js';
import { Track } from '../music/track.js';
import { entersState, VoiceConnectionStatus } from '@discordjs/voice';
import { getSubscription } from '../music/subscription.js';
import * as spotify from '../spotify-api.js';

const customIdSelectSearchResultTrack = "select_search_result_track";
const customIdSelectSearchResultAlbum = "select_search_result_album";
const customIdSelectSearchResultPlaylist = "select_search_result_playlist";
const EMOJI_TRACK = "%F0%9F%8E%B5"; // :musical_note:
const EMOJI_TRACK_EXPLICIT = "%E2%9A%A0%EF%B8%8F"; // :warning:
const EMOJI_ALBUM = "%F0%9F%92%BD"; // :minidisk:
const EMOJI_PLAYLIST = "%F0%9F%93%9C"; // :scroll:

export const data = new SlashCommandBuilder()
    .setName('search')
    .setDescription(t('command.search.description'))
    .addStringOption(option => option.setName('query')
        .setDescription(t('command.search.option.query.description'))
        .setRequired(true)
    );

type SearchCommandResponse = SpotifyApi.TrackSearchResponse & SpotifyApi.AlbumSearchResponse & SpotifyApi.PlaylistSearchResponse

export async function execute(interaction: CommandInteraction) {
    let query = interaction.options.getString("query") as string
    let results = await spotify.search(query, ['track', 'album', 'playlist'], 25) as SearchCommandResponse
    const menus: MessageSelectMenu[] = []

    console.log(`Got results for "${query}" with ${results.tracks.total} tracks, ${results.albums.total} albums, and ${results.playlists.total} playlists`)

    if (results.tracks.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultTrack)
            .setPlaceholder(t('command.search.response.tracks.placeholder', { count: results.tracks.total }))
            .addOptions(results.tracks.items
                .slice(0, 25)
                .map(track => ({
                    label: t('command.search.response.tracks.label', track),
                    description: t('command.search.response.tracks.description', track),
                    value: track.id,
                    emoji: track.explicit ? EMOJI_TRACK_EXPLICIT : EMOJI_TRACK
                }))
            )
        )
    }

    if (results.albums.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultAlbum)
            .setPlaceholder(t('command.search.response.albums.placeholder', { count: results.albums.total }))
            .addOptions(results.albums.items
                .slice(0, 25)
                .map(album => ({
                    label: t('command.search.response.albums.label', album),
                    description: t('command.search.response.albums.description', album),
                    value: album.id,
                    emoji: EMOJI_ALBUM 
                }))
            )
        )
    }

    if (results.playlists.items.length > 0) {
        menus.push(new MessageSelectMenu()
            .setCustomId(customIdSelectSearchResultPlaylist)
            .setPlaceholder(t('command.search.response.playlists.placeholder', { count: results.playlists.total }))
            .addOptions(results.playlists.items
                .slice(0, 25)
                .map(playlist => ({
                    label: t('command.search.response.playlists.label', playlist),
                    description: t('command.search.response.playlists.description', playlist),
                    value: playlist.id,
                    emoji: EMOJI_PLAYLIST 
                }))
            )
        )
    }

    if (menus.length == 0) {
        interaction.reply({
            content: t('error.query_no_results_for', { query }),
            ephemeral: true
        })
    } else {
        await interaction.reply({
            content: t('command.search.response.content', { query }),
            components: menus.map(menu => new MessageActionRow().addComponents(menu)),
            ephemeral: true
        })
    }
}

export const interactionIds = [customIdSelectSearchResultTrack, customIdSelectSearchResultAlbum, customIdSelectSearchResultPlaylist]


export async function interact(interaction: SelectMenuInteraction) {
    if (!interaction.guildId) return;
    if (!(interaction.member instanceof GuildMember)) return

    const updateAndClear = (content: string) => interaction.update({
        content: content,
        components: []
    })

    let subscription = getSubscription(interaction.guildId, true, interaction.member.voice.channel, interaction.channel)

    if (!subscription) {
        await interaction.update(t('error.user_not_connected'));
        return;
    }

    switch (interaction.customId) {
        case customIdSelectSearchResultTrack:
            // Extract the track id from the command
            const trackId = interaction.values[0];

            // Make sure the connection is ready before processing the user's request
            try {
                await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
            } catch (error) {
                console.warn(error);
                await interaction.update(t('error.join_timeout'));
                return;
            }

            try {
                const track = await Track.from(trackId, interaction.user);
                subscription.enqueue(track);
                updateAndClear(t('generic.song_added_to_queue', track.info))
            } catch (error) {
                console.warn(error);
                await interaction.followUp(t('error.track_play'));
            }
            break;
        case customIdSelectSearchResultAlbum:
        case customIdSelectSearchResultPlaylist:
            await updateAndClear("Albums and playlists aren't supported yet, please wait")
            break;
        default:
            throw new Error(`Unknown interaction ID ${interaction.customId}`)
    }
}
