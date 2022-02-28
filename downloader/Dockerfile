FROM python:3.10-alpine

RUN apk --update --no-cache add ffmpeg git gcc musl-dev

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN python -m compileall ./
CMD python main.py
