<template>
	<nav class="navbar navbar-expand-lg bg-body-tertiary">
		<div class="container-fluid">
			<a class="navbar-brand" href="#">Log Viewer</a>
		</div>
	</nav>

	<div class="container-fluid my-4">
		<div class="input-group mb-3">
			<input id="logFile" type="file" class="form-control" />
		</div>
	</div>

	<div>
		<pre>{{ log }}</pre>
	</div>
</template>

<script setup lang="ts">
import { readFile } from "fs/promises";
import { ref, onMounted } from "vue";

const log = ref("");

async function content(path: string): Promise<string> {
	return await readFile(path, "utf8");
}

async function handleFileSelect(evt: any) {
	const files = evt.target.files; // FileList object
	const file = files[0];
	const filePath = file.path;

	const fileContent = await content(filePath);
	log.value = fileContent;
}

onMounted(async () => {
	const fileInput = document.getElementById("logFile");
	fileInput.addEventListener("change", handleFileSelect, false);
});
</script>

<style lang="scss" scoped></style>
