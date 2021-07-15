FROM denoland/deno:debian

RUN apt-get update; \
	apt-get install socat -y;

EXPOSE 3000

WORKDIR /app

COPY deps.ts .
RUN deno cache deps.ts

ADD . .

RUN deno cache main.ts

USER root

ENTRYPOINT [ "/app/entrypoint.sh" ]
