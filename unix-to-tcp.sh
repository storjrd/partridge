#!/bin/sh
socat -v tcp-l:4444,reuseaddr,fork  UNIX-CONNECT:/var/run/docker.sock
