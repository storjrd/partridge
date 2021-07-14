import { serve, ServerRequest } from "https://deno.land/std@0.101.0/http/server.ts";

async function callDocker(path: string, payload: object): Promise<object> {
	const response = await fetch(`http://localhost:4444/v1.41/${path}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Host": "localhost"
		},
		body: JSON.stringify(payload)
	});

	return await response.json();
}

interface Image {
	tag: string;
	repo: string;
	org: string;
}

function imageToString(image: Image) {
	return `${image.org}/${image.repo}:${image.tag}`;
}

const portMap = {};

function parseHost(host: string): Image {
	const [ tag, repo, org ] = host.split(".");

	return { tag, repo, org };
}

async function pullImage(image: Image) {
	await callDocker(`images/create?fromImage=${imageToString(image)}`, {});
}

async function createContainer(image: Image): string {
	const port = 5000 + Math.floor(Math.random() * 1000);

	portMap[imageToString] = port;

	await callDocker("containers/create", {
		Image: `${image.org}/${image.repo}:${image.tag}`,
		PortBindings: {
			"80/tcp": {
				HostPort: port
			}
		}
	});
}

async function startContainer(container: string) {
	await callDocker(`containers/${container}/start`);
}

async function handleRequest(request: ServerRequest) {
	console.log(request);

	const host = request.headers.get("host");

	if(typeof host !== "string") {
		throw new Error("host cannot be undefined");
	}

	const image = parseHost(host);

	console.log({ image });

	if(typeof portMap[imageToString(image)] !== "number") {
		const id = await createContainer(image);
		await startContainer(id);

		console.log("container started");
	}
}

const server = serve({ port: 3000 });

for await (const request of server) {
	handleRequest(request);
}
