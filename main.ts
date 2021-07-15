import { serve, ServerRequest, readAll } from "./deps.ts";

async function callDocker(path: string, payload: object, json: boolean = true): Promise<object> {
	const response = await fetch(`http://localhost:4444/v1.41/${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Host": "localhost"
		},
		body: JSON.stringify(payload)
	});

	if(json === true) {
		return await response.json();
	} else {
		return await response.arrayBuffer();
	}
}

interface Image {
	tag: string;
	repo: string;
	org: string;
}

function imageToString(image: Image): string {
	return `${image.org}/${image.repo}:${image.tag}`;
}

const portMap: { [key: string]: Promise<number>; } = {};

function parseHost(host: string): Image {
	const [ tag, repo, org ] = host.split(".");

	return { tag, repo, org };
}

async function pullImage(image: Image) {
	await callDocker(`images/create?fromImage=${imageToString(image)}`, {}, false);
}

async function createContainer(image: Image, port: number): Promise<string> {
	interface createContainerResponse {
		Id: string;
	}

	const response: createContainerResponse = await callDocker("containers/create", {
		Image: `${image.org}/${image.repo}:${image.tag}`,
		HostConfig: {
			PortBindings: {
				"80/tcp": [
					{ HostPort: port.toString() }
				]
			}
		}
	}) as createContainerResponse;

	if(typeof response.Id !== "string") {
		throw new Error("failed to create container, responded with no `ID`");
	}

	return response.Id;
}

async function startContainer(container: string): Promise<void> {
	await callDocker(`containers/${container}/start`, {}, false);
}

async function ensureContainerRunning(request: ServerRequest): Promise<void> {
	const host = request.headers.get("host");

	if(typeof host !== "string") {
		throw new Error("host cannot be undefined");
	}

	const image = parseHost(host);

	if(!(portMap[imageToString(image)] instanceof Promise)) {
		portMap[imageToString(image)] = (async () => {
			const port = 5000 + Math.floor(Math.random() * 1000);

			await pullImage(image);
			
			const id = await createContainer(image, port);
			console.log({ id });
			
			await startContainer(id);

			console.log("container started");

			await new Promise(r => setTimeout(r, 500));

			return port;
		})() as Promise<number>;
	}
}

async function proxyRequest(request: ServerRequest): Promise<void> {
	const host = request.headers.get("host");

	if(typeof host !== "string") {
		throw new Error("host cannot be undefined");
	}

	const port = await portMap[imageToString(parseHost(host))];
	
	const url = `http://127.0.0.1:${port}${request.url}`;

	console.log(request.headers);

	const res = await fetch(url, {
		method: request.method,
		headers: request.headers,
		body: !([ "GET", "HEAD" ].includes(request.method)) ? await readAll(request.body) : null
	});

	const body = new Uint8Array(await res.arrayBuffer());

	const responseHeaders = new Headers();

	console.log({
		resHeaders: res.headers
	})

	// copy specified headers from fetch response to server response
	for(const header of [
		"Set-Cookie",
		"Content-Type"
	]) {
		if(res.headers.has(header)) {
			const value = res.headers.get(header) as string;
		
			responseHeaders.append(header, value);
		}
	}

	request.respond({
		body,
		headers: responseHeaders
	});
}

async function handleRequest(request: ServerRequest): Promise<void> {
	await ensureContainerRunning(request);
	await proxyRequest(request);
}

const server = serve({ port: 3000 });

for await (const request of server) {
	handleRequest(request);
}
