import { defineStore } from 'pinia'
import { ref } from 'vue'
import { StorageAPI } from '@/lib/backend'

export const useUserStore = defineStore('user', () => {
  const theme = ref('dark')
  const defaultSshPath = ref('')

  async function init() {
    await initTheme()
    await initDefaultSshPath()
  }

  async function initTheme() {
    theme.value = window.localStorage.getItem('theme') || theme.value
    setTheme()
  }

  function changeTheme(value: string) {
    theme.value = value
    setTheme()
  }

  function setTheme() {
    window.localStorage.setItem('theme', theme.value)
    const html = document.documentElement
    if (theme.value === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.toggle('dark', isDark)
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        html.classList.toggle('dark', e.matches)
      })
    } else {
      html.classList.toggle('dark', theme.value === 'dark')
    }
  }

  async function initDefaultSshPath() {
    defaultSshPath.value = await StorageAPI.Get('app.sshKeyPath', '')
  }

  return { theme, defaultSshPath, init, changeTheme, setTheme, initDefaultSshPath }
})
