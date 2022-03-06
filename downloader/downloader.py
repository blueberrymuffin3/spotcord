from asyncio import Future
import os
from queue import Queue
from tempfile import mktemp
from threading import Thread
import time
from librespot.audio.decoders import AudioQuality, VorbisOnlyAudioQuality
from librespot.core import Session
from librespot.metadata import TrackId
import subprocess
import ffmpeg
from diskcache import Cache

CACHE_LOCATION = "/cache"
CHUNK_SIZE = 128 * 1024
ANTI_BAN_WAIT_TIME = 5
FFMPEG_ARGS_OUT = {"c:a": "libopus", "b:a": "160k", "f": "ogg"}


class Downloader():
    _queue: Queue
    _session: Session
    _worker_thread: Thread
    _cache: Cache

    def __init__(self):
        self._queue = Queue()
        self._cache = Cache(directory=CACHE_LOCATION)

        conf = Session.Configuration(
            store_credentials=False,
            stored_credentials_file=None,
            cache_enabled=False,
            cache_dir=None,
            do_cache_clean_up=False,
            retry_on_chunk_error=False
        )
        print("Logging into Spotify...")
        self._session = (Session.Builder(conf=conf)
                         .stored_file(stored_credentials="/secret/credentials.json")
                         .create())
        print(f"Logged in as '{self._session.username()}'")

        print("Starting Worker Thread")
        self._worker_thread = Thread(
            target=self._worker, name="Downloader Worker Thread", daemon=True)
        self._worker_thread.start()

    async def download(self, track_id):
        try:
            return self._cache.read(track_id)
        except KeyError:
            future = Future()
            self._queue.put(self.Job(track_id, future))
            return await future

    def _worker(self):
        while True:
            job: Downloader.Job = self._queue.get()
            print(f"Downloading and encoding {job.track_id_str}")

            tempfile = None

            try:
                try:
                    job.future.set_result(self._cache.read(job.track_id_str))
                    continue
                except KeyError:
                    pass

                stream = self._session.content_feeder().load(
                    job.track_id, VorbisOnlyAudioQuality(AudioQuality.HIGH), False, None)

                tempfile = mktemp()

                ffmpeg_process: subprocess.Popen = (
                    ffmpeg
                    .input("pipe:")
                    .output(tempfile, **FFMPEG_ARGS_OUT)
                    .global_args("-hide_banner", "-loglevel", "error")
                    .run_async(pipe_stdin=True)
                )

                total_size = stream.input_stream.size
                for _ in range(total_size // CHUNK_SIZE + 1):
                    ffmpeg_process.stdin.write(
                        stream.input_stream.stream().read(CHUNK_SIZE))
                ffmpeg_process.stdin.close()
                if ffmpeg_process.wait() != 0:
                    raise ValueError("Unexpected ")


                print(f"Downloaded {job.track_id_str}")
                self._queue.task_done()
                self._cache.set(job.track_id_str, open(tempfile, "rb"), read=True)
                os.remove(tempfile)
                job.future.set_result(self._cache.read(job.track_id_str))
            except Exception as e:
                print(f"Error downloading {job.track_id_str}: {e}")
                job.future.set_exception(e)

                if tempfile != None and os.path.exists(tempfile):
                    os.remove(tempfile)

            time.sleep(ANTI_BAN_WAIT_TIME)


    class Job():
        track_id: TrackId
        track_id_str: TrackId
        future: Future

        def __init__(self, track_id, future):
            self.track_id_str = track_id
            self.track_id = TrackId.from_base62(track_id)
            self.future = future
