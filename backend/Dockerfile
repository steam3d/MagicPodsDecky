FROM ubuntu:22.04 AS system_stage

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        cmake \
        gcc \
        g++ \
        make \
        pkg-config \
        ca-certificates \
        doxygen \
        graphviz \
        libsystemd-dev \
        git \
        zlib1g-dev \
        bluez \
        libbluetooth-dev \
        libpulse-dev \
    && rm -rf /var/lib/apt/lists/*

FROM system_stage AS build_stage

ADD ./src/MagicPodsCore/src /app/src
ADD ./src/MagicPodsCore/dependencies /app/dependencies
ADD ./src/MagicPodsCore/config /app/config
ADD ./src/MagicPodsCore/CMakeLists.txt /app/CMakeLists.txt

WORKDIR /app/build

RUN cmake -DCMAKE_BUILD_TYPE=Release ../
RUN cmake --build ./

ENTRYPOINT [ "/backend/entrypoint.sh" ]