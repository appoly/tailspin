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

	<div class="container-fluid">
		<!-- Search Bar -->
		<div class="input-group mb-3">
			<input type="text" class="form-control" placeholder="Filter by level, time or message" v-model="searchTerm" />
		</div>
		<div class="d-flex">
			<div class="log-item-severity">
				Severity
			</div>
			<div class="log-item-time">
				Time
			</div>
			<div class="log-item-text">
				Content
			</div>
		</div>

		<LogEntry v-for="logItem in filteredLogItems" :log-item="logItem" />
	</div>
</template>

<script setup lang="ts">
import { readFile } from "fs/promises";
import { ref, computed, onMounted } from "vue";
import LogEntry from "./components/LogEntry.vue";

const log = ref("");
const searchTerm = ref("");

// computed filteredLogItems
const filteredLogItems = computed(() => {

	const search = searchTerm.value.toLowerCase();
	if (search === "") return testLogItems;
	return testLogItems.filter((logItem) => {
		return (
			logItem.text.toLowerCase().includes(search) ||
			logItem.severity.toLowerCase().includes(search) ||
			logItem.time.includes(search)
		);
	});
});

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

const testLogItems = [
	{
		'severity': 'INFO',
		'time': '2021-09-01 12:00:00',
		'text': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae ipsum sollicitudin, rhoncus leo molestie, sodales ipsum. Aliquam vehicula, turpis quis tincidunt fermentum, ligula orci efficitur ipsum, id aliquam mauris elit ac urna. Donec rhoncus laoreet sapien. Proin porta nunc vitae vestibulum luctus. Quisque finibus dui non libero hendrerit sodales. Nulla augue lacus, laoreet eget velit a, sollicitudin tristique leo. Vestibulum sit amet blandit diam, at eleifend magna. Nunc euismod diam vitae bibendum rhoncus. Sed et volutpat lectus, in convallis lorem. Morbi sit amet bibendum orci. Morbi eu dolor fermentum, egestas justo eget, blandit urna. Donec nec magna posuere, ullamcorper leo interdum, tincidunt ipsum. Donec a blandit nisl, vel convallis ipsum. Maecenas gravida ligula non sapien fermentum, a faucibus nibh pulvinar. Sed sagittis arcu nec pretium lobortis.'
	},
	{
		'severity': 'WARNING',
		'time': '2021-09-01 13:00:00',
		'text': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae ipsum sollicitudin, rhoncus leo molestie, sodales ipsum. Aliquam vehicula, turpis quis tincidunt fermentum, ligula orci efficitur ipsum, id aliquam mauris elit ac urna. Donec rhoncus laoreet sapien. Proin porta nunc vitae vestibulum luctus. Quisque finibus dui non libero hendrerit sodales. Nulla augue lacus, laoreet eget velit a, sollicitudin tristique leo. Vestibulum sit amet blandit diam, at eleifend magna. Nunc euismod diam vitae bibendum rhoncus. Sed et volutpat lectus, in convallis lorem. Morbi sit amet bibendum orci. Morbi eu dolor fermentum, egestas justo eget, blandit urna. Donec nec magna posuere, ullamcorper leo interdum, tincidunt ipsum. Donec a blandit nisl, vel convallis ipsum. Maecenas gravida ligula non sapien fermentum, a faucibus nibh pulvinar. Sed sagittis arcu nec pretium lobortis.'
	},
	{
		'severity': 'ERROR',
		'time': '2021-09-01 14:00:00',
		'text': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae ipsum sollicitudin, rhoncus leo molestie, sodales ipsum. Aliquam vehicula, turpis quis tincidunt fermentum, ligula orci efficitur ipsum, id aliquam mauris elit ac urna. Donec rhoncus laoreet sapien. Proin porta nunc vitae vestibulum luctus. Quisque finibus dui non libero hendrerit sodales. Nulla augue lacus, laoreet eget velit a, sollicitudin tristique leo. Vestibulum sit amet blandit diam, at eleifend magna. Nunc euismod diam vitae bibendum rhoncus. Sed et volutpat lectus, in convallis lorem. Morbi sit amet bibendum orci. Morbi eu dolor fermentum, egestas justo eget, blandit urna. Donec nec magna posuere, ullamcorper leo interdum, tincidunt ipsum. Donec a blandit nisl, vel convallis ipsum. Maecenas gravida ligula non sapien fermentum, a faucibus nibh pulvinar. Sed sagittis arcu nec pretium lobortis.'
	},
	{
		'severity': 'ERROR',
		'time': '2021-09-01 15:00:00',
		'text': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae ipsum sollicitudin, rhoncus leo molestie, sodales ipsum. Aliquam vehicula, turpis quis tincidunt fermentum, ligula orci efficitur ipsum, id aliquam mauris elit ac urna. Donec rhoncus laoreet sapien. Proin porta nunc vitae vestibulum luctus. Quisque finibus dui non libero hendrerit sodales. Nulla augue lacus, laoreet eget velit a, sollicitudin tristique leo. Vestibulum sit amet blandit diam, at eleifend magna. Nunc euismod diam vitae bibendum rhoncus. Sed et volutpat lectus, in convallis lorem. Morbi sit amet bibendum orci. Morbi eu dolor fermentum, egestas justo eget, blandit urna. Donec nec magna posuere, ullamcorper leo interdum, tincidunt ipsum. Donec a blandit nisl, vel convallis ipsum. Maecenas gravida ligula non sapien fermentum, a faucibus nibh pulvinar. Sed sagittis arcu nec pretium lobortis.'
	},
	{
		'severity': 'INFO',
		'time': '2021-09-01 16:00:00',
		'text': 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vitae ipsum sollicitudin, rhoncus leo molestie, sodales ipsum. Aliquam vehicula, turpis quis tincidunt fermentum, ligula orci efficitur ipsum, id aliquam mauris elit ac urna. Donec rhoncus laoreet sapien. Proin porta nunc vitae vestibulum luctus. Quisque finibus dui non libero hendrerit sodales. Nulla augue lacus, laoreet eget velit a, sollicitudin tristique leo. Vestibulum sit amet blandit diam, at eleifend magna. Nunc euismod diam vitae bibendum rhoncus. Sed et volutpat lectus, in convallis lorem. Morbi sit amet bibendum orci. Morbi eu dolor fermentum, egestas justo eget, blandit urna. Donec nec magna posuere, ullamcorper leo interdum, tincidunt ipsum. Donec a blandit nisl, vel convallis ipsum. Maecenas gravida ligula non sapien fermentum, a faucibus nibh pulvinar. Sed sagittis arcu nec pretium lobortis.'
	},

];

onMounted(async () => {
	const fileInput = document.getElementById("logFile");
	fileInput.addEventListener("change", handleFileSelect, false);
});
</script>

<style lang="scss" scoped></style>
