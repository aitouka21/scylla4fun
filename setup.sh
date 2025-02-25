#!/usr/bin/env bash

docker run \
  --name some-scylla \
  -p 8000:8000 \
  -p 9042:9042 \
  -d scylladb/scylla \
  --alternator-port 8000 \
  --alternator-write-isolation=always \
  --experimental-features=alternator-streams

# docker rm -f $(docker ps | grep scylladb | awk '{ print $1 }') 
