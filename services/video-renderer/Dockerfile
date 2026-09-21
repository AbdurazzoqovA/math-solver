FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      build-essential \
      dvisvgm \
      ffmpeg \
      libcairo2-dev \
      libpango1.0-dev \
      pkg-config \
      texlive-fonts-recommended \
      texlive-latex-base \
      texlive-latex-extra \
      texlive-science \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd --create-home --uid 10001 renderer \
    && chown -R renderer:renderer /app
USER renderer

# A successful first job does not prove that a reused process can render.
# This real Manim/FFmpeg regression must pass before an image can be released.
RUN PYTHONPATH=/app python tests/test_render_state.py -q

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1"]
