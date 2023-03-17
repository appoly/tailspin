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

onMounted(async () => {
  console.log(__dirname);
  const file = await content("storage/laravel.log");
  log.value = file;
  console.log(log.value.split("\n")[0]);
});
</script>

<style lang="scss" scoped></style>
