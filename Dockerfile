FROM denoland/deno:debian

RUN apt-get update; \
	apt-get install socat -y;

EXPOSE 3000

WORKDIR /app

COPY main.ts .
RUN deno cache main.ts

ADD . .

USER root

ENTRYPOINT [ "/app/entrypoint.sh" ]
