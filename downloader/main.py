import quart

from downloader import Downloader

downloader = Downloader()

app = quart.Quart(__name__)

@app.route("/health")
def health():
    return "OK"

@app.route("/track/<track_id>")
async def track(track_id):
    with await downloader.download(track_id) as reader:
        return await quart.send_file(reader.name)

app.run(host="0.0.0.0")
