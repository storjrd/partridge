#!/bin/sh
(./unix-to-tcp.sh > /dev/null 2>&1) &
deno run --allow-net main.ts
