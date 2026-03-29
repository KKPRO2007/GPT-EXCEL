import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AppState {
  theme: 'dark' | 'light'
  sidebarOpen: boolean
  activeModel: string
  apiKey: string
  plan: 'free' | 'pro'
  generationsUsed: number
  storageUsed: number
}

const appSlice = createSlice({
  name: 'app',
  initialState: {
    theme: 'dark',
    sidebarOpen: true,
    activeModel: 'gpt-4o',
    apiKey: '',
    plan: 'free',
    generationsUsed: 27,
    storageUsed: 3.4,
  } as AppState,
  reducers: {
    setTheme: (s, a: PayloadAction<'dark'|'light'>) => { s.theme = a.payload },
    toggleSidebar: (s) => { s.sidebarOpen = !s.sidebarOpen },
    setSidebar: (s, a: PayloadAction<boolean>) => { s.sidebarOpen = a.payload },
    setModel: (s, a: PayloadAction<string>) => { s.activeModel = a.payload },
    setApiKey: (s, a: PayloadAction<string>) => { s.apiKey = a.payload },
    incrementGenerations: (s) => { s.generationsUsed += 1 },
  }
})

export const { setTheme, toggleSidebar, setSidebar, setModel, setApiKey, incrementGenerations } = appSlice.actions

export const store = configureStore({ reducer: { app: appSlice.reducer } })
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch