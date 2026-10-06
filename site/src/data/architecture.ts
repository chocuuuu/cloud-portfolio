// Add an `adr` link (for example your GitHub URL to docs/adr/0001-....md) to show a "Read the decision" link.

export type ArchNode = {
	id: string;
	name: string;
	lane: string;
	role: string; // what it does in this project
	why: string; // why it was chosen
	adr?: string;
};

export const lanes = ['Serving requests', 'Delivery', 'Infrastructure and analytics'];

export const nodes: ArchNode[] = [
	{
		id: 'hosting',
		name: 'Firebase Hosting',
		lane: 'Serving requests',
		role: 'Serves the static Astro build to visitors from Google’s CDN.',
		why: 'It sits inside the always-free tier, gives global caching without extra setup, and its raw access logs can be routed to BigQuery, which is what keeps the analytics cookie-free.',
	},
	{
		id: 'cloud-run',
		name: 'Cloud Run',
		lane: 'Serving requests',
		role: 'Runs the Node.js visitor-count API in a small node:18-alpine container.',
		why: 'It scales to zero, so it costs nothing while idle and fits the free tier. A container also keeps the API portable instead of tied to one platform’s function format.',
	},
	{
		id: 'firestore',
		name: 'Firestore',
		lane: 'Serving requests',
		role: 'Stores the visitors collection that the API increments on every new session.',
		why: 'Native mode is serverless and inside the free tier, so there is no database server to patch, size or pay for.',
	},
	{
		id: 'actions',
		name: 'GitHub Actions',
		lane: 'Delivery',
		role: 'On every push to main it runs Gitleaks, builds the Docker image, pushes it and deploys Cloud Run, then builds and deploys the site.',
		why: 'The pipeline lives next to the code, so every deploy is repeatable and reviewable instead of a manual console step.',
	},
	{
		id: 'wif',
		name: 'Workload Identity Federation',
		lane: 'Delivery',
		role: 'Lets GitHub Actions authenticate to Google Cloud with short-lived tokens.',
		why: 'It replaces static service account JSON keys, so there is no long-lived secret that could leak from the repository or the CI settings.',
	},
	{
		id: 'artifact-registry',
		name: 'Artifact Registry',
		lane: 'Delivery',
		role: 'Stores the versioned container images that the pipeline builds.',
		why: 'Cloud Run pulls an exact image version from here, so a deploy is the same artifact every time.',
	},
	{
		id: 'terraform',
		name: 'Terraform',
		lane: 'Infrastructure and analytics',
		role: 'Provisions Firestore, Firebase and the state bucket as code.',
		why: 'Infrastructure is written down, reviewable and reproducible, rather than clicked together in the console and forgotten.',
	},
	{
		id: 'gcs-state',
		name: 'Cloud Storage',
		lane: 'Infrastructure and analytics',
		role: 'Holds the Terraform state file in a dedicated bucket, with locking.',
		why: 'Remote, locked state gives the infrastructure one source of truth and prevents two runs from overwriting each other.',
	},
	{
		id: 'bigquery',
		name: 'BigQuery',
		lane: 'Infrastructure and analytics',
		role: 'Receives Firebase Hosting access logs so page views can be counted with standard SQL.',
		why: 'It gives real analytics with no client-side tracker and no cookies, which keeps the site privacy-first.',
	},
];