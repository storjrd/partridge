#!/bin/sh
socat -v tcp-l:4444,reuseaddr,fork unix:/var/run/docker.sock
