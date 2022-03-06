FROM python:3.10-alpine as base

# Setup env
ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONFAULTHANDLER 1

RUN apk --update --no-cache add ffmpeg

FROM base AS python-deps

# Install pipenv and compilation dependencies
RUN pip install pipenv
RUN apk --no-cache add git gcc musl-dev

# Install python dependencies in /.venv
COPY Pipfile .
COPY Pipfile.lock .
RUN PIPENV_VENV_IN_PROJECT=1 pipenv install --deploy


FROM base AS runtime

# Copy virtual env from python-deps stage
COPY --from=python-deps /.venv /.venv
ENV PATH="/.venv/bin:$PATH"

# Create and switch to a new user
RUN addgroup -S appuser -g 1000 && adduser -S appuser -G appuser -u 1000
WORKDIR /home/appuser
USER appuser

# Install application into container
COPY . .
RUN python -m compileall ./

# Run the application
CMD python main.py
