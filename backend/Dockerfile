FROM ubuntu:22.04 AS system_stage

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        cmake \
        gcc \
        g++ \
        make \
        pkg-config \
        ca-certificates \
        curl \
        doxygen \
        graphviz \
        libsystemd-dev \
        git \
        nasm \
        patchelf \
        xz-utils \
        zlib1g-dev \
        bluez \
        libbluetooth-dev \
        libpulse-dev \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# SteamOS ships a newer FFmpeg that is incompatible with this Ubuntu 22.04
# build, so bundle a minimal compatible FFmpeg with the plugin.
FROM system_stage AS ffmpeg_stage

ARG FFMPEG_VERSION=4.4.8
ARG FFMPEG_SHA256=c73848c4ae283d9eaee7be3b276affbc3543380483555500d0dd2c9b7e1c39c3

WORKDIR /tmp/ffmpeg

RUN curl -fsSL "https://ffmpeg.org/releases/ffmpeg-${FFMPEG_VERSION}.tar.xz" \
        -o /tmp/ffmpeg.tar.xz \
    && echo "${FFMPEG_SHA256}  /tmp/ffmpeg.tar.xz" | sha256sum -c - \
    && tar -xJf /tmp/ffmpeg.tar.xz --strip-components=1

RUN ./configure \
        --prefix=/opt/ffmpeg \
        --disable-everything \
        --disable-autodetect \
        --disable-programs \
        --disable-doc \
        --disable-debug \
        --disable-static \
        --enable-shared \
        --enable-small \
        --enable-decoder=aac \
        --disable-avdevice \
        --disable-avfilter \
        --disable-avformat \
        --disable-network \
        --disable-postproc \
        --disable-swresample \
        --disable-swscale \
    && make -j"$(nproc)" \
    && make install \
    && find /opt/ffmpeg/lib -type f \
        \( -name 'libavcodec.so.*' -o -name 'libavutil.so.*' \) \
        -exec strip --strip-unneeded {} +

FROM system_stage AS build_stage

COPY --from=ffmpeg_stage /opt/ffmpeg /opt/ffmpeg

ENV LD_LIBRARY_PATH=/opt/ffmpeg/lib
ENV PKG_CONFIG_PATH=/opt/ffmpeg/lib/pkgconfig

ADD ./src/MagicPodsCore/src /app/src
ADD ./src/MagicPodsCore/dependencies /app/dependencies
ADD ./src/MagicPodsCore/config /app/config
ADD ./src/MagicPodsCore/CMakeLists.txt /app/CMakeLists.txt

WORKDIR /app/build

RUN cmake -DCMAKE_BUILD_TYPE=Release ../
RUN cmake --build ./

# The backend runs outside the image, so bundle the two minimal FFmpeg
# libraries and make the loader resolve them relative to the executable.
RUN mkdir -p /app/runtime-libs \
    && cp -L /opt/ffmpeg/lib/libavcodec.so.58 /app/runtime-libs/ \
    && cp -L /opt/ffmpeg/lib/libavutil.so.56 /app/runtime-libs/ \
    && patchelf --set-rpath '$ORIGIN/lib' /app/build/magicpodscore

ENTRYPOINT [ "/backend/entrypoint.sh" ]
