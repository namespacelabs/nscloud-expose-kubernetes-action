import * as core from "@actions/core";
import * as fs from "fs";
import * as path from "path";
import * as exec from "@actions/exec";

async function run(): Promise<void> {
	const commandExists = require("command-exists");

	commandExists("nsc")
		.then(prepareCluster)
		.catch(() => {
			core.setFailed(`Namespace Cloud CLI not found.

Please add a step this step to your workflow's job definition:

- uses: namespacelabs/nscloud-setup@v0`);
		});
}

async function prepareCluster(): Promise<void> {
	try {
		const id = core.getInput("instance-id");

		if (id === "") {
			throw new Error("instance-id not provided");
		}

		const preview = await core.group("Expose ingress", async () => {
			await ensureNscloudToken();

			return await exposeKubernetes(id);
		});

		core.setOutput("preview-url", preview.url);

		const token = await core.group("Generate ingress access token", async () => {
			return await generateAccessToken(id);
		});

		core.setSecret(token);
		core.setOutput("access-token", token);

		// New line to separate from groups.
		core.info(`
Successfully exposed port ${preview.port} under ${preview.url}.`);
	} catch (error) {
		core.setFailed(error.message);
	}
}

async function ensureNscloudToken() {
	const tokenFile = "/var/run/nsc/token.json";
	if (fs.existsSync(tokenFile)) {
		core.exportVariable("NSC_TOKEN_FILE", tokenFile);
		return;
	}

	// We only need a valid token when opening the proxy
	await exec.exec("nsc auth exchange-github-token --ensure=5m");
}

export function tmpFile(file: string): string {
	const tmpDir = path.join(process.env.RUNNER_TEMP, "ns");

	if (!fs.existsSync(tmpDir)) {
		fs.mkdirSync(tmpDir);
	}

	return path.join(tmpDir, file);
}

// Returns the access token as a string
async function generateAccessToken(id: string): Promise<string> {
	const out = tmpFile("ingress-access.txt");

	await exec.exec(
		`nsc ingress generate-access-token --instance=${id} --output_to=${out} --log_actions=false`
	);

	return fs.readFileSync(out, "utf8");
}

interface Preview {
	name: string;
	port: string;
	url: string;
}

async function exposeKubernetes(id: string): Promise<Preview> {
	const ns = core.getInput("namespace");
	const service = core.getInput("service");

	let cmd = `nsc expose kubernetes ${id} --namespace=${ns} --service=${service} --output json --wait`;

	const port = core.getInput("port");
	if (port !== "") {
		cmd = `${cmd} --port=${port}`;
	}

	const name = core.getInput("name");
	if (name !== "") {
		cmd = `${cmd} --name=${name}`;
	}

	const ingress = core.getInput("ingress");
	if (ingress !== "") {
		cmd = `${cmd} --ingress=${ingress}`;
	}

	if (core.getInput("wildcard") === "true") {
		cmd = `${cmd} --wildcard`;
	}

	const out = await exec.getExecOutput(cmd);

	return JSON.parse(out.stdout);
}

run();
