import { Util } from 'discord.js';
import { decode as decodeHTMLEntity } from 'html-entities';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

const ELLIPSES = '\u2026'

await i18next.use(Backend).init({
    lng: "en",
    backend: {
        loadPath: 'locales/{{lng}}/{{ns}}.yaml'
    },
    interpolation: {
        // TODO: What kind of escaping should we do?
        escapeValue: false,
    }
});

const formatInlineBlock = (value: string | undefined) => {
    return "`" + Util.escapeInlineCode(value || 'undefined') + "`"
}

i18next.services.formatter?.add('inline_block', formatInlineBlock)

// Needed until https://github.com/microsoft/TypeScript/pull/47254 merges
declare namespace Intl {
    const ListFormat: any
}

export const formatArtists = (artists: SpotifyApi.ArtistObjectSimplified[], lng = 'en') => {
    return new Intl.ListFormat(lng, { type: 'unit' })
        .format(artists
            .map(artist => artist.name)
        )
}

i18next.services.formatter?.add('artists', formatArtists)

i18next.services.formatter?.add('truncate_ellipses', (message: string, _lng, { max_length }) => {
    const characters = [...message]
    if(message.length <= max_length) {
        return message
    } else {
        var finalMessage = ""
        // Make sure not to split up any surrogate pairs
        for (const char of characters){
            if(finalMessage.length + char.length + ELLIPSES.length > max_length){
                break
            }
            finalMessage += char
        }
        return finalMessage + ELLIPSES
    }
})

i18next.services.formatter?.add('duration_ms', (value: string, _lng) => {
    let duration = parseInt(value)
    let seconds = Math.floor(duration / 1000) % 60
    let minutes = Math.floor(duration / 60000).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
})

i18next.services.formatter?.add('decode_entity', (value: string) => decodeHTMLEntity(value, { scope: 'strict' }))
