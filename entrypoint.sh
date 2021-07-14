#!/bin/sh
./unix-to-tcp.sh & >> /dev/null
deno run --allow-net main.ts
