default: build
	docker run -it -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock partridge

build:
	docker build . -t partridge

