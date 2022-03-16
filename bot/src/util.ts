// Format as m:ss
export function formatDurationMs(duration: number){
    let seconds = Math.floor(duration / 1000)
    let minutes = Math.floor(duration / 60000)
    seconds %= 60
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

export function truncateEllipses(message: string, maxLength: number){
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength - 3) + '...'
}

export function formatPlural(count: number, plural: string, singular: string){
    if(count == 1){
        return `${count.toLocaleString('en-US')} ${singular}`;
    } else {
        return `${count.toLocaleString('en-US')} ${plural}`;
    }
}

export function isProd() {
    return process.env.BOT_ENV == 'PROD'
}
