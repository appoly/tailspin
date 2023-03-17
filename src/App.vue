<template>
	<nav class="navbar navbar-expand-lg bg-body-tertiary">
		<div class="container-fluid">
			<a class="navbar-brand" href="#">Log Viewer</a>
		</div>
	</nav>

	<div class="container-fluid my-4">
		<div class="input-group mb-3">
			<input ref="logFile" type="file" class="form-control" />
		</div>
	</div>
</template>

<script>
export default {
	data() {
		return {
			log: ''
		}
	},
	mounted() {
		this.$refs.logFile.addEventListener('change', this.handleFileUpload, false);
	},
	methods: {
		handleFileUpload(e) {
			console.log('reading file...');
			const file = e.target.files[0];
			const reader = new FileReader();
			reader.onload = (e) => {
				console.log(e.target.result);
			};
			this.log = reader.readAsText(file);
		}
	}
}
</script>

<style lang="scss" scoped></style>