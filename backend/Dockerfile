FROM ubuntu:22.04 AS system_stage

RUN apt-get update
RUN apt-get install cmake -y
RUN apt-get install gcc -y
RUN apt-get install g++ -y
RUN apt-get install pkg-config -y
RUN apt-get install doxygen -y
RUN apt install graphviz -y
RUN apt-get install libsystemd-dev -y
RUN apt-get install git -y
RUN apt-get install zlib1g-dev -y
RUN apt-get install bluez -y
RUN apt-get install libbluetooth-dev -y

FROM system_stage AS build_stage

ADD ./src/MagicPodsCore/src /app/src
ADD ./src/MagicPodsCore/dependencies /app/dependencies
ADD ./src/MagicPodsCore/config /app/config
ADD ./src/MagicPodsCore/CMakeLists.txt /app/CMakeLists.txt

WORKDIR /app/build

RUN cmake -DCMAKE_BUILD_TYPE=Release ../
RUN cmake --build ./

ENTRYPOINT [ "/backend/entrypoint.sh" ]